export interface Remediation {
  summary: string;
  steps: string[];
  urgency: 'immediate' | 'recommended' | 'optional';
  reference?: string;
}

const REMEDIATIONS: Record<string, Remediation> = {
  // ─── Benchmarks ──────────────────────────────────────────

  'Failed iterations detected': {
    summary: 'Investigate and fix failing endpoint responses',
    steps: [
      'Check server logs for the specific error that caused the failures (5xx, timeouts, or connection refused).',
      'Verify that the endpoint has adequate resources — high CPU/memory usage can cause 5xx errors under load.',
      'Ensure the database connection pool is not exhausted — increase max_connections if needed.',
      'Add health check middleware that returns detailed error codes for easier diagnosis.',
      'Re-run the benchmark to verify the fix.',
    ],
    urgency: 'immediate',
    reference: 'https://nodejs.org/en/docs/guides/dont-block-the-event-loop',
  },

  'High p99 latency': {
    summary: 'Reduce tail latency by optimizing slow code paths',
    steps: [
      'Profile the endpoint using APM tools (New Relic, Datadog, Sentry) to find the slowest code paths.',
      'Check database queries — add missing indexes, avoid N+1 queries, use query EXPLAIN plans.',
      'Enable response caching (Redis, in-memory cache) for frequently accessed data.',
      'Consider adding pagination or response compression (gzip/brotli) for large payloads.',
      'Move heavy synchronous operations to background jobs or queues.',
    ],
    urgency: 'recommended',
    reference: 'https://aws.amazon.com/builders-library/avoiding-insurmountable-queue-backlogs/',
  },

  'Low throughput': {
    summary: 'Improve requests-per-second capacity',
    steps: [
      'Check if the endpoint has an artificial rate limit that is too restrictive.',
      'Increase the number of application server instances (horizontal scaling) or worker threads.',
      'Optimize database connection pooling — ensure connections are reused, not created per request.',
      'Implement asynchronous processing where possible — use non-blocking I/O.',
      'Consider using a CDN for static/cacheable responses to offload your server.',
    ],
    urgency: 'recommended',
    reference: 'https://expressjs.com/en/advanced/best-practice-performance.html',
  },

  // ─── Security ────────────────────────────────────────────

  'HTTPS Enforced': {
    summary: 'Enable HTTPS/TLS encryption for all traffic',
    steps: [
      'Obtain an SSL/TLS certificate from Let\'s Encrypt (free) or your cloud provider (AWS ACM, Cloudflare).',
      'Configure your web server (nginx/apache) to listen on port 443 and serve the certificate.',
      'Set up HTTP-to-HTTPS redirect (301) in your server configuration.',
      'Test with: curl -I https://yourdomain.com — should return 200, not redirect.',
      'Enable HSTS after confirming HTTPS works correctly.',
    ],
    urgency: 'immediate',
    reference: 'https://letsencrypt.org/getting-started/',
  },

  'HSTS Header': {
    summary: 'Add HTTP Strict Transport Security header',
    steps: [
      'In your nginx config: add_header Strict-Transport-Security "max-age=63072000; includeSubDomains; preload" always;',
      'In Apache: Header always set Strict-Transport-Security "max-age=63072000; includeSubDomains; preload"',
      'In Express: app.use((req, res, next) => { res.setHeader("Strict-Transport-Security", "max-age=63072000; includeSubDomains; preload"); next(); });',
      'Start with a low max-age (e.g. 3600) for testing, then increase to 63072000 (2 years).',
      'Submit your domain to the HSTS preload list at hstspreload.org after confirming everything works.',
    ],
    urgency: 'recommended',
    reference: 'https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Strict-Transport-Security',
  },

  'Server Version Disclosure': {
    summary: 'Hide server technology and version from response headers',
    steps: [
      'Nginx: add "server_tokens off;" to hide the version number from error pages and headers.',
      'Apache: add "ServerTokens Prod" and "ServerSignature Off" in httpd.conf.',
      'For Express: use helmet({ hidePoweredBy: true }) or manually remove the X-Powered-By header.',
      'In Docker: use nginx as a reverse proxy to strip backend headers with proxy_hide_header.',
    ],
    urgency: 'recommended',
    reference: 'https://helmetjs.github.io/',
  },

  'Technology Stack Disclosure': {
    summary: 'Remove X-Powered-By and similar technology disclosure headers',
    steps: [
      'Express: use helmet({ hidePoweredBy: true }) — this is a one-liner fix.',
      'Nginx reverse proxy: add "proxy_hide_header X-Powered-By;" in the location block.',
      'Cloudflare: enable "Remove Headers" in the Transform Rules section.',
      'Verify with: curl -I https://yourserver.com | grep -i powered',
    ],
    urgency: 'recommended',
    reference: 'https://helmetjs.github.io/',
  },

  'Content Security Policy': {
    summary: 'Implement CSP to prevent XSS and data injection attacks',
    steps: [
      'Start with report-only mode to avoid breaking anything: Content-Security-Policy-Report-Only: default-src \'self\'; report-uri /csp-violation',
      'Configure allowed sources: script-src \'self\' cdn.example.com; style-src \'self\' fonts.googleapis.com; img-src \'self\' data:; connect-src \'self\' api.example.com',
      'Use helmet.contentSecurityPolicy() in Express for easy setup.',
      'Monitor the CSP violation reports for a week, then switch to enforcement mode (remove -Report-Only).',
      'Never use \'unsafe-inline\' or \'unsafe-eval\' in production if possible.',
    ],
    urgency: 'recommended',
    reference: 'https://developer.mozilla.org/en-US/docs/Web/HTTP/CSP',
  },

  'CORS Policy': {
    summary: 'Restrict Cross-Origin Resource Sharing to trusted domains',
    steps: [
      'Replace Access-Control-Allow-Origin: * with your frontend domain (e.g. https://app.yourdomain.com).',
      'If you must allow multiple origins, dynamically echo back the request origin after validating it against a whitelist.',
      'Never combine Access-Control-Allow-Origin: * with Access-Control-Allow-Credentials: true — this is a security vulnerability.',
      'For Express, use the cors package: app.use(cors({ origin: "https://app.yourdomain.com", credentials: true }))',
      'For APIs consumed by mobile apps, consider using a wildcard on a separate subdomain with no credentials.',
    ],
    urgency: 'immediate',
    reference: 'https://developer.mozilla.org/en-US/docs/Web/HTTP/CORS/Errors/CORSNotSupportingCredentials',
  },

  'Clickjacking Protection': {
    summary: 'Prevent your site from being embedded in iframes on other domains',
    steps: [
      'Add header: X-Frame-Options: DENY (blocks all framing) or SAMEORIGIN (allows only your own domain).',
      'Alternative: use Content-Security-Policy: frame-ancestors \'self\' https://trusted-domain.com',
      'In Express: app.use(helmet.frameguard({ action: "deny" })) or app.use(helmet.frameguard({ action: "sameorigin" }))',
      'Test by embedding your page in an iframe — it should not render.',
    ],
    urgency: 'recommended',
    reference: 'https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/X-Frame-Options',
  },

  'MIME Sniffing Protection': {
    summary: 'Prevent browsers from interpreting files as a different MIME type',
    steps: [
      'Add header: X-Content-Type-Options: nosniff',
      'In Express: app.use(helmet.noSniff()) — one line of code.',
      'In Nginx: add_header X-Content-Type-Options "nosniff" always;',
      'This is a one-minute fix with no side effects — deploy immediately.',
    ],
    urgency: 'immediate',
    reference: 'https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/X-Content-Type-Options',
  },

  'Rate Limiting': {
    summary: 'Implement request rate limiting to prevent abuse and brute force attacks',
    steps: [
      'Install rate limiting middleware: express-rate-limit for Node.js.',
      'Set reasonable limits: 10 req/min for login, 100 req/min for auth endpoints, 1000 req/min for public APIs.',
      'Nginx: use limit_req_zone and limit_req directives in the server block.',
      'Cloudflare/AWS WAF: enable rate limiting rules in the dashboard.',
      'Return 429 Too Many Requests with Retry-After header when limit is exceeded.',
    ],
    urgency: 'recommended',
    reference: 'https://www.npmjs.com/package/express-rate-limit',
  },

  'Endpoint Reachable': {
    summary: 'Fix connectivity to the API endpoint',
    steps: [
      'Verify the URL is correct and the server is running (curl -I the URL).',
      'Check that the server is listening on the expected port and interface (0.0.0.0, not just localhost).',
      'Ensure no firewall rules or security groups block incoming traffic to the port.',
      'If behind a load balancer/proxy, check that health checks are passing.',
      'Check DNS resolution and SSL certificate validity.',
    ],
    urgency: 'immediate',
    reference: '',
  },

  // ─── Security check labels (from SecuritySuite) ───────────
  // These map directly to the check labels from the security scanner

  'WebSocket Security': {
    summary: 'Secure WebSocket connections',
    steps: [
      'Always use wss:// (WebSocket Secure) instead of ws:// for production.',
    ],
    urgency: 'recommended',
  },

  'SQL Injection Protection': {
    summary: 'Prevent SQL injection attacks',
    steps: [
      'Always use parameterized queries or prepared statements — never concatenate user input into SQL strings.',
      'For Node.js: use query builders like Knex.js or ORMs like Prisma/Drizzle that handle escaping automatically.',
      'Run a security audit with tools like sqlmap to verify protection.',
    ],
    urgency: 'immediate',
    reference: 'https://cheatsheetseries.owasp.org/cheatsheets/SQL_Injection_Prevention_Cheat_Sheet.html',
  },

  'Authentication Required': {
    summary: 'Ensure all mutating endpoints require authentication',
    steps: [
      'Add authentication middleware to all POST, PUT, PATCH, and DELETE endpoints.',
      'Use JWT tokens (verify on every request) or session-based auth.',
      'Return 401 Unauthorized for requests without valid credentials.',
      'Never expose sensitive data on unauthenticated GET endpoints.',
    ],
    urgency: 'immediate',
  },

  'Public Endpoint Access': {
    summary: 'Review public access to this endpoint',
    steps: [
      'Confirm this endpoint is intentionally public — if not, add authentication middleware.',
      'If public, ensure it does not expose sensitive data (PII, secrets, internal IDs).',
      'Add rate limiting specifically for this public endpoint to prevent scraping.',
    ],
    urgency: 'recommended',
  },

  // ─── Fuzz ───────────────────────────────────────────────

  'Null Values strategy caused crashes': {
    summary: 'Handle null/missing input values gracefully',
    steps: [
      'Validate all input fields — if a field is required, return 400 Bad Request when it is null or missing.',
      'Use a validation library: Joi, Zod, or Yup for JavaScript/TypeScript.',
      'Add input sanitization middleware that fills defaults for optional fields.',
      'Write unit tests that send null values to every parameter and verify behavior.',
    ],
    urgency: 'immediate',
  },

  'Wrong Type strategy caused crashes': {
    summary: 'Validate input data types before processing',
    steps: [
      'Use a JSON schema validator (AJV, Zod, Joi) to enforce types on all input fields.',
      'Return 400 Bad Request with a clear error message when a field has the wrong type.',
      'For example: if "age" should be a number, reject the string "twenty" with: { error: "age must be a number" }.',
      'Implement type guards in TypeScript to catch type errors at compile time.',
    ],
    urgency: 'recommended',
  },

  'Oversized strategy caused crashes': {
    summary: 'Implement request body size limits',
    steps: [
      'In Express: app.use(express.json({ limit: "1mb" })) to reject bodies larger than 1MB with 413 Payload Too Large.',
      'In Nginx: client_max_body_size 10M; in the server block.',
      'Return 413 Payload Too Large for oversized requests instead of crashing.',
      'Consider streaming large file uploads instead of buffering them in memory.',
    ],
    urgency: 'recommended',
  },

  'Empty Values strategy caused crashes': {
    summary: 'Handle empty request bodies and parameters gracefully',
    steps: [
      'Check if the request body is empty or {} when processing POST/PUT/PATCH — return 400 Bad Request if data is required.',
      'Define sensible defaults for optional fields so empty input doesn\'t crash the handler.',
      'For GET endpoints, ignore empty query parameters or treat them as omitted.',
    ],
    urgency: 'recommended',
  },

  'Unicode / Emoji strategy caused crashes': {
    summary: 'Support Unicode and international characters in all inputs',
    steps: [
      'Ensure your database columns use UTF-8 encoding (UTF8MB4 in MySQL, utf8mb4 collation).',
      'Test with emoji (🧪), Chinese (世界), Arabic (مرحبا), and accented characters (résumé).',
      'For API responses, set Content-Type: application/json; charset=utf-8.',
    ],
    urgency: 'recommended',
  },

  'Missing Params strategy caused crashes': {
    summary: 'Handle requests with missing query parameters or headers',
    steps: [
      'For each required parameter, check if it exists before using it — return 400 with a descriptive error if missing.',
      'Use middleware that validates required parameters for all endpoints automatically.',
      'Never access req.query.param directly without checking undefined first.',
    ],
    urgency: 'recommended',
  },

  // ─── Chaos ─────────────────────────────────────────────

  'Requests dropped under network simulation': {
    summary: 'Make your service resilient to network packet loss',
    steps: [
      'Implement retry logic with exponential backoff for outgoing API calls.',
      'For client-facing APIs: use a CDN or edge caching to serve stale content when origin is unreachable.',
      'Add connection timeout handling — don\'t hang indefinitely if the downstream is unavailable.',
      'Consider a circuit breaker pattern (e.g., opossum library for Node.js) to fail fast when downstream is degraded.',
    ],
    urgency: 'recommended',
  },

  'High failure rate under chaos': {
    summary: 'Improve resilience under high latency conditions',
    steps: [
      'Increase connection timeouts: set appropriate timeout values for HTTP clients (e.g., 30s instead of 5s).',
      'Add retry with exponential backoff and jitter to avoid thundering herd.',
      'Implement fallback responses — return cached/generic data when the primary source times out.',
      'Run your own chaos engineering experiments regularly using Gremlin or Chaos Monkey.',
    ],
    urgency: 'recommended',
    reference: 'https://aws.amazon.com/builders-library/timeouts-retries-and-backoff-with-jitter/',
  },

  // ─── Idempotency ──────────────────────────────────────

  'Request is not idempotent': {
    summary: 'Make your API idempotent — same request should produce same result',
    steps: [
      'For POST endpoints: accept an Idempotency-Key header. Store the key → response mapping (e.g., in Redis with TTL). On retry, return the cached response.',
      'For PUT endpoints: ensure sending the same body twice produces the same database state (PUT is idempotent by HTTP spec).',
      'Use database transactions to detect duplicates: INSERT ... ON CONFLICT DO NOTHING (PostgreSQL) or unique constraints.',
      'Return the same HTTP status code and response body for repeated identical requests.',
    ],
    urgency: 'recommended',
    reference: 'https://stripe.com/docs/idempotency',
  },

  // ─── Regression ───────────────────────────────────────

  'Response differs from baseline': {
    summary: 'Review changes to API responses against the saved baseline',
    steps: [
      'Check each changed field — is the change intentional (new feature) or accidental (regression)?',
      'If intentional: re-save the baseline snapshot (click "Save Baseline" in the Regression tab).',
      'If accidental: revert the breaking change, then re-run regression test to confirm fix.',
      'For API contracts: update your OpenAPI/Swagger schema and share with API consumers before deploying.',
      'Set up regression tests in CI/CD to catch unexpected response changes before deployment.',
    ],
    urgency: 'recommended',
  },
};

// ─── Generic / fallback remediations ───────────────────────

const GENERIC_REMEDIATION: Remediation = {
  summary: 'Review the issue details and apply the appropriate fix',
  steps: [
    'Read the issue description carefully to understand what went wrong.',
    'Check your application logs for related errors at the time the test ran.',
    'Apply the standard fix for this type of issue in your framework/language.',
    'Re-run the test suite after applying changes to verify the fix.',
  ],
  urgency: 'recommended',
};

const FUZZ_CRASH_REMEDIATION: Remediation = {
  summary: 'Fix input handling for this mutation strategy',
  steps: [
    'Add input validation middleware to catch malformed requests before they reach your handler.',
    'Return 400 Bad Request for invalid input instead of 500 Internal Server Error.',
    'Check your server logs for the exact error trace during the crash.',
    'Write a test case that sends the same malformed input and verify it returns a proper error response.',
  ],
  urgency: 'recommended',
};

const FUZZ_TIMEOUT_REMEDIATION: Remediation = {
  summary: 'Reduce response time for this type of request mutation',
  steps: [
    'Check if the mutated input triggers a slow code path — add performance logging.',
    'Set a maximum execution time limit on your request handlers.',
    'For oversized inputs: add a body size limit (e.g., express.json({ limit: "100kb" })).',
    'Consider returning 422 Unprocessable Entity quickly for known-invalid patterns.',
  ],
  urgency: 'recommended',
};

// ─── Lookup function ──────────────────────────────────────

export function getRemediation(issueTitle: string, section?: string): Remediation {
  // Exact match first
  if (REMEDIATIONS[issueTitle]) {
    return REMEDIATIONS[issueTitle];
  }

  // Fuzzy match: check if the title contains a known pattern
  for (const key of Object.keys(REMEDIATIONS)) {
    if (issueTitle.includes(key) || key.includes(issueTitle)) {
      return REMEDIATIONS[key];
    }
  }

  // Use generic fallbacks based on section
  if (section === 'fuzz') {
    if (issueTitle.toLowerCase().includes('crash')) return FUZZ_CRASH_REMEDIATION;
    if (issueTitle.toLowerCase().includes('timeout')) return FUZZ_TIMEOUT_REMEDIATION;
  }

  return GENERIC_REMEDIATION;
}
