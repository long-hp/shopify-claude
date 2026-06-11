# A11y checklist (markup-checkable)

The accessibility checks `polish` can verify from Liquid markup + SCSS, with fix patterns in this project's idiom (Liquid, atomic XO-CSS classes, aria). Color contrast and real screen-reader behavior are **not** statically checkable — flag those for a human pass, don't claim them fixed.

Each item: what to look for → how to fix here. A11y items are **correctness, not taste** — propose all real ones.

## 1. Images have a correct `alt`

- **Meaningful image** (product, hero subject) → `alt` describing it. In Liquid this is usually a setting or object field: `alt="{{ image.alt | escape }}"` or `alt="{{ block.settings.image_alt | escape }}"`.
- **Decorative image** (background texture, ornament) → `alt=""` (empty, not missing) so AT skips it.
- `{{ image | image_url: width: 800 | image_tag: alt: image.alt }}` — `image_tag` emits `alt` for you; prefer it over hand-written `<img>`.

## 2. Icon-only controls have an accessible name

A `<button>` or `<a>` whose only content is an icon (`{% render 'icon', ... %}` / inline `<svg>`) is announced as just "button"/"link". Give it a name:

- `<button aria-label="{{ 'sections.cart.title' | t }}">{% render 'icon', name: 'cart' %}</button>` — prefer a translation key over a hardcoded string.
- Mark the icon itself decorative: the icon snippet output should carry `aria-hidden="true"` / `focusable="false"` (check `src/snippets/icons/` dispatcher — add on the call site if not).
- If there IS a visible text label elsewhere, no aria-label needed.

## 3. Form controls are labelled

Every `<input>`/`<select>`/`<textarea>` needs an associated name:

- Visible label: `<label for="x">…</label>` + matching `id="x"`.
- No visible label (search box, inline filter): `aria-label="{{ 'general.search.placeholder' | t }}"` on the control. A `placeholder` is NOT a label.
- This project's form snippets (`newsletter-form-*`, `field-*`) mostly handle this — confirm before proposing.

## 4. Heading order is sane

- One `<h1>` per page (the page/section title). Sections rendered into a page usually start at `<h2>`.
- No skipped levels (`<h2>` → `<h4>`). The heading-level snippets / settings often control this — fix at the setting if one exists rather than hardcoding.

## 5. Interactive = real interactive elements

- Clickable things are `<button>` (actions) or `<a href>` (navigation), never `<div onclick>` / `<span>` with a JS handler — those aren't keyboard-focusable or announced.
- If you find a non-semantic clickable, propose swapping to `<button type="button">` (and let `scss` reset its default styling) rather than bolting on `tabindex` + `role` + key handlers.

## 6. Focus is visible

- Don't remove the focus outline without replacing it. If `.global.scss` has `outline: none` / `outline: 0` with no `:focus-visible` style, that's a finding.
- Fix pattern (via `scss` skill): a `:focus-visible` rule with a visible ring using framework tokens, e.g. `outline: 0.2rem solid color(primary); outline-offset: 0.2rem;`.

## 7. Motion respects `prefers-reduced-motion`

- `xo-animate` and the `xo-hover` convention already honor reduced-motion — prefer them over hand-rolled motion.
- Any hand-written `@keyframes` / `transition` that moves/scales content needs a guard:
  ```scss
  @media (prefers-reduced-motion: reduce) {
    .thing { animation: none; transition: none; }
  }
  ```
- Flag existing motion in the target that lacks this guard.

## 8. Landmarks & semantics

- Repeated/region content uses semantic elements: `<nav>` (menus), `<main>` (one per page, in layout), `<header>`/`<footer>` (the groups), `<section>`/`<article>` where meaningful.
- Multiple same-type landmarks get a distinguishing name: `<nav aria-label="Footer">`. Don't over-apply `role=` — native elements already carry their role.
- Lists of items use `<ul>/<li>`, not stacked `<div>`s, where it's genuinely a list.

## What to defer to a human (don't mark fixed)

- **Color contrast** — needs computed colors; verify in the editor / a contrast tool.
- **Actual AT announcement order & focus trapping** in modals — `xo-modal` handles trapping, but verify by tabbing through.
- **Meaningful alt copy quality** — you can ensure `alt` exists; whether it's *good* is editorial.
