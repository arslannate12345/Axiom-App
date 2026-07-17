import { Request, EnvironmentVariable } from '../types/database';
import { executeRequest } from './networkService';

export type MutationStrategy = 'null' | 'wrong_type' | 'oversized' | 'empty' | 'unicode' | 'missing';

export interface FuzzResult {
  strategy: MutationStrategy;
  passed: number; // e.g. 400 Bad Request
  failed: number; // e.g. 500 Internal Server Error
  timeout: number; // Did not respond
  total: number;
}

function mutateValue(value: any, strategy: MutationStrategy): any {
  switch (strategy) {
    case 'null':
      return null;
    case 'wrong_type':
      if (typeof value === 'string') return 12345;
      if (typeof value === 'number') return "not_a_number";
      if (typeof value === 'boolean') return "true";
      if (Array.isArray(value)) return { "expected_array": "got_object" };
      if (typeof value === 'object') return ["expected_object", "got_array"];
      return "wrong_type";
    case 'oversized':
      return 'A'.repeat(10000);
    case 'empty':
      if (typeof value === 'string') return "";
      if (Array.isArray(value)) return [];
      if (typeof value === 'object') return {};
      return "";
    case 'unicode':
      return "Z͑ͫ̓ͪ̂ͫ̽͏̴̙̤̞͉͚̯̞̠͍A̴̵̜̰͔ͫ͗͢Lͨͧͽ̶͈͝G̴̻͈͍͔̹̑͗̎̅͛́Ǫ̵̹̻̝̳͂̌̌͘!😈👉🏽👈🏽‮right-to-left";
    case 'missing':
      return undefined; // We'll filter this out later for objects
    default:
      return value;
  }
}

function mutateJson(obj: any, strategy: MutationStrategy): any {
  if (typeof obj !== 'object' || obj === null) {
    return mutateValue(obj, strategy);
  }

  if (Array.isArray(obj)) {
    return obj.map(item => mutateJson(item, strategy));
  }

  const mutatedObj: any = {};
  for (const key in obj) {
    // 50% chance to mutate a given field to avoid completely obliterating the object on every run
    if (Math.random() > 0.5) {
      const newVal = mutateJson(obj[key], strategy);
      if (newVal !== undefined) {
        mutatedObj[key] = newVal;
      }
    } else {
      mutatedObj[key] = obj[key];
    }
  }

  // If strategy is missing and object ends up empty, that's fine
  return mutatedObj;
}

export async function runFuzzTest(
  request: Request,
  variables: EnvironmentVariable[],
  strategies: MutationStrategy[],
  iterationsPerStrategy: number,
  onProgress: (strategy: MutationStrategy, current: number, total: number) => void
): Promise<FuzzResult[]> {
  
  const results: FuzzResult[] = [];

  for (const strategy of strategies) {
    let passed = 0;
    let failed = 0;
    let timeout = 0;

    for (let i = 0; i < iterationsPerStrategy; i++) {
      onProgress(strategy, i + 1, iterationsPerStrategy);

      // Deep copy request
      const mutatedRequest: Request = JSON.parse(JSON.stringify(request));

      // Mutate body if JSON
      if (mutatedRequest.body_type === 'json' && mutatedRequest.body) {
        try {
          const parsedBody = JSON.parse(mutatedRequest.body);
          const newBody = mutateJson(parsedBody, strategy);
          mutatedRequest.body = JSON.stringify(newBody);
        } catch (e) {
          // If body parsing fails, just mutate as a string
          mutatedRequest.body = mutateValue(mutatedRequest.body, strategy);
        }
      }

      // Mutate a random query param
      if (mutatedRequest.query_params.length > 0 && Math.random() > 0.5) {
        const targetIdx = Math.floor(Math.random() * mutatedRequest.query_params.length);
        mutatedRequest.query_params[targetIdx].value = mutateValue(mutatedRequest.query_params[targetIdx].value, strategy) || '';
      }

      try {
        const response = await executeRequest(mutatedRequest, variables);
        // A graceful rejection (4xx) is a pass for a fuzzer.
        // A server crash (5xx) is a fail.
        // 2xx means the server accepted the garbage data, which might be a failure of validation, but we'll count it as a "passed" request (it didn't crash).
        if (response.status >= 500) {
          failed++;
        } else {
          passed++;
        }
      } catch (err: any) {
        if (err.message?.toLowerCase().includes('timeout') || err.message?.toLowerCase().includes('network request failed')) {
          timeout++;
        } else {
          failed++;
        }
      }
    }

    results.push({
      strategy,
      passed,
      failed,
      timeout,
      total: iterationsPerStrategy
    });
  }

  return results;
}
