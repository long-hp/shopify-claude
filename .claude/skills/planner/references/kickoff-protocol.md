# Kickoff Protocol

What to do the **very first time** a port project starts (no `PLAN.md` exists yet).

## Goal

Produce a lightweight `PLAN.md` skeleton that captures **scope** (what's in the design) and **starting priorities** (what to port first). Don't try to plan everything — leave details for fill-in during work.

## Steps

### 1. Locate the design source

The design folder convention is typically `design/` but the name may vary. Look for a folder containing:

- `pages/*.html` — page-level compositions
- `sections/<name>/<name>.html` — composable sections
- `components/<name>/<name>.html` — reusable components

Also look for markdown documentation:
- `brand.md` / `design-system.md` — design tokens (colors, fonts, scale, radius)
- `blueprint*.md` — per-page architecture
- `component-inventory*.md` — component catalog

### 2. Enumerate scope

For each of these, count and list names:

```bash
ls design/src/pages/ | grep '\.html$'                    # → pages
ls design/src/sections/                                  # → sections
ls design/src/components/                                # → components
```

Cross-check against existing src/:

```bash
ls src/sections/                                         # → already-created sections
ls src/snippets/                                         # → already-created snippets
ls src/pages/                                            # → already-existing template dirs
```

### 3. Read design tokens once

Read the design's `design-system.md` (or equivalent) to extract:
- Palette (default scheme + inverted scheme + sub-brand schemes)
- Fonts (body + heading + italic emphasis + accent)
- Heading scale (h1-h6 desktop/mobile)
- Corner radius preset name
- Page-level spacing rhythm

This populates the **Theme tokens (Step 0)** section of the plan with the right token rows.

### 4. Draft `PLAN.md` skeleton

Write the plan with the structure described in `./plan-document-format.md`. Fill what you know:

- **Theme tokens (Step 0)** — one row per token group, status ⚪ for all unless Step 0 already ran
- **Pages** — one row per design page
- **Sections** — one row per design section
- **Snippets touched / created** — empty
- **Open decisions / blocks** — start with whatever questions emerged during scan (e.g. "Multiple design pages use same template — which preset gets which?", "Sub-brand themes in scope?")
- **Gaps (auto)** — placeholder, will fill on first scanner run

Keep cells SHORT. Long-form details belong in `PROGRESS.md` or the relevant skill reference.

### 5. Present priorities to the user

Don't choose the first section to port unilaterally. Ask the user to confirm:

> "Scanned the design — N pages, M sections, K components. Here's the draft plan: `.agent-state/PLAN.md`. Two questions before we start:
>
> 1. Which page should we port first? (`home.html` is the conventional starting point.)
> 2. Are any sections out of scope for the first pass? (e.g. sub-brand variants, dev-only sections.)"

Their answers inform what to mark ⚪ vs ❌ in the plan.

### 6. Mark Step 0 (tokens) as the immediate first task

Regardless of what page user picks first, **Step 0 (theme tokens) is always the first concrete work** — see `design-to-liquid` skill's Step 0. Update PLAN.md tokens table to 🔵 in progress on the row Claude is about to start.

### 7. Initialize PROGRESS.md

Create `.agent-state/PROGRESS.md` with a header and the first session entry:

```markdown
# Progress Log

> Append-only. Newest entry first. See `.claude/skills/planner/references/progress-protocol.md`.

---

## YYYY-MM-DD (session 1)

**Goal:** Project kickoff — establish port plan and start Step 0 (theme tokens).

**Done:**
- Scanned `design/` — N pages, M sections, K components catalogued in `.agent-state/PLAN.md`.
- Initialized planner state docs.

**Decisions:**
- Page priority confirmed: <home / etc.>
- Out-of-scope: <list>

**Files touched:**
- created: `.agent-state/{PLAN.md, PROGRESS.md, INVENTORY.md}`

**Open / next session:**
- Step 0 — map design tokens into preset-N.js (colors / fonts / scale / radius)
```

### 8. Hand off to `design-to-liquid`

Once the plan is committed and user has confirmed priorities, the next move is execution — invoke `design-to-liquid` skill for Step 0 (tokens).

## What this protocol does NOT do

- Detailed per-section design analysis — that happens inside `design-to-liquid` Step 1 (survey) when actually porting each section.
- Picking color hex values, font IDs, type-scale numbers — that's `design-to-liquid` Step 0.
- Estimating time / scheduling — Shopify themes are open-ended; this skill doesn't try to forecast.

## Re-bootstrap (when plan is stale or missing)

If `PLAN.md` exists but is significantly out of date:
1. Don't delete and recreate — preserve the historical decisions.
2. Run `scan-inventory.py` to surface gaps.
3. Add a section header `## Refresh YYYY-MM-DD` near the top with new findings.
4. Mark stale rows ❓ for user review rather than silently rewriting.
