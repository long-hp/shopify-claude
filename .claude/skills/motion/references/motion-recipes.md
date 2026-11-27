# Motion recipes — theme sections with `xo-motion`

Copy-paste starting points for `src/sections/<name>/`. Contract: `xo-motion.md`. Every recipe assumes the section prelude from `theme-integration.md` §2 (`motion_tag`, `motion_preset`, `motion_duration`, `motion_strength`) and the project wrapper:

```liquid
{%- capture content -%}
  …recipe markup…
{%- endcapture -%}
{% render 'section', content: content %}
```

Classes follow the section's BEM (`xo-<name>__*`, styles in `<name>.global.scss`). Bind `{{ section.settings.* }}` / `{% for block in section.blocks %}` as shown; `richtext` output goes in `<div class="… rte">`. Values are neutral defaults — swap the ease for the brand (`xo-motion.md` §16). Pinned / horizontal stories live in `story-patterns.md`, image effects in `image-effects.md`, component hooks in `component-motion.md`.

## Contents

1. Decision flow
2. Global-settings reveal — the xo-motion form of `<xo-animate xo-cascade>`
3. Hero — choreographed load
4. Image with text — split heading, image wipe, drift
5. Featured collection grid — staggered, batched
6. Testimonials — carousel with per-slide copy
7. Logo strip / marquee entrance (+ pause)
8. Product card hover (DOM)
9. Tabs, modal, drawer, collapse content
10. Counters / stats
11. Read-along text highlight
12. Loops — floating badge, pulsing CTA, scroll hint
13. Scroll-velocity skew
14. Pointer — 3D tilt, magnetic button
15. Window-wide mouse parallax
16. Scroll-linked parallax background (replaces `xo-parallax-scroll`)
17. SVG line draw
18. Two-row drift band
19. 3D layouts — helix, ring, fan

---

## 1. Decision flow

```
What should move?
├─ Content appearing as it scrolls in ── scroll toggle (default trigger)
│    ├─ should follow Theme settings → Animation ── global-settings reveal (§2)
│    ├─ many items in a grid / list ────────────── xo-motion-targets + stagger; multi-row → xo-batch (§5)
│    ├─ text by chars / words / lines ──────────── text-rise / -words / -lines or xo-split (§3, §4)
│    └─ replay / retract on scroll back ────────── xo-replay / xo-reverse
├─ First section on page load ───────────────────── xo-trigger="load" + xo-motion-at overlaps (§3)
├─ Value tied to scroll (drift, zoom, progress) ─── xo-scrub + xo-motion-keyframes (§16, §11)
├─ Section pinned while content changes ─────────── story-patterns.md
├─ Inside carousel slide / tab / modal / popover / toggle / collapse ─ xo-trigger="parent" (§6, §9)
├─ Reacts to scroll SPEED ───────────────────────── xo-trigger="velocity" (§13)
├─ Follows the mouse ────────────────────────────── xo-trigger="pointer", nested x / y for 2D (§14, §15)
├─ Hover / click with several parts ─────────────── xo-trigger="hover" / "click" (§8)
├─ Loops ────────────────────────────────────────── xo-repeat="-1" (§12); ticker → xo-marquee (§7)
└─ Section already on xo-animate / xo-parallax-* ── extend it, or migrate the whole section (motion-migration.md)
```

## 2. Global-settings reveal — the xo-motion form of `<xo-animate xo-cascade>`

`polish` still proposes bare `<xo-animate xo-cascade>` on each sibling. The xo-motion equivalent inherits the same global settings through the prelude and wraps the group in ONE host:

```liquid
<{{ motion_tag }} class="xo-collection-list__head" xo-start="top bottom-50px" xo-preset-strength="{{ motion_strength }}"
  xo-defaults="{ duration: {{ motion_duration }}, ease: 'cubic-bezier(0, 0, 0.3, 1)' }">
  <p class="xo-collection-list__eyebrow" xo-motion-preset="{{ motion_preset }}">{{ section.settings.eyebrow }}</p>
  <h2 class="xo-collection-list__heading rte" xo-motion-preset="{{ motion_preset }}" xo-motion-at="<0.075">{{ section.settings.heading }}</h2>
  <div class="xo-collection-list__text rte" xo-motion-preset="{{ motion_preset }}" xo-motion-at="<0.075">{{ section.settings.text }}</div>
</{{ motion_tag }}>

<{{ motion_tag }} xo-batch xo-start="top bottom-50px" xo-preset-strength="{{ motion_strength }}"
  xo-defaults="{ duration: {{ motion_duration }}, ease: 'cubic-bezier(0, 0, 0.3, 1)' }">
  <div class="xo-collection-list__grid" xo-motion-targets=".xo-collection-list__item" xo-motion-preset="{{ motion_preset }}" xo-motion-from="{ stagger: 0.075 }">
    {%- for block in section.blocks -%}
      <div class="xo-collection-list__item" {{ block.shopify_attributes }}>…</div>
    {%- endfor -%}
  </div>
</{{ motion_tag }}>
```

- `<0.075` = 75 ms after the previous step starts (xo-animate's default `xo-constant`); `top bottom-50px` = xo-animate's trigger line; the `cubic-bezier` = xo-animate's `easeLight`.
- Inside a carousel / tabs / modal / popover add `xo-trigger="parent"` — xo-animate did that automatically, xo-motion does not.
- Upgrading a heading to `text-rise-words` is a design decision, not the global look — do it only when asked or when the design shows it.

## 3. Hero — choreographed load

```liquid
<{{ motion_tag }} class="xo-hero__copy" xo-trigger="load" xo-defaults="{ duration: 1.1, ease: 'expo.out' }">
  <p class="xo-hero__eyebrow" xo-motion-preset="fade-up">{{ section.settings.eyebrow }}</p>
  <h1 class="xo-hero__heading rte" xo-motion-preset="text-rise" xo-motion-at="-=0.7">{{ section.settings.heading }}</h1>
  <div class="xo-hero__text rte" xo-motion-preset="fade-up" xo-motion-at="-=1">{{ section.settings.text }}</div>
  <div class="xo-hero__actions" xo-motion-targets=".xo-hero__button" xo-motion-from="{ y: 24, opacity: 0, stagger: 0.08 }" xo-motion-at="-=0.9">
    {%- for block in section.blocks -%}
      <a class="xo-hero__button" href="{{ block.settings.link }}" {{ block.shopify_attributes }}>{{ block.settings.label | escape }}</a>
    {%- endfor -%}
  </div>
</{{ motion_tag }}>
<div class="xo-hero__media">
  {% render 'image', image: section.settings.image, lazyload: false %}
</div>
```

- The LCP image stays outside every timeline (`theme-integration.md` §4). Long headings (> ~40 chars) → `text-rise-words`; quiet luxury brands → `text-rise-lines` or `fade-up` with `xo-preset-strength="0.5"`.
- `load` plays even when the hero is not the first section — use the default scroll trigger for heroes placed lower.

## 4. Image with text — split heading, image wipe, drift

```liquid
<{{ motion_tag }} class="xo-image-text__grid" xo-start="top 75%" xo-defaults="{ duration: 1, ease: 'expo.out' }">
  <figure class="xo-image-text__media" xo-motion-preset="wipe-up" xo-motion-from="{ duration: 1.3, ease: 'expo.inOut' }">
    <{{ motion_tag }} class="xo-image-text__drift" xo-scrub="0.3">
      <div class="xo-image-text__img" xo-motion-keyframes="{ '0%': { scale: 1.15, y: '-4%' }, '100%': { scale: 1.15, y: '4%' } }">
        {% render 'image', image: section.settings.image %}
      </div>
    </{{ motion_tag }}>
  </figure>
  <div class="xo-image-text__body">
    <h2 class="xo-image-text__heading rte" xo-motion-preset="text-rise-words" xo-motion-at="-=0.9">{{ section.settings.heading }}</h2>
    <div class="xo-image-text__text rte" xo-motion-preset="fade-up" xo-motion-at="-=0.9">{{ section.settings.text }}</div>
    <a class="xo-image-text__cta" href="{{ section.settings.link }}" xo-motion-preset="fade-up" xo-motion-at="-=0.8">{{ section.settings.label | escape }}</a>
  </div>
</{{ motion_tag }}>
```

- The drift is a nested host on a wrapper — the `figure` (outer step) and the image wrapper (inner step) never share a transform; `scale: 1.15` keeps the moving image covering the frame (`figure { overflow: hidden }`).
- `wipe-up` is a clip-path: fine for a half-width image (≤ ~0.25 Mpx), not for a full-bleed one — scale the image inside an `overflow: hidden` frame instead.
- Image hover into a second image (goo / dissolve / liquid) on the same figure: `image-effects.md` §3 — put the GL host inside the figure, never on the drift step.

## 5. Featured collection grid — staggered, batched

```liquid
<{{ motion_tag }} xo-batch xo-defaults="{ duration: 0.9, ease: 'expo.out' }">
  <div class="xo-featured__grid" xo-motion-targets=".xo-featured__cell" xo-motion-preset="fade-up" xo-motion-from="{ stagger: 0.08 }">
    {%- for product in section.settings.collection.products limit: section.settings.limit -%}
      <div class="xo-featured__cell">{% render 'product-card', product: product %}</div>
    {%- endfor -%}
  </div>
</{{ motion_tag }}>
```

- Target a cell wrapper, not the card: the card snippet may own its own hover / `xo-animate` (`animate_enabled`). Never add an xo-motion entrance on top of a snippet that already wraps itself in `xo-animate` — pass `animate_enabled: false` or keep the legacy reveal.
- `xo-batch`: rows below the fold wait for the shopper. One-row grids can drop it.
- AJAX pagination / infinite scroll: each appended fragment carries its own `<xo-motion xo-batch>` (`component-motion.md` §4).

## 6. Testimonials — carousel with per-slide copy

```liquid
<xo-carousel class="xo-testimonials__carousel" xo-loop aria-label="{{ section.settings.heading | escape }}">
  <xo-carousel-inner>
    <xo-carousel-list>
      {%- for block in section.blocks -%}
        <xo-carousel-slide {{ block.shopify_attributes }}>
          <{{ motion_tag }} class="xo-testimonials__slide" xo-trigger="parent" xo-defaults="{ duration: 0.9, ease: 'expo.out' }">
            <blockquote class="xo-testimonials__quote" xo-motion-preset="text-rise-lines">{{ block.settings.quote | escape }}</blockquote>
            <p class="xo-testimonials__author" xo-motion-preset="fade-up" xo-motion-at="-=0.6">{{ block.settings.author | escape }}</p>
          </{{ motion_tag }}>
        </xo-carousel-slide>
      {%- endfor -%}
    </xo-carousel-list>
  </xo-carousel-inner>
  <xo-carousel-prev><button type="button" aria-label="{{ 'sections.slideshow.previous_slideshow' | t }}">…</button></xo-carousel-prev>
  <xo-carousel-next><button type="button" aria-label="{{ 'sections.slideshow.next_slideshow' | t }}">…</button></xo-carousel-next>
</xo-carousel>
```

- `parent` plays when the slide becomes `xo-visible`, reverses when it leaves. It ignores page scroll, so the first slide may finish before the section is seen — wrap the carousel in an outer scroll host with a `fade-up` step for the section reveal.
- Centre card bigger and growing with the drag (coverflow): `component-motion.md` §3.
- `xo-autoplay` → pause control (`theme-integration.md` §3).

## 7. Logo strip / marquee entrance (+ pause)

```liquid
<{{ motion_tag }} class="xo-logos__inner" xo-start="top 90%">
  <p class="xo-logos__label" xo-motion-preset="fade-up">{{ section.settings.label | escape }}</p>
  <div class="xo-logos__strip" xo-motion-preset="wipe-right" xo-motion-from="{ duration: 1.2, ease: 'expo.inOut' }" xo-motion-at="-=0.5">
    <xo-marquee xo-speed="6">
      {%- for block in section.blocks -%}
        {{ block.settings.logo | image_url: width: 240 | image_tag: loading: 'lazy' }}
      {%- endfor -%}
    </xo-marquee>
  </div>
  <button type="button" class="xo-logos__pause" aria-pressed="false">{{ 'sections.slideshow.pause_slideshow' | t }}</button>
</{{ motion_tag }}>
```

- The marquee owns its own transforms — the entrance step sits on a wrapper, never on `xo-marquee` or its items. Wrap it in `overflow: clip`.
- Pause: the button toggles a class (e.g. `.is-paused`) on `.xo-logos__inner`; SCSS `.is-paused xo-marquee-item { animation-play-state: paused !important; }`. The toggle script is the theme's shared pause control (`theme-integration.md` §3). The library marquee has no reduced-motion stop of its own — add `@media (prefers-reduced-motion: reduce) { .xo-logos xo-marquee-item { animation-play-state: paused !important; } }`.
- Never put a marquee inside a `velocity` host (leaning tickers read as broken).
- Static logo grid instead: `xo-motion-targets="img" xo-motion-preset="fade" xo-motion-from="{ stagger: { amount: 0.6, from: 'center' } }"`.

## 8. Product card hover (DOM)

```liquid
<{{ motion_tag }} class="xo-card" xo-trigger="hover" xo-defaults="{ duration: 0.6, ease: 'expo.out' }">
  <a class="xo-card__media" href="{{ product.url }}">
    <span class="xo-card__img" xo-motion-to="{ scale: 1.06 }">{% render 'image', image: product.featured_image %}</span>
    {%- if product.images[1] -%}
      <span class="xo-card__img-alt" xo-motion-fromto="{ from: { opacity: 0 }, to: { opacity: 1 } }" xo-motion-at="<">{% render 'image', image: product.images[1] %}</span>
    {%- endif -%}
  </a>
  <div class="xo-card__actions" xo-motion-fromto="{ from: { y: '100%', opacity: 0 }, to: { y: '0%', opacity: 1 } }" xo-motion-at="<0.05">…quick add…</div>
  <h3 class="xo-card__title"><a href="{{ product.url }}">{{ product.title | escape }}</a></h3>
</{{ motion_tag }}>
```
```scss
.xo-card__media { position: relative; display: block; overflow: hidden; }
.xo-card__img-alt { position: absolute; inset: 0; }
.xo-card:focus-within .xo-card__actions { opacity: 1 !important; transform: none !important; } // keyboard
@media (hover: none) { .xo-card__actions { opacity: 1 !important; transform: none !important; } } // touch
```

- Leaving mid-way reverses smoothly from the current value. Single-property hovers (colour, underline) stay CSS `:hover`; existing `xo-hover` / `xo-effect` reveals keep working.
- Inside an entrance grid (§5) the card is a target of the outer step; hover steps live on its children so the two timelines never touch one element.
- Click toggles (flip card, play / pause morph): `xo-trigger="click"`.
- WebGL swap to the second image instead of a crossfade: `image-effects.md` §3.

## 9. Tabs, modal, drawer, collapse content

A click is feedback: the new content must be **usable within ≤ 400 ms** and settled by ~0.8 s.

```liquid
<xo-tabs-pane xo-name="details">
  <{{ motion_tag }} xo-trigger="parent" xo-defaults="{ duration: 0.4, ease: 'quart.out' }">
    <div class="xo-tabs-block__products" xo-motion-targets=".xo-tabs-block__item" xo-motion-from="{ y: 12, opacity: 0, stagger: { amount: 0.15 } }">…</div>
    <h3 class="xo-tabs-block__heading" xo-motion-preset="fade-up" xo-motion-preset-strength="0.3" xo-motion-at="<0.05">{{ block.settings.heading | escape }}</h3>
  </{{ motion_tag }}>
</xo-tabs-pane>
```

- CTA / price / products start at 0; steps 0.3–0.45 s; stagger by `amount` ≤ 0.2 s; travel 8–16 px; no blur. Ornaments run in parallel (`xo-motion-at="0"` / `<`) and never anchor later steps.
- Every pane carries the same `parent` host — the first pane too. Works the same inside `xo-collapse` panels (plays while open, reverses on close), `xo-modal`, `xo-popover`, `xo-toggle`.
- Never make an element that contains the modal / drawer itself a step (a kept transform traps `position: fixed`).

## 10. Counters / stats

```liquid
<{{ motion_tag }} class="xo-stats__grid" xo-start="top 80%" xo-defaults="{ duration: 0.8, ease: 'expo.out' }">
  <div class="xo-stats__row" xo-motion-targets=".xo-stats__item" xo-motion-preset="fade-up" xo-motion-from="{ stagger: 0.08 }">
    {%- for block in section.blocks -%}
      <div class="xo-stats__item" {{ block.shopify_attributes }}>
        <xo-countto xo-from="0" xo-to="{{ block.settings.value }}" xo-duration="2000">0</xo-countto>
        <span>{{ block.settings.label | escape }}</span>
      </div>
    {%- endfor -%}
  </div>
</{{ motion_tag }}>
```

Scroll-scrubbed integer counter with a progress bar: `xo-motion.md` §11 (`in1` → CSS counter, real number kept in text).

## 11. Read-along text highlight

```liquid
<{{ motion_tag }} class="xo-manifesto" xo-scrub="0.3" xo-start="top 78%" xo-end="bottom 45%">
  <p class="xo-manifesto__text" xo-split="words" xo-motion-keyframes="{ '0%': { opacity: 0.14 }, '100%': { opacity: 1 }, duration: 0.3, stagger: { amount: 0.7 } }">{{ section.settings.text | escape }}</p>
</{{ motion_tag }}>
```

`duration` + `stagger.amount` are fractions of the range (0.3 + 0.7 = 1). One paragraph only (a `text` / `inline_richtext` setting, not `richtext`). Reduced motion: full opacity.

## 12. Loops — floating badge, pulsing CTA, scroll hint

```liquid
{%- if product.tags contains 'new' -%}
  <{{ motion_tag }} class="xo-card__badge" xo-repeat="-1" xo-yoyo xo-defaults="{ duration: 1.6, ease: 'sine.inOut' }">
    <span xo-motion-to="{ y: -8, rotate: -6 }">{{ section.settings.badge_label | escape }}</span>
  </{{ motion_tag }}>
{%- endif -%}

<{{ motion_tag }} class="xo-hero__pulse" xo-repeat="-1" xo-repeat-delay="2.4">
  <span class="xo-hero__pulse-ring" aria-hidden="true" xo-motion-fromto="{ from: { scale: 1, opacity: 0.55 }, to: { scale: 1.7, opacity: 0 } }"></span>
  <a class="xo-hero__button" href="{{ section.settings.link }}" xo-motion-keyframes="{ '0%': { scale: 1 }, '35%': { scale: 1.07 }, '100%': { scale: 1 } }" xo-motion-at="<">{{ section.settings.label | escape }}</a>
</{{ motion_tag }}>
```

- No `xo-trigger` = starts when first in view, pauses off-screen / in a hidden tab. Loop on hover only: `xo-trigger="hover" xo-repeat="-1"`.
- An infinite loop on a scroll / load trigger that runs > 5 s beside content needs a pause control (`timeline.hold(true)`), or cap it with a finite `xo-repeat`, or loop on hover only (`theme-integration.md` §3).
- The looping element owns its transform — hover styles on an inner span. One or two loops per viewport. Reduced motion: end of the first leg (pulse at rest, badge raised) — fine as a static look.
- Keep CSS `@keyframes` for spinners, skeleton shimmer and loaders that must run before JS.

## 13. Scroll-velocity skew

```liquid
<{{ motion_tag }} class="xo-velocity__type" xo-trigger="velocity" xo-velocity-signed>
  <p class="xo-velocity__line" xo-motion-keyframes="{ '0%': { skewY: -7, x: '-3%' }, '50%': { skewY: 0, x: '0%' }, '100%': { skewY: 7, x: '3%' } }">{{ section.settings.line_1 | escape }}</p>
  <p class="xo-velocity__line" xo-motion-preset="velocity-skew">{{ section.settings.line_2 | escape }}</p>
</{{ motion_tag }}>
```

- `.xo-velocity__type { overflow: hidden; }` so skew + travel never widen the page. Default `xo-velocity-max="2"` needs a fling — `1` for a subtle wheel response.
- Window scroll only; held at rest under reduced motion. An entrance on the same element would fight for the transform — reveal a wrapper outside the velocity host. Never on marquees.

## 14. Pointer — 3D tilt, magnetic button

```liquid
<{{ motion_tag }} class="xo-tilt" xo-trigger="pointer">
  <div class="xo-tilt__wrap" xo-motion-keyframes="{ '0%': { perspective: 1000, rotateY: -12 }, '100%': { perspective: 1000, rotateY: 12 } }">
    <{{ motion_tag }} class="xo-tilt__inner" xo-trigger="pointer" xo-pointer-axis="y">
      <article class="xo-tilt__card" xo-motion-keyframes="{ '0%': { perspective: 1000, rotateX: 10 }, '100%': { perspective: 1000, rotateX: -10 } }">…</article>
    </{{ motion_tag }}>
  </div>
</{{ motion_tag }}>

<{{ motion_tag }} class="xo-cta__magnet" xo-trigger="pointer">
  <div xo-motion-keyframes="{ '0%': { x: -22 }, '100%': { x: 22 } }">
    <{{ motion_tag }} class="xo-cta__magnet-area" xo-trigger="pointer" xo-pointer-axis="y">
      <a class="xo-cta__button" href="{{ section.settings.link }}" xo-motion-keyframes="{ '0%': { y: -16 }, '100%': { y: 16 } }"><span>{{ section.settings.label | escape }}</span></a>
    </{{ motion_tag }}>
  </div>
</{{ motion_tag }}>
```
```scss
.xo-tilt { aspect-ratio: 4 / 4.6; }
.xo-tilt__wrap, .xo-tilt__inner, .xo-tilt__card { height: 100%; }
.xo-cta__magnet { width: fit-content; }      // outer hugs the padded inner → both rects match
.xo-cta__magnet-area { padding: 5rem 7rem; } // pull area larger than the button
```

- Symmetric keyframes → the rest pose is flat / centred. Steps on children of each host, never on a `self` host. Touch ignored; reduced motion holds rest. Button hover styles on the inner span.
- Inside an entrance grid, target a wrapper cell around each `.xo-tilt`.
- Z-layered depth (title floating forward of the photo while tilting) is documented only for `xo-parallax-hover xo-3d` — see SKILL.md §Legacy.
- `<xo-magnetic>` is the one-tag radius-based pull; use this recipe when the pull needs keyframes or the section is on xo-motion anyway.

## 15. Window-wide mouse parallax

```liquid
<{{ motion_tag }} class="xo-hero__float" xo-trigger="pointer" xo-pointer-area="window" aria-hidden="true">
  <span class="xo-hero__shape xo-hero__shape--a" xo-motion-keyframes="{ '0%': { x: -50 }, '100%': { x: 50 } }"></span>
  <span class="xo-hero__shape xo-hero__shape--b" xo-motion-keyframes="{ '0%': { x: 30 }, '100%': { x: -30 } }"></span>
</{{ motion_tag }}>
```

`.xo-hero__float { position: absolute; inset: 0; pointer-events: none; }`. Opposite signs and distances read as depth. Vertical too: inside each layer an inner host with `xo-pointer-area="window" xo-pointer-axis="y"`. Decorative only.

## 16. Scroll-linked parallax background (replaces `xo-parallax-scroll`)

```liquid
<{{ motion_tag }} class="xo-banner__frame" xo-scrub="0.4">
  <div class="xo-banner__bg" aria-hidden="true"
       xo-motion-keyframes="{ '0%': { y: '-10%' }, '100%': { y: '10%' }, breakpoints: { 767: { '0%': { y: '-5%' }, '100%': { y: '5%' } } } }">
    {% render 'image', image: section.settings.image, height_fill: true %}
  </div>
  <div class="xo-banner__content">
    <h2 class="xo-banner__heading rte" xo-motion-keyframes="{ '0%': { y: 60 }, '100%': { y: -60 } }">{{ section.settings.heading }}</h2>
  </div>
</{{ motion_tag }}>
```
```scss
.xo-banner__frame { position: relative; overflow: hidden; min-height: 60vh; }
.xo-banner__bg { position: absolute; inset: -12.5% 0; z-index: -1; } // y ±10 % of the layer ⇒ 12.5 % spare each end
```

- Moves a pre-painted layer with `y` (compositor) — never `backgroundPositionY`. Scale variant: `{ '0%': { scale: 1.2 }, '50%': { scale: 1 } }` (no spare inset).
- First section whose image is the LCP: the keyframe step is hidden until JS builds — keep the image static or put the scale on a wrapper after first paint (`theme-integration.md` §4).
- Same range as `<xo-parallax>`: 0 % = host top at viewport bottom, 100 % = host bottom past viewport top.

## 17. SVG line draw

```liquid
<{{ motion_tag }} class="xo-timeline" xo-scrub="0.3" xo-start="top 70%" xo-end="bottom 60%">
  <div class="xo-timeline__line" aria-hidden="true" xo-motion-targets="path" xo-motion-keyframes="{ '0%': { draw: 0 }, '100%': { draw: '100%' } }">
    <svg viewBox="0 0 240 880" fill="none"><path d="M72 0 C 82 220, 48 352, 62 528 S 82 748, 72 880" /></svg>
  </div>
</{{ motion_tag }}>
```

- Size the box with `aspect-ratio` matching the viewBox. A line that must stretch with a variable block count: reveal it with a clip on the wrapper (`clipPath: 'inset(0 0 100% 0)'` → `inset(0 0 0% 0)`) instead of stretching the viewBox.
- On enter instead of scrubbed: `xo-motion-fromto="{ from: { draw: 0 }, to: { draw: '100%', duration: 1.2, ease: 'expo.inOut' } }"`. Dashed strokes: clip reveal, not `draw`.

## 18. Two-row drift band

Two rows of display type slide opposite ways as the band crosses the viewport — position-locked to the scroll, no autoplay, so no pause control needed.

```liquid
<{{ motion_tag }} class="xo-drift" xo-scrub="0.6" xo-start="top bottom" xo-end="bottom top" aria-hidden="true">
  <div class="xo-drift__row" xo-motion-keyframes="{ '0%': { x: '0vw' }, '100%': { x: '-36vw' } }">
    {%- for i in (1..3) -%}<span>{{ section.settings.line_1 | escape }}</span><i class="xo-drift__dot"></i>{%- endfor -%}
  </div>
  <div class="xo-drift__row xo-drift__row--alt" xo-motion-keyframes="{ '0%': { x: '-36vw' }, '100%': { x: '0vw' } }">
    {%- for i in (1..3) -%}<em>{{ section.settings.line_2 | escape }}</em><i class="xo-drift__dot"></i>{%- endfor -%}
  </div>
</{{ motion_tag }}>
<p class="xo-visually-hidden">{{ section.settings.line_1 | escape }} {{ section.settings.line_2 | escape }}</p>
```

`.xo-drift { display: grid; overflow: clip; }` · `.xo-drift__row { display: flex; width: max-content; white-space: nowrap; }`. Repeat the phrase so each row covers its travel past the viewport edge. Outlined type: fill with the background colour + `-webkit-text-stroke` + `paint-order: stroke fill` (a transparent fill shows every inner contour, e.g. Vietnamese diacritics). Reduced motion: `transform: none !important` on the rows.

## 19. 3D layouts — helix, ring, fan

```liquid
<!-- Ring turning with scroll -->
<{{ motion_tag }} class="xo-ring" xo-scrub="0.5">
  <div class="xo-ring__stage" xo-motion-targets=".xo-ring__card" xo-motion-preset="ring" xo-motion-preset-options="{ radius: 360, turns: 0.6, perspective: 1800 }">
    {%- for block in section.blocks -%}<article class="xo-ring__card" {{ block.shopify_attributes }}>…</article>{%- endfor -%}
  </div>
</{{ motion_tag }}>

<!-- Fan opening on enter, spring settle -->
<{{ motion_tag }} xo-start="top 65%" xo-reverse xo-defaults="{ ease: 'spring.bouncy' }">
  <div class="xo-fan__deck" xo-motion-targets=".xo-fan__card" xo-motion-preset="fan" xo-motion-preset-options="{ angle: 52, spread: 460, pivot: 165 }">…</div>
</{{ motion_tag }}>
```

- Helix (DNA strand of products, pinned room): `xo-motion-preset="helix"` + `{ radius: 250, pitch: 64, step: 28, turns: 1.25, strands: 2, fade: 0.6 }`.
- The stage must not have `overflow: hidden` / `opacity` / `filter` (flattens 3D); set item size and stage height in CSS; `backface-visibility` if wanted. Values depend on the item count, so a merchant adding blocks re-lays the ring — cap `max_blocks`.
- Reduced motion jumps to the end pose — check that the end pose is readable (a ring at `turns` end, a fully open fan).
