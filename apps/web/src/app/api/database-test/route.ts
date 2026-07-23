import { NextResponse } from 'next/server';
import type {
  DatabaseAudit,
  DatabaseTestFinding,
  DatabaseEndpointCheck,
  DatabaseTestSeverity,
} from '@axiom/core/types';

export const dynamic = 'force-dynamic';

const HEALTH_ENDPOINTS = ['/health', '/api/health', '/status', '/api/status', '/db-health'];

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const targetUrlStr = searchParams.get('url');

  if (!targetUrlStr) {
    return NextResponse.json({ error: 'Missing target URL parameter' }, { status: 400 });
  }

  let formattedUrl = targetUrlStr.trim();
  if (!/^https?:\/\//i.test(formattedUrl)) {
    formattedUrl = `https://${formattedUrl}`;
  }

  try {
    const urlObj = new URL(formattedUrl);
    const origin = urlObj.origin;

    const findings: DatabaseTestFinding[] = [];
    const endpointChecks: DatabaseEndpointCheck[] = [];

    // 1. Connection & Primary Endpoint Latency
    const startTime = Date.now();
    let rootResponse: Response | null = null;
    let rootLatency = 0;
    let rootReachable = false;

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 8000);

      rootResponse = await fetch(formattedUrl, {
        method: 'GET',
        headers: { 'User-Agent': 'Axiom-Database-Tester/1.0', 'Accept': 'application/json, text/plain, */*' },
        signal: controller.signal,
      });
      clearTimeout(timeoutId);

      rootLatency = Date.now() - startTime;
      rootReachable = rootResponse.ok || rootResponse.status < 500;
    } catch (err: any) {
      rootLatency = Date.now() - startTime;
    }

    endpointChecks.push({
      endpoint: formattedUrl,
      method: 'GET',
      status: rootResponse ? rootResponse.status : 0,
      latencyMs: rootLatency,
      passed: rootReachable,
      notes: rootReachable ? `Primary target responded in ${rootLatency}ms` : 'Primary target unreachable or timed out',
    });

    if (!rootReachable) {
      findings.push({
        id: 'db-conn-fail',
        category: 'connection',
        title: 'Primary Target Connection Failed',
        severity: 'critical',
        status: 'fail',
        description: 'Unable to reach the target URL or received a server failure response.',
        impact: 'Database-backed services behind this endpoint cannot be verified.',
        latencyMs: rootLatency,
        recommendation: 'Ensure the endpoint URL is active and accessible from the public internet.',
      });
    } else {
      findings.push({
        id: 'db-conn-pass',
        category: 'connection',
        title: 'Target Connection Established',
        severity: 'info',
        status: 'pass',
        description: `Successfully reached target endpoint in ${rootLatency}ms.`,
        impact: 'Connection to target service verified.',
        latencyMs: rootLatency,
      });

      // Latency evaluation
      if (rootLatency > 1500) {
        findings.push({
          id: 'db-latency-high',
          category: 'performance',
          title: 'High Response Latency Detected',
          severity: 'high',
          status: 'warn',
          description: `Target response time was ${rootLatency}ms, exceeding the 1500ms recommended threshold.`,
          impact: 'Slow DB queries or lack of connection pooling can degrade user experience.',
          latencyMs: rootLatency,
          recommendation: 'Implement DB connection pooling, add indexing, or cache frequent query results.',
        });
      } else if (rootLatency > 600) {
        findings.push({
          id: 'db-latency-mod',
          category: 'performance',
          title: 'Moderate Response Latency',
          severity: 'medium',
          status: 'pass',
          description: `Target response time was ${rootLatency}ms.`,
          impact: 'Acceptable speed, though room for optimization exists.',
          latencyMs: rootLatency,
        });
      } else {
        findings.push({
          id: 'db-latency-opt',
          category: 'performance',
          title: 'Optimal Latency Performance',
          severity: 'info',
          status: 'pass',
          description: `Sub-600ms latency observed (${rootLatency}ms). Database responsiveness is excellent.`,
          impact: 'Fast database response delivery.',
          latencyMs: rootLatency,
        });
      }
    }

    // 2. Health Check Probing
    let healthFound = false;
    for (const ep of HEALTH_ENDPOINTS) {
      const probeUrl = `${origin}${ep}`;
      const epStart = Date.now();
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 4000);
        const res = await fetch(probeUrl, {
          method: 'GET',
          headers: { 'Accept': 'application/json' },
          signal: controller.signal,
        });
        clearTimeout(timeoutId);
        const epLatency = Date.now() - epStart;

        if (res.ok) {
          healthFound = true;
          endpointChecks.push({
            endpoint: ep,
            method: 'GET',
            status: res.status,
            latencyMs: epLatency,
            passed: true,
            notes: 'Exposes dedicated health endpoint',
          });
        }
      } catch {
        // Probe failed silently
      }
    }

    if (healthFound) {
      findings.push({
        id: 'db-health-ep',
        category: 'connection',
        title: 'Dedicated Database/Service Health Endpoint Available',
        severity: 'info',
        status: 'pass',
        description: 'Target exposes standard health check routes for monitoring DB pool readiness.',
        impact: 'Facilitates automated uptime and database connectivity monitoring.',
      });
    } else {
      findings.push({
        id: 'db-no-health-ep',
        category: 'connection',
        title: 'No Dedicated Health Check Endpoint Discovered',
        severity: 'low',
        status: 'warn',
        description: 'Standard health routes (/health, /api/health, /status) did not return 200 OK.',
        impact: 'Harder to monitor database status independently of application logic.',
        recommendation: 'Expose a lightweight /health endpoint that checks DB read/write readiness.',
      });
    }

    // 3. Response Schema & JSON Validation
    if (rootResponse && rootResponse.headers.get('content-type')?.includes('application/json')) {
      try {
        const text = await rootResponse.clone().text();
        const json = JSON.parse(text);
        
        findings.push({
          id: 'db-schema-valid',
          category: 'schema',
          title: 'Structured JSON Payload Verified',
          severity: 'info',
          status: 'pass',
          description: 'API returned valid JSON formatting, facilitating schema assertion testing.',
          impact: 'Data payload is machine-readable.',
        });

        // Check for null or missing key fields
        if (Array.isArray(json) && json.length === 0) {
          findings.push({
            id: 'db-schema-empty',
            category: 'integrity',
            title: 'Empty Dataset Returned',
            severity: 'low',
            status: 'warn',
            description: 'Response array contained 0 records.',
            impact: 'Ensure database seeding or query filters are behaving as expected.',
          });
        } else if (typeof json === 'object' && json !== null) {
          const keys = Object.keys(json);
          if (keys.some(k => k.toLowerCase().includes('error') || k.toLowerCase().includes('exception'))) {
            findings.push({
              id: 'db-schema-err-field',
              category: 'integrity',
              title: 'Database/Application Error Keys Present in Payload',
              severity: 'high',
              status: 'fail',
              description: 'Response payload contains explicit error or exception keys.',
              impact: 'Potential runtime query or data retrieval exception.',
              recommendation: 'Check database query logs for execution failures.',
            });
          }
        }
      } catch {
        findings.push({
          id: 'db-schema-invalid',
          category: 'schema',
          title: 'Malformed JSON Content Type',
          severity: 'medium',
          status: 'fail',
          description: 'Content-Type specified JSON but body parsing failed.',
          impact: 'Clients expecting JSON will fail to parse database output.',
        });
      }
    } else if (rootResponse) {
      findings.push({
        id: 'db-schema-non-json',
        category: 'schema',
        title: 'Non-JSON Content Type',
        severity: 'low',
        status: 'warn',
        description: `Response Content-Type is '${rootResponse.headers.get('content-type') || 'unknown'}'.`,
        impact: 'Structured database schema validation requires JSON endpoints.',
      });
    }

    // 4. Rate Limiting & Headers
    if (rootResponse) {
      const hasRateLimit = rootResponse.headers.has('x-ratelimit-limit') || 
                           rootResponse.headers.has('ratelimit-limit') || 
                           rootResponse.headers.has('retry-after');
      if (hasRateLimit) {
        findings.push({
          id: 'db-sec-ratelimit',
          category: 'security',
          title: 'Rate Limiting Headers Active',
          severity: 'info',
          status: 'pass',
          description: 'Rate limiting headers present on target endpoint.',
          impact: 'Protects database behind endpoint from connection pool exhaustion attacks.',
        });
      } else {
        findings.push({
          id: 'db-sec-no-ratelimit',
          category: 'security',
          title: 'No Rate Limiting Headers Detected',
          severity: 'medium',
          status: 'warn',
          description: 'No rate limiting headers found on target endpoint.',
          impact: 'Database connection pool may be vulnerable to denial of service or heavy query loops.',
          recommendation: 'Implement API rate limiting to guard underlying database resources.',
        });
      }
    }

    // 5. Score Calculation
    let score = 100;
    findings.forEach((f) => {
      if (f.status === 'fail') {
        if (f.severity === 'critical') score -= 40;
        else if (f.severity === 'high') score -= 25;
        else if (f.severity === 'medium') score -= 15;
        else score -= 10;
      } else if (f.status === 'warn') {
        if (f.severity === 'high') score -= 15;
        else if (f.severity === 'medium') score -= 10;
        else score -= 5;
      }
    });

    score = Math.max(0, Math.min(100, Math.round(score)));

    let grade: 'A+' | 'A' | 'B' | 'C' | 'D' | 'F' = 'F';
    if (score >= 95) grade = 'A+';
    else if (score >= 85) grade = 'A';
    else if (score >= 70) grade = 'B';
    else if (score >= 55) grade = 'C';
    else if (score >= 40) grade = 'D';

    const criticalCount = findings.filter(f => f.severity === 'critical' && f.status === 'fail').length;
    const highCount = findings.filter(f => f.severity === 'high' && (f.status === 'fail' || f.status === 'warn')).length;
    const mediumCount = findings.filter(f => f.severity === 'medium' && (f.status === 'fail' || f.status === 'warn')).length;
    const lowCount = findings.filter(f => f.severity === 'low' && (f.status === 'fail' || f.status === 'warn')).length;
    const passedCount = findings.filter(f => f.status === 'pass').length;

    const totalCheckLatency = endpointChecks.reduce((acc, c) => acc + c.latencyMs, 0);
    const avgLatencyMs = endpointChecks.length > 0 ? Math.round(totalCheckLatency / endpointChecks.length) : rootLatency;

    const auditResult: DatabaseAudit = {
      id: `db-audit-${Date.now()}`,
      url: formattedUrl,
      score,
      grade,
      findings,
      endpoint_checks: endpointChecks,
      summary: {
        criticalCount,
        highCount,
        mediumCount,
        lowCount,
        passedCount,
        avgLatencyMs,
      },
      created_at: new Date().toISOString(),
    };

    return NextResponse.json(auditResult);
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message || 'An error occurred during database testing audit execution' },
      { status: 500 }
    );
  }
}
