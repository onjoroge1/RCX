# RCX Roadmap — status graph

**Purpose:** the file to read first. Terse by design so a session can load state cheaply.
**Companion docs:** `RCX_AI_BUILD_SPEC.md` (product truth, §41 = audit, §42 = schema decisions), `BUILD_PLAN.md` (superseded by §41/§42 for anything backend).
**Updated:** 2026-08-14

Legend: `✅ done+verified` · `🟡 done, unverified` · `⬜ not started` · `🔴 known broken/risk`

---

## 1. Backend phases

```
A  Schema + DB client ........... ✅  72 tables, migrations 0000+0001 applied to Neon
B  Auth.js v5 + scope ........... ✅  JWT sessions, proxy.ts gate, demo sign-in, RBAC seeded
C  Seed (tier1 + tier2) ......... ✅  2,006 contacts, 90d rollups, deterministic
D  Migrate reads ................ 🟡  7 of 11 routes  ← CURRENT
E  Writes (server actions) ...... ⬜  BLOCKS every mutation in the app
F  Provider + journey runner .... ⬜
G  /admin, leads, pricing ....... ⬜
```

## 2. Phase D detail — `git grep -l '@/data/mock' -- app components` is the meter

```
✅ overview .......... 5e08c7f   KPIs, outcomes, attention (6 live checks), journeys, channel mix
✅ conversations ..... 77c073d   thread ordering, context pane, contact_records
✅ contacts .......... 77c073d   server-side search/filter/paging, 2,006 rows, consent timeline
✅ templates ......... 76ebb33   usage DERIVED via template→message→node→rollup
✅ brand ............. 76ebb33   per-agent checklist, test devices, per-country carrier
🟡 campaigns ......... UNCOMMITTED, unverified
🟡 settings .......... UNCOMMITTED, unverified — roles matrix now real grants
⬜ analytics ......... mock import live
⬜ integrations ...... mock import live
⬜ developers ........ mock import live
⬜ journey-builder ... mock import live
⬜ message-builder ... not mock, but local const; not DB-backed
```

**Definition of done for Phase D:** `git grep '@/data/mock'` returns 0, then `rm data/mock.ts`.

## 3. Routes that do not exist (spec §4.2)

```
⬜ /app/messages, /new, /:id ........ §12.1 list never built; messagesList fixture unused
⬜ /app/journeys/:id, /new .......... §37 demo seam: "open Service Reminder" lands on generic builder
                                      overview already links here → 404 today
⬜ /app/developers/{api-keys,webhooks,logs,sandbox,sdks,docs}
⬜ /app/settings/{general,team,roles,consent,billing,audit}   (tabs exist, routes don't)
⬜ marketing: /product/* (4), /solutions/* (6), /industries/* (5)   — nothing links to these
```

## 4. Spec features still absent

| § | Feature | Note |
|---|---|---|
| 9.2 | Onboarding, 5 steps | entirely absent |
| 14.2 | Campaign 4-step builder | largest single missing feature |
| 18.3/18.4 | Integration detail + Connect modal | `Dialog` component still imported nowhere |
| 19.2/19.4/19.5 | Key-create modal, expandable logs, sandbox | sandbox is the API-first proof |
| 22.7–22.13 | 7 remaining customer flows | authoring only, renderers exist |
| 17.1/17.4/17.5 | Analytics filters, RCS-vs-SMS, journey table | |
| 10.1/10.2 | Date range, quick actions | |
| 7.2 | Tablet icon rail | jumps full sidebar → drawer |
| 21.4/21.5 | Consent + Billing settings tabs | |

## 5. Known risks — read before shipping

```
🔴 SEED NON-CONVERGENT ....... 60 onConflictDoNothing vs 7 DoUpdate. Re-running does not
                               apply changed field definitions to existing rows. Counts-based
                               idempotency tests structurally cannot catch this.
🔴 PROD BUILD UNVERIFIED ..... `next build` had never been run until 2026-08-14. Dev ≠ prod.
🔴 TENANT ISOLATION UNTESTED . One workspace exists. scoped() is uniformly applied by
                               convention but has never been proven against a second tenant.
🔴 ZERO TESTS ................ no unit, integration, or e2e. Verification is manual curl + browser.
🟡 NO RLS .................... deliberate (§42 accepted gap); app-layer scoping only.
🟡 getTxDb NEVER EXERCISED ... no writes exist yet, so the pooled/transaction path is unproven.
🟡 WRITES ARE ALL FAKE ....... take over, send, save, invite, connect → toast only. Labelled
                               honestly in UI, but nothing persists. Phase E.
🟡 MACHINE .................... disk 91%, swap saturated. dev start ~5min, first compile 1-2min.
```

## 6. Priority order (highest value first)

1. **Finish Phase D** — 4 routes. Removes the last fiction; each has exposed a real bug so far.
2. **Phase E writes** — the app is read-only. Every button that matters is a toast.
3. **`/app/journeys/:id`** — §37 demo path is broken here *and overview links to a 404 today*.
4. **Seed convergence sweep** — before more seed fields get added and silently not apply.
5. **First test** — pin tenant isolation and the §37 path so regressions surface without a browser.
6. Phase F provider/runner, then G.

## 7. Verification commands

```bash
git grep -l '@/data/mock' -- app components   # Phase D meter
npx tsc --noEmit                              # types
npx next build                                # prod build — RUN THIS, it was never run
pnpm db:seed                                  # idempotent-ish; see risk above
curl -sI localhost:3000/app/overview          # expect 307 when signed out
```
