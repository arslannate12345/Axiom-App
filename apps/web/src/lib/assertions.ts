export type AssertionType = 'status' | 'body' | 'header' | 'jsonPath' | 'responseTime';

export type AssertionOperator = 'equals' | 'notEquals' | 'contains' | 'notContains' | 'exists' | 'lessThan' | 'greaterThan';

export interface Assertion {
  id: string;
  type: AssertionType;
  target: string;
  operator: AssertionOperator;
  expected: string;
  enabled: boolean;
  result?: boolean;
  actual?: string;
  error?: string;
}

let assertionCounter = 0;
export function createAssertionId(): string {
  assertionCounter += 1;
  return `asrt_${Date.now()}_${assertionCounter}`;
}

const OPERATOR_LABELS: Record<AssertionOperator, string> = {
  equals: '=',
  notEquals: '≠',
  contains: 'contains',
  notContains: '!contains',
  exists: 'exists',
  lessThan: '<',
  greaterThan: '>',
};

export function getOperatorLabel(op: AssertionOperator): string {
  return OPERATOR_LABELS[op];
}

type AssertionResult = { result: boolean; actual: string; error?: string };

export function runAssertion(
  assertion: Assertion,
  response: { status: number; statusText: string; headers: Record<string, string>; body: string; size: number; ttfb: number; totalTime: number } | null,
): AssertionResult {
  if (!response) {
    return { result: false, actual: '', error: 'No response' };
  }

  try {
    switch (assertion.type) {
      case 'status': {
        const actual = String(response.status);
        if (assertion.operator === 'equals') return { result: actual === assertion.expected, actual };
        if (assertion.operator === 'notEquals') return { result: actual !== assertion.expected, actual };
        return { result: false, actual, error: `Unsupported operator: ${assertion.operator}` };
      }

      case 'body': {
        const body = response.body;
        if (assertion.operator === 'contains') return { result: body.includes(assertion.expected), actual: body.slice(0, 200) };
        if (assertion.operator === 'notContains') return { result: !body.includes(assertion.expected), actual: body.slice(0, 200) };
        if (assertion.operator === 'equals') return { result: body.trim() === assertion.expected.trim(), actual: body.slice(0, 200) };
        return { result: false, actual: '', error: `Unsupported operator: ${assertion.operator}` };
      }

      case 'header': {
        const headerName = assertion.target.toLowerCase();
        const headerValue = Object.entries(response.headers).find(
          ([k]) => k.toLowerCase() === headerName,
        )?.[1];
        const actual = headerValue ?? '(not set)';
        if (assertion.operator === 'exists') return { result: headerValue !== undefined, actual };
        if (assertion.operator === 'equals') return { result: headerValue === assertion.expected, actual };
        if (assertion.operator === 'contains') return { result: (headerValue ?? '').includes(assertion.expected), actual };
        return { result: false, actual, error: `Unsupported operator: ${assertion.operator}` };
      }

      case 'jsonPath': {
        let parsed: unknown;
        try { parsed = JSON.parse(response.body); } catch { return { result: false, actual: '', error: 'Invalid JSON response' }; }
        const value = resolveJsonPath(parsed, assertion.target);
        const actual = value === undefined ? '(not found)' : typeof value === 'string' ? value : JSON.stringify(value);
        if (assertion.operator === 'exists') return { result: value !== undefined, actual };
        if (assertion.operator === 'equals') return { result: String(value) === assertion.expected, actual };
        if (assertion.operator === 'notEquals') return { result: String(value) !== assertion.expected, actual };
        if (assertion.operator === 'contains') return { result: String(value).includes(assertion.expected), actual };
        if (assertion.operator === 'greaterThan') return { result: Number(value) > Number(assertion.expected), actual };
        if (assertion.operator === 'lessThan') return { result: Number(value) < Number(assertion.expected), actual };
        return { result: false, actual, error: `Unsupported operator: ${assertion.operator}` };
      }

      case 'responseTime': {
        const actual = String(response.totalTime);
        if (assertion.operator === 'lessThan') return { result: response.totalTime < Number(assertion.expected), actual: `${actual}ms` };
        if (assertion.operator === 'greaterThan') return { result: response.totalTime > Number(assertion.expected), actual: `${actual}ms` };
        return { result: false, actual: `${actual}ms`, error: `Unsupported operator: ${assertion.operator}` };
      }

      default:
        return { result: false, actual: '', error: 'Unknown assertion type' };
    }
  } catch (err) {
    return { result: false, actual: '', error: String(err) };
  }
}

function resolveJsonPath(obj: unknown, path: string): unknown {
  if (!path.startsWith('$')) return undefined;
  const segments = path
    .replace(/^\$\.?/, '')
    .split('.')
    .filter(Boolean);
  let current: unknown = obj;
  for (const seg of segments) {
    if (current === null || current === undefined) return undefined;
    const arrayMatch = seg.match(/^(\w+)\[(\d+)\]$/);
    if (arrayMatch) {
      current = (current as Record<string, unknown>)[arrayMatch[1]];
      if (Array.isArray(current)) current = current[Number(arrayMatch[2])];
    } else {
      current = (current as Record<string, unknown>)[seg];
    }
  }
  return current;
}

export function runAllAssertions(
  assertions: Assertion[],
  response: { status: number; statusText: string; headers: Record<string, string>; body: string; size: number; ttfb: number; totalTime: number } | null,
): Assertion[] {
  if (!response) return assertions.map((a) => ({ ...a, result: undefined, actual: undefined, error: undefined }));
  return assertions.map((a) => {
    if (!a.enabled) return { ...a, result: undefined, actual: undefined, error: undefined };
    const r = runAssertion(a, response);
    return { ...a, result: r.result, actual: r.actual, error: r.error };
  });
}
