# Story patterns — pinned scroll stories (scroll-telling)

Read when a section is pinned while its content changes: stepped copy over a sticky image, chapters, horizontal lookbooks, stacked or 3D panels, the vortex ribbon landing in a product grid. Base contract: `xo-motion.md` §9. Image effects inside a story: `image-effects.md`. Every host is `<{{ motion_tag }}>` and every story has a static fallback (§6).

## Contents

1. Pick the engine — `xo-scroll-x` / `-y`, `xo-scroll-scene`, or an `xo-motion` scrub room
2. Skeleton — room, sticky stage, measured travel
3. Pinned steps and chapters
4. Patterns — horizontal lookbook, film strip, shaped wipes, GL edge, cube push, card to full screen, 3D deck, zoom-through, vortex ribbon landing in a grid, locked counters
5. Handoffs between stories
6. Reduced motion, global switch, mobile, editor, traps

---

## 1. Pick the engine

| Need | Use |
|---|---|
| Full-screen panels that slide / reveal in, zero tuning, Tab reaches the panel | `xo-scroll-x` / `xo-scroll-y` with `xo-scroll-x-item` / `-y-item` per block (height = N × 110vh, automatic). Per-panel copy: `<xo-motion xo-trigger="parent">` inside the item (the current chapter is `xo-active`) |
| Discrete chapters with an active state (nav dots, one image per chapter) | `xo-scroll-scene` + `xo-motion xo-trigger="parent"` inside each `xo-scroll-scene-item` (§3) |
| Old panel animates too, shaped / GL transitions, 3D, free-width items, layers at different speeds, counters locked to the visuals, a ribbon | a tall `xo-motion xo-scrub` room (this file) |

`xo-scroll-x`, `xo-scroll-y` and `xo-scroll-scene` live in `xo-extras.lazy.min.js` — the chunk must ship. The xo-motion room costs you the room height, the % stops, the static layout, and the built-in focus scrolling (keep CTAs reachable in the static layout).

## 2. Skeleton — room, sticky stage, measured travel

```liquid
<{{ motion_tag }} class="xo-story__room" xo-scrub="0.6" xo-start="top top" xo-end="bottom bottom">
  <div class="xo-story__stage">
    <div class="xo-story__track" xo-motion-keyframes="{ '3%': { x: 0 }, '97%': { x: 'Math.min(0, this.parentElement.offsetWidth * 0.97 - this.lastElementChild.offsetLeft - this.lastElementChild.offsetWidth)' } }">
      {%- for block in section.blocks -%}
        <figure class="xo-story__item" {{ block.shopify_attributes }}>…</figure>
      {%- endfor -%}
    </div>
  </div>
</{{ motion_tag }}>
```
```scss
.xo-story__room { position: relative; height: calc(var(--beats, 5) * 100vh); } // ~100vh per beat
.xo-story__stage { position: sticky; top: 0; height: 100svh; overflow: clip; }
.xo-story__track { display: flex; width: max-content; height: 100%; }
@include media('<md') { .xo-story__room { height: calc(var(--beats, 5) * 80vh); } }
```

- Set `--beats` inline from Liquid (`style="--beats: {{ section.blocks.size | plus: 1 }}"`) so the room grows with the merchant's block count; stops are %, so they scale.
- Measure travel from the last item (`offsetLeft + offsetWidth`) — `scrollWidth` also counts absolutely positioned overflow. Expressions re-run on resize.
- Hold 3 % at both ends so the first and last frames read before the stage unpins. `xo-scrub` 0.5–0.6 desktop, ≤ 0.4 where finger lag shows.
- Sticky breaks under any ancestor with `overflow: hidden` / `clip` — check the section wrapper and its container.

## 3. Pinned steps and chapters

**Pure scrub — stepped copy over a sticky image** (each step owns a window; overlap windows by a few %):

```liquid
<{{ motion_tag }} class="xo-steps__room" xo-scrub="0.4" xo-start="top top" xo-end="bottom bottom">
  <div class="xo-steps__stage">
    <div class="xo-steps__media" xo-motion-keyframes="{ '0%': { scale: 1.2 }, '30%': { scale: 1 } }">{% render 'image', image: section.settings.image %}</div>
    <div class="xo-steps__step" xo-motion-keyframes="{ '0%': { opacity: 1, y: 0 }, '28%': { opacity: 1, y: 0 }, '33%': { opacity: 0, y: -28 } }">…step 1…</div>
    <div class="xo-steps__step" xo-motion-keyframes="{ '30%': { opacity: 0, y: 28 }, '36%': { opacity: 1, y: 0 }, '61%': { opacity: 1, y: 0 }, '66%': { opacity: 0, y: -28 } }">…step 2…</div>
    <div class="xo-steps__step" xo-motion-keyframes="{ '63%': { opacity: 0, y: 28 }, '69%': { opacity: 1, y: 0 } }">…step 3…</div>
    <span class="xo-steps__bar"><i xo-motion-keyframes="{ '0%': { scaleX: 0 }, '100%': { scaleX: 1 } }"></i></span>
  </div>
</{{ motion_tag }}>
```

Block-driven windows: compute each step's stops in Liquid (`forloop.index0`, `section.blocks.size`) with `divided_by: 1.0` math, or use expression keys (`'100 / 3%'`). Stacked cards: card 1 `{ '0%': { scale: 1 }, '100 / 3%': { scale: 0.9 } }`, card 2 `{ '0%': { y: '110vh' }, '100 / 3%': { y: 0 } }`, card 3 `{ '100 / 3%': { y: '110vh' }, '200 / 3%': { y: 0 } }`.

**Chapters — `xo-scroll-scene` + `parent`** (no script):

```liquid
<{{ motion_tag }} xo-scrub xo-start="top top" xo-end="bottom bottom">
  <xo-scroll-scene class="xo-chapters__scene" xo-threshold="0.6">
    <xo-scroll-scene-inner>
      {%- for block in section.blocks -%}
        <xo-scroll-scene-item {{ block.shopify_attributes }}>
          <div class="xo-chapters__bg" xo-motion-keyframes="{ '0%': { scale: 1.2 }, '100%': { scale: 1 } }">{% render 'image', image: block.settings.image %}</div>
          <{{ motion_tag }} class="xo-chapters__text" xo-trigger="parent">
            <span xo-motion-preset="fade-up">{{ block.settings.kicker | escape }}</span>
            <h3 class="rte" xo-motion-preset="text-rise-words" xo-motion-at="-=0.6">{{ block.settings.heading }}</h3>
          </{{ motion_tag }}>
        </xo-scroll-scene-item>
      {%- endfor -%}
    </xo-scroll-scene-inner>
  </xo-scroll-scene>
</{{ motion_tag }}>
```

The text plays when its item becomes `xo-active` while the scene is on screen and reverses when another item takes over. Scene not pinned (`xo-mobile-disabled` list mode, before mount): each chapter plays when it scrolls into view. Scene attributes (`xo-threshold`, `xo-mobile-disabled`, `xo-mobile-breakpoint`): MCP `get_component` for `xo-scroll-scene`. Older sections with `xo-trigger="manual"` + an `xo:scroll-scene:change` script: switch to `parent`, delete the script.

**Per-chapter copy in a scrub room — invisible markers** (copy plays in seconds — split, scramble, spring — instead of being smeared across the scrub):

```liquid
<i class="xo-story__cue" id="{{ section.id }}-cue-{{ forloop.index }}" style="--a: 0.19; --b: 0.49"></i>
<{{ motion_tag }} xo-scroll-target="#{{ section.id }}-cue-{{ forloop.index }}" xo-start="top center" xo-end="bottom center" xo-reverse>
  <h3 xo-split="chars" xo-split-mask="words" xo-motion-from="{ y: '140%', stagger: 0.018 }">{{ block.settings.title | escape }}</h3>
  <p xo-motion-from="{ opacity: 0, scale: 0.6, ease: 'spring.bouncy' }" xo-motion-at="<0.08">{{ block.settings.product.price | money }}</p>
</{{ motion_tag }}>
```
```scss
// marker spans a → b of the room's scroll travel
.xo-story__cue { position: absolute; left: 0; width: 1px; pointer-events: none;
  top: calc(var(--a) * (100% - 100svh) + 50svh); height: calc((var(--b) - var(--a)) * (100% - 100svh)); }
```

Items moving horizontally can use their own position: `xo-motion xo-axis="x" xo-reverse xo-start="center 66%"` on the item.

## 4. Patterns

All keyframes are % of one room. Where the story sells, each card carries its price and link.

**Horizontal lookbook** — §2 skeleton; inside each item `<{{ motion_tag }} xo-axis="x" xo-reverse xo-start="left 85%">` with a `fade-up` caption; the photo inside its frame counter-drifts (film strip below).

**Film strip (free-width items, three speeds)** — background word moves by its own overflow (`x: 'Math.min(0, this.parentElement.offsetWidth - this.scrollWidth)'`), the track by measured travel, the photo inside each frame by its own position:

```liquid
<{{ motion_tag }} class="xo-story__win" xo-axis="x" xo-scrub="0" xo-start="left right" xo-end="right left">
  <div class="xo-story__photo" xo-motion-keyframes="{ '0%': { x: '-8%', scale: 1.16 }, '50%': { x: '0%', scale: 1.04 }, '100%': { x: '8%', scale: 1.16 } }">{% render 'image', image: block.settings.image %}</div>
</{{ motion_tag }}>
```

The same per-item `xo-axis="x" xo-scrub="0"` scrub follows any dragged track (`xo-carousel`, `xo-scroll-carousel`).

**Edge-lens strip** — the horizontal scrub chapter with `smear` cards: `image-effects.md` §8.

**Shaped wipes** — each panel opens with its own mask while the previous one scales to ~0.84 and darkens (shade overlay opacity, not `filter`): diagonal `polygon()`, iris `circle()`, blinds = one multi-point `polygon()`. Give the clipped panel a 99.6 % background (`background: color-mix(in srgb, var(--bg) 99.6%, transparent)`) — with an opaque one Chrome can stop painting the panel underneath and the stage background flashes. Full-screen clips break the 0.25 Mpx cap — keep them to one at a time.

**GL edge reveal** — still full-screen pictures, a live WebGL edge sweeps across: `image-effects.md` §3.

**Cube push (3D)** — each new panel turns in like the next face of a cube:

```liquid
<article class="xo-cube__panel">
  <div class="xo-cube__rot" xo-motion-keyframes="{ '8%': { rotateY: 90, ease: 'power2.inOut' }, '24%': { rotateY: 0 }, '28%': { rotateY: 0, ease: 'power2.inOut' }, '44%': { rotateY: -90 } }">
    <div class="xo-cube__face">… <span class="xo-cube__shade" xo-motion-keyframes="{ '8%': { opacity: 0.75 }, '24%': { opacity: 0 }, '28%': { opacity: 0 }, '44%': { opacity: 0.75 } }"></span></div>
  </div>
</article>
```
```scss
.xo-cube__stage { container-type: inline-size; perspective: 160cqw; overflow: clip; }
.xo-cube__panel, .xo-cube__rot, .xo-cube__face { position: absolute; inset: 0; transform-style: preserve-3d; }
.xo-cube__panel { transform: translateZ(-50cqw); }
.xo-cube__face { transform: translateZ(50cqw); backface-visibility: hidden; overflow: hidden; }
```

**Card to full screen** — the next panel glides in as a small rounded card, stops, then expands while the previous recedes: `{ '8%': { x: '86%', scale: 0.42, borderRadius: 64, ease: 'power3.out' }, '16%': { x: '0%', scale: 0.42, borderRadius: 64, ease: 'power3.inOut' }, '24%': { x: '0%', scale: 1, borderRadius: 0 } }`. Give each panel its own `z-index` in order.

**3D deck (vertical)** — the covered card recedes one notch (`y: '-3.4vh', rotateX: 7, scale: 0.93`, shade 0 → 0.5); the new card rises from `y: '92vh'`, an inner wrapper straightens from `rotateX: -20` with `ease: 'spring'` (`perspective` in the keyframe).

**Zoom-through** — the next scene is a small rounded window inside the current one (`scale: 0.1 → 0.22`, `borderRadius: '18vmin'`), then grows to full screen while the current scales past the camera (`1 → 2.6`) and fades. Scale + radius + opacity only, no `will-change` on the zoomed layers.

**Vortex ribbon landing in a grid** — product cards enter as a straight strip from one corner, coil once around the headline close to the camera, leave through the opposite corner, then each card lands in its own cell of the real product grid; from then on the grid is plain, clickable DOM with the canvas off. One `ribbon` step on the grid container of a pinned room.

```liquid
<{{ motion_tag }} class="xo-vortex" xo-scrub="0.6" xo-start="top top" xo-end="bottom bottom">
  <div class="xo-vortex__stage">
    <h2 class="xo-vortex__heading rte">{{ section.settings.heading }}</h2>
    <div class="xo-vortex__grid" xo-motion-targets=".xo-vortex__card" xo-motion-preset="ribbon" xo-motion-gl="ribbon"
         xo-motion-preset-options="{ profile: 'vortex', center: [0.56, 0.4], radius: 0.22, pitch: 0.26, coils: 1.1, phase: 198,
           spin: -1, tilt: [24, 14], depth: -0.06, ramp: 0.22, lead: 0.5, tail: 0.6, cardWidth: 0.14, gap: 6, perspective: 1100,
           release: [0.57, 0.88], stagger: 0.07,
           breakpoints: { 767: { center: [0.5, 0.42], radius: 0.4, pitch: 0.5, tilt: [24, 30], depth: -0.3, ramp: 0.3, lead: 1.2, cardWidth: 0.27, gap: 4 } } }">
      {%- for product in section.settings.collection.products limit: 10 -%}
        <a class="xo-vortex__card" href="{{ product.url }}">
          {{ product.featured_image | image_url: width: 900 | image_tag: widths: '450, 900', sizes: '20vw', crossorigin: 'anonymous' }}
        </a>
      {%- endfor -%}
    </div>
  </div>
</{{ motion_tag }}>
```
```scss
.xo-vortex { height: 620vh; }
.xo-vortex__stage { position: sticky; top: 0; height: 100svh; overflow: hidden; }
.xo-vortex__grid { position: absolute; inset: 0; display: grid; grid-template-columns: repeat(5, minmax(0, 1fr));
  align-content: center; gap: 1.6rem; padding: 19rem 4vw 6rem; pointer-events: none; }
.xo-vortex__card { aspect-ratio: 16 / 10; border-radius: 0.6rem; overflow: hidden; pointer-events: auto; }
@include media('<md') { .xo-vortex { height: 560vh; } .xo-vortex__grid { grid-template-columns: repeat(2, minmax(0, 1fr)); } .xo-vortex__card { aspect-ratio: 3 / 2; } }
```

Tune in two passes: the **path** first with `release` removed, then add the **landing**.

*Path* — where the strip flies. Lengths within ±2 are fractions of the container width, larger numbers are px.

| Option | Default (vortex) | Meaning |
|---|---|---|
| `profile` | `'helix'` | `'vortex'` = straight strip → one coil → straight strip; `'helix'` = plain tilted spiral, no landing by default |
| `center` | `[0.5, 0.5]` | coil centre as container fractions, origin top-left |
| `radius` · `pitch` · `coils` | 0.3 · 0.12 · 0.75 | coil radius, rise per turn (signed), turns around the vertical axis |
| `tilt` | `[0, 0]` | `[x, z]` degrees: x > 0 = seen from above; z turns the coil in the screen plane — picks the corners the straight ends point to |
| `phase` · `spin` | 0 · 1 | where the coil's middle sits on the ring (deg, 0 = front); 1 = front runs right → left, −1 = left → right |
| `depth` | 0 | z of the centre (negative = away from the camera) |
| `ramp` | 0.3 | length of the straight-to-coil blend on each side |
| `lead` · `tail` | 0.8 · 1 | straight length before / after the coil (enough to enter and leave the screen); `travel` replaces the computed total |
| `readable` | `true` | a card turning its back flips edge-on, so no photo reads mirrored |
| `cardWidth` · `gap` · `perspective` | 0.24 · 16 · 1400 | card width on the ribbon, spacing, camera distance (px) |
| `breakpoints` | — | `{ 767: { … } }` merges geometry options under that viewport width |

*Landing* — how the cards settle into the grid.

| Option | Default | Meaning |
|---|---|---|
| target grid | — | the container's own CSS grid; each card lands in its cell (measured without transforms); with `release` the ribbon card takes the cell's aspect |
| `release` | — | `[a, b]` of step progress: fly over 0 → a, land over a → b, from b the plain DOM grid with GL off. Fixed per build (not in `breakpoints`) |
| `stagger` | 0.05 | landing offset per card, DOM order |
| `lift` | 0.06 | z hop (arc) while a card lands |

- Copy rides the same room as sibling steps placed by `xo-motion-at`: headline lines part over 0 → 0.57 (strip in the air), shelf title + "Shop the set" link fade in at 0.57, captions at ~0.87.
- Without `xo-motion-gl="ribbon"` the cards stay flat (CSS version, cheaper); with it they truly bend and the DOM cards stay underneath for clicks and focus.
- Merchant collection size changes the train length — keep `limit` fixed and the grid's column count matching it.
- Reduced motion / animation off: the static grid — keep the CSS fallback (§6) so the room does not stay 620vh tall.

**Counters locked to the story** — register numbers (`@property --day { syntax: '<number>'; inherits: true; initial-value: 1 }`), keyframe them on the same room (`'--day': 1 → 7`), show with `counter-reset: day calc(var(--day))`. A route line uses `draw` (`motion-recipes.md` §17).

## 5. Handoffs between stories

- Colour flood: the last frame's background becomes the next section's background (both from the section's colour scheme).
- Gate: the last frame of story A equals the first frame of story B (same image, same position).
- Header colour by section: `xo-motion xo-scroll-target="<section>"` wrappers writing registered numbers that CSS mixes with `color-mix()` — shared header markup, so ask before touching the header group.

## 6. Reduced motion, global switch, mobile, editor, traps

- Reduced motion jumps scrub and toggle timelines to their END: a story shows its last frame. Design a static spread per story and apply it under **both** `@media (prefers-reduced-motion: reduce)` and `html[xo-animate-disabled]` (where `motion_tag` renders a plain `div`, the steps are inert but the tall room and absolute steps remain):
  ```scss
  @mixin xo-story-static {
    .xo-story__room { height: auto; }
    .xo-story__stage { position: static; height: auto; overflow: visible; }
    .xo-story__track { flex-direction: column; width: auto; transform: none !important; }
    .xo-story__step { position: static; opacity: 1 !important; transform: none !important; }
  }
  @media (prefers-reduced-motion: reduce) { @include xo-story-static; }
  html[xo-animate-disabled] { @include xo-story-static; }
  ```
  Panels stacked vertically, cube faces as a grid, deck as a column, GL layers as plain images with copy visible.
- Mobile: own layout (photo above copy), shorter rooms, travel and type sizes per breakpoint; keyframe `breakpoints` replace the whole stop set.
- Theme Editor: a 400–600vh room makes block selection scroll far — expected; keep `{{ block.shopify_attributes }}` on each item so selecting a block scrolls to it.
- Never `will-change: transform` on a layer that scales far. Full-screen reveals animate `scale`, not `clip-path`.
- Expressions on a `display: contents` parent measure 0 — measure a real box.
- A step inside a nested `xo-trigger="load"` host is also claimed by an enclosing scrub host — put the scrub on a wrapper outside it.
- `stagger` + `duration` inside scrub keyframes must fit the ruler.
