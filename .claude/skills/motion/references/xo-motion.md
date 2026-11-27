# `xo-motion` — contract

The declarative timeline component of xo-webcomponents (V1.9.29). Read before writing any `xo-motion` markup. Recipes live in `motion-recipes.md`; legacy conversions in `motion-migration.md`; theme rules (global switch, assets, LCP, editor) in `theme-integration.md`.

Source of truth: the shipped bundle. When an option is not shown verbatim here, call the `xo-components` MCP (`get_component` for `xo-motion`; if the name is not found, `find_components("motion")` lists the registered one). MCP and this file disagree → MCP wins for the bundle it describes; note the drift. Unknown attributes and option keys fail silently.

## Contents

1. Mental model — one timeline, three rulers
2. Host attributes (`<xo-motion>`)
3. Step attributes — five ways to declare a step
4. Triggers, scroll positions, loops, velocity, pointer
5. Positioning steps — `xo-motion-at`
6. Groups — `xo-motion-targets`, `stagger`, per-target overrides, `xo-batch`
7. Split text
8. Presets (entrance, 3D layout, velocity, slices)
9. Scrub, keyframes, pinning, horizontal tracks
10. Tween values, easing, springs, expressions
11. CSS-variable channel and counters
12. JS API, element methods, events, state
13. Reduced motion
14. Performance
15. Pitfalls
16. Timing defaults

---

## 1. Mental model — one timeline, three rulers

`<xo-motion>` owns **one timeline**. Every descendant (or the host itself) carrying a step attribute (`xo-motion-from` / `-to` / `-fromto` / `-keyframes` / `-preset`) becomes a step, in DOM order. Steps inside a nested `<xo-motion>` belong to that nested host.

| Ruler | When | Units | Step order |
|---|---|---|---|
| **Time** | no `xo-scrub` | seconds; default step `{ duration: 0.8, ease: 'power3.out' }` | sequential; `xo-motion-at` re-positions; `xo-parallel` starts all at 0 |
| **Scroll range** | `xo-scrub` (scroll trigger) | `0..1` of the range; `%` keys = scroll %; default `{ duration: 1, ease: 'none' }` | always parallel; `duration` / `delay` / `stagger` / numeric `xo-motion-at` are fractions (`0.2` = 20 %) |
| **Driven 0..1** | `xo-trigger="velocity"` / `"pointer"` | like scroll range, progress = smoothed scroll speed (`%` of `xo-velocity-max`) or pointer position (`%` across the area) | same as scroll range |

On the 0..1 rulers the ruler is exactly 1 long; a step reaching past 1 compresses everything (console warning). Only the time ruler loops.

## 2. Host attributes (`<xo-motion>`)

| Attribute | Default | Meaning |
|---|---|---|
| `xo-trigger` | `scroll` | `scroll` · `load` · `hover` · `click` · `parent` · `manual` · `velocity` · `pointer` (§4) |
| `xo-repeat` | `0` | Extra plays after the first (`2` = 3 plays); `-1` = infinite. Time ruler only |
| `xo-yoyo` | off | With `xo-repeat`: every other leg runs backwards on the mirrored curve |
| `xo-repeat-delay` | `0` | Seconds between legs |
| `xo-velocity-max` | `2` | `velocity`: px per ms mapped to progress 1 (`2` = 2000 px/s). Wheel ≈ 0.5–1, hard trackpad fling 3–6 |
| `xo-velocity-signed` | off | `velocity`: 0 = max up, 0.5 = rest, 1 = max down. Off: 0 = rest, 1 = max either way |
| `xo-velocity-smooth` | `0.5` | `velocity`: smoothing seconds, also the settle time; `0` = raw |
| `xo-pointer-axis` | `x` | `pointer`: `x` = left → right maps 0 → 1, `y` = top → bottom |
| `xo-pointer-area` | `self` | `pointer`: `self` = the host rect · `window` = the viewport while the host is visible |
| `xo-pointer-smooth` | `0.5` | `pointer`: smoothing seconds, `0` = exact |
| `xo-pointer-rest` | `0.5` | `pointer`: progress while the pointer is outside |
| `xo-start` | `top 85%` (scrub: `top bottom`) | `"<host edge> <viewport edge>"` (§4) |
| `xo-end` | scrub: `bottom top` | Scrub: end of range. With `xo-reverse`: passing it also reverses |
| `xo-scrub` | — | Scroll-range ruler. Empty = 0.6 s smoothing · number = seconds · `0` = follow scroll exactly |
| `xo-replay` | off | Scroll toggle: replay on every entry (from below or above) |
| `xo-reverse` | off | Scroll toggle: scrolling back above start reverses from wherever it is. Wins over `xo-replay` |
| `xo-batch` | off | Scroll toggle only: each target of each step gets its own watcher and queue (§6) |
| `xo-axis` | `y` | `x` = start/end measured horizontally, for items inside a scroll-driven horizontal track |
| `xo-scroll-target` | self | Selector of the element whose position drives scroll |
| `xo-defaults` | see §1 | Defaults for every step, e.g. `{ duration: 1, ease: 'expo.out' }` |
| `xo-parallel` | off (always on with scrub) | Time ruler: steps without `xo-motion-at` start at 0 |
| `xo-preset-strength` | `1` | Default strength for every preset inside |
| `xo-fit-content` | off | Step elements get `width: fit-content` (zero specificity) so rotate / scale pivot on content. Changes layout |
| `xo-markers` | off | Debug lines. `?xo-markers` in the URL enables it page-wide. Own rAF loop — never ship it |

Object attributes accept loose JS object syntax or JSON. In Liquid keep the attribute in double quotes and strings in single quotes: `xo-motion-from="{ y: '110%', stagger: 0.02 }"`.

## 3. Step attributes — five ways to declare a step

| Attribute | From | To | Typical use |
|---|---|---|---|
| `xo-motion-from="{ y: 20, opacity: 0 }"` | given values | current state | entrances |
| `xo-motion-to="{ x: 24 }"` | current state | given values | hover, push away |
| `xo-motion-fromto="{ from: { x: 0 }, to: { x: 100, duration: 1 } }"` | `from` | `to` (options live in `to`) | explicit A → B |
| `xo-motion-keyframes="{ '0%': {…}, '40%': {…}, '100%': {…}, duration, ease, stagger, breakpoints }"` | first stop | last stop | multi-stop, scroll scenes |
| `xo-motion-preset="fade-up"` | preset (§8) | current state | one-attribute entrances |

- Step options `duration`, `delay`, `ease`, `stagger` go inside the object (inside `to` for `fromto`, beside the stops for `keyframes`).
- A property the browser cannot interpolate from its current value (`clipPath` from `none`) needs both ends → `fromto` or `keyframes`.
- Keyframes hold their values before the first and after the last stop. On the time ruler the step `ease` warps the whole step (with `power3.out`, `'50%'` arrives at ~16 % of the time) — use `ease: 'none'` to keep stops in place. An `ease` inside a stop eases only the segment starting there.
- Computed keys: `'100 / 3%'`, `'container.offsetHeight / 8'` — evaluated per element and on resize, clamped 0–100.
- `breakpoints: { 767: { '0%': {…}, '100%': {…} } }` swaps the whole stop set when viewport width ≤ key (repeat every stop).
- `xo-motion-preset` + `xo-motion-from` on one element: `from` overrides preset values or adds options.

## 4. Triggers, scroll positions, loops, velocity, pointer

| `xo-trigger` | Plays when | Reverses when |
|---|---|---|
| `scroll` (default) | start point crosses the start line; once by default | `xo-reverse`: scrolling back above start (or past `xo-end`) |
| `load` | at mount | — |
| `hover` | `pointerenter` on the host | `pointerleave`, smoothly from the current value |
| `click` | click on the host toggles | every second click |
| `parent` | the nearest parent container turns on (list below); all nested ones must be on | it turns off |
| `manual` | `el.play()` / `el.restart()` | `el.reverse()` |
| `velocity` | progress follows the smoothed window scroll speed | eases back to rest when scrolling stops |
| `pointer` | progress follows the pointer on one axis | drifts to `xo-pointer-rest` when it leaves |

**`parent` containers**: `xo-carousel-slide` (and an `xo-item` / `[xo-carousel-slide]` slide inside `xo-carousel-list`) while `xo-visible`; `xo-tabs-pane`; `xo-modal`; `xo-popover`; `xo-toggle`; an `xo-collapse` panel while open (`xo-active`); `xo-scroll-x-item` / `xo-scroll-y-item` / `xo-scroll-xy-item` while they are the current chapter (`xo-active`, only while the host intersects the viewport); `xo-scroll-scene-item` while `xo-active` and its scene is on screen (when the scene is not pinned — not mounted or `xo-mobile-disabled` list mode — the item turns on when it scrolls into view). No parent found → falls back to scroll with a console warning. `parent` costs nothing per frame. It ignores page scroll: a carousel slide is `xo-visible` from init even below the fold — cover the first reveal with an outer scroll timeline.

Position syntax for `xo-start` / `xo-end`: `"<host edge> <viewport edge>"`, edges `top` · `center` · `bottom` · `40%` · `120px`, px offsets allowed (`top bottom-50px`, `center 50%+20px`); with `xo-axis="x"`: `left` · `center` · `right`. These are position strings, **not** expressions (unlike `xo-parallax-scroll`) and have no hidden `innerHeight` subtraction. Elements that can never reach the line (footer-adjacent, short pages) still play when the page is scrolled to its end.

**Loops (`xo-repeat`)** — time ruler only. Paused while off-screen or the tab is hidden, resumed in place. A user reverse (hover leave, second click, parent off) returns to the start and stops the loop, so `xo-trigger="hover" xo-repeat="-1"` loops while hovered. `xo-yoyo` with a symmetric ease (`sine.inOut`) gives a smooth float. `xo:motion:complete` fires when the last leg ends, never with `-1`. Ignored with `xo-scrub` / `velocity` / `pointer` (one console warning).

**Velocity**: unsigned `'0%'` = rest, `'100%'` = ≥ `xo-velocity-max`; signed `'0%'` = fast up, `'50%'` = rest, `'100%'` = fast down. Window scroll only (never inner scrollers, drawers, `xo-scroll-carousel`). Leaving the viewport snaps to rest.

**Pointer**: `'0%'` = left / top edge, `'100%'` = right / bottom. One axis per host — for 2D nest two hosts of the same size: outer `x` drives a wrapper (`rotateY` / `x`), inner `xo-pointer-axis="y"` drives the card (`rotateX` / `y`). With `self`, put steps on children, never on the host (its measured rect would move). 3D: write `perspective` (px) into each layer's keyframes. Touch is ignored (element stays at rest); pen behaves like a mouse.

## 5. Positioning steps — `xo-motion-at`

| Value (time ruler) | Step starts |
|---|---|
| (none) | after the previous steps end (or 0 with `xo-parallel`) |
| `1.2` | at 1.2 s |
| `-=0.3` / `+=0.3` | 0.3 s before / after the end of everything placed so far |
| `<` / `<0.1` | with / 0.1 s after the previous step **starts** |
| `>` | when the previous step ends |

**Chaining trap**: (none), `-=` and `+=` are relative to the END of everything placed so far — after a long decorative step (a 1.6 s line draw) the next content step waits for the ornament. Place ornaments with `<` or an absolute time, position content against content, or put ornaments last.

Scroll ruler: numbers `0..1` = fraction of the range; usually use `%` stops instead. In `xo-batch` only `>` (`>-0.5`, `>+0.3`) has effect.

## 6. Groups — `xo-motion-targets`, `stagger`, per-target overrides, `xo-batch`

`xo-motion-targets=".card"` on a step element tweens its matching descendants instead of itself.

| `stagger` | Meaning |
|---|---|
| `0.08` / `{ each: 0.08 }` | 0.08 s between targets (scroll ruler: fraction of range) |
| `{ amount: 0.6 }` | spread 0.6 s over the whole group |
| `{ each: 0.05, from: 'center' }` | `from`: `start` · `center` · `end` · `random` · index |

- Typical: chars 0.015–0.03, words 0.04–0.08, lines 0.08–0.12, cards 0.05–0.12; big groups → `amount` 0.3–1 so total time does not grow with merchant block count. No negative values — use `from: 'end'`.
- **Per-target override**: a target with its own step attribute replaces the group effect for itself, keeps its stagger slot, and does not inherit the group's `duration` / `ease` (falls back to `xo-defaults`).
- **`xo-batch`** (scroll toggle, no scrub): each target plays when it reaches `xo-start`, chained by `each`; targets already above the viewport jump to the end. Use it for multi-row product grids so rows below the fold wait for the shopper.

## 7. Split text

| Attribute | Values | Meaning |
|---|---|---|
| `xo-split` | `chars` · `words` · `lines`, comma list | what moves — the finest unit listed. Empty value = `words,chars` |
| `xo-split-mask` | empty · `lines` · `words` · `chars` · `none` | `overflow: hidden` boxes so units rise from behind an edge. Empty = line level |

- `lines,chars` / `lines,words`: chars / words move, lines are used for masks.
- At the end state the element gets `xo-split-done` and masks turn `overflow: visible` (descenders and Vietnamese diacritics are not clipped).
- Grapheme split (Vietnamese diacritics stay attached); `em` / `strong` / `a` from `inline_richtext` are preserved; a visually hidden copy of the text stays for screen readers.
- Line splits re-split on width change and after web fonts load, keeping progress.
- Chars lose kerning — short headings only. `xo-split="chars"` breaks a parent's `background-clip: text` gradient.
- Split `text` / `inline_richtext` output (one inline run). For a `richtext` field (several `<p>`) animate the `rte` wrapper as one block (`fade-up`) — the merchant's markup cannot carry per-paragraph attributes.

## 8. Presets

**Entrance presets** — `xo-motion-preset="<name>"` is a `from` step. Same names as `xo-animate`'s `xo-type` (xo-animate's `rotate-left-up` / `rotate-right-up` are `swing-left` / `swing-right` here).

| Name | Starts from |
|---|---|
| `fade` · `fade-up` / `-down` / `-left` / `-right` | transparent, shifted `min(30%, 60px)` |
| `zoom-in` / `zoom-out` | transparent, scale 0.6 / 1.3 |
| `swing-left` / `swing-right` | shifted down, rotated around one edge |
| `snake-left/right/up/down` | stretched along the travel axis |
| `3d-up` · `flip-up` | flipped around the top / bottom edge |
| `blur` · `blur-rise` · `focus-in` | blurred (filter — see §14 caps) |
| `skew-up` | skewed then upright — editorial headings |
| `liquid` / `liquid-wave` / `liquid-rise` | gooey SVG filter — one-block headings / logos, never per char |
| `text-rise` | chars rise from line masks (auto `lines,chars`, 1.2 s, `expo.out`, stagger 0.022) — hero headings |
| `text-rise-words` | words rise (auto `lines,words`, 1.1 s, stagger 0.05) — long headings |
| `text-rise-lines` | lines slide up (auto `lines`, 1.1 s, stagger 0.1) — short paragraphs |
| `wipe-right` / `-left` / `-up` / `-down` · `iris` | clip-path reveals — small media, colour blocks, rules |

Strength: `xo-motion-preset-strength` (step) or `xo-preset-strength` (host); `1` default, `0` = fade only; `wipe-*` / `iris` unaffected. An unknown name logs a warning and the step is skipped.

**3D layout presets** — `xo-motion-preset="helix|ring|fan|ribbon"` + `xo-motion-preset-options` on the element that carries `xo-motion-targets`; driven by any ruler (scrub, velocity, pointer, time). The container gets `xo-motion-stage` (children stacked in one grid cell, `preserve-3d`, `perspective: var(--xo-perspective)`); the 3D container must not have `overflow: hidden` / `opacity` / `filter` (flattens 3D).

| Preset | Options (defaults) | Use |
|---|---|---|
| `helix` | `radius` 200, `pitch` 40, `step` 30, `turns` 1, `strands` 1, `face` `'viewer'` \| `'out'`, `fade` 0, `perspective` | DNA strand of product thumbs in a pinned room |
| `ring` | `radius` 300, `turns` 1, `face` `'out'`, `fade`, `perspective` | cylinder carousel turning with scroll |
| `fan` | `angle` 50, `spread` 0, `pivot` 150 | card fan opening on enter (`ease: 'spring.bouncy'`) |
| `ribbon` | `profile` `'helix'` \| `'vortex'`, `release`, … | cards along a spiral; vortex + landing in a grid → `story-patterns.md` §4 |

**Velocity presets** — `velocity-stretch`, `velocity-skew`, `velocity-tilt`, `wave-text` (auto char split); transform only, rest = identity. Two-sided under `xo-velocity-signed` or `pointer`.

**Slices** — `xo-motion-preset="slices"` + `xo-motion-preset-options="{ count: 5, axis: 'y', jitter: [25, 75], reverse: false }"` → `image-effects.md` §5.

## 9. Scrub, keyframes, pinning, horizontal tracks

- **Default range**: 0 % = host top at viewport bottom, 100 % = host bottom past viewport top.
- **Pinning**: the `<xo-motion>` is the tall room (`height: 300–460vh`) with a `position: sticky; top: 0; height: 100svh` child, and `xo-start="top top" xo-end="bottom bottom"`. No ancestor with `overflow: hidden` / `clip` between room and stage (breaks sticky — check the project's `section` wrapper). Give each step a window: `{ '17%': { opacity: 0, y: 28 }, '21%': { opacity: 1, y: 0 }, '48%': { opacity: 1 }, '52%': { opacity: 0 } }`.
- **Horizontal track**: track `xo-motion-keyframes="{ '3%': { x: 0 }, '97%': { x: 'Math.min(0, this.parentElement.offsetWidth - this.lastElementChild.offsetLeft - this.lastElementChild.offsetWidth)' } }"`; items inside can be their own `<xo-motion xo-axis="x">` (e.g. `xo-reverse xo-start="left 85%"`).
- **Partial-range steps**: `xo-motion-at="0.2"` + `duration: 0.1` + `stagger: 0.01` (fractions of the range).
- **With `xo-scroll-scene`**: outer `<xo-motion xo-scrub xo-start="top top" xo-end="bottom bottom">` for continuous layers; per-item copy in `<xo-motion xo-trigger="parent">` inside each `xo-scroll-scene-item`.

## 10. Tween values, easing, springs, expressions

| Key | Meaning |
|---|---|
| `x`, `y`, `z` | translate; number = px, strings keep units (`'110%'` of own size, `'10vh'`) |
| `rotate`, `rotateX`, `rotateY`, `skewX`, `skewY` | degrees |
| `scale`, `scaleX`, `scaleY`, `perspective` | number (`perspective` px) |
| `blur`, `brightness`, `contrast`, `hueRotate`, `grayscale`, `invert`, `saturate`, `sepia` | composed into one `filter` |
| `opacity`, `clipPath`, `backgroundColor`, any camelCase CSS | numbers get `px` except unitless props |
| `draw` | SVG stroke in % of length: `0` hidden, `100` full, `'20% 80%'` segment; whole SVG: `xo-motion-targets="path, circle"` on the `<svg>` |
| `morph` | on a `<path>`: target `d` or selector of another path |
| `motionPath` | `'#route'` or `{ path, rotate, start, end, align }` — not in keyframes |
| `videoTime` | 0..100 % of the child `<video>` (scroll-scrubbed video) |
| `groupImg` | 0..100 → which child `<img>` is visible (image sequence) |
| `scramble` | JS channel 0..100 — text decode (`image-effects.md` §6) |
| `liquid`, `liquidNoise` | 0..100 gooey filter amounts; never with filter props on the same element |
| `in1`..`in4`, `'--any-name'` | written as CSS custom properties each frame (§11) |
| `'--xo-gl'`, `'--xo-gl-x'`, `'--xo-gl-y'` | drive a WebGL effect from scroll / parent (`image-effects.md` §2) |

xo-motion composes translate / rotate / scale / skew into one `transform`; a CSS `transform` on the same element is overridden while animating — put centring transforms on a wrapper.

**Easing**: `none`, `power1`..`power4`, `sine`, `expo`, `circ`, `back(overshoot)`, `elastic(amplitude, period)`, `bounce`, each with `.in` / `.out` / `.inOut` (bare = `.out`); aliases `linear`, `quad`, `cubic`, `quart`, `quint`. Raw CSS easings pass through: `cubic-bezier(...)`, `ease`, `ease-in-out`, `steps(n)`. An invalid name — including `var(--token)` and xo-animate names like `easeOutQuart` — logs a warning and falls back to `power1.out` (xo-animate names → literal curves: `motion-migration.md` §3). CSS `linear()` is rejected. Non-monotonic eases (`back`, `elastic`, `bounce`) reverse plainly.

**Springs**: `spring` (≈ 1.15 s), `spring.soft` (≈ 0.85 s), `spring.bouncy` (≈ 1.54 s), `spring.stiff` (≈ 0.40 s), `spring(mass, stiffness, damping[, velocity])`. A spring step without its own `duration` lasts its settling time (off on 0..1 rulers and when `xo-defaults` has `duration`). Good for price pops, badges, card fans.

**Expressions** — string values and keyframe keys may reference `this` (the animated element), `container` (the `xo-motion`), `window`, `document`, `offset(el)`, `random(min, max)` (stable per element). Re-evaluated on resize, run by a CSP-safe interpreter: arithmetic, comparisons, `&& || ??`, ternary, read-only property access, and an allowlist of calls (DOM measuring such as `getBoundingClientRect`, `querySelector`, `closest`, `getAttribute`; `Math.*`; `parseFloat`; safe string / array methods). No assignment, `new`, arrow functions, template `${}` → console error, value 0.

## 11. CSS-variable channel and counters

`in1`..`in4` write `--in1`..`--in4`; any `'--name'` key writes `--name`, every frame. Drive what CSS can read — a scrubbed number, a gradient angle, a variable-font weight:

```liquid
<span class="xo-stats__value" aria-hidden="true"
      xo-motion-keyframes="{ '10%': { in1: 0 }, '46%': { in1: {{ block.settings.value | default: 0 }} } }"></span>
<span class="xo-visually-hidden">{{ block.settings.value }}</span>
```
```scss
.xo-stats__value { contain: layout; font-variant-numeric: tabular-nums; }
.xo-stats__value::before { counter-reset: n calc(var(--in1, 0)); content: counter(n); } // integers only
```

The `::before` counter is invisible to screen readers — keep the real number in text. For a time-based count-up with decimals use `<xo-countto>`.

## 12. JS API, element methods, events, state

Element: `el.play()`, `el.reverse()`, `el.restart()`, `el.timeline` (`el.timeline.progress(0.5)`, `el.timeline.hold(true)` to pause a loop in place).

`window.xoMotion` → `{ timeline, to, from, fromTo, set, keyframes, split, scroll, spring, parseEase, toCssEase, presets }`. `timeline({ defaults, paused, repeat, yoyo, repeatDelay, onComplete })`; `tl.hold(on)` pauses / resumes without changing state (use it for a WCAG pause button on a loop); `tl.invalidate()` re-measures after layout changes; `tl.kill(commit)`; `split(el, { type, mask })`; `scroll(tl, { trigger, start, end, scrub, once, reverse, onUpdate })`. Prefer attributes — theme sections should not need JS for motion.

Events: `xo:motion:complete` (bubbles) when the timeline finishes forward. State: `xo-ready` on the host once built — until then from / fromto / keyframes / preset steps are `visibility: hidden` (no flash, but see `theme-integration.md` §4 for LCP and PSI). Split elements get `xo-split-done` at the end state.

## 13. Reduced motion

`prefers-reduced-motion: reduce` → every timeline (time, scrub, batch) jumps to its **end state**; `xo-repeat` does not loop; `velocity` / `pointer` stay at the rest pose (velocity `0`, signed `0.5`, pointer `xo-pointer-rest`); no WebGL canvas.

- Entrances: content shows in its final place — fine.
- Scrub / pinned stories: the shopper sees only the last frame. Design the end frame as a complete static layout, or add an un-pin fallback (`!important` because the WAAPI fill beats normal CSS):
  ```scss
  @media (prefers-reduced-motion: reduce) {
    .xo-story__room { height: auto; }
    .xo-story__stage { position: static; height: auto; }
    .xo-story__step { position: static; opacity: 1 !important; transform: none !important; }
  }
  ```
  Repeat the same block under `html[xo-animate-disabled]` when the section honours the theme switch (`theme-integration.md` §2).
- Hover / click: no motion — the end-state-only content must not be required to use the page.
- Loops: design the end of the first leg as the resting look (a pulse `1 → 1.07 → 1` ends at rest).
- Velocity / pointer: the rest pose is the design — make it neutral.

## 14. Performance

- Time-ruler modes run transform / opacity on the compositor. Scroll toggles with `xo-start="top <line>"` and no `xo-end` share IntersectionObservers — ~300 elements cost about the same as `xo-animate`. Other start edges, `xo-end` with `xo-reverse`, `xo-axis="x"` and `xo-scrub` read positions per frame while near the viewport.
- **Property rule**:
  1. `transform` + `opacity` first — free at any size.
  2. `clip-path` repaints per frame: ≤ ~0.25 Mpx per element (≈ 500×500 CSS px), ≤ 4 running at once. A large image reveal → scale / translate the image inside an `overflow: hidden` frame.
  3. `filter` / `blur` / `liquid*` reveals: a few small elements per page; never on tab panes, modal content, product grids or large images, never per char.
  4. Never `width` / `height` / `top` / `left` / `margin` / `padding` / `backgroundPosition` / grid templates.
- Split text: chars for short headings only; long copy → `text-rise-lines` or a block `fade-up`.
- Long grids: `xo-batch` with small `each` (0.05–0.08).
- Mobile: xo-motion keeps scrub smoothing on touch — keep `xo-scrub` ≤ 0.4 where finger lag shows; shrink travel with keyframe `breakpoints`; shorten pinned rooms with CSS height (stops are %); use `100svh` stages.
- `velocity` / `pointer`: one shared rAF loop that sleeps when settled; still apply to a few big elements, not every card.
- Never `will-change: transform` on a layer that scales far (stale tiles when it shrinks back).

## 15. Pitfalls

- **Transform ownership**: animations keep their final frame — CSS `:hover { transform }` on a step element never applies. Hover on a child. Never an xo-motion step plus `xo-animate` / `xo-parallax-scroll` on the same node.
- **Nested hosts**: a nested `<xo-motion>` carrying step attributes is claimed by both timelines — wrap it in a `div` and put the parent's step on the div.
- **Containing block**: a step keeps a transform, which traps `position: fixed` descendants — never make a step of an element that contains drawers / modals / sticky headers.
- **Layout**: `xo-motion` is `display: block`; as a grid / flex item it becomes the item. To stagger grid items keep the grid inside one host and use `xo-motion-targets`.
- **Late content**: steps are collected at mount. AJAX-appended products / quick view markup get their own `<xo-motion>` (`component-motion.md` §4).
- **Inside carousel / tabs / modal / popover / toggle / collapse / scroll-scene**: the default trigger is still `scroll` — opt in with `xo-trigger="parent"` (`xo-animate` did this automatically).
- **Ease tokens**: `var(--ease-*)` silently falls back to `power1.out`.
- **Repeat on a 0..1 ruler** is ignored — a loop inside a scrubbed section needs its own nested `<xo-motion xo-repeat>` on a wrapper.
- **Pointer ignores touch** — never hide content or meaning behind pointer motion.
- **`draw`**: the V1.9.29 engine drops `pathLength` and measures non-scaling strokes, so lines draw evenly; dashed / stitched strokes still lose their pattern — reveal those with a clip instead.
- **Keyframe `breakpoints`** replace the whole stop set.
- **Clip-path reveal over an opaque scene**: give the clipped panel a 99.6 % background or Chrome may skip painting the panel below (`story-patterns.md` §4).
- **Drag with inertia** is not a trigger — use a dragged track (`xo-carousel` with `xo-position-vars`, `xo-scroll-carousel`) and per-item `xo-axis="x" xo-scrub="0"` (`component-motion.md` §2).

## 16. Timing defaults

- Feedback (button / card hover response, press, tab, swatch) 120–250 ms; never delays buying.
- Reveals: `expo.out` / `power3.out` / `quart.out`, 0.6–1.2 s; text-rise presets carry their own.
- Image hover in / out: 0.4–0.5 s / 0.3–0.45 s (`expo.out` / `power3.out`); ~1 s hovers read as slow.
- Tabs / modal / drawer / collapse content usable within ≤ 400 ms, settled ≤ 0.8 s (`motion-recipes.md` §9).
- Scrub smoothing 0.4–0.6 desktop, ≤ 0.4 on touch.
- Brand taste per archetype: the matrix in `animate.md` (xo-animate names → convert eases with `motion-migration.md` §3).
