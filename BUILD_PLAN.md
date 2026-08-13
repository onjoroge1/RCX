# RCX — Build Plan

**Companion to:** `RCX_AI_BUILD_SPEC.md` (product/UX source of truth) and its §41 audit.
**Created:** 2026-08-09

> ## ⚠️ PARTIALLY SUPERSEDED — 2026-08-13
>
> The product owner has decided RCX becomes a **real production application**, not a prototype.
> A Neon Postgres database, Auth.js v5 authentication, multi-tenancy and an admin surface are
> now **in scope**.
>
> **§0.2, §0.3 and §6 of this document are void.** Specifically, §6's *"What not to build: …
> real auth, real persistence, and a real backend"* is reversed, as is the §0 chain it rests on
> (spec §0.5, "mocked local data only").
>
> **Still valid:** §1 Phase 0.4 (primitives) and 0.5 (route state files) — both now *more*
> important, since forms submit to server actions. §2 Phase 1 (§22 flows — since delivered),
> and the §3–§5 feature backlog, which is unaffected by where the data comes from.
>
> **Also revised:** Phase 0.2 (re-model `data/mock.ts`) is superseded *as an edit* — the
> strings→types transformation now happens once inside the database seed, and `data/mock.ts`
> is deleted rather than rewritten. Phase 0.3 (`data/repo.ts`) is dropped entirely; a real
> async data-access layer serves its purpose.
>
> See `RCX_AI_BUILD_SPEC.md` §42 for the production architecture.

---

## 0. Operating assumptions

These come from spec §0 and constrain every decision below.

1. **This is a prototype, not a production app.** Mocked local data only (§0.5). No live credentials (§0.12).
2. **Therefore: no real authentication.** `/app` stays open and clickable. The login screen is a cosmetic gate that routes to `/app`. Do not build sessions, password hashing, or middleware — a demo that can't be clicked is a worse demo.
3. **Therefore: no backend.** The "data layer" work below is about *shape and timing*, not persistence.
4. **The measure of done is §37**, the sales narrative, not feature-count against §35.

What we are optimizing for: a buyer clicks through the §37 sequence and believes RCX is a real operating platform.

---

## 1. Phase 0 — Foundations

Nothing here is user-visible. All of it is load-bearing for later phases, and each item gets more expensive the longer it waits.

### 0.1 Repository safety — **do this first**

`git rev-parse --show-toplevel` currently returns **`/Users/obadiah`**. The project has no git repository of its own; it sits inside an uninitialized repo rooted at the home directory. A `git add .` from here would stage `~/.ssh/`, `~/.zsh_history`, `~/.bash_history`, and `~/.claude.json`.

- `git init` inside `~/Documents/rcx`
- Verify the toplevel is the project, then make the first commit
- Do not commit anything until this is confirmed

**Size: S. Blocking — no other work should be committed until this is done.**

### 0.2 Data model (spec §25)

Every value in `data/mock.ts` is a pre-formatted display string: `'12,604'`, `'+14.2%'`, `'$84,240'`, `'2h ago'`. §25 specifies typed objects.

- Convert to real `number` and ISO-8601 timestamps
- Add `lib/format.ts` — `formatCount`, `formatCurrency`, `formatPercent`, `formatRelativeTime`
- Adopt the §25 type definitions verbatim (`Workspace`, `BrandAgent`, `Contact`, `Conversation`, `MessageTemplate`, `Journey`, `Integration`)
- Split `data/mock.ts` into `data/mock/` per §33

Do this **before** Phase 1, not after. Analytics filters, date ranges, and sorting are all impossible against pre-formatted strings, and every screen built on the current shape has to be revisited.

**Size: M. Blocks: date range, analytics filters, any sorting.**

### 0.3 Async accessor seam

Components import fixtures at module scope. Nothing is async, which is the actual reason no loading or error state exists anywhere in the app.

- `data/repo.ts` exposing async getters over the fixtures
- Artificial latency, toggleable, plus a forced-failure switch for demoing §27 error states

This is deliberately thin. It is not an ORM or an API client; it exists so that loading and error states have somewhere to live.

**Size: S. Blocks: all of §27.**

### 0.4 Primitive components (spec §32)

Currently built: Button, Input, Card, Badge, Toast, Dialog *(unused)*.

Needed before Phase 1–3 features can be built properly:

| Primitive | First needed by |
|---|---|
| Tabs | Template detail, settings sub-routes, builder config tabs |
| Select, Switch, Checkbox, Textarea | Campaign wizard, node inspector, sandbox |
| Tooltip | KPI definitions (§10.3 — the `hint` data already exists and is never rendered) |
| Skeleton | §27 loading |
| EmptyState, ErrorState | §27, §24 |
| Drawer | Mobile context panels, integration detail |
| Dropdown | Table action menus (§10.5) |
| DateRange | §10.1 |
| Avatar | Conversations, team |

Builders currently use raw `<select>` and `<input>`. Every one of those is rework later.

**Size: L. Blocks: most of Phases 1–3.**

### 0.5 Route-level state files

`loading.tsx`, `error.tsx`, `not-found.tsx`. None exist today.

**Size: S.**

**Phase 0 exit criteria:** project has its own git repo; `pnpm build` passes with `ignoreBuildErrors` removed; one page demonstrates loading → loaded and loading → error.

---

## 2. Phase 1 — Complete the demo narrative

Everything here is on the §37 critical path. This phase is what converts "good-looking prototype" into "closes the demo."

### 1.1 The customer-side RCS flows (spec §22) — **highest value item in the plan**

12 of 13 flows are absent. §22 calls them critical, and they are the only part of the product that shows the person receiving the message. Without them RCX demos as a dashboard.

Build a reusable **flow player**: a phone frame that steps through a scripted sequence with the six §22 states (trigger → context → decision → action → confirmation → recovery), driven by data, not bespoke markup per flow.

Then script the flows in value order:

1. §22.1 First-time trust — carries the "why verified branding matters" argument
2. §22.2 Booking and rescheduling — extend the existing thread to full depth
3. §22.3 Payment and deposit
4. §22.4 Quote review and partial approval — the most visually distinctive
5. §22.5 Order delivery exception — shows two-way operational control
6. §22.6 Support with human handoff — pairs with the Conversations takeover demo

Remaining seven (§22.7–22.13) in Phase 3.

Surface them in two places: the marketing use-case cards, and a `/app` flow gallery for demos.

**Size: L. This is the single biggest lever in the plan.**

### 1.2 Messages list (§12.1)

No `/app/messages` route exists, and the `messagesList` fixture is written but never imported. Add the list, `/new`, and `/:id`; point the sidebar at the list, with the builder as the editor.

**Size: M.**

### 1.3 Journey list and per-journey routes (§13.1)

`/app/journeys` currently opens the builder directly. Add the list, `/new`, and `/:id`.

This is the seam in the §37 demo: "open the Service Reminder journey" currently lands on a generic builder rather than that journey.

**Size: M.**

### 1.4 Journey canvas branching (§13.2)

The canvas renders a fixed linear chain. §13.2 specifies a branch/merge topology — condition nodes that split and rejoin. A linear chain undersells the product to anyone who has seen a competing tool.

**Size: L.**

### 1.5 Overview completion (§10)

Missing: date range (§10.1), quick actions (§10.2), KPI tooltips (§10.3), integration health (§10.7), recent conversations (§10.8), active RCS agents (§10.9), and the three dashboard states (§10.10).

The dashboard is the first screen in the demo and §10 says it must answer four questions in ten seconds. It currently answers three — "what needs my attention" is there, but integration health and live conversations are not.

**Size: M.**

**Phase 1 exit criteria:** the full §37 sequence runs with no dead ends and no generic-placeholder landings.

---

## 3. Phase 2 — Commercial surfaces

Credibility for buyer-side scrutiny: the questions asked after the demo lands.

- **Integration Connect modal (§18.4)** and detail view with 5 tabs (§18.3). `Dialog` is built and imported nowhere — this is its first real use. Connect must visibly change card state and add a health entry.
- **Developer sandbox (§19.5)** — capability toggles, simulated send, simulated inbound reply, simulated failure. This is the proof that RCX is API-first.
- **Expandable API log rows (§19.4)** with request/response/provider payloads and replay.
- **API key creation (§19.2)** — the show-secret-once modal is explicitly specified.
- **Brand profile, use cases, test devices (§20.4–20.6).**
- **Analytics: global filters (§17.1), RCS vs SMS comparison (§17.4), journey performance table (§17.5).**

**Size: L overall. Parallelizable — these six are independent of each other.**

---

## 4. Phase 3 — Operational breadth

- Campaign four-step builder (§14.2) — the largest single missing feature, but off the demo path
- Settings: Consent (§21.4) and Billing (§21.5) tabs; sub-routes (§4.2)
- Onboarding, five steps (§9.2)
- Remaining §22 flows (22.7–22.13)
- Secondary marketing routes — 4 `/product/*`, 6 `/solutions/*`, 5 `/industries/*`. Nothing links to these today, so nothing 404s; they matter for completeness against §4.1, not for the demo.

---

## 5. Phase 4 — Quality

- §27 states applied across every page (the components land in Phase 0; this is the sweep)
- Accessibility (§29): reduced-motion, focus traps, contrast audit, table headers
- Tablet icon rail (§7.2) — layout currently jumps from full sidebar straight to drawer
- Responsive pass against §28
- §34: no console errors, no layout shift, hover/focus/disabled on all controls

---

## 6. Sequencing notes

**The one hard ordering constraint** is Phase 0.2 (data model) and 0.4 (primitives) before Phase 1–3 features. Everything else can move.

**If time is short**, the highest-value cut is: Phase 0 → §22 flow player with 3 flows → journey list/`:id` → overview completion. That is roughly a third of the remaining work and it fully carries §37.

**What not to build:** anything in §38. Also real auth, real persistence, and a real backend — all three are explicitly out of scope per §0, and all three are easy to drift into while building the data layer.

---

## 7. Open questions

1. **Where are `renderings/` and `reference-prototype/`?** Both are cited as sources of truth (§5, §39) and neither is in the repo. Without them there is no visual target to check against — the build so far derives its look from §6 tokens alone.
2. **Is the current visual direction approved?** If the renderings are going to change the look, Phase 0.4 primitives should wait, since they encode the design system.
3. **Charts:** §0 recommends Recharts; the build hand-rolls SVG. Hand-rolled is lighter and currently works. Recommend keeping it unless §17 filtering pushes past what it can do.
4. **Demo mode:** worth a global toggle that forces error/empty/pending states for demoing §27 without breaking the happy path?
