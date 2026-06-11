# xo-hover — project-local hover interaction

`xo-hover` is **not** an xo-webcomponent (the MCP doesn't know it) — it's a project-local convention in the XO-CSS framework. The deep reference is `.claude/skills/xo-css/references/advanced.md` § "Advanced — xo-hover and xo-abs attributes" and § "Parent Attributes". This file is the fast version for polish proposals. **Reuse this convention — never invent a parallel hover system.**

There are two ways hover lands in this project; pick by context.

## Form 1 — markup convention (`xo-hover` + `xo-effect` + `xo-abs`)

Put `xo-hover` on the parent; children opt into reveal/transform effects:

```html
<div xo-hover class="w:20rem">
  <div class="h:20rem bgc:layer-1"></div>
  <div xo-effect="up in fade-in"  xo-abs="bottom left" style="--left: 1rem; --bottom: 1rem">…revealed on hover…</div>
  <div xo-effect="up out fade-out" xo-abs="bottom left" style="--left: 1rem; --bottom: 1rem">…hidden on hover…</div>
</div>
```

- **`xo-effect`** values: `up`, `down`, `left`, `right`, `zoom`, `fade-in`, `fade-out` — combine with `in` / `out` (e.g. `up in fade-in` = slides up + fades in when parent is hovered; pair an `… in …` element with an `… out …` element for a swap).
- **`xo-abs`** position (for overlay/reveal content): `top left`, `bottom right`, `center`, `fill`, … or custom via `style="--left: …; --bottom: …"`. `fill` stretches over the whole parent (good for image overlays).

## Form 2 — atomic parent-attribute classes (`property:value/xo-hover`)

When you just want a child property to change while the parent is hovered, use the atomic parent-selector form (no SCSS):

```html
<div xo-hover>
  <span class="bgc:transparent bgc:layer-1/xo-hover">background appears on parent hover</span>
</div>
```

- Syntax: `property:value/xo-hover` (parent has the attribute).
- Self form: `property:value/xo-hover-` (trailing dash = same element has `xo-hover`).
- This is the same parent-attribute mechanism as `/xo-active`, `/xo-open`, etc. — see xo-css advanced.md.
- `*gh` (group-hover, `property:value*gh`) is the lighter cousin for simple "child reacts to ancestor hover" without declaring `xo-hover`. Use `*gh` for a one-off color/opacity shift; use `xo-hover` + `xo-effect` for staged reveals/swaps.

## Form 3 — settings-driven (snippets that expose hover controls)

Some snippets already expose hover as merchant settings and render the attributes via the base snippet `src/snippets/_base/attrs/hover-attrs.liquid` (reads `context.settings.hover_type` / `hover_fade_enabled` / `hover_duration` / `hover_strength` / `hc_cascade` / `hover_mobile_disabled` and emits `xo-effect` + style vars). If the target is such a snippet, **prefer wiring/checking those settings** over hardcoding `xo-effect` — that keeps merchant control intact. Don't add a parallel hardcoded hover on top of a settings-driven one.

## Where hover is worth proposing

Good candidates:
- **Product / collection / article cards** — reveal a "Quick add" / "View" CTA, or swap the primary image for a secondary on hover.
- **Image tiles / lookbook** — overlay caption or CTA (`xo-abs="fill"` overlay + `fade-in`).
- **Media with a hidden action** the design only shows on hover.

Skip:
- Touch-only flows (hover doesn't exist on touch — ensure the hidden content is still reachable, e.g. always-visible on mobile or focatable). Check `hover_mobile_disabled` / provide a non-hover path.
- Anything already using `xo-hover` (detector reports present) — don't double-apply.
- Essential information or actions — never gate a primary CTA behind hover only.

## A11y note

Hover-revealed interactive content must also be **keyboard reachable** — if a "Quick add" button only appears on hover, make sure it's focusable and the reveal also triggers on `:focus-within` (or the button is always in the DOM and just visually revealed). Flag hover reveals that hide a focusable control from keyboard users. This is where polish's a11y and hover dimensions intersect.
