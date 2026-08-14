<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

# RCX working rules

## Read first

`ROADMAP.md` — status graph, priorities, known risks. Update it when a phase moves.
`RCX_AI_BUILD_SPEC.md` §41 (audit) and §42 (schema decisions) override `BUILD_PLAN.md` for anything backend.

## Ship rule: audit every build before calling it done

**No build is "done" until this audit has been run and its findings reported.** Not a summary of intent — an adversarial pass looking for what will burn us in production. Do not reassure. If the audit finds nothing, say so plainly and show what was checked.

Run it against the change just made:

1. **Assumptions.** Every assumption made that the spec did not state — about data, APIs, user behaviour, environment, edge cases. For each: is it load-bearing, and what breaks if it is wrong?
2. **Unverified claims.** Everything asserted as fact — endpoints, library methods, field names, response shapes, limits, config syntax. Mark each **verified** (seen in docs / actual code / a real response) or **assumed from pattern**. Every "assumed" is a likely invention.
3. **Fakes.** What is stubbed, mocked, hardcoded, or happy-path-only while *looking* finished.
4. **Viability killers.** Ranked: what, if true, means this cannot ship.
5. **Verify the top items now.** Run the check, read the doc, query the database. Report results — do not guess.
6. Least confident about?
7. Possible failure modes?
8. Investigate those: root cause, and what would raise confidence.
9. The biggest thing the user does not realise about what was built.
10. Recommendations.

### Non-negotiables the audit exists to catch

- **A page rendering correctly is not evidence the data is correct.** Query the database directly. Two real bugs this session (duplicated webhook rows, unapplied `createdFromTemplateId`) rendered as plausible UI.
- **Check the server log before the browser console.** A stale tab with dead HMR replays phantom errors; `preview_logs --level error` is authoritative.
- **`onConflictDoNothing` is non-duplicating, not convergent.** Use `onConflictDoUpdate` for any field that may change in a seed definition.
- **Never claim "verified" for something only type-checked.** Types passing ≠ query correct ≠ data correct.
- **Never delete `.next` while the dev server runs.** Stop it first.

## Conventions

- `import 'server-only'` at the top of every file in `lib/db/**` and `lib/auth/**`.
- No query function takes a `workspaceId` parameter — each calls `getScope()` itself. One exception makes the convention uncheckable.
- Reads use `db` (neon-http). Writes use `getTxDb()` (pooled) — the HTTP driver has no interactive transactions.
- DTOs return numbers and `Date`s. Formatting happens on render, via `lib/format.ts`.
- Pass `now` from the server into any component using relative time, or hydration mismatches.
- Enums are lowercase in the DB; display casing lives in `lib/labels.ts`.
- Next.js 16: `proxy.ts`, not `middleware.ts`.
