# Migration — `xo-animate` / `xo-parallax-*` / looping CSS → `xo-motion`

Read when a section already uses `xo-animate`, `xo-parallax-scroll`, `xo-parallax-hover` or looping `@keyframes` and it is being moved to xo-motion, or when new xo-motion work must match an old section's look. Migrate a whole section at once — never leave two systems on one element, and avoid two entrance systems in one section. Contract: `xo-motion.md`.

## Contents

1. Before you migrate
2. `xo-animate` → `xo-motion` (attributes)
3. Every `xo-type` → `xo-motion-preset`
4. `xo-animate` easing names → xo-motion `ease`
5. `xo-parallax` / `xo-parallax-scroll` → `xo-motion xo-scrub`
6. `xo-parallax-hover` → `xo-trigger="pointer"`
7. Looping CSS `@keyframes` → `xo-repeat`
8. Worked examples

---

## 1. Before you migrate

- Both legacy components already run on the xo-motion engine and share its presets — migration buys timelines, split text, replay / reverse, scrub, hover / click, loops, pointer, GL; not a different look.
- Shared snippets (`product-card`, `article-card`, `cart-mini-item`, `products-grid` with `animate_enabled`, `_base/animate*`) carry `xo-animate` theme-wide. Migrating them ripples into every section — ask first; until then a section rendering them keeps their legacy reveal and adds no xo-motion entrance on the same cards.
- `xo-animate` follows Theme settings → Animation automatically; xo-motion only through the Liquid prelude (`theme-integration.md` §2). Add the prelude and `<{{ motion_tag }}>` hosts as part of the migration, or the merchant's off switch stops working for that section.
- After migrating: `validate-liquid.py`, a visual check with motion on, reduced motion and "Animate disabled", and the Theme Editor.

## 2. `xo-animate` → `xo-motion` (attributes)

| `xo-animate` | `xo-motion` |
|---|---|
| `<xo-animate xo-type="fade-up">…</xo-animate>` | `<xo-motion xo-motion-preset="fade-up">…</xo-motion>` (the host can be its own step) or a step on a child inside one host per block |
| bare `<xo-animate xo-cascade>` (global settings) | prelude + `xo-motion-preset="{{ motion_preset }}"`, `xo-preset-strength="{{ motion_strength }}"`, `xo-defaults="{ duration: {{ motion_duration }}, ease: 'cubic-bezier(0, 0, 0.3, 1)' }"` (`motion-recipes.md` §2) |
| `xo-type` | `xo-motion-preset` (§3) |
| `xo-duration="500"` (ms) | `duration: 0.5` (s) in `xo-motion-from` or `xo-defaults` |
| defaults 500 ms + `easeLight` | xo-motion defaults 0.8 s + `power3.out`; parity: `xo-defaults="{ duration: 0.5, ease: 'cubic-bezier(0, 0, 0.3, 1)' }"` |
| `xo-easing` | `ease` (§4) |
| `xo-strength` | `xo-motion-preset-strength` (step) / `xo-preset-strength` (host) — same scale, same formula |
| `xo-delay="200"` | `delay: 0.2` or `xo-motion-at="+=0.2"` |
| sibling `xo-animate xo-cascade xo-constant="100"` | ONE host; steps with `xo-motion-at="<0.1"`, or `xo-motion-targets=".item"` + `stagger: 0.1`; multi-row → `xo-batch` |
| `xo-order` + `xo-constant` | `stagger` (`{ each, from }`) or explicit `xo-motion-at` |
| `xo-item-used` + `<xo-animate-item>` | `xo-motion-targets="<selector>"` on the wrapper (plain elements) |
| inside carousel / modal / popover / tabs: automatic play / reverse with the wrapper | explicit `xo-trigger="parent"` (also covers toggle, collapse, scroll-x / -y / scene items) |
| `xo-scroll-forced` | default behaviour (scroll) — omit `xo-trigger="parent"` |
| trigger line: top edge 50 px above the viewport bottom | default `top 85%`; parity `xo-start="top bottom-50px"` |
| plays once | once by default; `xo-replay` (every entry) / `xo-reverse` (retract on scroll back) |
| `xo-visible` + `xo-visible-binding` | `xo:motion:complete` event (bubbles); no attribute binding — chain inside one timeline instead |
| `xo-disabled` / `<html xo-animate-disabled>` | remove the step attribute / `motion_tag` = `div` (reduced motion is automatic) |
| `xo-observed` (design-mode re-init) | none needed — a re-rendered section mounts a fresh host |
| animation cancelled after finishing (natural styles) | end frame kept (fill) → move CSS hover transforms to a child |
| child `xo-motion-*` steps / `draw` / `morph` inside `xo-animate` | same step attributes inside `<xo-motion>`, with full positioning |
| builder attribute form `xo-animate="scroll"` + `xo-next-*` | `draw` / `morph` steps (that form exists only for the builder) |

## 3. Every `xo-type` → `xo-motion-preset`

| `xo-type` | `xo-motion-preset` | Note |
|---|---|---|
| `none` | — | drop the step (or keep child steps only) |
| `fade`, `fade-up`, `fade-down`, `fade-left`, `fade-right` | same name | travel `min(30%·s, 60px·s)` |
| `zoom-in`, `zoom-out` | same name | |
| `rotate-left-up` | `swing-left` | renamed |
| `rotate-right-up` | `swing-right` | renamed |
| `width-increment` | `wipe-right` | clip-path instead of animating width |
| `blur` | `blur` | filter — small elements only |
| `snake-up`, `snake-down`, `snake-left`, `snake-right` | same name | |
| `3d-up` | `3d-up` | |
| `liquid`, `liquid-wave`, `liquid-rise` | same name | one SVG filter per element, removed at the end |
| `goo-1` | `liquid` | |
| `goo-2`, `goo-5`, `goo-7` | `liquid-wave` | |
| `goo-3`, `goo-4`, `goo-6` | `liquid-rise` | |
| `blur-rise`, `focus-in`, `flip-up`, `skew-up` | same name | |
| `wipe-right`, `wipe-left`, `wipe-up`, `wipe-down`, `iris` | same name | clip-path — size cap |
| `text-rise`, `text-rise-words`, `text-rise-lines` on `xo-animate` | same name on xo-motion | xo-animate cannot split (renders without effect + warning) |

The global `animate_effect` setting stores one of `fade`, `fade-*`, `zoom-*`, `rotate-*-up`, `snake-*`, `3d-up` — the prelude's two `replace` filters handle the only renamed values.

## 4. `xo-animate` easing names → xo-motion `ease`

xo-motion does not know the xo-animate names (warning + fallback to `power1.out`) but accepts the literal curve:

| `xo-easing` | xo-motion `ease` |
|---|---|
| `easeLight` (default) | `'cubic-bezier(0, 0, 0.3, 1)'` |
| `ease` | `'ease'` |
| `easeOut`, `easeOutQuart` | `'cubic-bezier(0.165, 0.84, 0.44, 1)'` (or `'quart.out'`) |
| `easeOutCubic` | `'cubic-bezier(0.215, 0.61, 0.355, 1)'` (or `'cubic.out'`) |
| `easeOutQuint`, `easeOutBounce` | `'cubic-bezier(0.23, 1, 0.32, 1)'` |
| `easeOutExpo` | `'cubic-bezier(0.19, 1, 0.22, 1)'` (or `'expo.out'`) |
| `easeOutCirc` | `'cubic-bezier(0.075, 0.82, 0.165, 1)'` |
| `easeOutSine` | `'cubic-bezier(0.39, 0.575, 0.565, 1)'` |
| `easeOutQuad` | `'cubic-bezier(0.25, 0.46, 0.45, 0.94)'` |
| `easeOutBack` | `'cubic-bezier(0.175, 0.885, 0.32, 1.275)'` (or `'back.out(1.7)'`) |
| `easeIn`, `easeInCubic` | `'cubic-bezier(0.55, 0.055, 0.675, 0.19)'` |
| `easeInQuad` | `'cubic-bezier(0.55, 0.085, 0.68, 0.53)'` |
| `easeInQuart` | `'cubic-bezier(0.895, 0.03, 0.685, 0.22)'` |
| `easeInQuint`, `easeInBounce` | `'cubic-bezier(0.755, 0.05, 0.855, 0.06)'` |
| `easeInExpo` | `'cubic-bezier(0.95, 0.05, 0.795, 0.035)'` |
| `easeInCirc` | `'cubic-bezier(0.6, 0.04, 0.98, 0.335)'` |
| `easeInSine` | `'cubic-bezier(0.47, 0, 0.745, 0.715)'` |
| `easeInBack` | `'cubic-bezier(0.6, -0.28, 0.735, 0.045)'` |
| `easeInOut`, `easeInOutCubic` | `'cubic-bezier(0.645, 0.045, 0.355, 1)'` |
| `easeInOutQuad` | `'cubic-bezier(0.455, 0.03, 0.515, 0.955)'` |
| `easeInOutQuart` | `'cubic-bezier(0.77, 0, 0.175, 1)'` |
| `easeInOutQuint` | `'cubic-bezier(0.86, 0, 0.07, 1)'` |
| `easeInOutExpo` | `'cubic-bezier(1, 0, 0, 1)'` |
| `easeInOutCirc` | `'cubic-bezier(0.785, 0.135, 0.15, 0.86)'` |
| `easeInOutSine` | `'cubic-bezier(0.445, 0.05, 0.55, 0.95)'` |
| `easeInOutBack` | `'cubic-bezier(0.68, -0.55, 0.265, 1.55)'` |
| `spring` (a fixed overshoot curve) | `'cubic-bezier(.27,.79,.45,1.24)'` — or a real spring: `'spring'`, `'spring.bouncy'` |
| `linear` | `'none'` |

## 5. `xo-parallax` / `xo-parallax-scroll` → `xo-motion xo-scrub`

| `xo-parallax` family | `xo-motion` |
|---|---|
| `<xo-parallax>` container | `<xo-motion xo-scrub>` — the host is the measuring area; same default ruler (0 % = host top at viewport bottom, 100 % = host bottom past viewport top) |
| `<xo-parallax-scroll xo-keyframes="…">` | any element with `xo-motion-keyframes="…"` — same keyframe format |
| `xo-fit-content` (on by default) | `xo-fit-content` on the host (off by default) when items must shrink to their content |
| `xo-breakpoints="{ 1000: {…} }"` | `breakpoints: { 1000: {…} }` inside `xo-motion-keyframes` |
| `xo-lerp-ease="0.08"` | `xo-scrub` (empty = 0.6 s ≈ lerp 0.08; `xo-scrub="0"` = none) |
| `xo-start="offset(container).top"` / `xo-end="offset(container).top + container.offsetHeight"` (pinned room) | `xo-start="top top"` / `xo-end="bottom bottom"` — position strings, no hidden `innerHeight` subtraction |
| per-element range `xo-start="offset(this).top - window.innerHeight" xo-end="offset(this).top + window.innerHeight * 0.7"` | that element in its own `<xo-motion xo-scrub xo-start="top bottom" xo-end="top 30%">` |
| JS-expression keys / values (`'this.offsetHeight / 2'`, `container.clientWidth/2 - this.offsetLeft`) | same expressions (safe interpreter, `this` / `container` / `window` / `document` / `offset` / `random`) |
| `xo-step-mode` + CSS `transition` (snap, but smooth) | scroll toggle with `xo-reverse` at the threshold (`xo-start="top 60%"`) and a timed `xo-motion-to` |
| `xo-mobile-disabled` (by device) | no device switch — reduce travel with keyframe `breakpoints` (width), or keep `xo-parallax-scroll` for that layer |
| mobile auto lerp 1 + filters dropped | not automatic — `xo-scrub` ≤ 0.4, no filters on mobile layers |
| `x`, `y`, `scale`, `scaleX`, `scaleY`, `rotate`, `rotateX`, `rotateY`, `skewX`, `skewY`, `opacity` | same keys |
| `skew` | `skewX` |
| `brightness`, `hueRotate`, `contrast`, `blur`, `grayscale` | same keys (one composed `filter`) |
| `backgroundPositionY` | move an absolutely positioned layer with `y` (inset −12.5 % for ±10 %) — `motion-recipes.md` §16 |
| `backgroundSizeX` / `backgroundSizeY` | `scale` on an image layer inside an `overflow: hidden` frame |
| `width`, `height`, `fontSize` | prefer `scaleX` / `scaleY` / `scale` or a clip (layout per frame otherwise); camelCase CSS still works |
| `borderRadius`, `color` | same camelCase CSS keys |
| `strokeDasharray` (SVG) | `draw` |
| `d` (path morph) | `morph` (normalises different path structures) |
| `videoTime`, `groupImg` | same keys |
| `customEffects()` JS hook | `in1`..`in4` / `'--name'` CSS variables (no JS) |
| `xo:parallax-scroll:init` | `xo-ready` attribute on the host |
| `xo-observed` | none needed |
| `<xo-parallax-hover>` inside | convert it (§6), or keep it and add the `xo-parallax` attribute to the `<xo-motion>` host (hover needs that provider) |

## 6. `xo-parallax-hover` → `xo-trigger="pointer"`

| `xo-parallax-hover` | `xo-motion` |
|---|---|
| `<xo-parallax>` measuring area | the outer `<xo-motion xo-trigger="pointer">` rect (`xo-pointer-area="self"`), or `xo-pointer-area="window"` |
| `<xo-parallax-hover xo-strength="20">` (both axes) | two nested hosts — outer (x) → wrapper `{ '0%': { x: -N }, '100%': { x: N } }`, inner `xo-pointer-axis="y"` → child `{ '0%': { y: -N }, '100%': { y: N } }`; match the old travel by eye (no fixed strength → px conversion) |
| `xo-3d` tilt of one plane | same nesting with `perspective: 1000, rotateY` (outer) / `rotateX` (inner) — `motion-recipes.md` §14 |
| several layers at different strengths | one host per axis, each layer its own step and distance (opposite signs for depth) |
| `xo-reset-position` (default on) | default: drifts back to `xo-pointer-rest` (0.5) over `xo-pointer-smooth` |
| `xo-reset-position="false"` (stays where the pointer left) | no equivalent — keep `xo-parallax-hover` |
| `xo-3d` with children floating at different `translateZ` (depth inside the component's shadow `preserve-3d`) | not documented for xo-motion pointer (single plane per layer) — keep `xo-parallax-hover` unless the xo-motion version is built and checked in the browser |
| `xo-inner-width` | none — no shadow wrapper; size the step element in CSS |

xo-motion pointer ignores touch and holds the rest pose under reduced motion — same as before.

## 7. Looping CSS `@keyframes` → `xo-repeat`

| Looping CSS | `xo-motion` |
|---|---|
| `animation: float 1.6s ease-in-out infinite alternate` + `@keyframes float { to { transform: translateY(-10px) } }` | `<xo-motion xo-repeat="-1" xo-yoyo xo-defaults="{ duration: 1.6, ease: 'sine.inOut' }">` + child `xo-motion-to="{ y: -10 }"` |
| `animation-iteration-count: 3` | `xo-repeat="2"` (extra plays after the first) |
| `animation-direction: alternate` | `xo-yoyo` |
| idle gap faked inside the keyframes | real keyframes + `xo-repeat-delay` (seconds) |
| `@media (prefers-reduced-motion)` guard, off-screen `animation-play-state` hacks | automatic: no loop under reduced motion, paused off-screen / hidden tab |

Keep CSS `@keyframes` for spinners, skeleton shimmer and loaders (they must run before JS). Tickers / logo bands → `xo-marquee`.

## 8. Worked examples

```liquid
{%- comment -%} Before: cascaded cards {%- endcomment -%}
<div class="xo-featured__grid">
  {%- for product in collection.products limit: 8 -%}
    <xo-animate xo-type="fade-up" xo-cascade xo-constant="100" xo-duration="600"><div class="xo-featured__cell">…</div></xo-animate>
  {%- endfor -%}
</div>

{%- comment -%} After {%- endcomment -%}
<{{ motion_tag }} xo-batch xo-defaults="{ duration: 0.6, ease: 'cubic-bezier(0, 0, 0.3, 1)' }">
  <div class="xo-featured__grid" xo-motion-targets=".xo-featured__cell" xo-motion-preset="fade-up" xo-motion-from="{ stagger: 0.1 }">
    {%- for product in collection.products limit: 8 -%}<div class="xo-featured__cell">…</div>{%- endfor -%}
  </div>
</{{ motion_tag }}>
```

```liquid
{%- comment -%} Before: layered parallax {%- endcomment -%}
<xo-parallax class="xo-editorial">
  <xo-parallax-scroll xo-keyframes="{ '0%': { y: 120, rotate: -8 }, '100%': { y: -120, rotate: 4 } }">{% render 'image', image: block.settings.image %}</xo-parallax-scroll>
</xo-parallax>

{%- comment -%} After {%- endcomment -%}
<{{ motion_tag }} class="xo-editorial" xo-scrub xo-fit-content>
  <div xo-motion-keyframes="{ '0%': { y: 120, rotate: -8 }, '100%': { y: -120, rotate: 4 } }">{% render 'image', image: block.settings.image %}</div>
</{{ motion_tag }}>
```

```liquid
{%- comment -%} Before: hover float {%- endcomment -%}
<xo-parallax><xo-parallax-hover xo-strength="20">{% render 'image', image: section.settings.image %}</xo-parallax-hover></xo-parallax>

{%- comment -%} After {%- endcomment -%}
<{{ motion_tag }} class="xo-float" xo-trigger="pointer">
  <div class="xo-float__x" xo-motion-keyframes="{ '0%': { x: -16 }, '100%': { x: 16 } }">
    <{{ motion_tag }} class="xo-float__area" xo-trigger="pointer" xo-pointer-axis="y">
      <div class="xo-float__y" xo-motion-keyframes="{ '0%': { y: -16 }, '100%': { y: 16 } }">{% render 'image', image: section.settings.image %}</div>
    </{{ motion_tag }}>
  </div>
</{{ motion_tag }}>
```
