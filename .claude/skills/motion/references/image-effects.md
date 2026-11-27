# Image and text effects — `xo-motion-gl`, `slices`, `scramble`, cursor preview, edge-lens `smear`

Read when a section needs an image hover / transition beyond a CSS scale, a frameless card strip that flares at its edges, a text decode, or a cursor-following preview. GL needs `xo-motion-gl.lazy.min.js` in the theme assets and `crossorigin="anonymous"` on every GL `<img>` — exact Liquid in `theme-integration.md` §7. Wrap hosts in `<{{ motion_tag }}>` so the global Animation switch turns them off.

## Contents

1. The merchant-image rule
2. In-frame WebGL effects — which one, how to drive it
3. Recipes — product card hover, per-card hover menu, scroll-driven swap, GL edge reveal, scroll-calm hero
4. Frameless bend — cursor preview, edge-to-edge strips
5. `slices` hover reveal
6. `scramble` text decode
7. Performance, fallbacks, touch
8. Edge-lens `smear` — frameless cards in a moving strip (carousel, drag strip, scrub track, shapes)

---

## 1. The merchant-image rule

Every image is replaced by the merchant through an `image_picker` or the product's media. An effect must look right with any photo of roughly the same subject:
- Allowed: effects on the whole frame (in-frame GL, masks / clip reveals of the frame, slicing the frame, moving or stacking frames, colour grading), type and colour fields in their own layout space, frame-level HUD (corner brackets, a scan line across the frame), hotspots placed by editable `%` block settings.
- Not allowed: geometry registered to one photo — rings traced around a product, leader lines aimed at a detail, overlays drawn in the photo's own coordinates, a zoom origin or iris centred on a detail of one picture. A focal point that matters is the merchant's (`image.presentation.focal_point`), never a constant.
- Geometric GL (`bend`, `wave`) only on frameless media; a framed card would show its background around the bent image.

## 2. In-frame WebGL effects — which one, how to drive it

`xo-motion-gl` on a step (or the host) that wraps an `<img>`; it uses the first `<img>` descendant, so a wrapper `div` is fine. The frame stays rectangular, radii and background never move — only the picture inside distorts.

| Effect | Looks like | Second image | Good for |
|---|---|---|---|
| `liquid` | water lens following the pointer | no | editorial cards, journal, lookbook |
| `goo` | organic splats grow from the pointer into the next picture (or a tint) | optional | product card hover (front → back shot) |
| `ripple` | rings dropped by pointer travel | no | calm brands, water / skincare (desktop pointer) |
| `dissolve` | noisy edge sweeps into the next picture; `angle` sets direction, `from: 'pointer'` grows from the cursor | yes | variant / swatch swap, slideshow, scroll reveals |
| `pixel` | pixelate → dither → next picture | yes | tech, gaming, playful |
| `rgb-shift`, `zoom` | add-ons for any of the above | — | — |

- **Second image**: a second `<img>` in the same element, or `img[data-xo-gl-next]` (also `crossorigin`). Merchant data: `product.images[1]`, or an optional `image_2` block setting — always inside `{% if %}`.
- **Without a second image** `goo` / `dissolve` / `pixel` swap to a toned copy (`tint` hex, default greyscale; `treatment: 'none'` disables, which makes the swap invisible). `liquid` and `ripple` never swap — they only distort. So when the second image is blank, either keep the toned swap on purpose or fall back to `liquid` / `ripple`:
  ```liquid
  {%- liquid
    assign gl_effect = section.settings.hover_effect
    if product.images[1] == blank and gl_effect != 'liquid' and gl_effect != 'ripple'
      assign gl_effect = 'liquid'
    endif
  -%}
  ```
- **Driver**: `--xo-gl` 0..1. A hover host drives it automatically. From scroll or a parent, keyframe `'--xo-gl'`. `--xo-gl-x` / `--xo-gl-y` (0..1) pin the effect centre (a scroll-driven goo spreading from the middle).
- Combine in-frame effects with each other, `rgb-shift`, `zoom`; never with `bend` / `wave` / `noise`. `rgb-shift` with `dissolve` shows nothing. Keep `pad: 0` when one GL layer hands over to the next.
- Options (`xo-motion-gl-options`): liquid `liquid`, `radius`, `follow`, `scale`, `speed`, `drag`, `axis`; goo `goo`, `edge`, `detail`, `soft`, `parallax`, `fill`, `speed`; ripple `ripple`, `rippleSpeed`, `freq`, `width`, `decay`, `life`, `every`; dissolve `dissolve`, `width`, `noise`, `angle`, `from`; pixel `pixel` (number or `[min, max]`), `steps`, `dither`; shared `rgb`, `zoom`, `tint`, `treatment`, `pad`, `lerp`, `dpr`.

## 3. Recipes

**Product card hover — goo into the back shot** (0.45 s in, about the same out):

```liquid
<{{ motion_tag }} class="xo-card__media" xo-trigger="hover" xo-defaults="{ duration: 0.45, ease: 'expo.out' }">
  <a class="xo-card__frame" href="{{ product.url }}" xo-motion-gl="goo" xo-motion-gl-options="{ goo: 0.2 }">
    {{ product.featured_image | image_url: width: 900 | image_tag: widths: '450, 700, 900', sizes: '(min-width: 990px) 25vw, 50vw', loading: 'lazy', crossorigin: 'anonymous' }}
    {%- if product.images[1] -%}
      {{ product.images[1] | image_url: width: 900 | image_tag: widths: '450, 700, 900', sizes: '(min-width: 990px) 25vw, 50vw', loading: 'lazy', crossorigin: 'anonymous', alt: '' }}
    {%- endif -%}
  </a>
</{{ motion_tag }}>
```

The second image is decorative (`alt: ''`); the first keeps the product's alt text.

**Per-card hover menu** — one technique per grid (merchant `select`), or one per card in an editorial grid. Same markup, figure attributes swapped; host `xo-defaults="{ duration: 0.45, ease: 'power3.out' }"` (`pixel` 0.5 s). A size strip inside the frame can ride the same host (`xo-motion-from="{ y: '100%', opacity: 0, duration: 0.4 }" xo-motion-at="0.05"`).

| Look | `xo-motion-gl` | `xo-motion-gl-options` |
|---|---|---|
| dissolve from the pointer | `dissolve zoom` | `{ from: 'pointer', width: 0.16, noise: 0.3, zoom: 0.06 }` |
| ripples, then the back shot | `ripple dissolve` | `{ ripple: 0.05, from: 'pointer', noise: 0 }` |
| gooey splats | `goo` | `{ goo: 0.2 }` |
| water lens into the back shot | `liquid dissolve zoom` | `{ liquid: 0.06, radius: 0.5, follow: 0.8, width: 0.6, noise: 0, zoom: 0.05 }` |
| pixel swap | `pixel` | `{ pixel: [8, 120] }` |
| straight upward sweep | `dissolve` | `{ angle: -90, width: 0.1, noise: 0.25 }` |
| splats flooding the frame, colour fringe | `goo rgb-shift` | `{ goo: 0.16, fill: 0.5, rgb: 0.01 }` |
| strips + decoded title | none — `slices` on a wrapper of the second image (§5) + `scramble` on the title (§6) | `xo-motion-preset-options="{ count: 5, axis: 'y', jitter: [30, 80] }"` |

A merchant select stores the whole attribute pair: option values such as `goo` / `dissolve-pointer` mapped in a `{% case %}` to the strings above.

**Scroll-driven swap inside one fixed frame** (a story stage; copy slides while the picture changes):

```liquid
<figure class="xo-story__frame" xo-motion-gl="dissolve" xo-motion-gl-options="{ angle: 180, width: 0.05, noise: 0.25 }"
        xo-motion-keyframes="{ '30%': { '--xo-gl': 0 }, '45%': { '--xo-gl': 1 } }">
  {{ block.settings.image | image_url: width: 1600 | image_tag: crossorigin: 'anonymous' }}
  {{ block.settings.image_2 | image_url: width: 1600 | image_tag: crossorigin: 'anonymous', alt: '' }}
</figure>
```

A chain of N pictures = N − 1 stacked frames, each holding (current, next), the next frame switched on with an opacity stop exactly where the previous sweep ends.

**GL edge reveal** (like the `xo-scroll-x` reveal, but the curtain edge is alive): full-screen stacked layers with `xo-motion-gl="dissolve liquid"`, `{ angle: 180, width: 0.035, noise: 0.24, dissolve: 0.07, follow: 1, pad: 0 }`, `--xo-gl` 0 → 1 per window and `--xo-gl-x` keyframed with the edge (`1.155 → -0.155` for these settings) so the lens rides the seam. Copy is uncovered by a `clipPath: inset()` on the same stops.

**Scroll-calm hero** (a small rippling frame grows to full screen and stills; room ~280vh, sticky 100svh stage — never the first section's LCP image, `theme-integration.md` §4):

```liquid
<{{ motion_tag }} class="xo-calm" xo-scrub="0.5" xo-start="top top" xo-end="bottom bottom">
  <div class="xo-calm__stage">
    <div class="xo-calm__frame" xo-motion-gl="liquid zoom rgb-shift"
         xo-motion-gl-options="{ liquid: 0.1, radius: 1, follow: 0, drag: 0, speed: 0.4, zoom: 0.4, rgb: 0.006 }"
         xo-motion-keyframes="{ '0%': { scale: 0.42, '--xo-gl': 1 }, '64%': { scale: 1, '--xo-gl': 0 } }">
      <div class="xo-calm__img" xo-motion-keyframes="{ '0%': { scale: 1.4 }, '64%': { scale: 1 } }">
        {{ section.settings.image | image_url: width: 2000 | image_tag: widths: '900, 1400, 2000', sizes: '100vw', crossorigin: 'anonymous' }}
      </div>
      <span class="xo-calm__shade" xo-motion-keyframes="{ '0%': { opacity: 0.55 }, '60%': { opacity: 1 } }"></span>
    </div>
    <h2 class="xo-calm__heading rte">{{ section.settings.heading }}</h2>
  </div>
</{{ motion_tag }}>
```

- `follow: 0` + `radius: 1` spreads the ripple over the whole frame; `--xo-gl` 1 → 0 over the first 64 %, then the plain image holds.
- The image scale (1.4 → 1) matches the GL `zoom` (0.4 × `--xo-gl`) so the hand-off from canvas to image does not jump — change one, change the other.
- The frame shrinks with `scale`, not `clip-path`; `overflow: hidden` + `border-radius` on the frame. Static fallback under reduced motion / `html[xo-animate-disabled]` (`story-patterns.md` §6).

## 4. Frameless bend — cursor preview, edge-to-edge strips

`bend` / `wave` shrink the picture inside its box — never on framed images. Fine where there is no frame:
- Cursor list preview: `xo-cursor` + `xo-cursor-item` containing `[xo-motion-gl="bend rgb-shift"]` (no `xo-motion` needed — the cursor hosts it); the preview bends against the pointer direction. Several `<img>` in the item: the one with the highest computed opacity is drawn — switch rows with `:has(.row:hover)` CSS. Desktop only; the list must work without it.
- Scroll-velocity strips running edge to edge: a `velocity` host owning several `[xo-motion-gl="bend"]` items (`mode: 'group'` keeps the curve continuous across images; `profile: 'arc'` / `'bulge'` / `'drag'`, `axis: 'x'`).

## 5. `slices` hover reveal

`xo-motion-preset="slices"` + `xo-motion-preset-options="{ count: 5, axis: 'y', jitter: [25, 75] }"` on a hover step: the step's first child image is hidden at rest and arrives as staggered columns (rows with `axis: 'x'`). The original stays in flow at `opacity: 0` (layout + alt text). Time ruler only — in a scrub room build blinds as one multi-point `polygon()` clip-path instead. Children of a `slices` element are cloned with it — keep animated children outside.

```liquid
<div class="xo-card__slices" xo-motion-preset="slices" xo-motion-preset-options="{ count: 5, axis: 'y', jitter: [30, 80] }">
  {{ product.images[1] | image_url: width: 900 | image_tag: loading: 'lazy', alt: '' }}
</div>
```

## 6. `scramble` text decode

JS channel 0..100; widths never change (the random glyph is drawn over the transparent original).
- Hover: `xo-split="chars" xo-motion-keyframes="{ '0%': { scramble: 0 }, '50%': { scramble: 100 }, '100%': { scramble: 0 }, duration: 0.26, stagger: 0.012, ease: 'none' }" xo-motion-at="0"`.
- Entrance / per chapter: `xo-motion-from="{ scramble: 100, opacity: 0, duration: 0.45, ease: 'none' }"` — include `opacity: 0`, otherwise frozen random glyphs show before the first play.
- Labels, prices, codes, short titles; mono / tabular / uppercase faces. Decode in 0.25–0.5 s. Not on body copy. Custom glyph pool: `xo-scramble-chars="…"` on the element or an ancestor.
- Prices from `{{ product.price | money }}` are fine — the screen-reader copy keeps the real text.

## 7. Performance, fallbacks, touch

- GL is one lazy chunk and one shared WebGL context per page; textures upload when within 50 % of the viewport; 0 rAF at rest. The first transition can show one long frame (shader compile).
- No WebGL / reduced motion / bots / non-CORS image → no canvas, the `<img>` stays. `goo` / `dissolve` / `pixel` fall back to a CSS crossfade to the second image on hover (opacity 0 under reduced motion).
- Touch: pointer-driven effects do not run from a finger. The hover is a desktop bonus — never the only way to see the second image or the price. Optional: on `(hover: none)` a small theme script can switch GL hover hosts to `xo-trigger="velocity"` (and remove hand-written `--xo-gl` keyframes) so fast scrolling plays the effect — that is theme JS; ask first.
- WebGL crops from the centre and ignores `object-position`.
- Image hovers 0.4–0.5 s in, 0.3–0.45 s out.
- A grid of GL cards is fine (only hovered cards draw); several scrubbed GL frames on one screen are not — one signature per viewport.

## 8. Edge-lens `smear` — frameless cards in a moving strip

Frameless cards (the card is the object: capsule, circle, rounded card) moving through a clipped strip. The strip's two clip edges act as lenses whose strength follows the motion: a card crossing a rim flares its contour out to the rim and its picture is pulled like ink; as the strip slows, a card end leaving the rim necks, forms an X, breaks, stays pointed for a moment, then rounds. At rest: the exact CSS shapes, 0 rAF.

- One signature strip per page: lookbook, collection or "drop" carousel, a horizontal scrub chapter. Not for pictures inside a fixed frame (§2), not combinable with in-frame effects or `rgb-shift`.
- Image-agnostic: it bends the card's shape at the strip edges, never anything inside one photo — any merchant image works. Cards stay `object-fit: cover`.
- The card needs an `<xo-motion>` ancestor (any trigger — it only owns the GL element) and its image without `loading="lazy"`.
- DOM text over the card (title, price, badge) is not lensed — it stays put while the image flares. Place text below the card, or fade it out before the rim with `xo-position-vars` (`opacity: clamp(0, 1 - var(--a) * 4, 1)`).

**Carousel (step strength)** — each slide change is one stroke:

```liquid
<div class="xo-lens__stage">
  <xo-carousel class="xo-lens__rail" xo-position-vars xo-loop xo-per-view="1" xo-gap="0" xo-overflow="visible"
               xo-speed="1800" xo-easing="easeInOutQuint" xo-autoplay="{{ section.settings.autoplay_ms }}" aria-label="{{ section.settings.heading | escape }}">
    <xo-carousel-inner>
      <xo-carousel-list>
        {%- for block in section.blocks -%}
          <xo-carousel-slide {{ block.shopify_attributes }}>
            <{{ motion_tag }} class="xo-lens__item" xo-trigger="parent">
              <div class="xo-lens__card" xo-motion-gl="smear">
                {{ block.settings.image | image_url: width: 1000 | image_tag: widths: '500, 800, 1000', sizes: '30vw', crossorigin: 'anonymous' }}
              </div>
              <p class="xo-lens__name">{{ block.settings.title | escape }}</p>
            </{{ motion_tag }}>
          </xo-carousel-slide>
        {%- endfor -%}
      </xo-carousel-list>
    </xo-carousel-inner>
    <div class="xo-lens__bar">
      <xo-carousel-prev><button type="button" aria-label="{{ 'sections.slideshow.previous_slideshow' | t }}">…</button></xo-carousel-prev>
      <button type="button" class="xo-lens__pause" aria-pressed="false">{{ 'sections.slideshow.pause_slideshow' | t }}</button>
      <xo-carousel-next><button type="button" aria-label="{{ 'sections.slideshow.next_slideshow' | t }}">…</button></xo-carousel-next>
    </div>
  </xo-carousel>
</div>
```
```scss
// Equal capsules 1.78H × H, pitch 2H, stage 3.2H clipping the ±1 cards to domes
.xo-lens { --H: clamp(13rem, 19vw, 30rem); overflow-x: clip; }
.xo-lens__stage { width: min(100%, calc(var(--H) * 3.2)); margin-inline: auto; overflow-x: clip; }
.xo-lens__rail xo-carousel-inner { width: calc(var(--H) * 2); margin-inline: auto; }
.xo-lens__rail xo-carousel-slide { --a: min(1, max(var(--xo-slide-offset, 0), -1 * var(--xo-slide-offset, 0))); }
.xo-lens__item { display: grid; grid-template-columns: minmax(0, 1fr); justify-items: center; }
.xo-lens__card { width: calc(var(--H) * 1.78); height: var(--H); overflow: hidden; border-radius: 999px; }
.xo-lens__name { opacity: calc(1 - var(--a) * 1.6); translate: 0 calc(var(--a) * 0.8rem); } // only the centre card is named
@include media('<md') { .xo-lens { --H: 32vw; } }
```

- Autoplay → the pause button (`theme-integration.md` §3); reduced motion already stops autoplay.
- Easing: the reference stroke is `cubic-bezier(0.55, 0, 0.05, 1)` at 1.8 s. `xo-easing` takes only a name from the shared table (unknown = linear); the closest built-in is `easeInOutQuint`. The exact curve needs a name registered in `window.XotinyUtils.easings` by a theme script after the library loads — theme JS, ask first.

**Drag strip and scrub track (speed strength)** — strength chases the card speed (fast attack, ~0.6 s decay). `xo-scroll-carousel`: wrap each card in `<xo-motion xo-trigger="manual">` (only to own the GL element), `xo-motion-gl-options="{ strength: 'speed' }"`. Full-width scrub chapter:

```liquid
<{{ motion_tag }} class="xo-lens-track" xo-scrub="0.4" xo-start="top top" xo-end="bottom bottom">
  <div class="xo-lens-track__sticky">
    <div class="xo-lens-track__clip">
      <div class="xo-lens-track__row" xo-motion-keyframes="{ '0%': { x: 0 }, '100%': { x: 'Math.min(0, this.parentElement.offsetWidth - this.scrollWidth - this.firstElementChild.offsetWidth * 0.5)' } }">
        {%- for block in section.blocks -%}
          <div class="xo-lens__card" xo-motion-gl="smear" xo-motion-gl-options="{ strength: 'speed', frame: '.xo-lens-track__clip', lens: 0.022 }" {{ block.shopify_attributes }}>
            {{ block.settings.image | image_url: width: 1000 | image_tag: crossorigin: 'anonymous' }}
          </div>
        {%- endfor -%}
      </div>
    </div>
  </div>
</{{ motion_tag }}>
```

Room `height: 320–420vh`; sticky `top: 0; height: 100svh`; clip `width: 100%; overflow-x: clip` (the lens edges); row `display: flex; gap: 0.3H; width: max-content; margin-inline-start: -0.9H`. A wide frame needs a small `lens` (0.022 desktop, 0.05 phones). GL options have no `breakpoints`: pick a compromise (~0.03) or let a small theme script swap the option string below 768 px at load (ask first).

**Shapes** — the lens reads the card's computed `border-radius` (on resize and at the start of every move):

| Card | `border-radius` | Result |
|---|---|---|
| capsule | ≥ height / 2 (`999px`) | clearest neck, X and drop |
| circle | `50%` on a square | same, rounder blobs |
| rounded card | 16–32 px (~8–15 % of the short side) | flares, then necks once the end rounds |
| square-ish | 4–8 px | works, breaks off as a tidier block |

`round` (default 1) eases the corner radii towards a fully round end inside the lens, so a flat end necks like a capsule instead of breaking as a straight strip; `round: 0` keeps the flat end. Per-corner radii use the smallest corner while moving.

| Option | Default | Effect |
|---|---|---|
| `strength` | `'step'` inside `xo-carousel`, else `'speed'` | step envelope per slide change vs card speed |
| `smear` | 1 | multiplies `m`, `c`, `o` (overall intensity) |
| `m` | 0.24 | magnification across the axis at the rim (the flare) |
| `o` | −3 | pulls the source deeper near the rim — drives neck, X and break |
| `c` | 0 | compression along the axis at the rim |
| `lens` | 0.05 | lens width as a fraction of the frame length |
| `round` | 1 | end rounding inside the lens (0 = keep the CSS corners) |
| `frame` | containing `xo-carousel` / `xo-scroll-carousel`, else the parent | `closest()` selector of the clipping element — set it for scrub tracks |
| `max` | 0.04 | speed mode: card lengths per frame for full strength |
| `axis` | `'x'` | strip direction |
| `bleed` | `[0.5, 0.34]` | canvas overflow so the flare is not cut square |

- Cost: rects read only while a card moves; only cards within ~5 lens widths of a rim draw.
- Reduced motion, no WebGL, bots, non-CORS images: plain `<img>` with the CSS shapes — the domed strip still reads.
