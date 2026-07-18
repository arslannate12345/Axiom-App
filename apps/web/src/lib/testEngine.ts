import { executeRequest } from '@/lib/api';
import type { HttpMethod, BodyType, KeyValuePair, ResponseTiming } from '@/lib/api';
import type { RequestRecord } from '@/lib/supabase-service';

function toNumber(v: unknown, fallback: number): number {
  const n = Number(v);
  return Number.isFinite(n) ? n : fallback;
}

function toRequestConfig(req: RequestRecord, overrides?: { method?: HttpMethod; url?: string; headers?: KeyValuePair[]; queryParams?: KeyValuePair[]; body?: string; bodyType?: BodyType }) {
  return {
    method: (overrides?.method ?? (req.method as HttpMethod)),
    url: overrides?.url ?? req.url,
    headers: overrides?.headers ?? req.headers ?? [],
    queryParams: overrides?.queryParams ?? (req.query_params ?? []),
    bodyType: (overrides?.bodyType ?? (req.body_type as BodyType) ?? 'none'),
    body: overrides?.body ?? req.body ?? '',
  };
}

// ─── Percentile ───────────────────────────────────────────

function percentile(sorted: number[], p: number): number {
  if (sorted.length === 0) return 0;
  const idx = Math.ceil((p / 100) * sorted.length) - 1;
  return sorted[Math.max(0, Math.min(idx, sorted.length - 1))];
}

// ─── Benchmarks Engine ─────────────────────────────────────

export interface BenchmarkIteration {
  iteration: number;
  latency: number;
  status: number;
  size: number;
}

export interface BenchmarkStats {
  p50: number;
  p95: number;
  p99: number;
  avgLatency: number;
  minLatency: number;
  maxLatency: number;
  throughput: number;
  successRate: number;
  totalTime: number;
}

export interface BenchmarkResult {
  stats: BenchmarkStats;
  iterations: BenchmarkIteration[];
  chartData: number[];
  chartLabels: string[];
}

export async function runBenchmark(
  req: RequestRecord,
  config: { iterations: number; concurrency: number },
): Promise<BenchmarkResult> {
  const allIterations: BenchmarkIteration[] = [];
  const startTime = performance.now();
  let batchIndex = 0;

  const batchSize = Math.min(config.concurrency, config.iterations);

  for (let i = 0; i < config.iterations; i += batchSize) {
    const batch = Math.min(batchSize, config.iterations - i);
    const promises: Promise<number>[] = [];

    for (let j = 0; j < batch; j++) {
      const iterNum = i + j + 1;
      const iterStart = performance.now();
      promises.push(
        executeRequest(toRequestConfig(req), {}, new AbortController().signal, 15000)
          .then((r) => {
            allIterations.push({
              iteration: iterNum,
              latency: Math.round(performance.now() - iterStart),
              status: r.status,
              size: r.size,
            });
            return r.totalTime;
          })
          .catch(() => {
            allIterations.push({
              iteration: iterNum,
              latency: Math.round(performance.now() - iterStart),
              status: 0,
              size: 0,
            });
            return 0;
          }),
      );
    }

    await Promise.allSettled(promises);
    batchIndex++;
  }

  const totalTime = Math.round(performance.now() - startTime);
  const latencies = allIterations.map((i) => i.latency).sort((a, b) => a - b);
  const successes = allIterations.filter((i) => i.status > 0 && i.status < 500);

  const stats: BenchmarkStats = {
    p50: percentile(latencies, 50),
    p95: percentile(latencies, 95),
    p99: percentile(latencies, 99),
    avgLatency: latencies.length > 0 ? Math.round(latencies.reduce((s, v) => s + v, 0) / latencies.length) : 0,
    minLatency: latencies.length > 0 ? latencies[0] : 0,
    maxLatency: latencies.length > 0 ? latencies[latencies.length - 1] : 0,
    throughput: totalTime > 0 ? Math.round((successes.length / (totalTime / 1000)) * 100) / 100 : 0,
    successRate: allIterations.length > 0 ? Math.round((successes.length / allIterations.length) * 100) : 0,
    totalTime,
  };

  const chartData = allIterations.map((i) => i.latency);
  const chartLabels = allIterations.map((_, idx) => `#${idx + 1}`);

  return { stats, iterations: allIterations, chartData, chartLabels };
}

// ─── Security Scanner ──────────────────────────────────────

export interface SecurityCheck {
  id: string;
  label: string;
  status: 'pass' | 'fail' | 'warning';
  detail: string;
  critical?: boolean;
}

export interface SecurityResult {
  checks: SecurityCheck[];
  totalChecks: number;
  vulnerabilities: number;
  warnings: number;
  healthScore: number;
}

export async function runSecurityScan(
  req: RequestRecord,
  _config: { depth: string; toggles: string[] },
): Promise<SecurityResult> {
  const checks: SecurityCheck[] = [];

  const isHttps = req.url.toLowerCase().startsWith('https://');
  checks.push({
    id: 'https',
    label: 'HTTPS Enforced',
    status: isHttps ? 'pass' : 'fail',
    detail: isHttps
      ? `Endpoint uses HTTPS. TLS encryption is enforced for all traffic.`
      : `CRITICAL: Endpoint is using HTTP (unencrypted). All sensitive data is transmitted in plaintext.`,
    critical: !isHttps,
  });

  try {
    const resp = await executeRequest(toRequestConfig(req), {}, new AbortController().signal, 15000);

    const hsts = resp.headers['strict-transport-security'];
    checks.push({
      id: 'hsts',
      label: 'HSTS Header',
      status: hsts ? 'pass' : 'warning',
      detail: hsts
        ? `HSTS header present: ${hsts}`
        : `HSTS header is missing. This allows downgrade attacks.`,
    });

    const server = resp.headers['server'];
    checks.push({
      id: 'server-header',
      label: 'Server Version Disclosure',
      status: server ? 'warning' : 'pass',
      detail: server
        ? `Server header reveals: "${server}". This aids attackers in targeting version-specific vulnerabilities.`
        : `No Server header exposed. Server technology is not disclosed.`,
    });

    const poweredBy = resp.headers['x-powered-by'];
    checks.push({
      id: 'powered-by',
      label: 'Technology Stack Disclosure',
      status: poweredBy ? 'warning' : 'pass',
      detail: poweredBy
        ? `X-Powered-By header reveals: "${poweredBy}". Provides unnecessary information to attackers.`
        : `No X-Powered-By header. Technology stack not disclosed.`,
    });

    const csp = resp.headers['content-security-policy'];
    checks.push({
      id: 'csp',
      label: 'Content Security Policy',
      status: csp ? 'pass' : 'warning',
      detail: csp
        ? `CSP header present: ${csp.slice(0, 100)}...`
        : `No Content-Security-Policy header. Site vulnerable to XSS and data injection attacks.`,
    });

    const corsOrigin = resp.headers['access-control-allow-origin'];
    const corsCredentials = resp.headers['access-control-allow-credentials'];
    if (corsOrigin === '*') {
      checks.push({
        id: 'cors',
        label: 'CORS Policy',
        status: corsCredentials === 'true' ? 'fail' : 'warning',
        detail: corsCredentials === 'true'
          ? `CRITICAL: CORS set to wildcard (*) with credentials enabled. Any website can make authenticated requests.`
          : `CORS allows any origin (*). Consider restricting to trusted domains.`,
        critical: corsCredentials === 'true',
      });
    } else if (corsOrigin) {
      checks.push({
        id: 'cors',
        label: 'CORS Policy',
        status: 'pass',
        detail: `CORS restricted to: ${corsOrigin}`,
      });
    } else {
      checks.push({
        id: 'cors',
        label: 'CORS Policy',
        status: 'pass',
        detail: `No CORS headers set. Cross-origin requests are blocked by default.`,
      });
    }

    const xframe = resp.headers['x-frame-options'];
    checks.push({
      id: 'xframe',
      label: 'Clickjacking Protection',
      status: xframe ? 'pass' : 'warning',
      detail: xframe
        ? `X-Frame-Options: ${xframe}. Clickjacking protection is active.`
        : `No X-Frame-Options header. Site may be vulnerable to clickjacking.`,
    });

    const xContentType = resp.headers['x-content-type-options'];
    checks.push({
      id: 'content-type',
      label: 'MIME Sniffing Protection',
      status: xContentType === 'nosniff' ? 'pass' : 'warning',
      detail: xContentType === 'nosniff'
        ? `X-Content-Type-Options: nosniff. MIME type sniffing is prevented.`
        : `X-Content-Type-Options not set to 'nosniff'. MIME confusion attacks possible.`,
    });

    if (resp.status === 401 || resp.status === 403) {
      checks.push({
        id: 'auth',
        label: 'Authentication Required',
        status: 'pass',
        detail: `Endpoint returned ${resp.status}. Authentication is enforced.`,
      });
    } else {
      checks.push({
        id: 'auth',
        label: 'Public Endpoint Access',
        status: 'pass',
        detail: `Endpoint returned ${resp.status}. This endpoint appears publicly accessible (expected for this resource).`,
      });
    }

    const rateLimit = resp.headers['x-ratelimit-limit'] || resp.headers['ratelimit-limit'];
    checks.push({
      id: 'rate-limit',
      label: 'Rate Limiting',
      status: rateLimit ? 'pass' : 'warning',
      detail: rateLimit
        ? `Rate limit header present: ${rateLimit}`
        : `No rate limiting headers detected. Endpoint may be vulnerable to brute force or DDoS.`,
    });
  } catch (err) {
    const msg = (err as Error).message;
    checks.push({
      id: 'connectivity',
      label: 'Endpoint Reachable',
      status: 'fail',
      detail: `Could not reach endpoint: ${msg}. Verify the URL is correct and the server is running.`,
      critical: true,
    });
  }

  const vulns = checks.filter((c) => c.status === 'fail').length;
  const warns = checks.filter((c) => c.status === 'warning').length;
  const health = Math.max(0, 100 - vulns * 20 - warns * 8);

  return {
    checks,
    totalChecks: checks.length,
    vulnerabilities: vulns,
    warnings: warns,
    healthScore: health,
  };
}

// ─── Fuzz Engine ──────────────────────────────────────────

export interface FuzzStrategy {
  id: string;
  label: string;
}

export interface FuzzResult {
  strategy: string;
  safe: number;
  crash: number;
  timeout: number;
  total: number;
}

export const FUZZ_STRATEGIES: FuzzStrategy[] = [
  { id: 'null', label: 'Null Values' },
  { id: 'wrong_type', label: 'Wrong Type' },
  { id: 'oversized', label: 'Oversized' },
  { id: 'empty', label: 'Empty Values' },
  { id: 'unicode', label: 'Unicode / Emoji' },
  { id: 'missing', label: 'Missing Params' },
];

function mutateRequest(
  req: RequestRecord,
  strategy: string,
): Partial<{ method: HttpMethod; url: string; headers: KeyValuePair[]; queryParams: KeyValuePair[]; body: string; bodyType: BodyType }> {
  switch (strategy) {
    case 'null':
      return { body: '', queryParams: req.query_params?.map((p) => ({ ...p, value: '' })) ?? [] };
    case 'wrong_type':
      return { body: JSON.stringify(true), queryParams: req.query_params?.map((p) => ({ ...p, value: '999' })) ?? [] };
    case 'oversized':
      return { body: 'x'.repeat(100000) };
    case 'empty':
      return { body: '{}', headers: (req.headers ?? []).filter((h) => h.key.toLowerCase() !== 'content-type').concat({ key: 'Content-Type', value: 'application/json', enabled: true }), queryParams: [] };
    case 'unicode':
      return { body: JSON.stringify({ test: '\uD83D\uDE00 \u2764\uFE0F \u00F1 \u041F \u4E16' }), queryParams: [{ key: 'emoji', value: '\uD83D\uDE00', enabled: true }] };
    case 'missing':
      return { body: '', headers: [], queryParams: [] };
    default:
      return {};
  }
}

export async function runFuzzTest(
  req: RequestRecord,
  config: { strategies: string[]; iterations: number },
): Promise<FuzzResult[]> {
  const results: FuzzResult[] = [];

  for (const strategy of config.strategies) {
    let safe = 0;
    let crash = 0;
    let timeout = 0;
    const mutations = mutateRequest(req, strategy);

    for (let i = 0; i < config.iterations; i++) {
      try {
        const resp = await executeRequest(
          toRequestConfig(req, mutations),
          {},
          new AbortController().signal,
          8000,
        );
        if (resp.status >= 500) {
          crash++;
        } else {
          safe++;
        }
      } catch (err) {
        const msg = (err as Error).message;
        if (msg.toLowerCase().includes('timeout')) {
          timeout++;
        } else {
          crash++;
        }
      }
    }

    const label = FUZZ_STRATEGIES.find((s) => s.id === strategy)?.label ?? strategy;
    results.push({
      strategy: label,
      safe,
      crash,
      timeout,
      total: config.iterations,
    });
  }

  return results;
}

// ─── Chaos Engine ──────────────────────────────────────────

export interface ChaosIteration {
  iteration: number;
  status: 'passed' | 'dropped' | 'failed';
  injectedLatencyMs: number;
  responseStatus?: number;
  totalTimeMs?: number;
}

export async function runChaosTest(
  req: RequestRecord,
  config: { iterations: number; minLatencyMs: number; maxLatencyMs: number; dropProbability: number },
): Promise<ChaosIteration[]> {
  const results: ChaosIteration[] = [];

  for (let i = 0; i < config.iterations; i++) {
    const injectedLatency = Math.floor(
      Math.random() * (config.maxLatencyMs - config.minLatencyMs + 1) + config.minLatencyMs,
    );
    const shouldDrop = Math.random() * 100 < config.dropProbability;

    if (shouldDrop) {
      results.push({
        iteration: i + 1,
        status: 'dropped',
        injectedLatencyMs: injectedLatency,
      });
      continue;
    }

    const start = performance.now();
    try {
      await new Promise((r) => setTimeout(r, injectedLatency));
      const resp = await executeRequest(
        toRequestConfig(req),
        {},
        new AbortController().signal,
        15000,
      );
      const total = Math.round(performance.now() - start);
      results.push({
        iteration: i + 1,
        status: resp.status >= 500 ? 'failed' : 'passed',
        injectedLatencyMs: injectedLatency,
        responseStatus: resp.status,
        totalTimeMs: total,
      });
    } catch {
      results.push({
        iteration: i + 1,
        status: 'failed',
        injectedLatencyMs: injectedLatency,
        totalTimeMs: Math.round(performance.now() - start),
      });
    }
  }

  return results;
}

// ─── Idempotency Engine ────────────────────────────────────

export interface DiffItem {
  kind: 'A' | 'E' | 'D';
  path: string[];
  lhs?: unknown;
  rhs?: unknown;
}

export interface IdempotencyResult {
  isIdempotent: boolean;
  status1: number;
  status2: number;
  latency1: number;
  latency2: number;
  body1: string;
  body2: string;
  diffs: DiffItem[];
}

function deepDiff(
  a: unknown,
  b: unknown,
  path: string[] = [],
): DiffItem[] {
  if (a === b) return [];
  if (a === null || b === null || a === undefined || b === undefined) {
    return [{ kind: 'E', path, lhs: a, rhs: b }];
  }
  if (typeof a !== typeof b) return [{ kind: 'E', path, lhs: a, rhs: b }];

  if (Array.isArray(a) && Array.isArray(b)) {
    const diffs: DiffItem[] = [];
    const maxLen = Math.max(a.length, b.length);
    for (let i = 0; i < maxLen; i++) {
      if (i >= a.length) {
        diffs.push({ kind: 'A', path: [...path, String(i)], rhs: b[i] });
      } else if (i >= b.length) {
        diffs.push({ kind: 'D', path: [...path, String(i)], lhs: a[i] });
      } else {
        diffs.push(...deepDiff(a[i], b[i], [...path, String(i)]));
      }
    }
    return diffs;
  }

  if (typeof a === 'object' && typeof b === 'object' && a !== null && b !== null) {
    const diffs: DiffItem[] = [];
    const keysA = Object.keys(a as Record<string, unknown>);
    const keysB = Object.keys(b as Record<string, unknown>);
    const allKeys = new Set([...keysA, ...keysB]);
    for (const key of allKeys) {
      if (!(key in (a as object))) {
        diffs.push({ kind: 'A', path: [...path, key], rhs: (b as Record<string, unknown>)[key] });
      } else if (!(key in (b as object))) {
        diffs.push({ kind: 'D', path: [...path, key], lhs: (a as Record<string, unknown>)[key] });
      } else {
        diffs.push(...deepDiff((a as Record<string, unknown>)[key], (b as Record<string, unknown>)[key], [...path, key]));
      }
    }
    return diffs;
  }

  return [{ kind: 'E', path, lhs: a, rhs: b }];
}

export async function runIdempotencyTest(
  req: RequestRecord,
  mode: 'sequential' | 'parallel',
): Promise<IdempotencyResult> {
  const cfg = toRequestConfig(req);

  let res1: ResponseTiming;
  let res2: ResponseTiming;
  let latency1: number;
  let latency2: number;

  if (mode === 'parallel') {
    const start1 = performance.now();
    const start2 = performance.now();
    const [r1, r2] = await Promise.all([
      executeRequest(cfg, {}, new AbortController().signal, 15000),
      executeRequest(cfg, {}, new AbortController().signal, 15000),
    ]);
    res1 = r1;
    res2 = r2;
    latency1 = Math.round(performance.now() - start1);
    latency2 = Math.round(performance.now() - start2);
  } else {
    const start1 = performance.now();
    res1 = await executeRequest(cfg, {}, new AbortController().signal, 15000);
    latency1 = Math.round(performance.now() - start1);
    const start2 = performance.now();
    res2 = await executeRequest(cfg, {}, new AbortController().signal, 15000);
    latency2 = Math.round(performance.now() - start2);
  }

  const isIdempotent = res1.status === res2.status && res1.body === res2.body;

  let diffs: DiffItem[] = [];
  try {
    const json1 = JSON.parse(res1.body);
    const json2 = JSON.parse(res2.body);
    diffs = deepDiff(json1, json2);
  } catch {
    if (res1.body !== res2.body) {
      diffs = [{ kind: 'E', path: [], lhs: res1.body.slice(0, 100), rhs: res2.body.slice(0, 100) }];
    }
  }

  return {
    isIdempotent,
    status1: res1.status,
    status2: res2.status,
    latency1,
    latency2,
    body1: res1.body.slice(0, 200),
    body2: res2.body.slice(0, 200),
    diffs: diffs.slice(0, 20),
  };
}

// ─── Regression Engine ─────────────────────────────────────

export interface RegressionDiff {
  path: string;
  kind: string;
  lhs?: string;
  rhs?: string;
}

export async function runRegressionTest(
  req: RequestRecord,
  baseline: { body: string; status: number } | null,
): Promise<{ diffs: RegressionDiff[] }> {
  const resp = await executeRequest(toRequestConfig(req), {}, new AbortController().signal, 15000);

  if (!baseline) {
    return { diffs: [] };
  }

  const diffs: RegressionDiff[] = [];

  if (resp.status !== baseline.status) {
    diffs.push({ path: 'status', kind: 'changed', lhs: String(baseline.status), rhs: String(resp.status) });
  }

  try {
    const current = JSON.parse(resp.body);
    const saved = JSON.parse(baseline.body);
    const raw = deepDiff(saved, current);
    for (const d of raw.slice(0, 15)) {
      diffs.push({
        path: d.path.join('.') || '(root)',
        kind: d.kind === 'A' ? 'added' : d.kind === 'D' ? 'removed' : 'changed',
        lhs: d.lhs !== undefined ? String(d.lhs).slice(0, 80) : undefined,
        rhs: d.rhs !== undefined ? String(d.rhs).slice(0, 80) : undefined,
      });
    }
  } catch {
    if (resp.body !== baseline.body) {
      diffs.push({ path: '(body)', kind: 'changed', lhs: baseline.body.slice(0, 80), rhs: resp.body.slice(0, 80) });
    }
  }

  return { diffs };
}
