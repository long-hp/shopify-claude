---
name: planner
description: Use at the START of every conversation working on this project, and again whenever planning, tracking progress, or doing gap analysis on the design-to-liquid port. Owns three state documents under .agent-state/ that persist across sessions — PLAN.md (what needs porting and in what order; sections, snippets, presets, gaps), PROGRESS.md (append-only changelog so the next conversation knows what was done and where to resume), INVENTORY.md (live mirror of src/ vs design/ coverage, refreshable by a scanner script). Invoke this skill when the user asks "what's next?", "where did we stop?", "resume", "what's been done?", "compare with design", "what's missing", or when a new conversation opens on this project (read state first). This skill answers WHAT to do and STATUS — it does NOT cover HOW to port a section; for that, hand off to the design-to-liquid skill once the next item is picked. Ships a scanner at .claude/skills/planner/scripts/scan-inventory.py that regenerates .agent-state/INVENTORY.md from the filesystem.
---

# Port Planner

The brain of the project's design-to-liquid port. Tells you **what to do, where you are, and what's missing** — separate from the `design-to-liquid` skill which only knows HOW to port a section once chosen.

## State documents (single source of truth)

All three live under `.agent-state/`:

| Document          | Updated by                                          | Read at              |
| ----------------- | --------------------------------------------------- | -------------------- |
| `PLAN.md`    | Claude at kickoff + after each completed item       | Whenever picking next work |
| `PROGRESS.md`     | Claude at the **end** of every session (append-only)| First thing in a new session |
| `INVENTORY.md`    | The scanner script (`scan-inventory.py`)            | When verifying coverage / before quarterly cleanup |

## When to invoke this skill

### Session start (every new conversation)

1. Read `.agent-state/PROGRESS.md` — most recent entries reveal current state and "open" items.
2. Read `.agent-state/PLAN.md` — the next pending item and prerequisites.
3. If `INVENTORY.md` is more than ~3 sessions stale, run `scan-inventory.py` before deciding next work.

→ See `references/resumption-protocol.md`.

### During work

- Mark items done in `PLAN.md` immediately when finished (status `⚪ pending` → `✅ done`).
- Don't write to `PROGRESS.md` in the middle of work — wait for end-of-session.

### Session end

Append one entry to `PROGRESS.md` describing:
- The session's goal
- What was done (with file paths)
- Decisions and gotchas
- What's still open / what to do next session

→ See `references/progress-protocol.md`.

### Project kickoff (first time)

Scan `design/` to enumerate pages, sections, components. Draft the initial `PLAN.md` and let the user prioritize. Don't try to plan everything — leave details for fill-in.

→ See `references/kickoff-protocol.md`.

### Gap analysis (any time)

Run `python .claude/skills/planner/scripts/scan-inventory.py` then read `INVENTORY.md`. Look at the "Design → src mapping" table for missing sections.

→ See `references/inventory-protocol.md`.

## Hand-off to `design-to-liquid`

Port-planner picks WHAT. Once a target is chosen (e.g. "port `hero` section next"), invoke the `design-to-liquid` skill for the actual port. Its workflow (Step 0 tokens → Step 1 survey → Step 2 audit → … → Step 6 restyle) takes over.

When the section is done:
1. Mark item ✅ in `PLAN.md`
2. Add brief entry to `PROGRESS.md` at session end
3. Move to the next pending item or surface a question for the user

## Conventions enforced by this skill

- **Single-source-of-truth.** Plan, log, and inventory are markdown files in `.agent-state/`. Don't fork them.
- **Append-only PROGRESS.md.** Never rewrite history; if a previous decision changed, note the reversal in a new entry.
- **PLAN.md status icons:** ⚪ pending · 🔵 in progress · ✅ done · ⏸ paused / blocked · ❌ removed-from-scope
- **One entry per session in PROGRESS.md.** A session = one conversation. Date header + 5 standard subsections (Goal, Done, Decisions, Files touched, Open / next).
- **No PII / secrets** in any state document. They're commit-tracked artifacts.

## Reference index

- `references/kickoff-protocol.md` — first-time bootstrap when no `PLAN.md` exists yet
- `references/plan-document-format.md` — full schema of `PLAN.md` tables
- `references/progress-protocol.md` — `PROGRESS.md` entry template + when to append
- `references/resumption-protocol.md` — the exact session-start checklist
- `references/inventory-protocol.md` — scanner usage + `INVENTORY.md` format

## Related skills

- `design-to-liquid` — the HOW-to-port skill (handed off to after planning picks WHAT)
- `schema`, `scss`, `xo-css`, `liquid-doc` — domain knowledge for individual files
