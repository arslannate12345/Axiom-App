import { NextResponse } from 'next/server';
import type { SecurityFinding, HeaderCheckResult, ExposedPathCheck, SecuritySeverity } from '@axiom/core/types';

export const dynamic = 'force-dynamic';

const SECURITY_HEADERS = [
  {
    header: 'Strict-Transport-Security',
    name: 'HSTS',
    description: 'Enforces HTTPS connections and guards against SSL stripping attacks.',
    required: true,
  },
  {
    header: 'Content-Security-Policy',
    name: 'CSP',
    description: 'Prevents Cross-Site Scripting (XSS) and data injection attacks.',
    required: true,
  },
  {
    header: 'X-Frame-Options',
    name: 'Clickjacking Protection',
    description: 'Prevents the site from being embedded in iframes.',
    required: true,
  },
  {
    header: 'X-Content-Type-Options',
    name: 'MIME Sniffing Protection',
    description: 'Blocks browsers from MIME-sniffing response content types.',
    required: true,
  },
  {
    header: 'Referrer-Policy',
    name: 'Referrer Policy',
    description: 'Controls how much referrer information is included with requests.',
    required: false,
  },
  {
    header: 'Permissions-Policy',
    name: 'Permissions Policy',
    description: 'Restricts access to browser features (camera, microphone, geolocation).',
    required: false,
  },
];

const PROBE_PATHS = [
  { path: '/.env', severity: 'critical' as SecuritySeverity, desc: 'Environment variables file exposed.' },
  { path: '/.git/HEAD', severity: 'critical' as SecuritySeverity, desc: 'Git repository directory exposed.' },
  { path: '/wp-config.php', severity: 'high' as SecuritySeverity, desc: 'WordPress configuration file exposed.' },
  { path: '/server-status', severity: 'medium' as SecuritySeverity, desc: 'Apache server status page exposed.' },
  { path: '/robots.txt', severity: 'info' as SecuritySeverity, desc: 'Robots disclosure file present.' },
];

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const targetUrlStr = searchParams.get('url');

  if (!targetUrlStr) {
    return NextResponse.json({ error: 'Missing target URL parameter' }, { status: 400 });
  }

  let formattedUrl = targetUrlStr.trim();
  if (!formattedUrl.startsWith('http://') && !formattedUrl.startsWith('https://')) {
    formattedUrl = `https://${formattedUrl}`;
  }

  let parsedUrl: URL;
  try {
    parsedUrl = new URL(formattedUrl);
  } catch (err) {
    return NextResponse.json({ error: 'Invalid URL format' }, { status: 400 });
  }

  const isHttps = parsedUrl.protocol === 'https:';
  const headerResults: HeaderCheckResult[] = [];
  const findings: SecurityFinding[] = [];
  const exposedPaths: ExposedPathCheck[] = [];

  let score = 100;

  // 1. TLS/HTTPS check
  if (!isHttps) {
    score -= 30;
    findings.push({
      id: 'tls_missing',
      category: 'tls',
      title: 'Insecure HTTP Protocol',
      severity: 'high',
      status: 'fail',
      description: 'The target website uses plain unencrypted HTTP instead of HTTPS.',
      impact: 'Data transmitted between browser and server can be intercepted and modified by attackers.',
      remediation: {
        summary: 'Obtain an SSL/TLS certificate and configure HTTP-to-HTTPS redirect.',
        codeSnippet: `// Next.js / Node.js express redirect
if (req.headers['x-forwarded-proto'] !== 'https') {
  return res.redirect(301, 'https://' + req.headers.host + req.url);
}`,
      },
    });
  } else {
    findings.push({
      id: 'tls_ok',
      category: 'tls',
      title: 'HTTPS / TLS Encryption Enabled',
      severity: 'info',
      status: 'pass',
      description: 'Connection uses secure HTTPS transport layer.',
      impact: 'Data in transit is protected with TLS encryption.',
    });
  }

  // 2. Fetch headers from target URL
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 8000);

    const res = await fetch(formattedUrl, {
      method: 'GET',
      redirect: 'follow',
      headers: {
        'User-Agent': 'Axiom-SecurityScanner/1.0',
      },
      signal: controller.signal,
    }).finally(() => clearTimeout(timeoutId));

    const headers = res.headers;

    // Check Security Headers
    SECURITY_HEADERS.forEach((sh) => {
      const val = headers.get(sh.header);
      const isPresent = !!val;

      if (isPresent) {
        headerResults.push({
          header: sh.header,
          present: true,
          value: val,
          status: 'pass',
        });
      } else {
        const severity: SecuritySeverity = sh.required ? 'high' : 'medium';
        const scoreDeduction = sh.required ? 12 : 5;
        score -= scoreDeduction;

        headerResults.push({
          header: sh.header,
          present: false,
          value: null,
          status: 'fail',
          recommendation: `Add the '${sh.header}' header to your server responses.`,
        });

        findings.push({
          id: `missing_${sh.header.toLowerCase()}`,
          category: 'headers',
          title: `Missing ${sh.name} Header (${sh.header})`,
          severity,
          status: 'fail',
          description: sh.description,
          impact: `Lack of ${sh.header} exposes the application to common client-side web vulnerabilities.`,
          remediation: {
            summary: `Add '${sh.header}' to HTTP response headers.`,
            codeSnippet: `// next.config.ts
module.exports = {
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          { key: '${sh.header}', value: 'SAMEORIGIN' }
        ]
      }
    ]
  }
}`,
          },
        });
      }
    });

    // Check for Information Disclosure headers
    const serverHeader = headers.get('server');
    const xPoweredBy = headers.get('x-powered-by');

    if (serverHeader || xPoweredBy) {
      score -= 5;
      findings.push({
        id: 'info_disclosure_headers',
        category: 'exposure',
        title: 'Information Disclosure via Headers',
        severity: 'low',
        status: 'warn',
        description: `Server returned descriptive banner headers: ${[serverHeader && `Server: ${serverHeader}`, xPoweredBy && `X-Powered-By: ${xPoweredBy}`].filter(Boolean).join(', ')}`,
        impact: 'Exposing backend technology stack simplifies targeted exploits for attackers.',
        remediation: {
          summary: 'Remove technology banner headers in web server configuration.',
          codeSnippet: `// Express.js
app.disable('x-powered-by');`,
        },
      });
    }

  } catch (err: any) {
    findings.push({
      id: 'fetch_error',
      category: 'best_practice',
      title: 'Target Connection Warning',
      severity: 'medium',
      status: 'warn',
      description: `Could not verify all headers directly (${err.message || 'Request timed out'}).`,
      impact: 'Some live headers could not be retrieved in the scan window.',
    });
  }

  // 3. Perform Exposed Path Probing (Concurrent HEAD requests)
  await Promise.all(
    PROBE_PATHS.map(async (item) => {
      try {
        const probeUrl = `${parsedUrl.origin}${item.path}`;
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 4000);

        const probeRes = await fetch(probeUrl, {
          method: 'HEAD',
          redirect: 'manual',
          signal: controller.signal,
        }).finally(() => clearTimeout(timeoutId));

        const isExposed = probeRes.status === 200;
        exposedPaths.push({
          path: item.path,
          status: probeRes.status,
          exposed: isExposed,
          severity: item.severity,
        });

        if (isExposed && item.severity !== 'info') {
          const deduction = item.severity === 'critical' ? 25 : 15;
          score -= deduction;
          findings.push({
            id: `exposed_${item.path.replace(/[^a-z0-9]/gi, '_')}`,
            category: 'exposure',
            title: `Exposed Path Detected: ${item.path}`,
            severity: item.severity,
            status: 'fail',
            description: item.desc,
            impact: 'Sensitive configuration or system files are accessible to public web visitors.',
            remediation: {
              summary: `Restrict access to ${item.path} in web server config or remove file.`,
              codeSnippet: `# Nginx config
location ~ /\\. {
    deny all;
}`,
            },
          });
        }
      } catch (err) {
        exposedPaths.push({
          path: item.path,
          status: 0,
          exposed: false,
          severity: item.severity,
        });
      }
    })
  );

  // Normalize score
  score = Math.max(0, Math.min(100, Math.round(score)));

  let grade: 'A+' | 'A' | 'B' | 'C' | 'D' | 'F' = 'F';
  if (score >= 95) grade = 'A+';
  else if (score >= 85) grade = 'A';
  else if (score >= 70) grade = 'B';
  else if (score >= 55) grade = 'C';
  else if (score >= 40) grade = 'D';

  const criticalCount = findings.filter((f) => f.severity === 'critical' && f.status === 'fail').length;
  const highCount = findings.filter((f) => f.severity === 'high' && f.status === 'fail').length;
  const mediumCount = findings.filter((f) => f.severity === 'medium' && f.status === 'fail').length;
  const lowCount = findings.filter((f) => (f.severity === 'low' || f.severity === 'info') && f.status === 'fail').length;
  const passedCount = findings.filter((f) => f.status === 'pass').length;

  return NextResponse.json({
    id: `sec_${Date.now()}`,
    url: formattedUrl,
    score,
    grade,
    findings,
    header_analysis: headerResults,
    exposed_paths: exposedPaths,
    summary: {
      criticalCount,
      highCount,
      mediumCount,
      lowCount,
      passedCount,
    },
    created_at: new Date().toISOString(),
  });
}
