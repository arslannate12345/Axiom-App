import { Request, EnvironmentVariable } from '../types/database';
import { executeRequest } from './networkService';

export type SecurityAuditType = 'auth_strip' | 'http_downgrade' | 'sqli' | 'xss';

export interface SecurityResult {
  audit: SecurityAuditType;
  status: 'passed' | 'failed' | 'skipped' | 'error';
  message: string;
  details?: string;
}

const SQLI_PAYLOAD = "' OR 1=1 --";
const XSS_PAYLOAD = "<script>alert(1)</script>";

function injectValue(value: any, payload: string): any {
  if (typeof value === 'string') {
    return value + payload;
  }
  return value; // Keep non-strings as they are for this basic smoke test
}

function injectJson(obj: any, payload: string): any {
  if (typeof obj !== 'object' || obj === null) {
    return injectValue(obj, payload);
  }

  if (Array.isArray(obj)) {
    return obj.map(item => injectJson(item, payload));
  }

  const injectedObj: any = {};
  for (const key in obj) {
    injectedObj[key] = injectJson(obj[key], payload);
  }
  return injectedObj;
}

export async function runSecurityAudit(
  baseRequest: Request,
  variables: EnvironmentVariable[],
  audits: SecurityAuditType[],
  onProgress: (current: number, total: number, audit: string) => void
): Promise<SecurityResult[]> {
  
  const results: SecurityResult[] = [];
  const totalAudits = audits.length;

  for (let i = 0; i < audits.length; i++) {
    const audit = audits[i];
    onProgress(i + 1, totalAudits, audit);

    const testReq: Request = JSON.parse(JSON.stringify(baseRequest));

    try {
      switch (audit) {
        case 'auth_strip': {
          // Remove authentication headers
          const originalHeaderCount = testReq.headers.length;
          testReq.headers = testReq.headers.filter(
            h => !['authorization', 'x-api-key', 'bearer', 'token'].includes(h.key.toLowerCase())
          );
          
          if (testReq.headers.length === originalHeaderCount) {
            results.push({
              audit,
              status: 'skipped',
              message: 'No obvious auth headers found to strip.',
            });
            break;
          }

          const res = await executeRequest(testReq, variables);
          if (res.status === 401 || res.status === 403) {
            results.push({
              audit,
              status: 'passed',
              message: 'Server correctly rejected unauthenticated request.',
              details: `Status: ${res.status}`,
            });
          } else if (res.status >= 200 && res.status < 300) {
            results.push({
              audit,
              status: 'failed',
              message: 'VULNERABILITY: Server accepted request without auth headers!',
              details: `Status: ${res.status}`,
            });
          } else {
            results.push({
              audit,
              status: 'passed',
              message: `Server rejected request with status ${res.status}`,
            });
          }
          break;
        }

        case 'http_downgrade': {
          if (!testReq.url.toLowerCase().startsWith('https://')) {
            results.push({
              audit,
              status: 'skipped',
              message: 'URL is already HTTP or does not use HTTPS.',
            });
            break;
          }
          
          testReq.url = testReq.url.replace(/^https/i, 'http');
          try {
            const res = await executeRequest(testReq, variables);
            if (res.status >= 300 && res.status < 400) {
              results.push({
                audit,
                status: 'passed',
                message: 'Server correctly redirected to HTTPS.',
              });
            } else if (res.status >= 200 && res.status < 300) {
              results.push({
                audit,
                status: 'failed',
                message: 'VULNERABILITY: Server accepted plain HTTP traffic.',
                details: `Status: ${res.status}`,
              });
            } else {
               results.push({
                audit,
                status: 'passed',
                message: `Server rejected HTTP request (Status: ${res.status})`,
              });
            }
          } catch (e: any) {
            results.push({
              audit,
              status: 'passed',
              message: 'Connection dropped for HTTP request.',
            });
          }
          break;
        }

        case 'sqli': {
          if (testReq.body_type === 'json' && testReq.body) {
            try {
              const bodyObj = JSON.parse(testReq.body);
              testReq.body = JSON.stringify(injectJson(bodyObj, SQLI_PAYLOAD));
            } catch (e) {}
          }
          testReq.query_params = testReq.query_params.map(p => ({
            ...p,
            value: injectValue(p.value, SQLI_PAYLOAD)
          }));

          const res = await executeRequest(testReq, variables);
          const bodyStr = res.body.toLowerCase();
          
          if (res.status === 500 || bodyStr.includes('sql') || bodyStr.includes('syntax')) {
            results.push({
              audit,
              status: 'failed',
              message: 'VULNERABILITY: Possible SQL Injection detected. Server threw 500 or leaked SQL syntax.',
              details: `Status: ${res.status}`,
            });
          } else {
            results.push({
              audit,
              status: 'passed',
              message: 'Server handled SQLi payload safely.',
            });
          }
          break;
        }

        case 'xss': {
          if (testReq.body_type === 'json' && testReq.body) {
            try {
              const bodyObj = JSON.parse(testReq.body);
              testReq.body = JSON.stringify(injectJson(bodyObj, XSS_PAYLOAD));
            } catch (e) {}
          }
          testReq.query_params = testReq.query_params.map(p => ({
            ...p,
            value: injectValue(p.value, XSS_PAYLOAD)
          }));

          const res = await executeRequest(testReq, variables);
          const bodyStr = res.body.toLowerCase();
          
          if (res.status === 500) {
            results.push({
              audit,
              status: 'failed',
              message: 'VULNERABILITY: Server crashed on XSS payload.',
              details: `Status: 500`,
            });
          } else if (bodyStr.includes('<script>')) {
            results.push({
              audit,
              status: 'failed',
              message: 'VULNERABILITY: Server reflected XSS payload without sanitization!',
              details: `Status: ${res.status}`,
            });
          } else {
            results.push({
              audit,
              status: 'passed',
              message: 'Server handled XSS payload safely.',
            });
          }
          break;
        }
      }
    } catch (err: any) {
      results.push({
        audit,
        status: 'error',
        message: 'Network error or timeout during audit.',
        details: err.message,
      });
    }
  }

  return results;
}
