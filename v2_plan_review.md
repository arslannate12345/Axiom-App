# Axiom v2 Implementation Plan — Senior Dev Review

## TL;DR

**This is an exceptionally well-written plan.** Whoever authored it clearly studied the v1 codebase in detail — every phase-level "Architecture Fit" section references *actual* files, functions, and schema columns correctly. All 11 phases are technically feasible within the scope of your Expo + Supabase stack, but they vary significantly in complexity and a few carry risks worth flagging.

---

## ✅ What the Plan Gets Right

| Strength | Why it Matters |
|---|---|
| **Dependency ordering** | Phases are genuinely sequenced by dependency — Phase 1 (Assertions) rightly comes first because Phases 2, 5, 7, 9, and 11 all consume pass/fail results from it. |
| **Accurate codebase references** | The plan cites `executeRequest()` returning `ResponseTiming`, `runSingleIteration()` in `benchmarkEngine.ts`, `{{variable}}` interpolation in `variableService.ts`, `sort_order` on collections, `response_body TEXT` on history — all verified correct against your actual code. |
| **Extend, don't rewrite** | Every phase is scoped as an extension of existing services rather than a parallel architecture. This is the right call for a v2. |
| **Operator-based assertions over eval()** | Storing assertions as `{ field, operator, expectedValue }` instead of `eval()`-ing raw JS is the correct mobile-safe approach. |

---

## Phase-by-Phase Feasibility Assessment

### 🟢 Fully Feasible — Low Risk

| Phase | Feature | Notes |
|-------|---------|-------|
| **1** | Assertions Engine | Straightforward. New `assertionEngine.ts` service + new `assertions` table + a "Tests" tab on the request UI. Your `ResponseTiming` interface already has everything needed (status, headers, body, ttfb, totalTime). A JSONPath library like `jsonpath-plus` keeps nested field assertions clean. **Estimate: ~2-3 days.** |
| **2** | Collection Runner & Variable Chaining | The plan correctly identifies that `collectionsStore.ts` already models collection → requests with `sort_order`, and `variableService.ts` already handles `{{var}}` interpolation. You'd add a `collectionRunner.ts` service that loops through requests sequentially, calls `executeRequest()` per step, extracts values via JSONPath into the variable context, and runs assertions. New `collection_runs` + `collection_run_steps` tables. **Estimate: ~3-4 days.** |
| **3** | Environment Matrix Testing | Relatively simple once Phase 2 exists — loop the collection runner across N environments and present a diff view. The `environmentStore.ts` already manages multiple environments. **Estimate: ~2 days.** |
| **4** | Stress / Spike / Soak Modes | The plan's observation is spot-on: these are just different batch-size-per-iteration calculations on the *same* `benchmarkEngine.ts` loop. Adding `mode: 'fixed' | 'ramp' | 'spike' | 'soak'` to `BenchmarkRunOptions` and branching the batch-size logic is clean. The `expo-keep-awake` suggestion for soak mode is correct. **Estimate: ~2-3 days.** |
| **9** | Idempotency Testing | A thin wrapper: fire the same request twice, diff the two responses using the Phase 5 diff engine, surface pass/fail. **Estimate: ~1-2 days.** |

---

### 🟡 Feasible — Medium Risk / Caveats

| Phase | Feature | Concern |
|-------|---------|---------|
| **5** | Regression & Contract Testing | Feasible, but the **structural JSON diff** is the hardest pure-logic piece in the entire plan. Key reordering tolerance, nested array comparison, and whitespace normalization are deceptively tricky to get right. Consider using a library like `deep-diff` or `json-diff` rather than rolling your own. The **JSON Schema auto-inference** (contract mode) is also non-trivial — there's an npm package `to-json-schema` that can help, but it'll need manual review for edge cases. **Estimate: ~4-5 days.** |
| **6** | Fuzz & Negative Testing | Feasible and the plan's "reuse the benchmarkEngine batching loop" insight is correct. The risk is in mutation strategy design — you need enough strategies to be useful but not so many that results become noise. Start with the 6 strategies the plan names (null, wrong type, oversized string, empty string, unicode edge cases, missing field). **Estimate: ~3-4 days.** |
| **7** | Security Smoke Testing | Header hygiene checks and auth-boundary checks (strip the `Authorization` header, assert 401/403) are very doable on-device today. The **deep TLS inspection** part correctly calls out that React Native's `fetch()` can't inspect cipher suites — this genuinely requires the Phase 10 Node proxy, so it's gated. **App Store review risk**: frame this as "QA hygiene for your own APIs" exactly as the plan suggests. **Estimate: ~2-3 days (excluding TLS deep check).** |
| **8** | Network Condition (Chaos) Testing | Delay injection (`await sleep(delayMs)` before `executeRequest()`) and forced random aborts are simple. However, this is **simulated** chaos, not real network-level throttling — the plan is honest about this, which is the right framing. Good enough for validating retry/timeout logic. **Estimate: ~2 days.** |

---

### 🔴 Feasible but Complex — High Risk / Scope Concerns

| Phase | Feature | Concern |
|-------|---------|---------|
| **10** | Node Proxy Scheduler & Synthetic Monitoring | This is the **biggest scope jump** in the plan because it introduces a **separate backend service**. Two approaches are offered: (a) a standalone Node.js/Express proxy, or (b) Supabase Edge Functions + `pg_cron`. I'd strongly recommend **option (b)** — it keeps you on Supabase's managed infrastructure, avoids hosting/DevOps overhead, and `pg_cron` can invoke Edge Functions on a schedule. However, either way this is a multi-day effort involving server-side code, deployment, monitoring persistence, and a new "health check dashboard" UI. **Estimate: ~5-7 days.** |
| **11** | CI / Export Capability | The plan correctly notes that `networkService.ts`, `assertionEngine.ts`, and `variableService.ts` are all plain TS with no RN-specific APIs (beyond `fetch()`, which Node supports). A standalone CLI runner is realistic. But this is essentially a **second product deliverable** — a Node CLI package with its own packaging, docs, and CI-friendly output format. **Estimate: ~4-5 days.** |

---

## Risks & Recommendations

### 1. Mobile Performance at Scale

> [!WARNING]
> Phases 4 (soak mode) and 6 (fuzz testing) can generate **thousands of requests** in a single run. On-device, this means keeping thousands of iteration results in memory before flushing to Supabase. Your current `benchmarkEngine.ts` already batches DB writes per batch — make sure the new modes do the same and don't accumulate `allIterations[]` unboundedly for very long runs.

### 2. Supabase Row Limits

> [!IMPORTANT]
> A 1,000-iteration benchmark run already creates 1,000 rows in `benchmark_iterations`. Soak mode over hours could produce 10,000+ rows per run. If you're on a free-tier Supabase project, consider adding TTL-based cleanup (delete iterations older than N days) or aggregated storage instead of raw per-iteration rows for long runs.

### 3. Phase 10 is a "v3" Feature in Disguise

> [!NOTE]
> Phase 10 (Node Proxy + Synthetic Monitoring) breaks the "everything runs on the phone" architecture. It's genuinely valuable, but it's architecturally a different class of feature. Consider shipping Phases 1–9 as v2 and Phase 10–11 as v2.5 or v3. This keeps v2 shippable and self-contained.

### 4. JSONPath Dependency

Phases 1, 2, 5, and 9 all need JSONPath evaluation. Pick one library early (`jsonpath-plus` is well-maintained and works in React Native) and use it consistently across all phases rather than rolling different field-access patterns per phase.

### 5. App Store Framing for Phase 7

The plan already handles this well by framing security checks as "QA hygiene for your own APIs." Maintain this framing consistently in any UI copy, app description, and review notes. Apple and Google have rejected apps that appear to be "hacking tools" or "vulnerability scanners."

---

## Suggested Implementation Order (with time estimates)

| Priority | Phase | Est. Days | Rationale |
|----------|-------|-----------|-----------|
| 1st | Phase 1 — Assertions Engine | 2-3 | Foundation for everything else |
| 2nd | Phase 2 — Collection Runner | 3-4 | Highest user-facing value |
| 3rd | Phase 4 — Stress/Spike/Soak | 2-3 | Natural extension of existing benchmark UI |
| 4th | Phase 5 — Regression & Contract | 4-5 | Requires careful diff engine work |
| 5th | Phase 3 — Environment Matrix | 2 | Quick win once Phase 2 is done |
| 6th | Phase 6 — Fuzz Testing | 3-4 | New testing category, builds on assertion engine |
| 7th | Phase 7 — Security Smoke | 2-3 | Lightweight, high-differentiation |
| 8th | Phase 8 — Chaos Testing | 2 | Simple delay/abort injection |
| 9th | Phase 9 — Idempotency | 1-2 | Thin wrapper on diff engine |
| 10th | Phase 10 — Node Proxy | 5-7 | Server-side scope, can be deferred |
| 11th | Phase 11 — CI Export | 4-5 | Second deliverable, can be deferred |
| | **Total** | **~31-40 days** | |

---

## Bottom Line

**All 11 phases are technically possible.** The plan is genuinely well-architected — it's not a wishlist, it's an engineering document that someone wrote after reading your actual code. The dependency chain is sound, the codebase references are accurate, and the "extend, don't rewrite" philosophy is exactly right.

My only structural recommendation: **consider shipping Phases 1–9 as v2 (pure on-device, ~22-28 dev days) and Phases 10–11 as v2.5 (server-side extension, ~9-12 additional days)**. This gives you a complete, shippable v2 without the server-side infrastructure dependency.

Ready to start building whenever you share the UI/UX designs. 🚀
