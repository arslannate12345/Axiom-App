# Axiom Web — Implementation Plan

> Generated from deep analysis of the Axiom mobile app (Expo + Supabase) and 8 Stitch.io HTML design exports.
> All decisions documented below were confirmed in conversation with the author on 2026-07-17.

---

## 1. Executive Summary

Axiom is a mobile API testing & QA platform (Postman-class). This plan rebuilds it as a **web application** targeting the **same Supabase backend** while upgrading the UI to an IDE-class Postman-like shell. The work is split across **M1 (Auth + Client + Collections + Environments + History + Settings)** and **M2 (Tests Hub + Runners + Reports + remaining screens)**.

### Key Architecture Decisions

| Concern | Choice | Rationale |
|---|---|---|
| Framework | **Next.js 15 (App Router)** | SSR-ready public report viewer, Supabase SSR helpers, React 19 |
| Styling | **Tailwind v4 + shadcn/ui (New York, slate, dark)** | Primitives match the IDE shell (Dialog, Sheet, Tabs, Collapsible, Select) |
| State | **Zustand** directly reused from mobile | Storage adapter swap only (`AsyncStorage` → `localStorage` via `zustand/middleware`) |
| Backend | Same Supabase project, same RLS | Zero backend changes for M1. Add migrations only in M2 (snapshots, constraints) |
| Code sharing | **pnpm monorepo** with `packages/core` | RN-agnostic services + types + stores shared verbatim between mobile and web |
| Icons | **Material Symbols Outlined** (npm package) | Matches the Stitch designs; no Ionicons on web |
| Code editor | **Monaco Editor** (`@monaco-editor/react`) | Line numbers, JSON syntax fold/format, multi-cursor, scalable |
| Charts | **chart.js + react-chartjs-2** | Bezier line charts with gradient fills; matches the SVG design pattern |
| HTTP client | Web-native `fetch` + `AbortController` + `performance.now()` | Same logic, no polyfills needed |
| Auth | **Supabase SSR** (`@supabase/ssr`) | Browser session via `createBrowserClient()`; public report via `createServerClient()` |

---

## 2. Unified Design Tokens

The 8 Stitch HTML designs use inconsistent color values across files (`#6366F1` vs `#c0c1ff` for `primary`; `#0F172A` vs `#13131b` for `background`). **We standardise on the mobile app's proven palette**, which is consistent and WCAG-compliant in dark mode. The pastel `#c0c1ff` from some designs is retained only as the JSON syntax-key colour where the design explicitly uses it.

### Colour Tokens

| Token | Tailwind alias | Hex | Usage |
|---|---|---|---|
| `bg-deepest` | `slate-950` | `#0F172A` | Page background, modal body |
| `bg-surface` | `slate-900` | `#0c1220` | TopBar, SideNav body |
| `bg-surface-container` | – | `#1f1f27` | SideNav, panels |
| `bg-surface-elevated` | `slate-800` | `#1E293B` | Cards, inputs, chip bg |
| `bg-surface-high` | – | `#292932` | Hover rows, active states |
| `bg-surface-highest` | – | `#34343d` | Accordion rows, variant bg |
| `border-default` | `slate-700` | `#334155` | All borders, dividers, outline-variant |
| `border-outline` | `slate-500` | `#64748B` | Subtle outlines (disabled chips) |
| `primary` | `indigo-500` | `#6366F1` | Main accent: buttons, active tab lines, CTA |
| `primary-container` | `indigo-400` | `#818CF8` | Active tab text, soft-indigo pills |
| `primary-pressed` | – | `#8083ff` | Pressed state of primary elements |
| `secondary-container` | – | `#2f3aa3` | Active nav item bg tint |
| `on-secondary-container` | – | `#a8afff` | Active nav item text |
| `text-primary` | `slate-100` | `#F1F5F9` | High-emphasis body |
| `text-secondary` | – | `#e4e1ed` | Body text |
| `text-tertiary` | – | `#c7c4d7` | Labels, metadata |
| `text-muted` | `slate-400` | `#94A3B8` | Captions, timestamps |
| `text-placeholder` | – | `#908fa0` | Placeholder text, disabled icons |
| `text-disabled` | `slate-600` | `#475569` | Disabled elements |
| `success` | `emerald-500` | `#10B981` | Pass badges, status dots |
| `error` | `red-500` | `#EF4444` | Fail badges, delete buttons |
| `warning` | `amber-500` | `#F59E0B` | Warning badges, delta indicators |
| `syntax-key` | – | `#c0c1ff` | JSON key colour |
| `syntax-string` | – | `#ffb783` | JSON string colour |
| `syntax-number` | – | `#bdc2ff` | JSON number colour |
| `syntax-boolean` | – | `#fca5a5` | JSON boolean colour |

### Typography

| Token | Font | Size | Weight | Line height | Letter-spacing | Usage |
|---|---|---|---|---|---|---|
| `label-md` | Inter | 12 px | 500 | 16 px | 0.02 em | Labels, uppercase headers, buttons |
| `body-sm` | Inter | 13 px | 400 | 18 px | — | Nav items, secondary text |
| `body-md` | Inter | 14 px | 400 | 20 px | — | Paragraphs, card content |
| `headline-sm` | Inter | 18 px | 600 | 24 px | -0.01 em | Section titles, modal titles |
| `code-sm` | JetBrains Mono | 12 px | 400 | 18 px | — | Table cells, status text |
| `code-md` | JetBrains Mono | 13 px | 400 | 20 px | — | URLs, body content, JSON |

### Spacing & Radius

- **Spacing grid**: 4 px base unit. Tokens: `container-padding = 16`, `element-gap = 8`, `list-item-height = 32`, `input-height-sm = 28`.
- **Border radii**: `DEFAULT = 2 px`, `lg = 4 px`, `xl = 8 px`, `full = 12 px` (pill). These are **intentionally small** for an IDE/tooling aesthetic.

---

## 3. Monorepo Layout

The existing mobile code lives at the repo root. We restructure into a pnpm workspace so `packages/core` is shared.

```
Axiom/
├── pnpm-workspace.yaml
├── package.json                    (workspace root, private)
├── tsconfig.base.json              strict TS, path aliases
├── apps/
│   ├── mobile/                     (lifted from current repo root)
│   │   ├── app/                    Expo Router routes
│   │   ├── src/
│   │   │   ├── components/         (mobile-specific: RN components)
│   │   │   ├── services/           *removed* — now imports from @axiom/core
│   │   │   ├── stores/             *removed* — imports @axiom/core/stores with RN storage adapter
│   │   │   └── types/              *removed* — imports @axiom/core/types
│   │   ├── package.json
│   │   └── eas.json, app.json, …
│   └── web/                        (short alias: `axiom-web`)
│       ├── package.json            next, react, tailwind, shadcn, zustand, supabase, monaco, chart.js
│       ├── next.config.ts
│       ├── components.json         shadcn config
│       ├── tailwind.config.ts      extended with the tokens above
│       ├── src/
│       │   ├── lib/
│       │   │   ├── supabase.ts       createBrowserClient()
│       │   │   ├── supabase-server.ts createServerClient() for SSR
│       │   │   ├── networkService.ts  web adapter (browser-native fetch)
│       │   │   ├── dataService.ts     re-exports from @axiom/core; swaps persist adapter
│       │   │   └── utils.ts           cn() helper
│       │   ├── components/
│       │   │   ├── ui/               shadcn primitives (button, input, card, dialog, sheet, etc.)
│       │   │   └── (feature components per route)
│       │   ├── stores/             re-exports with web storage adapter
│       │   ├── hooks/              web-specific hooks (useSupabaseSession, useTheme, etc.)
│       │   ├── providers/          SupabaseProvider, ThemeProvider, ToastProvider
│       │   └── app/                App Router routes
│       ├── public/                 static assets
│       └── .env.local              NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY
├── packages/
│   └── core/
│       ├── package.json            name: "@axiom/core"; exports { ./types, ./services, ./stores }
│       ├── tsconfig.json
│       └── src/
│           ├── types/               assertions.ts, database.ts, report.ts, runner.ts (moved verbatim)
│           ├── services/            RN-agnostic services (all except networkService + supabase.ts)
│           │   ├── assertionEngine.ts
│           │   ├── benchmarkEngine.ts
│           │   ├── chaosService.ts
│           │   ├── collectionRunner.ts
│           │   ├── diffService.ts
│           │   ├── fuzzerService.ts
│           │   ├── idempotencyService.ts
│           │   ├── reportService.ts
│           │   ├── securityService.ts
│           │   └── variableService.ts
│           ├── stores/             Zustand stores (no persist adapter baked in)
│           │   ├── authStore.ts
│           │   ├── collectionsStore.ts
│           │   ├── environmentStore.ts
│           │   ├── historyStore.ts
│           │   ├── regressionStore.ts
│           │   ├── reportStore.ts
│           │   └── runnerStore.ts
│           └── adapters/           Storage adapter interface + implementations
│               ├── types.ts
│               ├── rn.ts           AsyncStorage adapter
│               └── web.ts          localStorage adapter
├── supabase/
│   ├── schema.sql
│   └── migrations/                 shared by both apps
└── .env                            shared root env (SUPABASE_URL, SUPABASE_ANON_KEY)
```

---

## 4. Per-Screen Specs

### Conventions used below

- **shadcn primitives** referenced as `<Dialog>`, `<Sheet>`, `<Tabs>`, `<Button>`, `<Input>`, `<Select>`, `<Card>`, `<Badge>`, `<Switch>`, `<Collapsible>`, `<ScrollArea>`, `<Separator>`, `<Tooltip>`, `<DropdownMenu>`.
- **Icons**: `<Icon icon="icon_name" />` from Material Symbols (react wrapper `material-symbols` package).
- **Stores**: `useAuthStore`, `useCollectionsStore`, `useEnvironmentStore`, `useHistoryStore`, `useReportStore`, `useRunnerStore`. Non-persisted states are read in-memory.
- **Data flow**: Screen → Zustand store action → `packages/core` service → Supabase query → store set state.
- **Screens authored from scratch** (not from Stitch exports) are marked ✱.

---

### 4.1 Login (`/login`)

**Source**: `Sign up.html` (actually the login screen)

**Layout**: Centered card on full-screen `#0F172A` bg. No SideNav or TopBar.

**Component tree**:
```
<main class="flex min-h-screen items-center justify-center bg-[#0F172A]">
  <Card class="w-full max-w-[420px] bg-[#1E293B] border-[#334155] p-8">
    <div class="flex flex-col items-center mb-8">
      <Icon icon="api" class="text-[#6366F1]" />
      <h1 class="font-headline-sm font-black tracking-tighter uppercase">AXIOM</h1>
      <p class="label-md text-[#94A3B8] uppercase tracking-widest">Workbench Authentication</p>
    </div>
    <form>
      <FormField label="Email" icon="alternate_email">
        <Input type="email" placeholder="developer@axiom.io" />
      </FormField>
      <FormField label="Password" icon="lock" trailing="FORGOT?">
        <Input type="password" placeholder="••••••••" />
      </FormField>
      <Button variant="primary" class="w-full h-10">Sign In</Button>
    </form>
    <Separator label="OR" />
    <div class="text-center">
      <Link href="/signup">New here? <span class="text-[#6366F1]">Create account</span></Link>
    </div>
    <footer class="text-code-sm text-muted">Connection secured via TLS 1.3 / Axiom-Auth-v2</footer>
  </Card>
</main>
```

**State/logic**:
- Local: `email`, `password`, `loading`, `errorMessage`.
- `loading` state → button shows `<LoadingSpinner />` + "AUTHENTICATING…" for 1.2s min animation, then `useAuthStore.signIn(email, password)`.
- On success → `router.replace('/client')`.
- On error → `toast.error(error)`.
- "Forgot?" link → `toast("Password reset coming soon")` (M2).

**deferred from design**: SSO button, GitHub button, the two trailing pill buttons. Hidden in M1.

---

### 4.2 Signup (`/signup`) ✱

**Source**: Not exported. Authored in the same visual language.

**Layout**: Identical card to Login.

**Deltas from Login**:
- Title: "Create Account". Subtitle: "Join AXIOM to sync your collections."
- Inputs: email, password, **confirm password** (third field).
- CTA: "Create Account" (icon: `person_add`).
- Footer link: "Already have an account? [Sign In](/login)".
- Validations (client-side): non-empty email, password min 8 chars, passwords match.
- On success → `toast.success("Account created! Please sign in.")` + `router.replace('/login')`.
- On error → `toast.error(error)`.

---

### 4.3 App Shell (all authenticated routes)

**Source**: All 7 Stitch exports share the same SideNav + TopBar pattern.

**Layout**:
```
<div class="flex h-screen bg-[#0F172A]">
  <SideNav class="w-[260px] shrink-0" />
  <div class="flex-1 flex flex-col min-w-0">
    <TopBar />
    <main class="flex-1 overflow-auto">{children}</main>
    <OptionalFooter />
  </div>
</div>
```

**SideNav** (260 px fixed):
- Logo area: "Axiom" (headline-sm) + version badge "V1.2.0-stable" (code-sm, muted).
- "New Request" button — `Button variant="primary"` with `add` icon. Action: opens a **blank Client tab** (M1: navigates to `/client` with cleared state).
- Nav items (`Client`, `Collections`, `Environments`, `Tests`, `History`):
  - Icon at 20 px, label body-sm.
  - **Active** state: `bg-secondary-container/50 text-on-secondary-container font-medium border-r-2 border-primary`.
  - **Inactive** hover state: `text-on-surface-variant hover:text-on-surface hover:bg-surface-variant/50`.
- Footer divider + `Settings`, `Support` items.
- Avatar row at bottom: 32×32 avatar (circular, border-outline-variant) + name + plan badge.

**TopBar** (48 px fixed):
- "Axiom Workbench" brand (headline-sm font-black text-primary). Minimal — no sub-tabs in M1.
- Workspace switcher (Select or DropdownMenu showing active workspace name). RHS: user avatar with DropdownMenu (Profile, Sign Out).

**M1 notes**: No "Main Workspace / Team Library / Analytics" sub-tabs. No "Share" / "Deploy" buttons. No "Notifications" / "Cloud Done" icons. No global search field. These are deferred to M2+.

---

### 4.4 Client Workbench (`/client`)

**Source**: `Client Workbench.html` (single-tab M1 version)

**Layout**: Top-to-bottom vertical flex, no second sidebar. The multi-tab request bar is present but rendered with ONE active tab (no close button, no additional tabs).

**Sections (top → bottom)**:

#### 4.4.1 Request Bar
```
<div class="flex items-center gap-3 p-3">
  <div class="flex items-center border border-[#334155] rounded-lg flex-1 focus-within:border-[#6366F1]">
    <MethodSelector class="px-4 py-2 bg-[#292932]" />    ← dropdown with 7 methods
    <Input class="flex-1 bg-transparent code-md px-4" />
    <Button variant="primary" class="px-6 h-full">
      <Icon icon="send" /> Send
      <!-- when loading: LoadingSpinner + "Cancel" bg-[#EF4444] -->
    </Button>
  </div>
  <EnvironmentChip />   ← dropdown with env list, active dot
</div>
```

- MethodSelector: DropdownMenu (trigger = pill with method-coloured text, bg `#292932`, border `#334155`). Options: GET `#10B981`, POST `#3B82F6`, PUT `#F59E0B`, PATCH `#8B5CF6`, DELETE `#EF4444`, HEAD `#64748B`, OPTIONS `#EC4899`. Active option shown as method-coloured text on the trigger.
- URL Input: code-md, placeholder `https://api.example.com/endpoint`. `autoComplete="off"`.
- Send/Cancel button: 36px height. When idle → `#6366F1` + `send` icon + "Send". When loading → `#EF4444` + LoadingSpinner + "Cancel". Resets after response/error.
- EnvironmentChip: DropdownMenu trigger pill (env name + chevron + green dot). Menu items show all environments, checkmark on active.

#### 4.4.2 Action Bar
```
<div class="flex gap-3 px-3 pb-1">
  <Button variant="soft-indigo" icon="bookmark-outline">Add to Collection</Button>        ← conditional: only if no currentRequestId
  <Button variant="soft-indigo" icon="save-outline">Update Request</Button>               ← if currentRequestId set
  <Button variant="soft-indigo" icon="copy-outline">Save as Copy</Button>                ← if currentRequestId set
  <Button variant="soft-indigo" icon="refresh-outline">Refresh</Button>                    ← resets form
</div>
```
- "Add to Collection" opens the **Save Request Dialog** (see §4.6).
- "Update Request" calls `useCollectionsStore.getState().updateRequest(...)`, rewrites assertions + extractions (M2).
- "Save as Copy" opens Save Request Dialog pre-populated with the current request's data.
- "Refresh" calls `handleResetForm()` to GET + empty url + default Content-Type header.

#### 4.4.3 Sub-tab Strip
```
<Tabs>
  <TabsTrigger value="params">Params</TabsTrigger>
  <TabsTrigger value="headers">Headers (4)</TabsTrigger>    ← live count
  <TabsTrigger value="body">Body</TabsTrigger>
  <TabsTrigger value="tests" disabled>Tests</TabsTrigger>    ← M2, greyed out
  <TabsTrigger value="extractions" disabled>Extractions</TabsTrigger> ← M2, greyed out
</Tabs>
```
- Active tab has a `2px #6366F1` bottom border (shadcn `TabsTrigger` with custom `data-[state=active]` style).

#### 4.4.4 Editor Surface
- **Params tab**: `<KeyValueEditor pairs={queryParams} onChange={...} keyPlaceholder="Parameter" valuePlaceholder="Value" />`
- **Headers tab**: `<KeyValueEditor pairs={headers} onChange={...} keyPlaceholder="Header" valuePlaceholder="Value" suggestedKeys={['Authorization','Content-Type','Accept','User-Agent']} />`
- **Body tab**:
  - Type row: segmented buttons `none | json | raw` + `Beautify` button (right-aligned, only visible for `json`).
  - Monaco Editor (`language="json"` or plain `text` depending on bodyType):
    - JSON: line numbers (1–5 visible), syntax highlighting via tokens above, fold gutter, minimap off, wordWrap on.
    - Accessory key bar above keyboard (when bodyType === `json`): `{ } [ ] " : , {{ }}` insert buttons. Hover tooltip inserts at cursor.
    - Error banner below editor when JSON does not parse (live-validation).
  - **Beautify** button wraps body with `JSON.parse → JSON.stringify(…, null, 2)`.

#### 4.4.5 Response Panel
```
<ResponsePanel>
  <div class="flex items-center gap-2 px-4 py-2 bg-[#1b1b23] border-b border-[#334155]">
    <StatusBadge status={200} />  ← green/amber/red dynamic bg
    <Chip icon="schedule" label="124ms" />
    <Chip icon="database" label="1.2 KB" />
    <div class="ml-auto flex gap-2">
      <IconButton icon="content_copy" tooltip="Copy response body" />
      <IconButton icon="download" tooltip="Download as JSON" />
    </div>
  </div>
  <Tabs>
    <TabsTrigger value="body">Body</TabsTrigger>
    <TabsTrigger value="headers">Headers</TabsTrigger>
    <TabsTrigger value="assertions">Assertion Results <Badge>3/3</Badge></TabsTrigger>  ← M2
  </Tabs>
  <div class="flex-1 bg-[#0F172A] p-4 overflow-auto">
    <MonacoEditor language="json" readOnly={true} value={responseBody} />
    <!-- Or: HeadersTable or AssertionsList for respective tabs -->
  </div>
</ResponsePanel>
```

#### 4.4.6 State / logic
- **Local state**: `method`, `url`, `headers`, `queryParams`, `bodyType`, `body`, `response`, `error`, `isLoading`, `currentRequestId`.
- `useEffect([selectedRequest])`: Hydrates the form from `collectionsStore.selectedRequest`. Clears selection afterwards (prevents re-hydration on re-render).
- `handleSend()`:
  1. Creates `AbortController` + 30 s timeout.
  2. Calls `networkService.executeRequest()` with merged active variables from `environmentStore.getActiveVariables()`.
  3. Sets response; evaluates assertions (M2); logs to `historyStore`.
  4. Catches → extracts `RequestError` shape, sets error state.
- `handleCancel()`: aborts `abortRef.current`.
- `handleResetForm()`: GET, empty url, `[{key:'Content-Type', value:'application/json', enabled:true}]`, `bodyType:'none'`.

---

### 4.5 Save Request Dialog ✱

**Source**: Not directly exported. Based on mobile `SaveRequestModal.tsx` + the IDE design language.

**Trigger**: "Add to Collection" / "Save as Copy" pill buttons in the Client action bar.

**Component tree**:
```
<Dialog>
  <DialogContent class="bg-[#1E293B] border-[#334155] max-w-md">
    <DialogHeader>
      <DialogTitle>Add Request</DialogTitle>
    </DialogHeader>
    <div class="space-y-4">
      <FormField label="Request Name">
        <Input placeholder="e.g. Login Endpoint" autoFocus />
      </FormField>
      <FormField label="Workspace">
        <div class="flex gap-2 flex-wrap">
          {workspaces.map(ws => (
            <Chip key={ws.id} active={ws.id === activeWorkspaceId} onClick={setActive(ws.id)}>
              <Icon icon="briefcase" /> {ws.name}
            </Chip>
          ))}
          <Chip variant="dashed" onClick={openInlineCreateWorkspace}>+</Chip>
        </div>
      </FormField>
      <FormField label="Collection">
        <ScrollArea class="max-h-40">
          {collections[activeWorkspaceId]?.map(col => (
            <div key={col.id} class="flex items-center gap-3 p-3 rounded-lg border border-[#334155] mb-2 hover:border-[#6366F1] cursor-pointer"
                 onClick={() => setSelectedCollection(col.id)}>
              <Icon icon="folder" class="text-[#64748B]" />
              <span>{col.name}</span>
            </div>
          ))}
        </ScrollArea>
        <Button variant="dashed" icon="add" onClick={openInlineCreateCollection}>New Collection</Button>
      </FormField>
    </div>
    <DialogFooter>
      <Button variant="ghost" onClick={close}>Cancel</Button>
      <Button variant="primary" onClick={handleSave}>Save</Button>
    </DialogFooter>
  </DialogContent>
</Dialog>
```

**State/logic**:
- Pre-fills name by parsing current URL (pathname segment with fallback to full string).
- Calls `collectionsStore.saveRequest(payload)` on save.
- On success → toast "Saved to {collectionName}" + `onSaved(requestId)` callback.
- Inline create workspace/collection: text input + checkmark button replaces the chip row.

---

### 4.6 Collections (`/collections`)

**Source**: `Collections.html`

**Layout**: Two-column inside the shell:
- **Left (280 px)**: Collections Tree sidebar (similar to SideNav but narrower, dedicated).
- **Right (flex)**: Collection Dashboard content.

#### 4.6.1 Collections Tree (280 px)

```
<div class="w-[280px] bg-[#1b1b23] border-r border-[#334155] flex flex-col">
  <div class="p-4 border-b border-[#334155] flex justify-between items-center">
    <span class="label-md uppercase tracking-wider text-[#e4e1ed] font-bold">Collections</span>
    <div class="flex gap-1">
      <IconButton icon="create_new_folder" tooltip="New Collection" />
      <IconButton icon="filter_list" />
    </div>
  </div>
  <ScrollArea class="flex-1">
    {workspaces.map(ws => (
      <WorkspacePill key={ws.id} active={ws.id === activeWorkspaceId} onClick={setActive(ws.id)}>
        <Icon icon="folder" /> {ws.name}
      </WorkspacePill>
    ))}
    <Separator />
    {collections[activeWorkspaceId]?.map(col => <CollectionTreeNode key={col.id} collection={col} />)}
  </ScrollArea>
</div>
```

- Workspace pills at top: horizontal scroll (max-h 44), `#1E293B` bg, `#334155` border, radius 20. Active → `#6366F1` bg + white text.
- CollectionTreeNode: collapsible via `chevron_right`/`chevron_down`. Folder icon `#6366F1` (active) or `#64748B`. Name truncate.
  - Expanded children: nested folders + request items.
  - Request item row: `drag_indicator` icon (opacity-0 on group-hover opacity-100, non-functional in M1 — visual only), method-coloured badge (code-sm 10 px, width 8), name.
  - `more_vert` icon on hover → DropdownMenu (Rename, Move to…, Delete).
- Context menu actions:
  - Delete → `<AlertDialog>` with confirmation.
  - Rename → inline input replaces the name span.
  - Move to… → opens a Dialog with workspace/collection destination picker.
  - **No drag-and-drop in M1** — the `drag_indicator` icons are decorative placeholders.

#### 4.6.2 Collection Dashboard

```
<div class="flex-1 overflow-auto p-8">
  <!-- Collection Header -->
  <div class="flex justify-between items-start mb-8">
    <div>
      <Breadcrumb>Collection / Workspace / Core API v2</Breadcrumb>
      <h2 class="headline-sm text-3xl font-extrabold mb-2">Core API v2</h2>
      <p class="text-on-surface-variant max-w-2xl mb-4">Description text…</p>
      <MetaBar>
        <Chip icon="account_tree">18 requests</Chip>
        <Chip icon="person">Created by Alex Rivera</Chip>
        <Chip icon="schedule">Modified 2h ago</Chip>
      </MetaBar>
    </div>
    <div class="flex gap-3">
      <Button variant="outline" icon="settings">Variables</Button>
      <Button variant="primary" icon="play_arrow">Run Collection</Button>   ← M2 (tooltip "Coming in M2")
    </div>
  </div>

  <!-- Stats Bento Grid -->
  <div class="grid grid-cols-1 md:grid-cols-3 gap-4 mb-10">
    <StatCard title="Avg Latency" value="142ms" delta="-12%" deltaType="down" icon="speed" barWidth="65%" />
    <StatCard title="Success Rate" value="99.4%" subtitle="Stable" icon="check_circle" color="success" barWidth="99.4%" />
    <StatCard title="Error Count" value="02" subtitle="Last 24h" delta type="up" icon="warning" color="error" barWidth="5%" />
  </div>

  <!-- Recent Executions Table -->
  <div class="bg-[#1E293B] border border-[#334155] rounded-lg overflow-hidden">
    <div class="px-6 py-4 border-b border-[#334155] flex justify-between">
      <h3 class="label-md font-bold uppercase">Recent Executions</h3>
      <Link href="/history" class="text-primary label-md">View All History</Link>
    </div>
    <ExecutionsTable data={runs} />  ← empty state if no runs
  </div>
</div>
```

**State/logic**:
- `useEffect` on mount: `collectionsStore.loadWorkspaces()`. On `activeWorkspaceId` change: `loadCollections()`, `loadEnvironments()`.
- Stats computed from last 10 `history` entries for requests in this collection (client-side aggregate via a simple `select` or post-loaded by a dataService utility).
- "Run Collection" button → tooltip "Coming in M2" in M1.
- Clicking a request row in the tree → `collectionsStore.setSelectedRequest(req)` + `router.navigate('/client')`.

---

### 4.7 Environments (`/environments`)

**Source**: `Environments.html`

**Layout**: Three-column: env list (left 288 px), variable editor (right flex).

#### 4.7.1 Env List (288 px)
```
<div class="w-72 border-r border-[#334155] bg-[#1E293B] flex flex-col">
  <div class="p-4 flex justify-between items-center border-b border-[#334155]">
    <h2 class="headline-sm font-semibold text-primary">Environments</h2>
    <IconButton icon="add" onClick={createNewEnvironment} />
  </div>
  <div class="p-2 space-y-1 overflow-y-auto">
    {environments.map(env => (
      <EnvListItem key={env.id} active={env.id === activeEnvironmentId}
        onClick={setActive(env.id)}
        icon={env.name === 'Global' ? 'dns' : 'cloud_queue'}
        indicator={env.id === activeEnvironmentId ? <GreenDot /> : undefined} />
    ))}
  </div>
</div>
```

- Active row: `bg-secondary-container/20 text-on-surface border-r-2 border-[#6366F1]`. Green dot with glow when active.
- Add: inline text input row appears at top, "Save" button + chevron to close.

#### 4.7.2 Variable Editor
```
<div class="flex-1 flex flex-col bg-[#0F172A]">
  <Header>
    <h2 class="headline-sm font-bold">{env.name}</h2>
    <Badge color="success">Active</Badge>
    <div class="ml-auto flex gap-2">
      <Button variant="outline">Duplicate</Button>
      <Button variant="outline" class="hover:bg-error/10 hover:text-error">Delete</Button>
    </div>
  </Header>
  <ScrollArea class="flex-1 p-6">
    <div class="bg-[#1E293B] border border-[#334155] rounded-xl overflow-hidden">
      <table>
        <thead>
          <tr>
            <th>Key</th> <th>Value</th> <th class="text-center w-24">Secret</th> <th class="text-right w-24">Actions</th>
          </tr>
        </thead>
        <tbody>
          {variables.map(v => (
            <tr class="group hover:bg-[#334155]/30">
              <td class="font-medium text-primary">{v.key}</td>
              <td class={v.is_secret ? 'tracking-widest' : ''}>
                {v.is_secret ? '••••••••••••' : v.value}
                <Icon icon="lock" class="text-tertiary" /> ← only when is_secret
              </td>
              <td class="text-center">
                <Switch checked={v.is_secret} onCheckedChange={toggleSecret(v.id)} />
              </td>
              <td class="text-right"><IconButton icon="delete" tooltip="Delete" /></td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
    <Button variant="dashed" icon="add_circle">Add Variable</Button>
  </ScrollArea>
  <Footer>
    <div class="flex items-center gap-2">
      <GreenDot /> Syncing…   ← debounced 800ms after the most recent upsert
      <span>Last updated 2m ago</span>
    </div>
    <Button variant="primary">Save Changes</Button>   ← non-functional in M1 (saves onBlur). Visual only.
  </Footer>
</div>
```

**State/logic**:
- `useEffect`: `loadEnvironments(activeWorkspaceId)`. Auto-selects "Global" env (or first).
- `addVariable()`: upserts blank variable to `dataService`, appends locally.
- `updateLocalVariable()`: optimistic local update with `updated_at`.
- `saveVariableToDb()`: called `onBlur` of input → `dataService.upsertEnvironmentVariable(...)`.
- `removeVariable()`: confirmation `AlertDialog` → `dataService.deleteEnvironmentVariable()`.
- Secret toggle: calls `dataService.upsertEnvironmentVariable(..., isSecret: !current)` immediately.
- "Save Changes" button: M1 visual only. On click → show success toast "All variables synced" + updated "Last updated …" timestamp.

---

### 4.8 History (`/history`)

**Source**: `History.html`

**Layout**: Full-page table + slide-in inspector drawer.

#### 4.8.1 Header & Filters
```
<div class="px-6 py-6 border-b border-[#334155]">
  <div class="flex justify-between items-start">
    <div>
      <h2 class="headline-sm font-bold">Request History</h2>
      <p class="body-md text-on-surface-variant">Review and re-run your historical API interactions.</p>
    </div>
    <div class="flex gap-3">
      <Button variant="outline" icon="delete_sweep" onClick={confirmClear}>
        Clear All
      </Button>
      <Button variant="outline" icon="download" disabled>
        Export    ← tooltip "Coming in M2"
      </Button>
    </div>
  </div>
  <!-- Filters bar (M1: 2 columns) -->
  <div class="mt-6 flex flex-wrap items-center gap-3 p-2 bg-[#1E293B] rounded-lg border border-[#334155]">
    <div class="flex-1 min-w-[240px] relative">
      <Input prefix={<Icon icon="search" />} placeholder="Search URL or parameters…" value={searchTerm} />
    </div>
    <Select value={methodFilter} onValueChange={setMethodFilter}>
      <SelectItem value="all">All Methods</SelectItem>
      <SelectItem value="GET">GET</SelectItem>
      <SelectItem value="POST">POST</SelectItem>
      <SelectItem value="PUT">PUT</SelectItem>
      <SelectItem value="PATCH">PATCH</SelectItem>
      <SelectItem value="DELETE">DELETE</SelectItem>
      <SelectItem value="HEAD">HEAD</SelectItem>
    </Select>
    <!-- Status select & date range picker not rendered (M2) -->
  </div>
</div>
```

#### 4.8.2 Table & Inspector
```
<div class="flex-1 overflow-auto relative">
  <table>
    <thead>
      <tr>Method | URL | Status | Latency | Size | Time | Actions</tr>
    </thead>
    <tbody>
      {entries.map(entry => (
        <tr class="group hover:bg-surface-variant/30" onClick={openInspector(entry)}>
          <td><MethodBadge method={entry.method} /></td>
          <td class="code-md truncate max-w-lg">{entry.url}</td>
          <td><StatusPill status={entry.status_code} /></td>
          <td class="code-md">{formatMs(entry.latency_ms)}</td>
          <td class="code-md">{formatBytes(entry.response_size)}</td>
          <td class="body-sm">{timeAgo(entry.executed_at)}</td>
          <td class="text-right">
            <IconButton icon="open_in_new" class="opacity-0 group-hover:opacity-100"
              tooltip="Restore to Workbench" onClick={restoreToClient(entry)} />
          </td>
        </tr>
      ))}
    </tbody>
  </table>
</div>

<!-- Inspector Drawer slid from right -->
<Sheet open={inspectorOpen} onOpenChange={setInspectorOpen}>
  <SheetContent side="right" class="w-[400px] bg-[#1E293B] border-l border-[#334155]">
    <MethodBadge method={inspectorEntry.method} />
    <h4 class="label-md uppercase">URL</h4>
    <div class="code-md text-primary break-all">{inspectorEntry.url}</div>
    <h4 class="label-md uppercase">Request Body</h4>
    <pre class="bg-[#0F172A] border border-[#334155] p-4 code-md rounded">{body}</pre>
    <h4 class="label-md uppercase">Headers</h4>
    {Object.entries(responseHeaders).map(([k, v]) => (
      <div class="flex justify-between text-[11px]">
        <span class="font-bold">{k}</span>
        <span class="code-sm">{v}</span>
      </div>
    ))}
    <Button variant="primary" icon="refresh" class="w-full" onClick={restoreToClient}>
      Restore to Workbench
    </Button>
  </SheetContent>
</Sheet>
```

**State/logic**:
- `useEffect` on mount: `historyStore.loadHistory(50)`.
- Search filter: client-side filter on `entry.url` and `entry.method` (case-insensitive `includes`).
- Method filter: `entry.method === methodFilter || methodFilter === 'all'`.
- `restoreToClient(entry)`: reconstructs a `Request`-like object from the history entry + the original saved request (if `request_id` exists), calls `collectionsStore.setSelectedRequest(...)` + `router.navigate('/client')`.
- Clear All → `AlertDialog` confirmation → `historyStore.clearHistory()`.
- Inspector: `Sheet` from shadcn, `side="right"`, opens on row click. Close button or clicking "Restore to Workbench" closes it.
- Footer: minimal — page indicator not implemented (M1 caps at 100 rows, single page).

---

### 4.9 Settings (`/settings`)

**Source**: `Profile & settings.html`

**Layout**: SideNav + TopBar + single-column bento.

```
<main class="ml-[260px] mt-[48px] h-[calc(100vh-48px)] overflow-y-auto bg-[#0F172A] p-12">
  <div class="max-w-2xl mx-auto">

    <!-- Hero -->
    <div class="mb-12 text-center flex flex-col items-center">
      <Avatar class="w-24 h-24 border-2 border-primary p-1" />
      <Button variant="ghost" class="absolute bottom-0 right-0" icon="edit" tooltip="Coming in M2" />
      <h2 class="headline-sm text-2xl font-bold mb-1">{user.email}</h2>
      <div class="flex items-center gap-2 mb-2">
        <span class="body-md text-on-surface-variant">{user.email}</span>
        <Badge class="bg-primary/20 text-primary border-primary/30">Pro Plan</Badge>
      </div>
    </div>

    <!-- Account & Security -->
    <Card>
      <CardHeader icon="lock">Account & Security</CardHeader>
      <CardContent class="space-y-6">
        <Row label="Change Password" description="Update your security credentials regularly." trailing={<ChevronRight />} onClick={comingSoon} />
        <Separator />
        <Row label="Sign Out" description="Terminate your current session securely." trailing={
          <Button variant="danger-outline" onClick={handleLogout}>Logout</Button>
        } />
      </CardContent>
    </Card>

    <!-- Workspace Management -->
    <Card>
      <CardHeader icon="terminal">Workspace Management</CardHeader>
      <CardContent>
        <Row label="Active Workspace" description="Currently targeting..." trailing={
          <Badge class="bg-[#0F172A] border border-[#334155] code-md text-primary"><GreenDot /> {activeWorkspaceName}</Badge>
        } />
        <div class="grid grid-cols-2 gap-4 mt-4">
          <div class="bg-surface-variant/30 p-4 rounded-lg border border-outline-variant/50 hover:border-primary/50 cursor-pointer">
            <p class="text-[10px] uppercase mb-1">Region</p>
            <p class="body-md font-medium">— (Coming in M2)</p>
          </div>
          <div class="bg-surface-variant/30 p-4 rounded-lg border border-outline-variant/50 hover:border-primary/50 cursor-pointer">
            <p class="text-[10px] uppercase mb-1">Node Status</p>
            <p class="body-md font-medium">— (Coming in M2)</p>
          </div>
        </div>
      </CardContent>
    </Card>

    <!-- Preferences -->
    <Card>
      <CardContent>
        <Row icon="dark_mode" label="Theme Preferences" description="System default: High-Contrast Dark" trailing={
          <SegmentedControl value="dark" options={[{value:'dark',label:'Dark'},{value:'light',label:'Light'}]}
            onChange={(v) => v === 'light' && toast('Light mode coming soon')} />
        } />
      </CardContent>
    </Card>

    <!-- Footer -->
    <div class="mt-12 pt-8 border-t border-[#334155] text-center">
      <p class="text-[11px] code-sm text-on-surface-variant">
        User GUID: <span class="text-primary/70">{truncatedUid}</span> • Last Login: {formatLastLogin(…)}
      </p>
    </div>
  </div>
</main>
```

**State/logic**:
- `useAuthStore` → `user`, `signOut`.
- `useCollectionsStore` → `activeWorkspaceId`, `workspaces` (for active workspace name).
- `handleLogout`: `AlertDialog` confirm → `signOut()` → `router.replace('/login')`.
- Tabs not functional in M1: `Change Password` → toast, `Region/Node` → greyed out text, `Light` theme → toast.

---

### 4.10 Tests Hub shell (`/tests`) ✱

**Source**: Both `Test Hub-Benchmarks.html` and `Test Hub - Security.html` share the same sub-nav bar.

**M1**: Minimal placeholder — renders the sub-nav bar with 6 tabs and a centered "Choose a test suite" message. All tabs except the sub-nav text are clickable but route to `/tests/{suite}` which shows "Coming in M2" for each.

**Component tree**:
```
<div class="flex-1 flex flex-col">
  <!-- Sub-navigation -->
  <div class="px-6 pt-4 flex gap-8 border-b border-[#334155]/30">
    {suites.map(s => (
      <Button variant={activeSuite === s.id ? 'active-tab' : 'inactive-tab'} onClick={setSuite(s.id)}>
        {s.label}
      </Button>
    ))}
  </div>
  <div class="flex-1 flex items-center justify-center">
    <div class="text-center">
      <Icon icon="checklist" class="text-[#334155] text-6xl mb-4 block" />
      <p class="headline-sm text-[#475569]">Select a testing suite above</p>
      <p class="body-md text-[#64748B]">Benchmarks, Contracts, Fuzzing, Security, Chaos & Idempotency — all coming in M2.</p>
    </div>
  </div>
</div>
```

---

### 4.11 M2 Screens (briefly noted)

These will be authored into PLAN.md during M2 planning. For completeness:

- **Benchmarks** (`/tests/benchmarks`): Full implementation from `Test Hub-Benchmarks.html`. Config card (iterations, concurrency, ramp-pattern grid grid-cols-2 with Load/Stress/Spike/Soak, target endpoint), 4 stat cards (p50/p95/p99/Throughput), SVG line chart via `chart.js + react-chartjs-2`, iterations table. Bottom status bar with real API status.
- **Security** (`/tests/security`): Scan config panel with select + 4 toggle switches, results stat cards, Compliance Checklist accordion list with expandable `<pre>` detail blocks, live event log feed.
- **Contracts & Regression** (`/tests/regression`): Tab switcher for Snapshots vs Contracts, baseline list with "Save Baseline" button, diff viewer (green/red/yellow syntax), schema inference card.
- **Fuzzing** (`/tests/fuzzing`): Strategy chips (null/wrong_type/oversized/empty/unicode/missing), iterations input, test results bento with Safe/Crash/Timeout counts per strategy.
- **Chaos** (`/tests/chaos`): Drop probability slider, latency injection sliders, iterations input, results with abort counts + per-iteration breakdown.
- **Idempotency** (`/tests/idempotency`): Mode selector (sequential/parallel), results showing status comparison, deep-diff output with ignored-fields chip editor.
- **Collection Runner**: Slide-over sheet (steps progress), transient variable extraction per step, assertion result per step, "Generate Report" CTA → Report dialog.
- **Matrix Runner**: Modal with environment toggle chips, request×environment result grid, per-cell pass/fail with status code + latency.
- **Reports list** (`/reports` or inside Profile): Dialog listing `ReportCard`s from `reportStore`.
- **Report detail**: Full-screen dialog with header (report name, share link, delete), execution summary stats bento, per-request detail cards.
- **Public report viewer** (`/reports/[token]`): Server component using `supabase-server.ts` to call `get_shared_report` RPC. Displays a read-only report view with the same bento/detail pattern, no auth wrapper.

---

## 5. M1 Phase Plan

### Phase W0 — Monorepo scaffold

Duration estimate: 1 day

- [ ] Create `pnpm-workspace.yaml` at repo root
- [ ] Move existing mobile app into `apps/mobile/` (git mv everything except `.git/`, `node_modules/`, `axiom-web/`)
- [ ] Create `packages/core/` with `package.json` (`@axiom/core`), `tsconfig.json`
- [ ] Copy types files verbatim into `packages/core/src/types/`
- [ ] Copy RN-agnostic services into `packages/core/src/services/` (exclude `networkService.ts`, `supabase.ts`, `dataService.ts`)
- [ ] Copy all 7 Zustand stores into `packages/core/src/stores/`; export a `createPersistConfig` factory that accepts a storage adapter
- [ ] Create `packages/core/src/adapters/` with interface + `rn.ts` + `web.ts`
- [ ] Update `apps/mobile` imports to `@axiom/core/types`, `@axiom/core/services`, `@axiom/core/stores`
- [ ] Verify mobile builds & runs: `pnpm --filter mobile start`
- [ ] Remove the now-unnecessary copies from `apps/mobile/src`

### Phase W1 — Web app skeleton

Duration estimate: 1 day

- [ ] `pnpm create next-app@latest apps/web --typescript --tailwind --eslint --src-dir --app --import-alias "@/*" --use-pnpm`
- [ ] Install deps: `@supabase/ssr`, `zustand`, `material-symbols`, `@monaco-editor/react`, `chart.js react-chartjs-2`, `date-fns`, `@axiom/core` (local workspace dep)
- [ ] Install shadcn primitives: `npx shadcn@latest init` (New York, slate, dark) then `npx shadcn@latest add button input card dialog sheet tabs scroll-area select badge switch separator collapsible dropdown-menu tooltip alert-dialog sonner`
- [ ] Write `tailwind.config.ts` with the unified tokens from §2
- [ ] Write `src/lib/utils.ts` (shadcn `cn()`)
- [ ] Write `src/lib/supabase.ts` (browser client, `createBrowserClient`)
- [ ] Write `src/lib/supabase-server.ts` (server client, `createServerClient`)
- [ ] Write `src/providers/SupabaseProvider.tsx` (wrap session into `useEffect` + `visibilitychange` auto-refresh)
- [ ] Write `src/providers/ToastProvider.tsx` (shadcn `sonner`)
- [ ] Write `src/stores/index.ts` — re-export stores from `@axiom/core/stores` configured with `localStorage` persist adapter
- [ ] Write `middleware.ts` (standard Supabase SSR session refresh)
- [ ] Write `.env.local` with `NEXT_PUBLIC_SUPABASE_URL` + `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- [ ] Build AnimatedBackground CSS component (4 orbs, indigo/violet, opacity 0.04–0.07, `@keyframes` drift)
- [ ] Verify: `pnpm --filter web dev` starts, renders a blank dark page

### Phase W2 — Auth (login + signup)

Duration estimate: 1 day

- [ ] Build `(auth)/layout.tsx` — centered layout without shell
- [ ] Build `login/page.tsx` per spec §4.1
- [ ] Build `signup/page.tsx` per spec §4.2
- [ ] Wire `useAuthStore.signIn`, `signUp`, `signOut`
- [ ] Auth guard in `(app)/layout.tsx` — redirect to `/login` if unauthenticated
- [ ] Index redirect (`/client` if authed, `/login` otherwise)
- [ ] Test: sign up, sign in, session persistence (page reload keeps session), sign out

### Phase W3 — App shell + SideNav + TopBar

Duration estimate: 1 day

- [ ] Build `(app)/layout.tsx` with SideNav + TopBar + `<AnimatedBackground>` wrapper
- [ ] SideNav per spec §4.3 — all nav items, active state, "New Request" button, avatar row
- [ ] TopBar per spec §4.3 — brand + workspace switcher dropdown + avatar menu
- [ ] Workspace switcher: read from `collectionsStore.workspaces`, default to first or "My Workspace"
- [ ] Route the 5 main navigation items (Client, Collections, Environments, History, Tests) to their respective pages. Tests shows M1 placeholder.
- [ ] Wire Settings & Support sidebar items (Settings → `/settings` route, Support → tooltip/toast M2)
- [ ] Minimal Footer (status bar) optional for now

### Phase W4 — Client Workbench (single-tab)

Duration estimate: 3 days

- [ ] Build `MethodSelector` (shadcn DropdownMenu with method-coloured pill trigger + item list)
- [ ] Build `EnvironmentChip` (DropdownMenu trigger + env list with checkmark)
- [ ] Build request bar (method + URL + send/cancel button) per §4.4.1
- [ ] Build action bar per §4.4.2 (Add to Collection / Update / Save as Copy / Refresh pills)
- [ ] Build `KeyValueEditor` generic component (shadcn card, rows of key + value + enabled checkbox + delete; dashed "Add" button; suggestion chips)
- [ ] Build `BodyEditor` (type selector segmented buttons + Monaco editor + Beautify + Accessory key bar) per §4.4.4
- [ ] Wire sub-tab strip with Params / Headers / Body active; Tests & Extractions tabs disabled
- [ ] Wire `handleSend()` / `handleCancel()` / `handleResetForm()` per state/logic in §4.4.6
- [ ] Build `ResponsePanel` — status bar, timing chips, tabs (Body/Headers), Monaco readOnly for Body, HeadersTable for Headers tab
- [ ] Wire `historyStore.logEntry` after each execution
- [ ] Load `selectedRequest` hydration effect from `collectionsStore.selectedRequest`
- [ ] Default headers: `[{key:'Content-Type', value:'application/json', enabled:true}]`
- [ ] Test: build request from scratch, send, see response, reset, open a saved request from Collections

### Phase W5 — Save Request Dialog + Collections

Duration estimate: 2 days

- [ ] Build Save Request Dialog per spec §4.5
- [ ] Wire inline create workspace/collection flows
- [ ] Wire `collectionsStore.saveRequest()` / `updateRequest()`
- [ ] Build Collections Tree sidebar (280 px) per spec §4.6.1
- [ ] Context menu (Rename, Move to…, Delete) using shadcn DropdownMenu + AlertDialog
- [ ] Workspace pills row + inline create
- [ ] Build Collection Dashboard per spec §4.6.2 (header, bento stats cards, Recent Executions table)
- [ ] Wire `router.navigate('/client')` on request tap
- [ ] Wire "Variables" button → `/environments`
- [ ] Add "Refresh" pull-to-reload via button in header
- [ ] Test: create workspace, create collection with inline create, save a request into it, tap to open in Client, delete request

### Phase W6 — Environments

Duration estimate: 1.5 days

- [ ] Build Environment List (288 px) per spec §4.7.1
- [ ] Wire `useEnvironmentStore.loadEnvironments(activeWorkspaceId)`
- [ ] Build variable editor table per spec §4.7.2 (Key/Value/Secret/Actions)
- [ ] Secret toggle switch → `upsertEnvironmentVariable(..., isSecret)`
- [ ] Masked values (`••••••••••••`) when `is_secret === true`
- [ ] `onBlur` persistence via `dataService.upsertEnvironmentVariable`
- [ ] Add Variable dashed button
- [ ] "Duplicate" env button (calls `createEnvironment` + copies all variables)
- [ ] "Delete" env button (calls `deleteEnvironment`, prevents deleting "Global")
- [ ] Footer: syncing debounce indicator + "Last updated" timer + "Save Changes" (visual only, triggers full re-sync)
- [ ] Inline create env input row
- [ ] Test: create Production env, add base_url variable, set secret for api_key, verify masking, switch to Global, verify getActiveVariables merge

### Phase W7 — History + Settings

Duration estimate: 1.5 days

- [ ] Build History table + filters per spec §4.8
- [ ] Wire `historyStore.loadHistory(50)`
- [ ] Client-side search filter + method filter
- [ ] StatusPill component (coloured dot + status code + label, dynamic bg for 2xx/4xx/5xx)
- [ ] MethodBadge component (coloured bg pill, 10 px/700 uppercase, width 56 px)
- [ ] Inspector drawer (`Sheet` right side) per spec §4.8.2
- [ ] "Restore to Workbench" → reconstruct Request + navigate to `/client`
- [ ] "Clear All" with confirmation
- [ ] Build Settings page per spec §4.9 (hero, Account & Security, Workspace Management, Preferences, footer meta)
- [ ] Wire logout
- [ ] Wire active workspace name display
- [ ] Test: run requests from Client, see them in History, filter, open inspector, restore, go to Settings, sign out

Total M1 estimate: ~11 days (calendar, includes buffer)

---

## 6. M1 Acceptance Checklist

- [ ] User can sign up with email + password, sign in, session survives page reload
- [ ] User sees SideNav + TopBar with active route highlighting
- [ ] Client: URL → method → Params/Headers/Body → Send → see response (timing, status, body, headers)
- [ ] Client: Cancel mid-flight, reset form, load saved request from Collections
- [ ] Save Request dialog creates a workspace/collection and saves the current request
- [ ] Collections tree shows workspaces + collections + requests; tap → opens in Client
- [ ] Collection Dashboard shows stat cards + Recent Executions table
- [ ] Environments: create, select, edit variables, toggle secret, view masking, Global env always present
- [ ] History: entries appear after executions, search/method filter works, inspector drawer opens, "Restore to Workbench" works
- [ ] Settings: hero, logout, active workspace shown
- [ ] All states match the same Supabase data that the mobile app reads — flipping between devices shows the same collections/environments/history

---

## 7. Migration & Adapter Notes

| Concern | Mobile (Expo) | Web (Next.js) | Action |
|---|---|---|---|
| Zustand persist | `AsyncStorage` | `localStorage` | Swap adapter in `packages/core/adapters/web.ts` |
| HTTP client | `react-native` fetch | Browser fetch | `networkService.ts` — already `fetch()`-based; works identically |
| Auth session | `AsyncStorage` (supabase-js default) | `@supabase/ssr` cookie storage | `supabase.ts` → `createBrowserClient`; middleware handles cookie refresh |
| AppState listener | `AppState.addEventListener` | `window.addEventListener('visibilitychange', …)` | Web adapter checks `document.visibilityState` |
| URL/URLSearchParams | `react-native-url-polyfill` | Native | Drop polyfill; native browser `URL` works |
| Date formatting | `date-fns` via stores | Same `date-fns` | Identical import; use `date-fns` throughout |
| Chart library | `react-native-chart-kit` | `chart.js` + `react-chartjs-2` | New dependency; configure indigo theme matching `#6366F1` |
| Vector icons | `@expo/vector-icons` (Ionicons) | `material-symbols` | New icon set; map names per component |
| Code/Monaco | None (plain `<TextInput />` + jsx highlight) | `@monaco-editor/react` | Lazy-loaded; `json` language + custom theme matching syntax tokens |
| RegExp / crypto | `eval`-safe | Full | `new RegExp()` and `crypto.getRandomValues()` available natively on web |
| Share token | `Math.random().toString(36)` | Same for M1; M2 → `crypto.getRandomValues()` | Deferred to M2 |
| `is_secret` | Stored plaintext in DB, visually ignored | Same DB, visually shown as secret toggle + masked value | No backend change in M1; M2 research encryption |

---

## 8. M2 Outline (post-M1)

- [ ] **Tests Hub sub-screens** (Benchmarks, Contracts & Regression, Fuzzing, Security, Chaos, Idempotency) — one dedicated file per suite, each consuming the corresponding `packages/core/services/*` engine.
- [ ] **Collection Runner** — `CollectionRunnerView` as a bottom sheet / dialog (steps list, transient vars, assertions, "Generate Report" CTA).
- [ ] **Matrix Runner** — multi-env selection grid result viewer.
- [ ] **Multi-tab Client** — new `tabsStore.ts` manages open request tabs + active tab + dirty flag + confirmation dialog on close.
- [ ] **Drag-and-drop** in Collections tree (`@dnd-kit/core + @dnd-kit/sortable`).
- [ ] **Report list / detail** screens (dialog for list, full-screen dialog for detail).
- [ ] **Public report viewer** (`/reports/[token]`) — server component, reads RPC `get_shared_report` via `createServerClient()`.
- [ ] **Schema migrations** — `snapshots` + `contracts` tables, CHECK enums on `method` / `body_type` / `operator` / `status`, UNIQUE on `(request_id, variable_name)`, `benchmark_runs.created_at` ordering fix.
- [ ] **Share token hardening** → `crypto.getRandomValues`.
- [ ] **Secrets encryption research** (client-side or Supabase Vault).
- [ ] **Export CSV** from History.
- [ ] **Search** across requests (TopBar search field).
- [ ] **Light theme** support (CSS variable toggle).

---

## 9. Risk Register

| Risk | Impact | Mitigation |
|---|---|---|
| Mobile breakage during monorepo migration | Mobile stops building | Run `pnpm --filter mobile start` after each file move in W0; roll back if broken |
| `requests.body JSONB` type mismatch | Non-JSON strings silently fail to persist | Defer fix to M2 schema; ensure body is always JSON-wrapped or use `TEXT` M2 |
| `MOCK_USER` UUID mismatch in SKIP_AUTH (mobile) | Auth mock inconsistent between store and dataService:222 | Don't change legacy behaviour for M1; unify in M2 |
| SSR + Zustand hydration mismatch | Next.js server client mismatch | Use `skipHydration: true` + `useEffect` manual rehydrate in providers |
| Monaco Editor bundle size | Slow initial load | Lazy-load with `next/dynamic` + `loading` spinner; ~400 KB gzipped |
| `charCodeAt` in `formatBytes` | Wrong byte size for multi-byte UTF-8 | Always use `TextEncoder.encode(str).length` (browser-native) |
| Add to Collection without Tests/Extractions | M1 saves incomplete request | Tests/Extractions tabs are disabled; only Params/Headers/Body saved; assertion/extraction handling added in M2 |

---

*End of plan. Ready for review & execution.*
