---
name: design-sync
argument-hint: "(no args — diff design HEAD vs baseline)"
description: Use when the design source has been updated and the ported Shopify theme may now be behind. The design/ folder is a SEPARATE git repo (cloned from the upstream Folio HTML template) versioned via design/package.json; pulling a new version advances its git HEAD. This skill diffs the current design HEAD against the last synced baseline (recorded in .agent-state/DESIGN-SYNC.md), buckets what changed (tokens/foundation, sections, components, pages), cross-references PROGRESS.md to tell which changed units are ALREADY PORTED (need re-sync) vs net-new (backlog), produces a severity-sorted impact table, and proposes batched re-port work handed off to the design-to-liquid skill. Invoke this for "/design-sync", "I pulled a new design", "design có bản mới", "design update / cập nhật design", "check design changes", "đồng bộ design", "what changed in the design since last time", "design version bumped", "re-port what's stale", or at the start of a session right after a `git -C design pull`. Do NOT use it to port a brand-new section from scratch (that's design-to-liquid) or to track src-side progress (that's planner) — design-sync is the bridge that turns "design moved forward" into "here's the re-port worklist". After it reports, it updates the DESIGN-SYNC.md baseline ledger only once the user confirms a batch is actually synced.
---

# design-sync

Turn **"the design repo moved forward"** into **"here's exactly what to re-port, in priority order."**

## Why this exists

`design/` is a separate git repo (clone of the upstream Folio HTML template, see `design/.clone-source`), versioned by `design/package.json`. When the user pulls a new version, design's git HEAD advances — but the ported theme under `src/` doesn't know it's now stale. Nothing records *which design commit the port was aligned to*, so "what changed and what do I redo?" has been a guessing game.

This skill closes that loop:

1. A **baseline** — the design version + commit the port is currently aligned to — lives in `.agent-state/DESIGN-SYNC.md`.
2. The engine diffs `baseline..HEAD` and buckets every changed file.
3. **You** (the judgment layer) resolve which changed units are *already ported* and therefore need re-syncing, vs net-new work for the backlog.
4. You produce an impact table and propose **batches** that hand off to `design-to-liquid`.
5. After the user confirms a batch is synced, you advance the ledger.

The `version` in `package.json` is the human-facing headline ("are we behind?"). The git commits are the precise diff. Use both — and never trust version alone, because a pull can land many commits under the same version number.

## Step 0 — Bootstrap (only when no ledger exists yet)

If `.agent-state/DESIGN-SYNC.md` is absent, there's no baseline. The engine exits with code 3 and prints `NO_BASELINE`. Establish a baseline before anything else.

Ask the user which baseline they want (use `AskUserQuestion`):

- **Clean slate (recommended)** — baseline = current design HEAD. Future pulls are tracked from here; existing already-ported work is assumed in sync. Pick this when the port is roughly current and they just want forward tracking.
- **Backfill audit** — baseline = an older commit (e.g. the design HEAD around the last big port session — cross-check dates in `PROGRESS.md`). The first report then surfaces the full backlog of drift since then. Pick this when they suspect the port already lags the design.

> [!IMPORTANT]
> **Clean-slate guardrail — never baseline on top of unported drift.** Clean slate assumes everything up to HEAD is already ported. That is FALSE when the latest design commit(s) — often the very release that bumped `package.json` — modified already-ported sections; baselining at HEAD then buries those changes inside the baseline (`baseline..HEAD` is empty → the next report wrongly says "up to date"). Before writing a clean-slate baseline at HEAD, verify HEAD isn't already ahead of the port:
> 1. Run `python .claude/skills/design-sync/scripts/design-diff.py --since HEAD~5` (widen the range if the port lagged further; cross-check `PROGRESS.md` dates for the last port session).
> 2. Cross-check the 🟠 list against already-ported sections (grep `PROGRESS.md` "Files touched"). If any ported section shows as modified/removed, HEAD is ahead of the port — clean-slate-at-HEAD would hide it.
> 3. In that case record the baseline at the **parent of the earliest commit that touched a ported section** (`<sha>~1`), NOT HEAD, so the drift surfaces on the first real report. Only baseline at HEAD when no recent commit touches a ported unit.

Then create the ledger from the template in `references/ledger-format.md` and record the chosen baseline. Stop here on first run unless the user picked Backfill (in which case continue to Step 1 with that commit).

## Step 1 — Run the engine

```bash
python .claude/skills/design-sync/scripts/design-diff.py
# or, to diff from a specific commit instead of the ledger baseline:
python .claude/skills/design-sync/scripts/design-diff.py --since <ref>
# add --json when you want to reason over structured data
```

The engine reads `design/package.json` version + HEAD, the ledger baseline, runs `git -C design diff --name-status --find-renames baseline..HEAD`, and emits a report grouped by severity tier:

| Tier | Meaning | Default action |
| --- | --- | --- |
| 🔴 **Foundation** | `src/styles/` tokens, `design-system.md`, `head.html`, fonts | Re-check **Step 0 token mapping** — a variable change ripples to every ported section |
| 🟠 **Units** | sections & components | Re-port if already ported; else backlog |
| 🟡 **Pages/blueprints** | page templates, `blueprint-*.md` | Informational — tells you which sections appear where |
| ⚫ **Infra** | build config, lockfiles | Usually ignore |

If the engine says **up to date**, report that and stop — there's nothing to re-port.

Each 🟠 unit carries a **PROGRESS mentions** hint (how many times the design unit's name appears in `PROGRESS.md`). High count ≈ likely ported; `0` ≈ likely new. **This is a hint, not proof** — design names rarely match src names 1:1 (`header` design → `src/groups/headers/header/`; `hero` design → an `image-banner`-style section), so resolve truth in Step 2.

## Step 2 — Resolve true port state (the judgment layer)

The engine can't know whether a design unit was ported, because the mapping is fuzzy. You resolve it per 🟠 unit and per 🔴 foundation change:

**For each 🔴 foundation change:** open the changed file's diff (`git -C design diff <baseline>..HEAD -- <path>`) and judge whether a token/variable the theme's Step 0 mapping depends on actually moved (color, font, type scale, radius, spacing). If yes, the fix is in `src/config/presets/preset-N.js` / global-schema — not in any one section. Flag it as the top priority; everything else is downstream of it.

**For each 🟠 modified/removed unit, decide ported-or-not:**

1. Grep `PROGRESS.md` for the design unit name and read the surrounding "Files touched" / "Goal" lines — they name the real `src/` target (e.g. searching `header` surfaces `src/groups/headers/header/header.global.scss`).
2. Cross-check `INVENTORY.md` and, when still unsure, grep `src/` for distinctive strings from the design unit (a class name, a heading copy).
3. Classify:
   - **Ported + modified** → *candidate* re-sync. Before calling it actionable, read the actual design diff (`git -C design diff <baseline>..HEAD -- src/sections/<unit>/`) and confirm the change touches the **ported surface**, not a sibling. A "modified" flag is often a sub-brand block being moved out (e.g. `header` showed up modified, but the diff was just `header-sound` announce CSS relocating to a new `announcement-bar-sound` section — the ported Folio base header was untouched). Only the part of the diff that hits the ported surface is real re-sync work; capture the resolved `src/` path for it.
   - **Ported + removed/renamed** → the src version may now be orphaned or misnamed; flag for the user (don't delete anything yourself — AGENT.md surgical-changes rule).
   - **Not ported + modified** → no rework; just note the design moved (PLAN/INVENTORY will catch it as backlog).
   - **New** → backlog item for a future `design-to-liquid` port, not a re-sync.

Keep this fast — you don't need to open every section's diff, only enough to confidently bucket ported vs not. When a unit is clearly new (0 mentions, `added`), trust it.

## Step 3 — Build the impact table

Present a single table the user can act on, ordered foundation-first then by ported-and-modified:

```
| # | Design change | Type | Ported? | src target | Action | Batch |
| - | ------------- | ---- | ------- | ---------- | ------ | ----- |
| 1 | src/styles/base/variables.scss | 🔴 token | foundation | preset-1.js | Re-check Step 0 mapping | A |
| 2 | header (modified)              | 🟠 sect | ✅ ported | groups/headers/header/ | Re-sync SCSS/settings | A |
| 3 | hero (modified)               | 🟠 sect | ⏳ next-in-plan | (image-banner audit) | Fold into planned port | B |
| 4 | plp-bento (added)             | 🟠 sect | ❌ new | — | Backlog (design-to-liquid) | — |
```

Always include the new design commit subjects (from the engine) above the table — the commit messages are the best summary of intent ("sound stack — 4 new sections + violet palette").

## Step 4 — Propose batches + hand off

Group the actionable rows into **batches** the user can take one at a time, and recommend the handoff:

- **Batch ordering:** foundation (🔴) first — re-mapping a moved token may auto-fix downstream sections via the CSS-variable cascade, shrinking the rest of the list. Then ported-and-modified sections grouped by area (header/footer chrome together, PLP family together, etc.).
- For each batch, name the concrete next command: *"Run `/design-to-liquid` on `<unit>` — it's an override re-sync of `src/groups/headers/header/`"* (or for new units: *"…a fresh port"*). Respect the group override ladder vs section port ladder per AGENT.md.
- Offer to write the new/backlog units into `PLAN.md` (via the `planner` skill) so they're not lost.

Do **not** start porting yourself — design-sync's job ends at the worklist + handoff. The user picks a batch; `design-to-liquid` does the actual re-port.

## Step 5 — Advance the ledger (only after confirmed sync)

When the user confirms a batch (or the whole set) is actually re-ported and verified, update `.agent-state/DESIGN-SYNC.md`: add a new TOP row with today's date (ask the user for the date — you cannot read the clock reliably), the new design version, the new short SHA, and a one-line note of what was synced. The TOP row is always the live baseline the next `/design-sync` diffs from.

**Never advance the ledger automatically just because you ran the report** — that would silently mark un-done work as done and the drift would vanish from the next report. Advance only what the user confirms.

If the user re-ports just part of the worklist, advance the ledger only if the remaining items are net-new backlog (tracked in PLAN) rather than un-synced modifications — otherwise the modified-but-skipped units would disappear. When in doubt, leave the baseline where it is and note the partial progress instead.

## Reference

- `references/ledger-format.md` — the `DESIGN-SYNC.md` table format + bootstrap template.

## Guardrails

- This skill is **read-and-report + ledger**, not a porter. The only file it writes is `.agent-state/DESIGN-SYNC.md` (and optionally PLAN via planner). All src/ changes go through `design-to-liquid`.
- PROGRESS-mention counts are heuristics — always confirm ported state with the grep/read pass before calling something "✅ ported".
- If the design repo is shallow or the baseline ref is missing, the engine errors — tell the user to `git -C design fetch` and retry.
- Foundation changes are the highest leverage: re-mapping one moved token can resolve many downstream "modified" sections at once. Always handle 🔴 before 🟠.
