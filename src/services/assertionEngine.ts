// ============================================================
// ASSERTION ENGINE
// Evaluates structured assertions against a ResponseTiming object.
// No eval() — operators are matched explicitly for mobile safety.
// ============================================================

import { JSONPath } from 'jsonpath-plus';
import type { ResponseTiming } from './networkService';
import type {
  AssertionRow,
  AssertionResult,
  AssertionSummary,
  AssertionOperator,
} from '../types/assertions';

/**
 * Extract the value of an assertion field from a response.
 *
 * Supported field formats:
 *  - 'status'           → response.status
 *  - 'totalTime'        → response.totalTime
 *  - 'ttfb'             → response.ttfb
 *  - 'size'             → response.size
 *  - 'body'             → full body string
 *  - 'header.<name>'    → response.headers[name]
 *  - 'jsonpath:<expr>'  → JSONPath query against parsed body
 */
function extractFieldValue(
  response: ResponseTiming,
  field: string
): { value: unknown; displayValue: string } {
  // Direct top-level fields
  switch (field) {
    case 'status':
      return { value: response.status, displayValue: String(response.status) };
    case 'totalTime':
      return { value: response.totalTime, displayValue: String(response.totalTime) };
    case 'ttfb':
      return { value: response.ttfb, displayValue: String(response.ttfb) };
    case 'size':
      return { value: response.size, displayValue: String(response.size) };
    case 'body':
      return { value: response.body, displayValue: truncate(response.body, 100) };
  }

  // Response headers: "header.content-type"
  if (field.startsWith('header.')) {
    const headerName = field.slice(7).toLowerCase();
    const headerVal = Object.entries(response.headers).find(
      ([k]) => k.toLowerCase() === headerName
    )?.[1];
    return {
      value: headerVal ?? undefined,
      displayValue: headerVal ?? '(not present)',
    };
  }

  // JSONPath on body: "jsonpath:$.data.token"
  if (field.startsWith('jsonpath:')) {
    const expression = field.slice(9);
    try {
      const parsed = JSON.parse(response.body);
      const results = JSONPath({ path: expression, json: parsed, wrap: false });
      if (results === undefined || results === null) {
        return { value: undefined, displayValue: '(not found)' };
      }
      const display =
        typeof results === 'object' ? JSON.stringify(results) : String(results);
      return { value: results, displayValue: truncate(display, 100) };
    } catch {
      return { value: undefined, displayValue: '(invalid JSON or path)' };
    }
  }

  return { value: undefined, displayValue: '(unknown field)' };
}

/**
 * Evaluate a single operator against an actual value and expected value.
 */
function evaluateOperator(
  operator: AssertionOperator,
  actual: unknown,
  expected: string | null
): { passed: boolean; reason: string } {
  const actualStr = actual === undefined || actual === null ? '' : String(actual);

  switch (operator) {
    case 'equals':
      // Loose comparison: stringify both sides
      if (actualStr === (expected ?? '')) {
        return { passed: true, reason: '' };
      }
      return {
        passed: false,
        reason: `Expected "${expected}", got "${actualStr}"`,
      };

    case 'notEquals':
      if (actualStr !== (expected ?? '')) {
        return { passed: true, reason: '' };
      }
      return {
        passed: false,
        reason: `Expected NOT "${expected}", but got "${actualStr}"`,
      };

    case 'contains':
      if (actualStr.includes(expected ?? '')) {
        return { passed: true, reason: '' };
      }
      return {
        passed: false,
        reason: `Expected to contain "${expected}", got "${truncate(actualStr, 60)}"`,
      };

    case 'notContains':
      if (!actualStr.includes(expected ?? '')) {
        return { passed: true, reason: '' };
      }
      return {
        passed: false,
        reason: `Expected NOT to contain "${expected}"`,
      };

    case 'exists':
      if (actual !== undefined && actual !== null) {
        return { passed: true, reason: '' };
      }
      return { passed: false, reason: 'Expected field to exist, but it was not found' };

    case 'notExists':
      if (actual === undefined || actual === null) {
        return { passed: true, reason: '' };
      }
      return {
        passed: false,
        reason: `Expected field to not exist, but found "${truncate(actualStr, 60)}"`,
      };

    case 'matchesRegex': {
      try {
        const regex = new RegExp(expected ?? '');
        if (regex.test(actualStr)) {
          return { passed: true, reason: '' };
        }
        return {
          passed: false,
          reason: `"${truncate(actualStr, 40)}" did not match regex /${expected}/`,
        };
      } catch {
        return { passed: false, reason: `Invalid regex: ${expected}` };
      }
    }

    case 'lessThan': {
      const numActual = Number(actualStr);
      const numExpected = Number(expected);
      if (isNaN(numActual) || isNaN(numExpected)) {
        return { passed: false, reason: `Cannot compare non-numeric values` };
      }
      if (numActual < numExpected) {
        return { passed: true, reason: '' };
      }
      return {
        passed: false,
        reason: `Expected < ${numExpected}, got ${numActual}`,
      };
    }

    case 'greaterThan': {
      const numActual = Number(actualStr);
      const numExpected = Number(expected);
      if (isNaN(numActual) || isNaN(numExpected)) {
        return { passed: false, reason: `Cannot compare non-numeric values` };
      }
      if (numActual > numExpected) {
        return { passed: true, reason: '' };
      }
      return {
        passed: false,
        reason: `Expected > ${numExpected}, got ${numActual}`,
      };
    }

    case 'jsonPathEquals':
      // For jsonPathEquals, the field should already be a jsonpath: prefix.
      // This operator is a convenience alias — actual comparison is 'equals'.
      if (actualStr === (expected ?? '')) {
        return { passed: true, reason: '' };
      }
      return {
        passed: false,
        reason: `JSONPath value: expected "${expected}", got "${actualStr}"`,
      };

    default:
      return { passed: false, reason: `Unknown operator: ${operator}` };
  }
}

/**
 * Evaluate all assertions against a response.
 * This is the main entry point for the assertion engine.
 */
export function evaluateAssertions(
  response: ResponseTiming,
  assertions: AssertionRow[]
): AssertionSummary {
  const enabledAssertions = assertions.filter((a) => a.enabled);

  if (enabledAssertions.length === 0) {
    return {
      passed: true,
      total: 0,
      passedCount: 0,
      failedCount: 0,
      results: [],
      failures: [],
    };
  }

  const results: AssertionResult[] = [];
  const failures: string[] = [];

  for (const assertion of enabledAssertions) {
    const { value, displayValue } = extractFieldValue(response, assertion.field);
    const { passed, reason } = evaluateOperator(
      assertion.operator,
      value,
      assertion.expected_value
    );

    const fieldLabel = getFieldLabel(assertion.field);
    const message = passed
      ? `✓ ${fieldLabel} ${assertion.operator} ${assertion.expected_value ?? ''}`
      : `✗ ${fieldLabel}: ${reason}`;

    results.push({
      assertion,
      passed,
      actual_value: displayValue,
      message,
    });

    if (!passed) {
      failures.push(message);
    }
  }

  const passedCount = results.filter((r) => r.passed).length;

  return {
    passed: failures.length === 0,
    total: results.length,
    passedCount,
    failedCount: results.length - passedCount,
    results,
    failures,
  };
}

// ---- Helpers ----

function truncate(str: string, maxLen: number): string {
  if (str.length <= maxLen) return str;
  return str.slice(0, maxLen) + '…';
}

function getFieldLabel(field: string): string {
  if (field.startsWith('header.')) return `Header[${field.slice(7)}]`;
  if (field.startsWith('jsonpath:')) return `Body${field.slice(8)}`;
  switch (field) {
    case 'status': return 'Status';
    case 'totalTime': return 'Total Time';
    case 'ttfb': return 'TTFB';
    case 'size': return 'Size';
    case 'body': return 'Body';
    default: return field;
  }
}
