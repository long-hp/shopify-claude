# Session Resumption Protocol

What to do in the **first 30 seconds** of a new conversation on this project.

## The 3-step checklist

### 1. Read `PROGRESS.md` (bounded, never the whole file)

```
Read(.agent-state/PROGRESS.md, limit: 100)
```

The file has a **"Session summary" table at the top** giving 1-line orientation per session. Read that table + the latest verbose entry. Pay attention to:

- The session-summary table — quickly scan all sessions. Pick out anything flagged `❌→Nx` (failed, recovered in session Nx) or `paused`.
- The previous session's **Open / next** section — that's what you should be doing now (or asking the user about).
- Any **Decisions** flagged that affect current work (e.g. "paused because user is redesigning X").
- **Files touched** in the previous session — these are the most likely areas of active work.

If the latest entry alone doesn't paint a clear picture, expand the read: `Read(.agent-state/PROGRESS.md, limit: 200)`. **Do NOT read the whole file** at session start — older entries are archaeology, only grep when investigating a specific past decision. If you need an archived entry, grep `.agent-state/archive/PROGRESS-*.md` on-demand.

### 2. Read `PLAN.md`

```
.agent-state/PLAN.md
```

Skim every table. Look at:

- Which items are 🔵 in progress (these are your active focus)
- Which items are ⏸ paused (and why — note in "Open decisions / blocks" section)
- The first ⚪ pending item in the highest-priority table

### 3. (Conditional) Refresh `INVENTORY.md`

If the latest INVENTORY.md timestamp is older than the latest PROGRESS.md entry by more than ~3 sessions, the inventory is stale:

```bash
python .claude/skills/planner/scripts/scan-inventory.py
```

This walks `design/src/sections/` and `src/sections/` and recomputes coverage. Skip if PLAN.md already reflects fresh state.

## What to do next

Based on what you read:

| Situation                                                         | Action                                                                  |
| ----------------------------------------------------------------- | ----------------------------------------------------------------------- |
| Latest entry says "next session: X" and X is unambiguous          | Tell user "Resuming X. Should I proceed?"                               |
| Latest entry mentions an ⏸ blocked item                           | Ask user whether the blocker is resolved                                |
| Multiple things 🔵 in progress                                   | Ask user which one to prioritize                                        |
| Nothing 🔵 active, all ⏸ or ⚪                                   | Suggest the highest-priority ⚪ item from PLAN.md                  |
| Plan looks stale (more sections in src/ than tracked in plan)     | Suggest running scanner + reconciling                                   |
| User opens with their own question                                | Answer it, then ask if they want to continue the open item              |

## What NOT to do

- **Don't re-read every reference in every skill.** Skills are read on-demand when their context applies; the state files are the daily working set.
- **Don't append to PROGRESS.md at session start.** Only at session END.
- **Don't speculate about state from memory** — always re-read the state docs. Sessions are stateless.
- **Don't silently start porting** something that's marked ⏸ paused without confirming with the user.

## Quick session-start template

A reliable opener for any new conversation:

```
Reading .agent-state/PROGRESS.md and PLAN.md to catch up …

Last session: <date> — <one-line goal from last PROGRESS entry>
Open: <"next" item from last PROGRESS entry, OR first 🔵 item from PLAN>
Blocked: <list ⏸ items with their blocker reasons>

Want me to continue with <open item> or pick a different item from the plan?
```

This makes the user immediately confident the system remembered yesterday's work.
