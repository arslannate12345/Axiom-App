import { NextResponse } from 'next/server';
import type { LoadAudit, LoadIterationMetric, LoadTestConfig } from '@axiom/core/types';

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  try {
    const body: LoadTestConfig = await request.json();
    let formattedUrl = body.url ? body.url.trim() : '';

    if (!formattedUrl) {
      return NextResponse.json({ error: 'Missing target URL parameter' }, { status: 400 });
    }

    if (!/^https?:\/\//i.test(formattedUrl)) {
      formattedUrl = `https://${formattedUrl}`;
    }

    const vu = Math.min(100, Math.max(1, body.virtualUsers || 10)); // Clamp VUs for serverless safety
    const method = body.method || 'GET';
    const totalSimulatedRequests = vu * 5; // Batch of 5 iterations per VU

    const iterations: LoadIterationMetric[] = [];
    const statusBreakdown: Record<string, number> = {};

    const startTime = Date.now();

    // Execute concurrent batch execution
    const promises: Promise<void>[] = [];
    for (let i = 0; i < totalSimulatedRequests; i++) {
      const iterNum = i + 1;
      const iterStart = Date.now();

      const p = (async () => {
        try {
          const controller = new AbortController();
          const timeoutId = setTimeout(() => controller.abort(), 6000);

          const res = await fetch(formattedUrl, {
            method,
            headers: {
              'User-Agent': 'Axiom-LoadTester/1.0',
            },
            signal: controller.signal,
          });
          clearTimeout(timeoutId);

          const latency = Date.now() - iterStart;
          const status = res.status;
          const success = res.ok || status < 400;

          statusBreakdown[status] = (statusBreakdown[status] || 0) + 1;
          iterations.push({
            iteration: iterNum,
            latencyMs: latency,
            statusCode: status,
            success,
            timestampMs: Date.now() - startTime,
          });
        } catch {
          const latency = Date.now() - iterStart;
          statusBreakdown['0'] = (statusBreakdown['0'] || 0) + 1;
          iterations.push({
            iteration: iterNum,
            latencyMs: latency,
            statusCode: 0,
            success: false,
            timestampMs: Date.now() - startTime,
          });
        }
      })();

      promises.push(p);
    }

    await Promise.all(promises);
    const totalDurationMs = Math.max(1, Date.now() - startTime);

    // Calculate metrics
    const sortedLatencies = iterations.map((it) => it.latencyMs).sort((a, b) => a - b);
    const getPercentile = (p: number) => {
      if (sortedLatencies.length === 0) return 0;
      const idx = Math.ceil((p / 100) * sortedLatencies.length) - 1;
      return sortedLatencies[Math.max(0, Math.min(idx, sortedLatencies.length - 1))];
    };

    const p50Ms = getPercentile(50);
    const p95Ms = getPercentile(95);
    const p99Ms = getPercentile(99);
    const minLatencyMs = sortedLatencies[0] || 0;
    const maxLatencyMs = sortedLatencies[sortedLatencies.length - 1] || 0;
    const sumLatency = sortedLatencies.reduce((acc, l) => acc + l, 0);
    const avgLatencyMs = sortedLatencies.length > 0 ? Math.round(sumLatency / sortedLatencies.length) : 0;

    const successfulRequests = iterations.filter((it) => it.success).length;
    const failedRequests = iterations.length - successfulRequests;
    const errorRatePercentage = Math.round((failedRequests / (iterations.length || 1)) * 100);
    const throughputRps = Math.round((iterations.length / (totalDurationMs / 1000)) * 10) / 10;

    // Calculate Resilience Score
    let score = 100;
    score -= errorRatePercentage * 1.5; // Error rate penalty
    if (p95Ms > 2000) score -= 30;
    else if (p95Ms > 1000) score -= 20;
    else if (p95Ms > 500) score -= 10;

    score = Math.max(0, Math.min(100, Math.round(score)));

    let grade: 'A+' | 'A' | 'B' | 'C' | 'D' | 'F' = 'F';
    if (score >= 95) grade = 'A+';
    else if (score >= 85) grade = 'A';
    else if (score >= 70) grade = 'B';
    else if (score >= 55) grade = 'C';
    else if (score >= 40) grade = 'D';

    const auditResult: LoadAudit = {
      id: `load-audit-${Date.now()}`,
      url: formattedUrl,
      score,
      grade,
      config: {
        url: formattedUrl,
        method,
        virtualUsers: vu,
        durationSeconds: body.durationSeconds || 10,
        strategy: body.strategy || 'constant',
      },
      summary: {
        p50Ms,
        p95Ms,
        p99Ms,
        avgLatencyMs,
        minLatencyMs,
        maxLatencyMs,
        throughputRps,
        errorRatePercentage,
        totalRequests: iterations.length,
        successfulRequests,
        failedRequests,
      },
      iterations,
      statusBreakdown,
      created_at: new Date().toISOString(),
    };

    return NextResponse.json(auditResult);
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Load test execution failed' }, { status: 500 });
  }
}
