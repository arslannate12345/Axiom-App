# Axiom — Multi-Domain Testing Platform: Implementation Plan

> **Axiom — your one-stop solution for every kind of testing.**
> Alternate taglines considered in §1.2.

Prepared as the next planning artifact following `axiom-web/PLAN.md` (M1/M2 web build) and `v2_plan_review.md` (API test-suite v2). This document scopes the pivot from **"API testing tool"** to **"multi-domain testing platform"** via a domain-selector shell, and is written to be dropped into the repo alongside those two files.

---

## 1. Vision & Positioning

### 1.1 The pitch, one sentence

Axiom is a testing platform where a tester picks *what kind of testing they're doing* — API, Performance, Accessibility, Security, or Visual/Responsive — and the entire workspace reconfigures around that domain, from a Postman-class API client to a GTMetrix-class site auditor, all under one account, one report format, and one export pipeline.

### 1.2 Naming & tagline

Product name: **Axiom** (unchanged — no sub-brand, no "Axiom Web" in customer-facing copy; internally the monorepo apps stay `apps/web` and `apps/mobile`).

Tagline options for README, landing page, and pitch deck:
- **"Axiom — your one-stop solution for every kind of testing."** (recommended: plain, descriptive, investor-legible)
- "Axiom — one platform, every test."
- "Axiom — from API to pixel, tested."
- "Axiom — the testing workbench for the whole product, not just the backend."

### 1.3 Why this is fundable as a prototype

Investors and non-technical evaluators respond to **breadth with visible depth**, not breadth alone. The plan below is built around one principle: **ship few domains at real depth, and show the rest as an honest roadmap**, rather than five shallow domains that don't survive a live demo. Section 5 gives the exact build order that maximizes visible domain count per engineering-hour, because three of the four new domains share one backend integration (§4.2).

---

## 2. Current State of the Repo — Progress Report

This section exists so the plan reads correctly for anyone (including future collaborators or investors doing diligence) who opens the repo cold.

### 2.1 Repository shape

```
Axiom/  (pnpm monorepo)
├── apps/
│   ├── mobile/        ✅ COMPLETE — Expo/React Native API client, shipped
│   └── web/            🚧 ACTIVE DEVELOPMENT — primary focus going forward
├── packages/core/       ✅ shared types, services, stores, storage adapters (RN + web)
├── supabase/             ✅ schema + 6 migrations, shared backend for both apps
├── axiom-web/PLAN.md      reference doc — original web build plan (M1/M2)
└── v2_plan_review.md       reference doc — API test-suite v2 phase review
```

### 2.2 Mobile app — status: complete

Full-featured React Native (Expo) API client: request builder (GET/POST/PUT/PATCH/DELETE), Collections & Workspaces, dynamic Environments with `{{variable}}` interpolation, native Load Benchmarking with P95/P99 charts, Request History, Supabase Auth. This is the shipped v1 product and is no longer the primary development focus.

### 2.3 Web app — status: active, further along than "in progress" implies

A read of `apps/web/src` shows this is not an early-stage rebuild — it is a mature, near-feature-complete API testing product:

| Area | What's built |
|---|---|
| Shell | Collapsible IDE-style side-nav, Ctrl+K global search, dark/light theme, Monaco-editor request/body editing |
| Core client | Full request builder on `@axiom/core`, shared verbatim with mobile via the adapter pattern (`adapters/web.ts` / `adapters/rn.ts`) |
| Collections | Drag-and-drop reordering (`@dnd-kit`), nested collections, workspaces |
| Environments | Full CRUD, variable interpolation |
| **Tests hub** | Six working test suites, each its own component: **Benchmarks, Contracts & Regression, Fuzzing, Idempotency, Security, Chaos** |
| Reporting | `reportGenerator.ts`, `reportCompare.ts` (diffing between runs), `remediation.ts` (397 lines — automated fix suggestions), PDF export (`jspdf` + `html2canvas`), and a **public token-shared report viewer** at `/reports/[token]` for sending results outside the app |
| History | Full request log |
| Auth | Supabase SSR (`@supabase/ssr`), login/signup flows |

**Read for planning purposes:** the API Testing domain (§3) is not something this plan needs to build — it *is* the current app. This plan's job is to (a) generalize the current single-purpose shell into a domain-switching shell, and (b) add three genuinely new domains behind it.

### 2.4 Data layer — status: established, extends cleanly

Current Supabase schema (`supabase/schema.sql` + migrations): `workspaces`, `collections`, `requests`, `environments`, `environment_variables`, `history`, `benchmark_runs`, `benchmark_iterations`, `assertions`, `variable_extractions`, `collection_runs`, `collection_run_steps`, `reports`, `report_issues`, `snapshots`, `contracts`. This is a well-normalized, RLS-scoped schema. New domains extend it with new tables rather than touching existing ones (§6).

### 2.5 What needs to change for this plan

1. **README + repo description** — currently framed as a mobile-first API client. Needs rewrite to reflect: web-first, multi-domain testing platform, mobile app as the shipped v1 companion. (Draft in §8.)
2. **Nav model** (`apps/web/src/app/(app)/layout.tsx`) — currently a flat `navItems` array pointing at API-testing-only routes. This becomes domain-aware (§4.1).
3. **No backend for page-level auditing exists yet** — no headless browser, no Lighthouse/PSI integration, nothing in `package.json` for this. This is the one genuinely new piece of infrastructure (§4.2).

---

## 3. Domain Selector — Product Scope

Four domains ship at real depth. Additional domains are shown as roadmap tiles, not built.

| # | Domain | Status | Depth |
|---|---|---|---|
| 1 | **API Testing** | Already built | Full — client, collections, environments, 6 test suites, reports |
| 2 | **Performance Testing** | New | Core Web Vitals, load waterfall, one-click site scan |
| 3 | **Accessibility Testing** | New | WCAG violations, contrast, ARIA/alt-text issues |
| 4 | **Security Testing** | Extend existing | Web-domain checks added to the existing `SecuritySuite` engine |
| 5 | **Visual & Responsive Testing** | New | Screenshot diffing across breakpoints/devices |
| — | SEO Audit | Stretch (near-free add-on to #2) | Meta tags, headings, broken links |
| — | Database Testing (grey-box) | Roadmap tile only | Not built this cycle |
| — | Compliance/Regulatory Scanning | Roadmap tile only | Not built this cycle |
| — | Mobile App Testing | Roadmap tile only | Leverages existing native app later |

**Naming note:** "UI/UX Testing" is deliberately renamed **"Visual & Responsive Testing."** True usability testing (session recording, user confusion, heatmaps) is a different product category (Hotjar-class) and isn't automatable in this scope. Calling the domain what it actually does — visual regression + responsive rendering checks — reads as more credible to a technical evaluator than a broader label the prototype can't back up.

---

## 4. Technical Architecture

### 4.1 The domain-switcher shell

Today `navItems` in `apps/web/src/app/(app)/layout.tsx` is a flat, hardcoded array pointing at `/client`, `/collections`, etc. — all API-testing routes. This becomes:

```ts
// packages/core/src/types/domains.ts
export type TestingDomainId = 'api' | 'performance' | 'accessibility' | 'security' | 'visual';

export interface TestingDomain {
  id: TestingDomainId;
  label: string;
  icon: string;            // material-symbols name, matches existing icon system
  description: string;
  navItems: { href: string; label: string; icon: string }[];
  status: 'active' | 'coming_soon';
}
```

A `domainRegistry.ts` in `packages/core` defines all domains (including the roadmap-only ones, flagged `coming_soon` so they render as disabled tiles rather than being omitted). The side-nav in `layout.tsx` reads the active domain from a new `useDomainStore` (same Zustand pattern as `tabsStore.ts`) and renders that domain's `navItems` instead of the current hardcoded list.

**Why this is low-risk:** it is a navigation-layer refactor. None of the existing API-testing routes, components, or `@axiom/core` services change. The current API Testing experience becomes `domain: 'api'` with its existing six nav items (`Client`, `Collections`, `Environments`, `Tests`, `Reports`, `History`) unchanged.

A top-of-sidebar domain switcher (dropdown or icon rail, matching the existing `Web Designs` visual language in `axiom-web/Web Designs/`) sits above the nav list and swaps `navItems` on selection — this is the "whole dashboard changes" behavior described in the original brief.

### 4.2 The one new piece of infrastructure: the Page Audit Engine

Performance, Accessibility, and SEO all read from the same source: a Lighthouse-class audit of a URL. Building this once unlocks three domains.

**Recommended approach for this phase: Google PageSpeed Insights API**, not a self-hosted headless browser fleet.

Rationale:
- Zero infrastructure to stand up or maintain (no Playwright/Puppeteer server, no browser farm, no scaling concerns for a prototype)
- Free tier is sufficient for demo/investor use
- Returns real Lighthouse data: Performance, Accessibility, SEO, and Best Practices scores plus itemized issues — from **one API call**
- De-risks the "is this domain worth building" question before committing to owned infrastructure

This mirrors the exact recommendation your own `v2_plan_review.md` made for Phase 10 (prefer managed infra over a self-hosted Node proxy) — same principle, applied one level earlier.

```
apps/web/src/lib/pageAuditService.ts
  → calls PageSpeed Insights API (server-side, via a Next.js route handler to hide the key)
  → normalizes response into { performance, accessibility, seo, bestPractices } scored sections
  → reuses existing reportGenerator.ts / remediation.ts to render results and suggest fixes
  → reuses existing pdfExport.ts and public-report-token flow for sharing
```

**Migration path (v2+, not this phase):** once there's real usage data justifying it, swap the PSI call for a self-hosted Playwright-based runner for more control (custom auth flows before scanning, scheduled synthetic monitoring, on-prem/intranet URLs the public API can't reach). The service boundary above is written so that swap doesn't touch the UI or reporting layers.

### 4.3 Security domain extension

No new infrastructure. Extends the existing `SecuritySuite` engine (already does header hygiene and auth-boundary checks for APIs) with web-specific checks: TLS/certificate validity, security headers (CSP, HSTS, X-Frame-Options, X-Content-Type-Options), cookie flags (`Secure`, `HttpOnly`, `SameSite`), and exposed common paths (`.env`, `.git/`). Framed consistently with the existing "QA hygiene for your own site" language already used for the API security suite — same App Store/positioning rationale applies to web.

### 4.4 Visual & Responsive Testing — the one domain needing new infrastructure

This domain is architecturally different from the other three: it requires actually *rendering* a page at multiple viewport sizes and capturing screenshots, which PageSpeed Insights does not provide.

Scope for this phase:
- Capture screenshots at 3–4 standard breakpoints (mobile, tablet, desktop, wide) via a serverless headless-browser call (e.g. a hosted screenshot API, or a lightweight Playwright function deployed as a Supabase Edge Function / Vercel serverless function using `@sparticuz/chromium` for a slim binary)
- Baseline vs. current-run pixel diffing (a well-maintained library such as `pixelmatch` or `resemblejs`) to flag visual regressions between two runs of the same URL
- Reuses the existing `reportCompare.ts` diff-presentation pattern already built for API contract regression — same UI concept, new data type

This is explicitly scoped smaller than a full Percy/Chromatic-class visual-testing product: single-URL, breakpoint-based, run-to-run diffing — enough to be genuinely useful and demoable without building a snapshot-management platform.

---

## 5. Build Order & Rationale

| Order | Item | Why this position |
|---|---|---|
| 1 | Domain-switcher shell (§4.1) | Unblocks everything else; pure refactor, no new backend; makes the existing API domain demo-ready in the new IA immediately |
| 2 | Performance domain via PSI (§4.2) | Highest visual impact per hour of work; validates the shared audit engine |
| 3 | Accessibility domain (§4.2, same engine) | Near-zero marginal cost once #2 exists; strong enterprise/compliance pitch angle |
| 4 | Security domain extension (§4.3) | Reuses existing engine; low net-new work |
| 5 | Visual & Responsive Testing (§4.4) | Only domain needing new infra; scoped last so the audit-engine pattern is proven first |
| 6 (stretch) | SEO audit | Free by-product of #2's PSI payload; add if time remains |
| — | README/repo description rewrite (§8) | Do in parallel with #1 — no code dependency |

---

## 6. Data Model Additions

New tables, additive only — no changes to existing schema:

```sql
-- one row per audited URL per run, shared by performance/accessibility/seo
CREATE TABLE page_audits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID REFERENCES workspaces(id) NOT NULL,
  url TEXT NOT NULL,
  domain TEXT NOT NULL,               -- 'performance' | 'accessibility' | 'seo'
  scores JSONB NOT NULL,              -- { performance, accessibility, seo, bestPractices }
  raw_result JSONB NOT NULL,          -- full PSI payload for drill-down
  created_at TIMESTAMPTZ DEFAULT now()
);

-- screenshot captures per breakpoint, per run
CREATE TABLE visual_snapshots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID REFERENCES workspaces(id) NOT NULL,
  url TEXT NOT NULL,
  breakpoint TEXT NOT NULL,           -- 'mobile' | 'tablet' | 'desktop' | 'wide'
  image_url TEXT NOT NULL,            -- Supabase Storage path
  created_at TIMESTAMPTZ DEFAULT now()
);

-- diff result between two visual_snapshots
CREATE TABLE visual_diffs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  baseline_snapshot_id UUID REFERENCES visual_snapshots(id) NOT NULL,
  current_snapshot_id UUID REFERENCES visual_snapshots(id) NOT NULL,
  diff_percentage NUMERIC NOT NULL,
  diff_image_url TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);
```

Security-domain web checks extend the existing `reports` / `report_issues` tables — no new tables needed there, since it's the same shape as the current API security findings.

---

## 7. Risks & Mitigations

| Risk | Mitigation |
|---|---|
| PSI API rate limits under demo load | Free tier is generous (25k/day); cache results per URL for a short TTL |
| Screenshot/headless-browser infra is the one genuinely new ops surface | Start with a hosted screenshot API rather than self-managed Playwright; revisit only if usage justifies owning it |
| Domain-switcher refactor touches shared layout code | Scope strictly to `layout.tsx` + a new store; zero changes to existing route components, so regression surface is small |
| "Visual & Responsive" scope creep toward full Percy-class product | Explicitly cap this phase at single-URL, breakpoint-based, run-to-run diffing (§4.4) |
| Investor demo exposes unbuilt domains | Ship them as clearly-labeled "coming soon" tiles in the domain switcher, not hidden — shows roadmap intentionally |

---

## 8. README & Repo Description — Draft

**Repo description (GitHub one-liner):**
> Axiom — your one-stop testing platform. API, Performance, Accessibility, Security, and Visual testing in one workspace.

**README opening (replaces current mobile-first framing):**

> # Axiom
>
> **Axiom is a one-stop testing platform for the whole product, not just the backend.** Pick a testing domain — API, Performance, Accessibility, Security, or Visual & Responsive — and the workspace reconfigures around it: request builders and collection runners for API testing, one-click site audits for performance and accessibility, header/TLS checks for security, and breakpoint screenshot diffing for visual regressions.
>
> Axiom started as a mobile-first API client (still available, fully featured — see `apps/mobile`) and has grown into a web-first, multi-domain testing workbench (`apps/web`), sharing one backend and one core testing engine (`packages/core`) across both.

Full features list, tech stack, and setup instructions below this should be updated per-domain as each ships, rather than rewritten again later — recommend structuring the README with one collapsible section per domain so it grows cleanly as domains 2–5 land.

---

## 9. Definition of Done for the Investor Prototype

- [ ] Domain switcher visibly changes the entire side-nav and workspace on selection
- [ ] API Testing domain works exactly as it does today (zero regression)
- [ ] Performance domain: enter a URL, get a real Lighthouse-backed score + itemized issues + PDF export
- [ ] Accessibility domain: same URL, same run, separate scored report
- [ ] Security domain: web-specific checks visibly distinct from the API security suite
- [ ] Visual & Responsive domain: two runs of the same URL produce a visual diff with a highlighted regression
- [ ] Roadmap-only domains appear as labeled, disabled tiles (not hidden)
- [ ] README and GitHub repo description updated per §8
