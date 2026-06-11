# Progress Protocol

How and when to write to `.agent-state/PROGRESS.md`.

## Scope — what gets logged

`PROGRESS.md` tracks **`src/` Liquid theme work only**. In scope:

- Section ports (`src/sections/<name>/`)
- Snippet creation / variants / restyles (`src/snippets/<name>/`)
- Block authoring (`src/blocks/`) when user has opted in
- Group / layout / page-template work (`src/groups/`, `src/layout/`, `src/pages/`)
- Schema fixes + preset value mappings (`src/config/`)
- Token mappings into `theme-config/theme.config.json` when tied to a port
- `design/` reading + reuse decisions

**Out of scope — do NOT log here:**

- `.claude/` system updates — skill description edits, AGENT.md changes, new hook files, reference doc additions, clarify-protocol edits, validator script changes.
- Build pipeline / `theme-config/` tweaks unrelated to a specific section port.
- README / docs-only changes.

System-level changes leave a trace in **git commit history** (use `/git` with scope `.claude` / `.claude/<skill>` / `agent-state`). That's the system changelog — don't duplicate into PROGRESS.

## When to write

- **At the END of each session**, never in the middle.
- A "session" = one conversation. If the user closes Claude and reopens, that's a new session.
- If a single conversation spans multiple distinct goals (rare), it's still **one entry** — list multiple goals in the body.
- **If a session contains ONLY system-level work** (no `src/` change), skip the PROGRESS entry. Git commits capture it.

## File format

`PROGRESS.md` is **append-only newest-first**. New entry goes at the TOP of the file (under the title), pushing older entries down. This way the most relevant entry is the first thing read.

```markdown
# Progress Log

> Append-only. Newest entry first. See `.claude/skills/planner/references/progress-protocol.md` for the entry template.

---

## YYYY-MM-DD (session N)

**Goal:** <one sentence — what this session set out to do>

**Done:**
- <accomplishment 1>
- <accomplishment 2>

**Decisions:**
- <decision 1 + reasoning>
- <decision 2>

**Files touched:**
- created: `path/a`, `path/b`
- edited: `path/c`, `path/d`
- deleted: `path/e`

**Open / next session:**
- <open item 1 — what to do, what's blocking>
- <open item 2>

---

## YYYY-MM-DD (session N-1)
...
```

## Section semantics

### Goal

One sentence. The most concrete framing of what the session was trying to accomplish. Examples:

- "Port subscribe section as proof of design-to-liquid pipeline"
- "Establish project memory system (planner skill + state docs)"
- "Fix theme-editor errors blocking Folio preset preview"

Avoid vague phrasings like "general work" or "improvements".

### Done

Concrete accomplishments. Each bullet:
- An action verb
- The artifact / area
- (optional) Why it matters

Examples:
- "Created `src/sections/subscribe/{subscribe.liquid, subscribe.global.scss, schema.js}` (validator passes)."
- "Fixed 6 preset bugs: corner_radius, font_size_6 step, line_height_2/4 step, case_X format, orphan inverse scheme."

### Decisions

Choices made that future-you needs to know. Each bullet:
- The decision
- The reasoning (one line)

These are gold for resumption — they explain why current state looks the way it does.

Examples:
- "Convention: edit `preset-N.js` slots, don't create new preset files. Reason: keeps file slot count stable when .claude is copied to other projects."
- "Validator placed in `.claude/skills/design-to-liquid/scripts/` (not project root scripts/) so it moves with the skill."

### Files touched

Group by action verb (created / edited / deleted). Keep paths relative to project root. Optional one-line annotation if the change is non-obvious.

### Open / next session

The single most important section for resumption. List unresolved items with enough context for a cold-start conversation:

- What needs doing
- What's blocking (if anything)
- Where to find the relevant work-in-progress files

A good "Open / next" entry lets a new conversation jump in without reading the rest of the log.

## What NOT to log

- Routine reads (don't list "read schema.js" as a Done item)
- File-by-file diffs (the git log already has those)
- Long quotes of decisions made elsewhere (link / reference instead)
- Detailed how-to content (that's skill references' job)

## Edge cases

### Rolling back a previous decision

Don't edit the old entry. Add a new entry with a `**Reversal:**` section explaining what changed and why. The historical record stays intact.

### A session interrupted mid-task

Still write the entry. Use:
- **Done:** what got finished
- **Open / next:** "Mid-task on <X> — current file is <path> at <state>; continue by <next step>"

### Multi-day conversation (rare)

If the conversation spans a day boundary without closing, still ONE entry. Use the date you started. Note the duration in the Goal.
