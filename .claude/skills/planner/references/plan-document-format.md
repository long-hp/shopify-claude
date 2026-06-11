# PLAN.md Format

Structure for `.agent-state/PLAN.md`. The plan is **lightweight** — it doesn't have to be exhaustive. Start with high-level pages + a few priority sections, fill in details as work progresses.

## Status icons (used in every table)

| Icon | Meaning                              |
| ---- | ------------------------------------ |
| ⚪   | pending — not started                |
| 🔵   | in progress — actively being worked  |
| ✅   | done                                 |
| ⏸   | paused / blocked — see Open decisions |
| ❌   | removed from scope                   |
| ❓   | needs decision — unclear what to do  |

## Sections (in order)

```markdown
# Port Plan

> Last refreshed: YYYY-MM-DD
> Active design source: <path, e.g. design/>

## Theme tokens (Step 0)
## Pages
## Sections (cross-cutting)
## Snippets touched / created
## Open decisions / blocks
## Gaps (auto)
```

### 1. Theme tokens (Step 0)

The foundation that everything else depends on. Tracks the mapping done in `design-to-liquid` Step 0 (`tokens-mapping.md`).

```markdown
## Theme tokens (Step 0)

| Token group       | Status | Notes                                                |
| ----------------- | ------ | ---------------------------------------------------- |
| Colors            | ✅      | Folio palette mapped in preset-1.js (background-1 + background-2 schemes) |
| Fonts             | ✅      | Manrope (body/heading) + Source Serif 4 italic (sub) |
| Heading scale     | ✅      | h1: 72/36, … h6: 16/14 with step-safe values         |
| Corner radius     | ✅      | `xs` preset                                          |
| Italic emphasis   | ✅      | Global SCSS rule `h* em → var(--font-sub-family)`    |
| Button base       | ⏸      | User redesigning base; defer dependent section work  |
```

### 2. Pages

Mirror of `design/src/pages/*.html` with target template + sections needed.

```markdown
## Pages

| # | Design page    | Target template (`src/pages/<x>/`) | Status   | Preset JSON file        | Notes                          |
| - | -------------- | --------------------------------- | -------- | ----------------------- | ------------------------------ |
| 1 | home.html      | home/                             | 🔵       | index.preset-1.json     | 14 sections                    |
| 2 | home-2.html    | home/                             | ⚪       | index.preset-2.json     | sub-brand theme-sound          |
| 3 | product.html   | product/                          | ⚪       | product.preset-1.json   | needs PDP block tree           |
| … |
```

### 3. Sections (cross-cutting)

The detailed work register. Every design section that needs porting (or reuse) gets a row.

```markdown
## Sections (cross-cutting)

| Section            | Design source                              | src/sections/<x>/ exists | Status | Reuses snippets               | Notes                          |
| ------------------ | ------------------------------------------ | ------------------------ | ------ | ----------------------------- | ------------------------------ |
| subscribe          | design/src/sections/subscribe/             | ✅ created               | ✅      | button, icon                  | Italic em via inline_richtext  |
| hero               | design/src/sections/hero/                  | ⚪                       | ⚪      | button, icon-button, carousel | Dark scheme, 3 slides          |
| shop-categories    | design/src/sections/shop-categories/       | ⚪                       | ⚪      | collection-card, section-heading | 3-up cards on cream         |
| featured-products  | design/src/sections/featured-products/     | ⚪ (maybe reuse?)        | ❓     | product-card, section-heading | Verify vs existing featured-collection |
| journal            | design/src/sections/journal/               | ⚪                       | ⚪      | article-card, section-heading | 3×2 grid + filter pills        |
| …                  |                                            |                          |        |                               |                                |
```

**Two "exists" / "status" columns?** Yes:
- **exists** — Is the `src/sections/<name>/` folder there yet? (a structural fact)
- **status** — Has work on it actually progressed?

A section can exist (folder + schema scaffold) but still be ⚪ pending if the visual isn't done.

### 4. Snippets touched / created

Track only snippets the port created OR modified. (Not the 100+ existing snippets — that would be noise.)

```markdown
## Snippets touched / created

| Snippet           | Action          | Why                                                | Files                                                |
| ----------------- | --------------- | -------------------------------------------------- | ---------------------------------------------------- |
| _none yet_        |                 |                                                    |                                                      |
```

When you DO modify a snippet (escalation step B or C from design-to-liquid sections-to-liquid.md), add a row.

### 5. Open decisions / blocks

Anything that needs the user's input or is otherwise blocked.

```markdown
## Open decisions / blocks

- [ ] **Button base redesign** (user). Blocks: section CTAs need final variant choice. Sections affected: subscribe, hero, featured-products.
- [ ] **Sub-brand themes** (theme-pet / sound / parfum / kids) — scope decision. Defer to phase 2?
- [ ] **Inverse color scheme** — restyle for Folio or remove + sweep references? See PROGRESS 2026-05-21 audit.
```

### 6. Gaps

Auto-filled by `python .claude/skills/planner/scripts/scan-inventory.py` — design sections without matching src counterparts. Leave the section header in place even if empty.

```markdown
## Gaps (auto — refresh with scan-inventory.py)

_(filled by scanner; do not hand-edit — re-run scanner instead)_
```

## Maintenance rules

- **Update status icons in-place** as work progresses. Don't add new rows for status changes.
- **Add new rows** when new design sections are discovered.
- **Strike through** ❌ items rather than deleting — preserves the trail.
- **Update the "Last refreshed" date** in the header whenever you do a meaningful edit.
- **Don't duplicate** rows across tables. A section listed under "Sections" doesn't need to be repeated under each page that uses it.

## What the plan is NOT

- It's not the implementation guide — that's `design-to-liquid` skill's references.
- It's not the changelog — that's `PROGRESS.md`.
- It's not the build manifest — that's `INVENTORY.md` (auto-generated).
- It's not a Gantt chart — Shopify themes don't need that level of scheduling.
