# DESIGN-SYNC.md ledger format

`.agent-state/DESIGN-SYNC.md` records the design-repo state the `src/` port is aligned to. The `design-sync` skill reads its **TOP data row** as the baseline and appends a new TOP row each time the user confirms a sync.

## Why it lives in `.agent-state/`

Per AGENT.md, `.agent-state/` tracks `src/` Liquid port work. The sync baseline is port state — "which design version did we port up to" — so it belongs here alongside PLAN/PROGRESS/INVENTORY, not in git history. It is rewritten append-only (newest row on top), same spirit as PROGRESS.

## File template (use this when bootstrapping)

```markdown
# Design sync ledger

> Records the design-repo state (version + commit) that the `src/` port is aligned to.
> The TOP data row is the LIVE baseline that `/design-sync` diffs `design HEAD` against.
> Append a new TOP row (newest first) ONLY after the user confirms a re-port is done.
> Owned by the `design-sync` skill. `design/` is a separate repo — see `design/.clone-source`.

| Date | Design version | Commit | Synced by | Notes |
| --- | --- | --- | --- | --- |
| 2026-06-10 | 1.0.0 | `84a89fc` | session 4 | Baseline established (clean slate). Header/search/cart already ported. |
```

## Column meaning

| Column | What goes in it |
| --- | --- |
| **Date** | The day the row was recorded. Ask the user — the agent cannot read the clock reliably. |
| **Design version** | `version` field from `design/package.json` at that commit. |
| **Commit** | Short SHA of `design` HEAD at sync time, in backticks. This is what the engine diffs from. |
| **Synced by** | Session number or short attribution, matching PROGRESS session numbering. |
| **Notes** | One line: what was re-ported / why the baseline moved. For the bootstrap row, note whether it was "clean slate" or "backfill from `<ref>`". |

## How the engine parses it

`design-diff.py` walks the file, skips the header + separator rows, and takes the **first data row** it finds. The 3rd cell (Commit, backticks stripped) becomes the baseline ref; the 2nd cell (version) is shown as the baseline version in the report. So the newest row MUST be on top.

## Advancing the baseline

When the user confirms a batch synced, prepend a row — do not edit old rows (they're the audit trail of how the port tracked the design over time):

```markdown
| Date | Design version | Commit | Synced by | Notes |
| --- | --- | --- | --- | --- |
| 2026-06-18 | 1.1.0 | `a1b2c3d` | session 5 | Re-synced header + footer chrome after token bump; plp-* added to PLAN backlog. |
| 2026-06-10 | 1.0.0 | `84a89fc` | session 4 | Baseline established (clean slate). Header/search/cart already ported. |
```

If only part of a worklist was re-ported, prefer leaving the baseline where it is and recording partial progress in PLAN — advancing past un-synced modifications hides them from the next report. See SKILL.md Step 5.
