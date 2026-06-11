# Inventory Protocol

How to use `scan-inventory.py` and read `INVENTORY.md`.

## What the scanner does

`.claude/skills/planner/scripts/scan-inventory.py` walks both sides and writes a fresh `.agent-state/INVENTORY.md`:

- `design/src/sections/` → list section names + presence of HTML/SCSS files
- `design/src/components/` → list component names
- `src/sections/` → list section folders + which files they have (`.liquid`, `schema.js`, `*.global.scss`, `preset-*.js`)
- `src/snippets/` → count + flag recently-modified snippets
- Cross-reference → "Design → src mapping" table with coverage status

It does NOT modify any file other than `INVENTORY.md` itself.

## When to run

| Trigger                                                       | Action                                                    |
| ------------------------------------------------------------- | --------------------------------------------------------- |
| Start of a new session AND last INVENTORY is >3 sessions old  | Run before deciding next work                             |
| Just completed a section / batch                              | Run to confirm `PLAN.md` is up to date               |
| Doing gap analysis ("what's still missing?")                  | Run first, then read the "Gaps" table                     |
| Plan and reality look disagreeing                             | Run to ground-truth                                       |

## How to run

```bash
python .claude/skills/planner/scripts/scan-inventory.py
```

Optional flags (see `--help`):

- `--design <path>` — override design folder location (default `design/`)
- `--summary` — print a one-line summary to stdout instead of writing `INVENTORY.md`

The script exits 0 on success, 1 if it can't find the design or src folders.

## Reading `INVENTORY.md`

The generated file has three top-level sections:

### `src/sections/` enumeration

A row per section folder with file presence checkmarks. Use this to spot half-finished sections (schema.js exists but no `*.global.scss`, etc.).

### `design/` enumeration

A row per design section / page / component. Quick way to see total scope without opening the design folder.

### Design → src mapping

The most actionable table. Each design section gets a row showing whether a same-named src section exists. Examples:

| Design section          | src/sections/ match    | Coverage  |
| ----------------------- | ---------------------- | --------- |
| subscribe               | subscribe              | ✅ matched  |
| hero                    | _none_                 | ⚪ gap    |
| featured-products       | featured-collection?   | ❓ verify |

Name-matched cases are reliable. The `❓ verify` cases are heuristic — a generic src section might cover the design's purpose under a different name. Resolve those manually and reflect in `PLAN.md`.

### `INVENTORY.md` is read-only

Don't hand-edit. Re-run the scanner. Hand-edits will be overwritten on next run, and they'd mislead about live filesystem state.

## Reconciling with `PLAN.md`

After running the scanner:

1. Open both `INVENTORY.md` (just refreshed) and `PLAN.md` (your living plan).
2. For each ⚪ gap in INVENTORY's "Design → src mapping" — ensure there's a corresponding row in PLAN's Sections table.
3. For each ✅ matched but with mismatched intent — either:
   - Update PLAN to ✅ if work is genuinely done, OR
   - Add a note explaining why it's matched-but-not-done (e.g. "folder exists, visual incomplete")
4. Surface any surprises to the user (e.g. "Scanner found 3 sections in src/ that aren't in the plan — were these created earlier?").

## Limitations

- **Name matching is shallow.** A design section named `featured-products` doesn't programmatically know that `src/sections/featured-collection/` covers the same purpose. Semantic matching is your job.
- **Doesn't inspect content.** The scanner only checks file presence, not visual correctness. A section can show ✅ matched in inventory while still being visually broken.
- **Snippet inventory is intentionally light.** Listing all ~150 snippets would be noise — the scanner highlights only those modified recently or created by the port effort. Cross-reference with `PLAN.md`'s "Snippets touched / created" table for canonical changes.
