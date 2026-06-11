---
name: polish
argument-hint: "<target> | theme"
description: Use as the finishing-pass QA after a section, snippet, page, or the whole theme is functionally ported — call it standalone whenever you say "polish this", "/polish", "finishing pass", "làm bóng / hoàn thiện section này", "rà a11y + animation", "check accessibility", "thêm animation cho phần này", "gợi ý hover", or accept the handoff that design-to-liquid prints when a port completes. It audits ONE explicit target (a section/snippet/page dir, or a whole-theme sweep) across three dimensions — (1) accessibility (markup-checkable — alt text, icon-button aria-label, form-label association, heading order, keyboard operability, focus-visible, reduced-motion, landmarks), (2) xo-animate scroll-reveal opportunities (always proposed as the bare `<xo-animate xo-cascade>` auto-mode that inherits global motion settings — manual xo-type/xo-duration/xo-easing attributes are added only on explicit user request, pulled from the xo-components MCP, never on the agent's own reading of the design), and (3) xo-hover interaction opportunities (the project-local xo-hover convention — parent `xo-hover` + child `xo-effect`/`xo-abs`, or atomic `property:value/xo-hover`). It produces a grouped proposal checklist with exact markup for each item, the user multi-selects which to apply, and only the selected items are written. Do NOT use it to port a design from scratch (that's design-to-liquid) or to audit/upgrade the .claude/ system (that's system-upgrade). It edits .liquid markup, so for shared groups it follows the group override ladder (ask before deep markup changes) and invokes snippet/scss/xo-css skills when authoring the fixes.
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

Group by dimension, ordered a11y → animate → hover (a11y first because it's correctness, not taste). **Every item must be self-explanatory enough that the user never has to open the file to judge it** — symptom, human impact, exact before→after, and any risk/caveat, each tagged with severity + ripple badges.

→ **`references/proposal-format.md` is the source of truth for the item template, the badges, and the choice format. Read it before presenting.** The per-item shape:

```markdown
## ♿ A11y (N) · ✨ xo-animate (N) · 🖱 xo-hover (N)

- **A1** `action-quick-view.liquid:15` · 🔴 Must-fix · 🔁 Shared snippet · ⚠️ Needs-confirm
  - **Symptom:** `<xo-product-quick-view-trigger>` wraps icon-only content — no `role`/`tabindex`/`aria-label`.
  - **Impact:** screen-reader users hear nothing; keyboard users may not be able to open quick-view.
  - **Fix:** add `role="button" tabindex="0" aria-label="{{ 'products.product.quick_view' | t }}"` to the trigger.
  - **Caveat:** confirm the web component doesn't wire role/keyboard at runtime before writing; if it does, drop A1.
```

Badges (full table in `proposal-format.md`): severity 🔴 Must-fix (a11y) / 🟡 Optional (animate·hover); risk 🟢 additive-safe / 🔁 shared snippet / 🧩 group; confidence ⚠️ needs-confirm / 👁 human-eye (recommendation-only). If you can't fill **Impact** in human terms ("keyboard users can't…", not "violates 4.1.2"), the item isn't justified — drop it. Don't re-propose what the port already added (detector/read shows `xo-animate`/`xo-hover` present → skip).

**The animation markup polish writes is always the bare `<xo-animate xo-cascade>` — nothing else.** No `xo-type`, no `xo-duration`, no `xo-easing`, no `xo-constant`. This is the project's "auto theo global settings" mode: every animated element inherits the same global motion rhythm, so reveals stay uniform across the theme. That uniformity is the point — bespoke per-element tuning is opt-in by the user, **not the agent's call**, so don't read the design and decide "this one wants a fade-right" on your own. The bare form covers virtually every polish proposal, and it's what goes into the AskUserQuestion option markup.

Add manual attributes **only when the user explicitly asks** for a specific effect or describes the motion they want ("make the cards zoom in", "I want the hero to slide from the left"). Only at that point — driven by the user's request, never by your own reading — consult the xo-components MCP (`mcp__xo-components__get_component` name `xo-animate`) for the exact `xo-type`/`xo-easing` values rather than guessing from memory. See `references/xo-animate.md`.

## Step 4 — Let the user select, then apply only those

Ask with **one multi-select `AskUserQuestion` per dimension** (a11y / animate / hover), in that order — never mix dimensions in one question (severity must be uniform so the user isn't weighing "broken for blind users" against "nice fade-in" in the same list). Apply **only** the chosen items.

Each question + option follows `references/proposal-format.md` exactly. The essentials:

- **Question text** states target + dimension + count + "multi-select; only picks are written", and for a11y adds the steer "apply all unless you have a reason".
- **Each option = one finding.** Label = `<ID> — <plain short symptom>` (name the user-facing problem, not the attribute). Description carries four compact facets: **Changes** (`attr/wrapper` @ `file:line`) · **Without it** (human impact) · **Level** (🔴/🟡) · **Risk** (🟢/🔁/🧩 + any ⚠️/👁 caveat).
- **`AskUserQuestion` needs 2–4 options per question.** A **1-item dimension MUST add an explicit "Skip this group" option** (a lone option errors — this bit us in testing). For 2–3 items, optionally lead with "Apply all (N)". For 4+, lead with "Apply all (N)" + show the top few and say what's not shown — never silently truncate.
- **Never bury** a 🔁/🧩 ripple or ⚠️/👁 caveat — it must be visible in the option, because it changes the cost of "yes".

> Free-form selection ("apply A1,A2 / all a11y / none") is acceptable as a fallback, but the structured per-dimension `AskUserQuestion` above is the default — it's what makes the choice legible.

When applying:

- **Invoke the authoring skill for the file you touch** — `snippet` before editing a snippet body, `scss` for focus-state / reduced-motion SCSS, `xo-css` for atomic hover/utility classes, `liquid-doc` if a snippet's params change. These exist so the edit follows project rules; don't freehand.
- **Shared groups (`src/groups/...`)** — adding a single `aria-label` or one `xo-animate` wrapper is fine, but anything structural follows the group ladder (AGENT.md): Step D is "STOP — ask the user before non-trivial markup change". When in doubt on a group, ask.
- **Keep changes additive and surgical** — you're adding attributes/wrappers/aria, not restyling. Don't "improve" adjacent markup (AGENT.md surgical-changes rule).
- **A11y text is translatable — never hardcode it.** Any `aria-label` / `visually-hidden` / functional `alt` you add goes through `'<namespace>.<path>' | t`, reuse-first (`grep -rin "<text>" src/locales/` before adding a key). See `liquid/references/translations.md`. Surface "add key `X` to `src/locales/NN-<ns>.json`" as part of the proposal when a new key is needed.
- **Reduced-motion** — if you add hand-rolled motion (not `xo-animate`), pair it with a `prefers-reduced-motion` guard in SCSS.

## Step 5 — Verify

- If a `schema.js` was touched (rare — only if a fix adds a setting), run `python .claude/skills/design-to-liquid/scripts/validate-schema.py <dir>`.
- Re-run `scan-target.py` on the target to confirm the a11y candidates you fixed no longer flag.
- Note what needs a human eye: color contrast (not statically checkable) and the actual animation/hover feel in the Theme Editor / `npm run dev`.
- This skill does **not** update `.agent-state/` or commit — polish is a refinement of already-logged work. If the polish was substantial, mention that the user may want a PROGRESS note (via `planner`) and a `/git` commit, but don't do either automatically.

## References

- `references/proposal-format.md` — **how to present findings + phrase the choice** (Step 3 item template, badges, the per-dimension `AskUserQuestion` rules + worked example). Read before Step 3/4.
- `references/a11y-checklist.md` — the markup-checkable a11y checklist + fix patterns in project idiom
- `references/xo-animate.md` — xo-animate cascade/auto vs manual, when to animate, MCP pointer
- `references/xo-hover.md` — the project-local xo-hover convention (attributes + atomic form)

## Guardrails

- **Propose before apply, always.** Never rewrite markup without the user picking the item.
- **A11y is correctness; motion/hover is taste.** Be exhaustive on the first, selective on the latter two.
- **Detector output is candidates, not proof** — confirm by reading before proposing.
- **Additive + surgical** — attributes, wrappers, aria, focus states. Not a restyle, not a refactor.
- **Groups need an ask** for non-trivial markup; reuse existing `xo-hover` / `xo-animate` conventions, never invent parallel ones.
