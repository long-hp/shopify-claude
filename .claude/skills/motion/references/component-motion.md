# Component motion — hooks the xo-* components expose

Read when a section uses a carousel, marquee, collapse, tabs, scroll-x / -y, counter, range, masonry, dark mode, typing, image comparison or cursor and the motion should be driven by the component instead of sitting beside it — and whenever markup is inserted after page load. Exact attributes: the `xo-components` MCP (`get_component` per tag). Items marked (V1.9.29) need at least that bundle (`theme-integration.md` §1).

## Contents

1. Formula sections — give them a motion role
2. Hooks components expose
3. Per component — what to wire (incl. centre-card-grows carousel)
4. DOM inserted after load — `xo:dom:load`, `window.xoGlobal.init`, `[xo-measure]`
5. Pitfalls

---

## 1. Formula sections — give them a motion role

Stock themes ship the same kit in its default form: a manifesto paragraph, a stats row, a press-logo marquee, a reviews carousel, journal cards, an FAQ accordion. Build them, but give one per page a motion idea so the page does not read as a template:

| Formula | Reinvent as |
|---|---|
| Stats row (`xo-countto` × 4) | one counter driving an instrument (`--xo-value` pans a photo, sweeps a needle) |
| Press-logo marquee | vertical marquee columns in 3D that stand up on scroll; a curved `xo-svg-marquee` framing a hero |
| Reviews carousel | quote cards fanning in 3D under the finger with `xo-position-vars`; each slide's quote rising by `parent` |
| Journal cards | titles as `xo-carousel-trigger xo-type="hover"` for one large fade carousel whose slides burn in with GL dissolve |
| FAQ / specs | collapse panels whose open content deals in (`parent`) |
| Image grid | masonry that reflows on filter chips |

## 2. Hooks components expose

| Channel | How | Sources |
|---|---|---|
| Parent state | `xo-motion xo-trigger="parent"` inside plays forward when the container turns on, reverses when it turns off | `xo-carousel-slide` (and (V1.9.29) `xo-item` / `[xo-carousel-slide]` in a `xo-carousel-list`), `xo-tabs-pane`, `xo-modal`, `xo-popover`, `xo-toggle`, `xo-scroll-scene-item`; (V1.9.29) `xo-collapse` panel while open, `xo-scroll-x-item` / `-y-item` / `-xy-item` (current chapter) |
| CSS variables written by the component | read with `calc()`, `mod()`, `color-mix()`, counters | `--xo-value` (countto, image-comparison), (V1.9.29) `--xo-slide-offset` / `--xo-carousel-position` / `--xo-carousel-progress` (carousel `xo-position-vars`), `--xo-autoplay-progress` (carousel `xo-progress`), (V1.9.29) `--xo-range-start` / `--xo-range-end`, `--xo-progress` (circle-bar), `--xo-cursor-vx` / `-vy` (cursor), `--xo-marquee-scroll` |
| State attributes | CSS transitions, `:has()`, registered `@property` numbers with a transition | `xo-active` / `xo-prev` / `xo-next` / `xo-center` on slides, `xo-active` on collapse, `xo-dragging` on the carousel list, `html[xo-dark-mode]`, (V1.9.29) `xo-state` on typing |
| Position in a moving track | per-item `xo-motion xo-axis="x" xo-scrub="0" xo-start="left right" xo-end="right left"` | any transform-dragged track (`xo-scroll-carousel`, `xo-carousel`) |
| Public API bridge | component event → `motionEl.timeline.progress(v)` on an `xo-trigger="manual"` host | last resort, needs theme JS |

## 3. Per component — what to wire

**`xo-carousel`** — `xo-position-vars` (V1.9.29) writes `--xo-slide-offset` on each slide (0 = active, ±1 neighbours, continuous while dragging, seamless across the loop seam; with `xo-per-view` > 1 the centre slide has offset `(perView − 1) / 2`), plus `--xo-carousel-position` / `--xo-carousel-progress` on the carousel. Coverflow / fan / depth in plain CSS, 0 rAF when still:

```scss
.xo-reviews__card { transform: rotateY(calc(var(--xo-slide-offset) * -32deg)) translateZ(calc(max(var(--xo-slide-offset), var(--xo-slide-offset) * -1) * -120px)); }
```

Keep prev / next inside the `xo-carousel` element. `xo-type="fade"` + `xo-carousel-trigger xo-type="hover"` = hover projector. Autoplay pauses itself on hover, touch, focus inside, off-screen, hidden tab and reduced motion — still add the visible pause control (`theme-integration.md` §3). Frameless capsule strip with lensing edges: `image-effects.md` §8.

**Centre card bigger, growing with the drag** (V1.9.29, `carousel.html` §10b) — the centre card is 1.54× the side cards and its size follows the finger mid-drag while gaps stay equal. Build every card at the big size (sharp image), shrink with `transform` from `--xo-slide-offset`, shift side cards by half the extra width; `xo-per-view="1"` + `xo-overflow="visible"` (the frame is one small card wide, the rest overflow); `xo-carousel-trigger` so a click on a side card goes to it (lives in `xo-extras.lazy.min.js`):

```liquid
<div class="xo-centre" style="overflow-x: clip">
  <xo-carousel class="xo-centre__rail" xo-position-vars xo-loop xo-overflow="visible" xo-per-view="1" xo-gap="28" xo-speed="550"
               xo-breakpoints="{ 575: { gap: 12 }, 991: { gap: 20 } }" aria-label="{{ section.settings.heading | escape }}">
    <xo-carousel-inner><xo-carousel-list>
      {%- for block in section.blocks -%}
        <xo-carousel-slide {{ block.shopify_attributes }}>
          <xo-carousel-trigger class="xo-centre__card" xo-index="{{ forloop.index0 }}" xo-carousel-selector=".xo-centre__rail">
            {% render 'image', image: block.settings.image, aspect_ratio: 'none' %}
            <{{ motion_tag }} class="xo-centre__quote" xo-trigger="parent">
              <p class="rte" xo-motion-preset="text-rise-lines">{{ block.settings.quote }}</p>
            </{{ motion_tag }}>
          </xo-carousel-trigger>
        </xo-carousel-slide>
      {%- endfor -%}
    </xo-carousel-list></xo-carousel-inner>
    <xo-carousel-prev><button type="button" aria-label="{{ 'sections.slideshow.previous_slideshow' | t }}">…</button></xo-carousel-prev>
    <xo-carousel-next><button type="button" aria-label="{{ 'sections.slideshow.next_slideshow' | t }}">…</button></xo-carousel-next>
  </xo-carousel>
</div>
```
```scss
.xo-centre__rail { --w: clamp(16rem, 14.5vw, 30rem); --k: 1.54; width: var(--w); margin-inline: auto; }
.xo-centre__rail xo-carousel-slide { --o: 1; }
.xo-centre__rail xo-carousel-slide:first-child { --o: 0; }               // before JS: the first slide is the big one
.xo-centre__rail[xo-initialized] xo-carousel-slide { --o: var(--xo-slide-offset); }
.xo-centre__card {
  --d: max(var(--o), -1 * var(--o));                                      // |o|
  --t: max(0, 1 - var(--d));                                              // 1 at the centre, 0 from the neighbours out
  position: relative; display: block; aspect-ratio: 5 / 6; overflow: hidden;
  width: calc(var(--k) * 100%);                                           // built at the big size
  margin-inline-start: calc((1 - var(--k)) * 50%);
  transform: translateX(calc(clamp(-1, var(--o), 1) * (var(--k) - 1) * var(--w) / 2))   // keeps the gaps equal
             scale(calc((1 + (var(--k) - 1) * var(--t)) / var(--k)));
}
.xo-centre__rail xo-carousel-slide:not([xo-active]) .xo-centre__card { cursor: pointer; }
.xo-centre__quote { opacity: var(--t); }                                  // copy only on the centre card
@include media('<lg') { .xo-centre__rail { --w: 22vw; } }
@include media('<sm') { .xo-centre__rail { --w: 38vw; } }               // centre card + one peeking each side
```

Transform only, no reflow. The per-slide `parent` host plays the quote when the slide turns `xo-visible`; `xo-visible` follows `xo-per-view` (slides inside the frame), not `xo-overflow`, so with `xo-per-view="1"` only the active slide plays even though the neighbours are drawn. Fade the copy of the drawn neighbours from `--t` as above so text reads only on the centre card. Do not set `translate` on `xo-carousel-slide` itself (the loop uses it).

**`xo-scroll-carousel`** — toss with momentum; per-item axis scrub (§2) poses each card by its position. No snap after a toss — cards must look fine between positions.

**`xo-scroll-x` / `xo-scroll-y`** — the current chapter item gets `xo-active` (V1.9.29), a `parent` source: `<xo-scroll-x-item><xo-motion xo-trigger="parent" xo-motion-from="{ opacity: 0, y: 40 }">…</xo-motion></xo-scroll-x-item>`. No attributes on the host; height = N × 110vh.

**`xo-marquee`** — constant speed only; never inside a `velocity` host. Roles: knockout type mask over a photo, vertical image columns in 3D, a ticker inside a scene. Wrap it in `overflow: clip`; a vertical marquee needs a definite height. It pauses itself off-screen and on hidden tabs (`xo-paused`), has `xo-pause-on-hover`, but no reduced-motion stop and no pause API — the theme pause control and reduced-motion rule: `motion-recipes.md` §7.

**`xo-collapse`** — (V1.9.29) `parent` source while open: the open panel's content staggers in and reverses on close; keep it ≤ 400 ms (`motion-recipes.md` §9).

**`xo-tabs`** — each pane's `xo-motion xo-trigger="parent"` reveals its content; for a pane-to-pane wipe keep panes visible (override the component's hiding) and animate `clipPath: circle()` or `--xo-gl` 0 → 1 on the incoming pane, with a trailing hold step keeping the outgoing one underneath.

**`xo-countto`** — counts on scroll-in, keeps the decimals of `xo-to`; `--xo-value` drives a visual (`calc(var(--xo-value) / 100 * 1turn)` for a needle, `mod()` for drum digits).

**`xo-range`** — (V1.9.29) `xo-vars-target=".xo-scene"` writes `--xo-range-start` / `--xo-range-end` (0..1) on the scene (a sibling — the range clears its own children); `xo-single` for one thumb. A physical dial: a size picker scaling a product, an aperture window. Lives in `xo-collection.lazy.min.js`.

**`xo-circle-bar`** — `--xo-progress` 0..1; changing `xo-value` tweens.

**`xo-typing`** — (V1.9.29) `xo-once` (type once, stop on the last line), `xo-trigger="scroll" | "parent" | "manual"` (none = start on mount), `xo-cursor-blink`, `xo:typing:complete`, `xo-state`. Reduced motion + `xo-once` shows the last line at once.

**`xo-dark-mode`** — a registered `--night` number with a 1–1.4 s transition switched by `html[xo-dark-mode]` drives grade, sky, icons and copy; (V1.9.29) `xo-view-transition="400"` reveals the new scheme as a circle from the toggle. One instance per page.

**`xo-masonry`** — filter chips: (V1.9.29) `xo-hidden` on items or `--xo-masonry-item-display: none` from `:has()`; the other tiles glide. Reserve the wall height on a wrapper (it grows late and shifts pinned rooms below).

**`xo-image-comparison`** — `--xo-value` (0..100) drives more than the split: a day / night grade, a label crossfade.

**`xo-popover`** — `xo-group` morphs one popover between hotspots placed by `%` block settings.

**`xo-cursor`** — contextual labels; `xo-velocity` writes `--xo-cursor-vx` / `-vy`; GL bend preview and image trail (`image-effects.md` §4). Desktop only. Lives in `xo-extras.lazy.min.js`.

**`xo-magnetic`** — one-tag radius pull for CTAs and large chips; not on every button. Keyframed pull: `motion-recipes.md` §14.

## 4. DOM inserted after load — `xo:dom:load`, `window.xoGlobal.init`, `[xo-measure]`

Custom elements (including `<xo-motion>`) initialise themselves whenever they are connected. What does not re-run by itself are the library's page-level jobs: hover levels (`xo-hover-level` / `xo-effect-level`), `[xo-measure]` registration, anchor rewrites, YouTube `enablejsapi`.

- **Theme Editor**: on `shopify:section:load` the library re-runs them inside that section — only when `Shopify.designMode` is true.
- **Live storefront** (AJAX section rendering, quick view, cart drawer markup, infinite scroll, the theme-settings panel swapping a header): after inserting, fire a bubbling event on the new subtree or call the init directly (V1.9.29); both are safe to repeat on the same DOM:
  ```js
  newEl.dispatchEvent(new CustomEvent('xo:dom:load', { bubbles: true }));
  // or
  window.xoGlobal.init(newEl);
  ```
- Theme scripts that only re-initialise inside `if (Shopify.designMode)` will not re-init swapped markup on the live store — have them also listen to `xo:dom:load` (re-init within `event.target`).
- Motion inside the fragment needs its own `<xo-motion>` host — steps are collected at mount, so products appended into an existing host are not animated.
- (V1.9.29) `[xo-measure]` writes `--xo-top` / `--xo-left` / `--xo-width` / `--xo-height` / `--xo-current-left` (relative to the nearest `[xo-measure-parent-selector]` match, else the page) and re-measures itself on element or parent resize, window resize, `load`, `document.fonts.ready`, pointer over and click; removed elements stop being watched — no hand-written resize listener.

## 5. Pitfalls

- A component in its default role is not a motion signature — one component per page should drive or host choreography.
- A carousel inside a grid cell needs `min-width: 0` on the cell.
- A modal's `parent` timeline starts when it begins opening.
- `xo-split="chars"` breaks a parent's `background-clip: text` gradient.
- `xo-carousel-trigger`, `xo-carousel-bullet`, `xo-scroll-x`, `xo-scroll-scene`, `xo-cursor`, `xo-magnetic` need `xo-extras.lazy.min.js`; `xo-range` needs `xo-collection.lazy.min.js`.
