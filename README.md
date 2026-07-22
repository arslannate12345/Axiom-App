# Axiom

**Axiom is a one-stop testing platform for the whole product, not just the backend.** Pick a testing domain — API, Performance, Accessibility, Security, or Visual & Responsive — and the workspace reconfigures around it: request builders and collection runners for API testing, one-click site audits for performance and accessibility, header/TLS checks for security, and breakpoint screenshot diffing for visual regressions.

Axiom started as a mobile-first API client (still available, fully featured — see `apps/mobile`) and has grown into a web-first, multi-domain testing workbench (`apps/web`), sharing one backend and one core testing engine (`packages/core`) across both.

---

## ⚡ Active Testing Domains

<details open>
<summary><b>1. 🚀 API Testing Domain</b></summary>

- **Full-featured Request Builder**: Support for GET, POST, PUT, PATCH, and DELETE requests with dynamic headers, query params, auth, and JSON body payload editors.
- **Collections & Environments**: Organize saved requests into nested collections and define global variables (e.g. `{{baseUrl}}`, `{{token}}`) for dynamic interpolation.
- **Test Runner & 6 Test Suites**: Automated test assertions, benchmarking (P95/P99 latency charts), and fuzz testing.
- **Historical Logs & Reports**: Comprehensive request trails and shareable HTML/JSON/PDF reports.
</details>

<details open>
<summary><b>2. ⚡ Performance Testing Domain</b></summary>

- **Google PageSpeed Insights Integration**: One-click Lighthouse-backed site performance audits for Mobile and Desktop.
- **Core Web Vitals**: Real-time metrics for LCP (Largest Contentful Paint), FID, CLS, TTFB, and Speed Index.
- **Actionable Opportunities**: Itemized performance recommendations with estimated time savings.
- **Audit History & Printable Reports**: Track score trends over time and export audit reports as PDF.
</details>

<details open>
<summary><b>3. ♿ Accessibility Testing Domain</b></summary>

- **WCAG Compliance Audits**: Automated WCAG and ARIA violation checks based on Lighthouse accessibility engines.
- **Categorized Issue Severity**: Filter findings by Critical, Serious, and Moderate severity.
- **A11y Scores & History**: View overall accessibility grade and track improvements across testing runs.
</details>

<details open>
<summary><b>4. 🛡️ Web Security Testing Domain</b></summary>

- **Security Header Analysis**: Evaluates HTTP response headers including HSTS, CSP, X-Frame-Options, X-Content-Type-Options, Referrer-Policy, and Permissions-Policy.
- **TLS / HTTPS Verification**: Verifies secure connection transport.
- **Information Disclosure & Path Exposure**: Scans for tech disclosure headers (`Server`, `X-Powered-By`) and probes sensitive system paths (`/.env`, `/.git/HEAD`, `/wp-config.php`).
- **Remediation Code Snippets**: Copy-paste fix guidance for Next.js, Nginx, Apache, and Express.
</details>

<details open>
<summary><b>5. 📱 Visual & Responsive Testing Domain</b></summary>

- **Multi-Viewport Inspection**: Inspect responsive site rendering across 4 viewports (Mobile: 375px, Tablet: 768px, Laptop: 1280px, Desktop: 1920px).
- **Interactive Visual Regression Diffs**: Side-by-side snapshot comparison and split-screen overlay slider tool to detect pixel shifts between runs.
- **Match Score Calculation**: Real-time layout match percentage and mismatch calculation.
</details>

---

## 🛠️ Tech Stack & Monorepo Architecture

- **Web Workbench (`apps/web`)**: Next.js 16 (App Router, Turbopack), React 19, Tailwind CSS, Motion (Framer Motion), Zustand.
- **Mobile App (`apps/mobile`)**: React Native, Expo Router, Native StyleSheet.
- **Core Shared Engine (`packages/core`)**: TypeScript domain definitions, test runners, assertions, and report generators.
- **Backend & Persistence**: Supabase (PostgreSQL, Row Level Security, Auth).

---

## 🚀 Getting Started

### Prerequisites
- Node.js 18+ & `pnpm` (or `npm`)

### Setup Instructions

1. Clone the repository:
   ```bash
   git clone https://github.com/arslannate12345/Axiom-App.git
   cd Axiom
   ```

2. Install monorepo dependencies:
   ```bash
   pnpm install
   ```

3. Set up Environment Variables:
   Copy `.env.example` to `.env.local` inside `apps/web/` and add your Supabase & Google PSI credentials:
   ```env
   NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
   GOOGLE_PSI_API_KEY=your_google_psi_api_key
   ```

4. Run the Web Workbench:
   ```bash
   pnpm --filter web dev
   ```

5. Or run the Mobile App:
   ```bash
   pnpm --filter mobile start
   ```
