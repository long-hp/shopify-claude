---
name: polish
description: Use as the finishing-pass QA after a section, snippet, page, or the whole theme is functionally ported — call it standalone whenever you say "polish this", "/polish", "finishing pass", "làm bóng / hoàn thiện section này", "rà a11y + animation", "check accessibility", "thêm animation cho phần này", "gợi ý hover", or accept the handoff that design-to-liquid prints when a port completes. It audits ONE explicit target (a section/snippet/page dir, or a whole-theme sweep) across three dimensions — (1) accessibility (markup-checkable — alt text, icon-button aria-label, form-label association, heading order, keyboard operability, focus-visible, reduced-motion, landmarks), (2) xo-animate scroll-reveal opportunities (default `<xo-animate xo-cascade>` auto-mode that inherits global motion settings; manual xo-type/xo-duration/xo-easing options pulled from the xo-components MCP), and (3) xo-hover interaction opportunities (the project-local xo-hover convention — parent `xo-hover` + child `xo-effect`/`xo-abs`, or atomic `property:value/xo-hover`). It produces a grouped proposal checklist with exact markup for each item, the user multi-selects which to apply, and only the selected items are written. Do NOT use it to port a design from scratch (that's design-to-liquid) or to audit the .claude/ system (that's system-audit). It edits .liquid markup, so for shared groups it follows the group override ladder (ask before deep markup changes) and invokes snippet/scss/xo-css skills when authoring the fixes.
---

# polish

The finishing pass. A section/snippet/page is functionally ported and looks right — now make it **accessible**, **alive** (scroll-reveal), and **interactive** (hover), without re-porting anything.

Two ways in, same skill:

- **Standalone** — `/polish <target>` whenever you want to QA a finished surface.
- **Handoff** — `design-to-liquid` prints "run `/polish` for the a11y + motion + hover finishing pass" when a port completes. Accepting that just runs this skill on the just-ported target.

This skill is **propose-then-apply**: it never silently rewrites markup. It surfaces a checklist, you pick, it applies only your picks.

## Why a separate pass

The design HTML under `design/` already carries `xo-animate` / `xo-hover` on many elements, and `design-to-liquid` should carry those over during porting. But ports focus on structure + schema + visual match, so motion and a11y details get dropped or partially applied. `polish` is the deliberate sweep that catches what the port pass wasn't looking for — it complements `design-to-liquid`, it doesn't duplicate it.

## Step 0 — Resolve the target (always explicit)

This skill audits one explicit target per run — it does **not** guess from selection. Resolve from what the user gave you:

- A path or name → that section/snippet/page dir (`src/sections/<name>/`, `src/snippets/<name>/`, `src/pages/<name>/`, or a `src/groups/<group>/<name>/`).
- "the whole theme" / "toàn bộ theme" / a sweep request → enumerate `src/sections/*`, then offer to continue through snippets/groups in batches (don't dump 100 targets at once — sweep section-by-section, report per target).
- Nothing concrete → ask which target. Do not default to "everything".

Note whether the target is a **shared group** (`src/groups/...`) — those follow the override ladder and need an explicit ask before any non-trivial markup change (see Apply, below).

## Step 1 — Scan + read

Run the detector to get deterministic candidates, then read the actual markup to confirm:

```bash
python .claude/skills/polish/scripts/scan-target.py src/sections/<name>/
# whole-theme sweep prints one block per section dir:
python .claude/skills/polish/scripts/scan-target.py --sweep
```

The detector flags **candidates, not verdicts** (same spirit as design-sync's mention-hints): images without `alt`, icon-only buttons/links without an accessible name, form controls without a label, and whether `xo-animate` / `xo-hover` / `@keyframes` are already present. It cannot see dynamically-injected attributes or aria on a wrapping element, so always open the file and confirm before proposing a change.

Read the target's `.liquid` (and `.global.scss` for focus/motion) so your proposals quote real `file:line` and real surrounding markup.

**A section is usually a thin wrapper that `{% render %}`s snippets — the real markup (cards, buttons, images) lives in those snippets.** If the section's own scan is empty (common), trace the snippets it renders and scan/read those too: `python .claude/skills/polish/scripts/scan-target.py src/snippets/<rendered-snippet>/`. But a snippet is shared across every caller, so editing its markup ripples theme-wide — treat a shared snippet like a group: an additive `aria-label` or one `xo-animate` wrapper is usually safe, but **flag the ripple and ask before changing shared snippet markup** that other sections depend on. When the fix really belongs at the snippet level but is too invasive, surface it as a recommendation rather than auto-proposing the edit.

## Step 2 — Audit the three dimensions

For each, the detailed checklist + project-idiom fix patterns live in references — read the one you're working in:

| Dimension | What you're looking for | Reference |
| --- | --- | --- |
| ♿ **A11y** | missing alt / accessible name, unlabeled form controls, heading-order skips, `<div onclick>` instead of `<button>`, removed focus outline, motion without reduced-motion guard, missing landmarks | `references/a11y-checklist.md` |
| ✨ **xo-animate** | section headings / image reveals / card grids that should scroll-reveal; default to `xo-cascade` auto-mode; manual effects via MCP | `references/xo-animate.md` |
| 🖱 **xo-hover** | cards/media that should reveal a CTA/overlay or swap content on hover; use the project-local `xo-hover` convention | `references/xo-hover.md` |

Principles that cut across all three (Simplicity-first, per AGENT.md):

- **Don't over-propose.** A11y issues are non-negotiable fixes; animation and hover are *opportunities* — suggest them only where they genuinely serve the design, not on every element. A wall of 30 "add animation here" items is noise.
- **Don't duplicate what the port already did.** If the element already has `xo-animate`/`xo-hover` (detector says present), skip it unless it's misconfigured.
- **A11y and motion reinforce each other.** `xo-animate` already respects `prefers-reduced-motion`; any hand-rolled motion you propose must too. Flag any existing motion that doesn't.

## Step 3 — Present the proposal checklist

Group by dimension, ordered a11y → animate → hover (a11y first because it's correctness, not taste). Each item is self-contained so the user can judge it in isolation:

```markdown
## ♿ A11y (N items)
- **A1** `header.liquid:42` — icon-only cart button has no accessible name
  - Fix: add `aria-label="{{ 'sections.cart.title' | t }}"` to the `<button>`
  - Why: screen readers announce it as "button" otherwise
- **A2** `hero.liquid:18` — decorative background `<img>` missing alt
  - Fix: `alt=""` (decorative — hide from AT)

## ✨ xo-animate (N items)
- **V1** `hero.liquid:12` — heading block, no entrance animation
  - Fix: wrap in `<xo-animate xo-cascade>…</xo-animate>` (auto-stagger, inherits global motion)
  - Why: design reveals the headline on scroll; cascade matches sibling rhythm

## 🖱 xo-hover (N items)
- **H1** `product-card.liquid:8` — card image has a hidden "Quick add" with no reveal
  - Fix: `xo-hover` on the card root + `xo-effect="up in fade-in"` on the CTA (see xo-hover ref)
```

Always state the **default animation recommendation as `xo-cascade`** (the user's "auto theo global settings" mode). Only reach for manual `xo-type`/`xo-duration`/`xo-easing` when a specific effect is called for — and when you do, pull the exact option from the xo-components MCP (`mcp__xo-components__get_component` name `xo-animate`) rather than from memory.

## Step 4 — Let the user select, then apply only those

Ask with a multi-select (e.g. `AskUserQuestion` or a free-form "which items? A1,A2,V1 / all a11y / all / none"). Apply **only** the chosen items.

When applying:

- **Invoke the authoring skill for the file you touch** — `snippet` before editing a snippet body, `scss` for focus-state / reduced-motion SCSS, `xo-css` for atomic hover/utility classes, `liquid-doc` if a snippet's params change. These exist so the edit follows project rules; don't freehand.
- **Shared groups (`src/groups/...`)** — adding a single `aria-label` or one `xo-animate` wrapper is fine, but anything structural follows the group ladder (AGENT.md): Step D is "STOP — ask the user before non-trivial markup change". When in doubt on a group, ask.
- **Keep changes additive and surgical** — you're adding attributes/wrappers/aria, not restyling. Don't "improve" adjacent markup (AGENT.md surgical-changes rule).
- **Reduced-motion** — if you add hand-rolled motion (not `xo-animate`), pair it with a `prefers-reduced-motion` guard in SCSS.

## Step 5 — Verify

- If a `schema.js` was touched (rare — only if a fix adds a setting), run `python .claude/skills/design-to-liquid/scripts/validate-schema.py <dir>`.
- Re-run `scan-target.py` on the target to confirm the a11y candidates you fixed no longer flag.
- Note what needs a human eye: color contrast (not statically checkable) and the actual animation/hover feel in the Theme Editor / `npm run dev`.
- This skill does **not** update `.agent-state/` or commit — polish is a refinement of already-logged work. If the polish was substantial, mention that the user may want a PROGRESS note (via `planner`) and a `/git` commit, but don't do either automatically.

## References

- `references/a11y-checklist.md` — the markup-checkable a11y checklist + fix patterns in project idiom
- `references/xo-animate.md` — xo-animate cascade/auto vs manual, when to animate, MCP pointer
- `references/xo-hover.md` — the project-local xo-hover convention (attributes + atomic form)

## Guardrails

- **Propose before apply, always.** Never rewrite markup without the user picking the item.
- **A11y is correctness; motion/hover is taste.** Be exhaustive on the first, selective on the latter two.
- **Detector output is candidates, not proof** — confirm by reading before proposing.
- **Additive + surgical** — attributes, wrappers, aria, focus states. Not a restyle, not a refactor.
- **Groups need an ask** for non-trivial markup; reuse existing `xo-hover` / `xo-animate` conventions, never invent parallel ones.
