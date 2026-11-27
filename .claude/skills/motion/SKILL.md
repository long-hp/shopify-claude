---
name: motion
argument-hint: "[what should move + how]"
description: "The theme's MOTION authority. Wires animation into src/ sections with xo-webcomponents, xo-motion first: reveals, split text, stagger, scrub/pinned stories, scroll-telling, horizontal story, loops, springs, velocity skew, pointer tilt, magnetic, 3D helix/ring/fan/ribbon, WebGL image hover/liquid/goo/dissolve/pixel, edge-lens smear strip, slices, scramble, carousel centre-big/coverflow, counters, re-init after AJAX. Legacy xo-animate/xo-parallax-* only to maintain existing sections. Use whenever animation is added or ported, even unnamed: /motion, 'làm animation', 'thêm hiệu ứng', 'hiệu ứng cuộn', 'thêm parallax', 'tách chữ', 'chữ trồi lên', 'ghim section', 'cuộn ngang', 'hover ảnh goo', 'card nghiêng theo chuột', 'reveal on scroll', 'parallax hero', 'xo-motion', 'xo-animate'. NOT for: building a new xo-* component (web-components), the finishing-pass reveal proposal (polish), static styling (xo-css/scss)."
---

# Motion — xo-motion first

Knowledge for adding motion to this theme with the existing xo-* components. It answers which tool a motion needs, how to wire it in Liquid so merchants, reviewers and every device get a correct result, and which mistakes bite (an invisible LCP, a merchant switch that does nothing, a hover-only price, a GL effect that silently stays off). This skill is knowledge, not a pipeline.

> [!IMPORTANT]
> **`xo-motion` is the default for every new motion** — reveals (`xo-motion-preset`, `text-rise*`, stagger, `xo-batch`), scroll-linked values (`xo-scrub` instead of `xo-parallax-scroll`), mouse tracking (`xo-trigger="pointer"` instead of `xo-parallax-hover`), element loops (`xo-repeat` instead of CSS `@keyframes`), plus everything the legacy tools cannot do (timelines, split text, pinned stories, velocity, 3D layouts, WebGL). It runs the same engine and presets as the legacy components and does more. `xo-animate` / `xo-parallax-*` are legacy: maintain them where a section already uses them (§Legacy).

## When to use / when not

- **Use** for any animation, reveal, parallax, scroll-linked, pinned, hover / pointer, loop or image effect authored or ported in `src/`.
- **New bespoke JS behaviour** no xo-* covers (custom drag physics, a new web component) → `web-components`. Pause-control or touch-switch scripts are theme JS too — ask first.
- **Finishing-pass reveal proposals** → `polish` (it still writes bare `<xo-animate xo-cascade>`; the xo-motion equivalent is `references/motion-recipes.md` §2).
- **Static styling** with no motion → `xo-css` / `scss`. Porting a design's section → `design-to-liquid`, which calls this skill for its motion.

**Look things up in the `xo-components` MCP before writing markup** — it is the live source of truth for the shipped bundle, and the references here are a distilled snapshot. Unknown attributes and option keys fail silently, so never write one from memory:
- `mcp__xo-components__find_components("<use case>")` / `list_components` — which component fits.
- `mcp__xo-components__get_component("<name>")` — the docs: every attribute, option, default, event (e.g. `Motion`, `Carousel`, `Cursor`).
- `mcp__xo-components__get_component_example("<name>")` — working demo markup; start from it instead of inventing structure (scrub rooms, GL hovers, smear strips, ribbon release, centre-big carousel all have examples).
- `mcp__xo-components__get_component_source("<name>")` — when the docs don't answer a behaviour question (what turns `xo-visible` on, what reduced motion does).
If the MCP is not connected, say so and fall back to the references; if it disagrees with a reference, the MCP wins — note the drift in your report.

## Workflow

1. **Read the target.** Which section / snippet, which system it already uses (`grep -n "xo-animate\|xo-parallax\|xo-motion" <files>`), whether it renders shared snippets that carry their own `xo-animate`, whether it is the first section (LCP), what the merchant controls (blocks, images, autoplay).
2. **Pick the tool** with the decision tree below. One entrance system per section; one transform owner per element.
   Then open the component docs and a demo through the `xo-components` MCP (`get_component` + `get_component_example`) for every tag you will use.
3. **Ask only when genuinely ambiguous** (user's language, `AskUserQuestion`, 2–3 options, xo-motion first and recommended): the request names no element or kind ("make it livelier"); the section is on a legacy system and the ask means mixing or migrating; the page is performance-sensitive (PLP, video / LCP-heavy hero, several stories); a new section setting or a new script would be needed. Do not ask when the intent maps to one row of the tree.
4. **Write it.** Add the section prelude and `<{{ motion_tag }}>` hosts (`references/theme-integration.md` §2), start from the matching recipe, bind merchant settings, add the static fallback for anything pinned and the pause control for anything autoplaying.
5. **Verify** (`references/theme-integration.md` §8): MCP attribute check → `validate-liquid.py` (+ `validate-schema.py` if `schema.js` changed) → browser at desktop / mobile, reduced motion, "Animate disabled" → keyboard → Network (no `xo-*.lazy.min.js` 404, GL images in CORS mode) → `/editor-qa` for block-driven sections.

## Decision tree

```
Motion
├─ Section already built on xo-animate / xo-parallax-* ─────── §Legacy: extend it, or migrate the whole section
├─ Element enters the viewport and settles (heading, image, card, CTA)
│   ├─ should follow Theme settings → Animation ─────────── global-settings reveal (recipes §2)
│   ├─ text by chars / words / lines ──────────────────────── text-rise / -words / -lines, xo-split (recipes §3–4)
│   ├─ grid / list of merchant blocks or products ────────── xo-motion-targets + stagger, xo-batch (recipes §5)
│   └─ first section on load, overlapping steps ──────────── xo-trigger="load" + xo-motion-at (recipes §3)
├─ Value tied to scroll position (drift, zoom, bg parallax, read-along) ─ xo-scrub + keyframes (recipes §11, §16)
├─ Section pinned while content changes (steps, chapters, horizontal lookbook, cube, card-to-full,
│   vortex ribbon landing in the product grid) ─────────────── story-patterns.md
├─ Content inside carousel slide / tab / modal / popover / toggle / collapse / scroll-x item ─ xo-trigger="parent"
├─ Carousel card size / tilt / depth following the drag (centre-big, coverflow) ─ xo-position-vars (component-motion §3)
├─ Reacts to scroll speed (skew, stretch) ─────────────────── xo-trigger="velocity" (recipes §13)
├─ Follows the mouse (tilt, magnetic, float, window parallax) ─ xo-trigger="pointer", nested x / y (recipes §14–15)
├─ Hover / click with several parts, SVG draw / morph ─────── xo-trigger="hover" / "click" (recipes §8)
├─ Image hover / swap beyond a CSS scale, slices, scramble ── image-effects.md
├─ Frameless card strip whose edges pull the cards like ink ─ xo-motion-gl="smear" (image-effects §8)
├─ 3D list layout (helix, ring, fan) ─────────────────────── layout presets (recipes §19)
├─ Element loop (badge float, pulse, scroll hint) ─────────── xo-repeat="-1" + pause control (recipes §12)
│   └─ ticker / logo band ─────────────────────────────────── xo-marquee (recipes §7)
├─ Count-up stat ──────────────────────────────────────────── xo-countto; scrubbed number → in1 + CSS counter
├─ Single-property hover (colour, small lift) ─────────────── plain CSS :hover / the project xo-hover convention
├─ Spinner, skeleton, loader (must run before JS) ─────────── CSS @keyframes with a reduced-motion guard
└─ Markup inserted after load (AJAX, quick view, swapped header) ─ own <xo-motion> + xo:dom:load (component-motion §4)
```

## Legacy — `xo-animate`, `xo-parallax-scroll`, `xo-parallax-hover`

Keep or extend a legacy tool only when:
- **The section already uses it.** Extend the same system rather than adding xo-motion entrances beside it; when the new motion needs xo-motion features, migrate the whole section (`references/motion-migration.md`). Shared snippets that carry `xo-animate` (`product-card`, `article-card`, `products-grid` `animate_enabled`, `_base/animate*`) are theme-wide — ask before migrating them.
- **A merchant-facing setting stores an `xo-type` name** and the markup passes it straight to `xo-animate` (xo-motion needs the `rotate-*-up` → `swing-*` mapping, `theme-integration.md` §2).
- **`xo-parallax-hover xo-3d` with children floating at different `translateZ`** — xo-motion's pointer tilt is documented for one plane per layer; keep the legacy component for Z-layered depth unless an xo-motion version is built and checked in the browser.
- **`xo-parallax-scroll xo-mobile-disabled`** for a layer that must stop on phones by device, or `xo-reset-position="false"` on a hover float (no xo-motion equivalent).

Legacy references for maintaining existing code: `references/animate.md`, `references/parallax-scroll.md`, `references/parallax-hover.md`.

## Invariants (never violate)

- **Merchant switch**: xo-motion ignores Theme settings → Animation (`animate_disabled`, duration, effect, strength); `xo-animate` reads them. Every xo-motion section bridges them in Liquid (`motion_tag` swap + global-settings reveal, `theme-integration.md` §2).
- **One transform owner per element**: xo-motion keeps its end frame, so CSS `:hover { transform }` on a step is dead — hover on a child. Never an xo-motion step plus `xo-animate` / `xo-parallax-scroll` on one node; a nested host never carries the parent's step; centring transforms on a wrapper. One entrance system per section.
- **Reduced motion**: timelines jump to their end, loops stop, velocity / pointer rest, no WebGL. Design every end frame as a complete layout; pinned stories get a static fallback under `prefers-reduced-motion` and `html[xo-animate-disabled]`.
- **Pause / Stop / Hide (WCAG 2.2.2)**: autoplay carousels, marquees, infinite loops on scroll / load, autoplay video running > 5 s beside content ship a visible, keyboard-reachable pause control; hover-pause alone fails.
- **Never hide content behind hover or pointer**: touch has neither. Hidden actions get `:focus-within` and `(hover: none)` overrides; a GL second image is a bonus.
- **LCP**: never make the first section's image (eager, `fetchpriority="high"` from the `image` snippet) or its wrapper a step, and never a GL frame. Lighthouse / PSI never define `<xo-motion>` (library bot rule), so step content is hidden in those reports — check which element became LCP.
- **Property rule**: `transform` / `opacity` first; `clip-path` ≤ ~0.25 Mpx per element and ≤ 4 at once; `filter` / blur / liquid on a few small elements; never layout properties (`xo-motion.md` §14).
- **Merchant images**: effects act on the frame, never on geometry fitted to one photo; optional second images get an `{% if %}` and a one-image fallback (`image-effects.md` §1–2).
- **Assets**: GL needs `xo-motion-gl.lazy.min.js` beside `xo-webcomponents.min.js` and `crossorigin="anonymous"` on every GL `<img>` (`image_tag: crossorigin: 'anonymous'`, `theme-integration.md` §7); scroll-x / -y / scene, cursor, magnetic and carousel-trigger need `xo-extras.lazy.min.js`.
- **Inside containers** the default trigger is still `scroll` — opt in with `xo-trigger="parent"`.
- **Eases** inside xo-motion objects: named eases or literal `cubic-bezier(...)`; `var(--…)` and xo-animate names fall back to `power1.out`.
- **Late DOM**: content inserted on the live store gets its own host and `xo:dom:load` / `window.xoGlobal.init(el)`; the library re-runs its page jobs on `shopify:section:load` only in the Theme Editor.
- Never ship `xo-markers` / `?xo-markers`; never hand-write `xo-hover-level` / `xo-effect-level`.

## Anti-patterns

- A `fade-up` on every element down the page — vary rhythm, overlap steps, leave quiet sections quiet; one signature move per page done well beats ten.
- Split chars on paragraphs or `richtext` output (animate the `rte` wrapper as a block).
- A clip-path wipe or blur reveal on a full-bleed image (scale inside an `overflow: hidden` frame instead).
- Scrubbed stories without a static fallback (reduced-motion users see only the last frame; with animation off, a 500vh room of stacked steps).
- `velocity` skew on a marquee; `bend` / `wave` on a framed image; GL on the LCP image.
- Appending AJAX products into an existing host and expecting them to animate.
- Per-tween merchant settings; motion that only works with the demo photo.

## References — read when

| File | Read when |
|---|---|
| `references/xo-motion.md` | Writing any xo-motion markup — host / step attributes, triggers (parent list, velocity, pointer), loops, `xo-motion-at`, stagger / batch, split text, presets (entrance, 3D layout, velocity, slices), scrub / pinning, values, eases, springs, expressions, CSS-var channel, JS API, reduced motion, performance, pitfalls, timing |
| `references/theme-integration.md` | Every xo-motion section before shipping — bundle version and lazy-chunk assets, the `settings.animate_*` bridge (`motion_tag`, global-settings reveal), a11y (reduced motion, pause control, hover / touch), LCP and Lighthouse, Theme Editor and AJAX re-init, merchant settings / images, exact `crossorigin` Liquid, verification list |
| `references/motion-recipes.md` | Building a section — global-settings reveal, hero, image-with-text, collection grid, testimonials carousel, logo marquee, product card hover, tabs / modal / collapse content, counters, read-along, loops, velocity, pointer tilt / magnetic, mouse parallax, scrubbed background, SVG draw, drift band, helix / ring / fan |
| `references/story-patterns.md` | A section pins while content changes — engine choice (`xo-scroll-x` / `-y`, `xo-scroll-scene`, scrub room), skeleton, steps and chapters, horizontal lookbook, film strip, wipes, cube, card-to-full-screen, deck, zoom-through, vortex ribbon + `release` (path vs landing options), static fallbacks |
| `references/image-effects.md` | Image hover / swap beyond a CSS scale, per-card hover menu, scroll-driven swap, scroll-calm hero, cursor preview, `slices`, `scramble`, edge-lens `smear` (carousel, drag strip, scrub track, card shapes, `round`, `strength`), the merchant-image rule |
| `references/component-motion.md` | A carousel / marquee / collapse / tabs / scroll-x / countto / range / masonry / dark mode / typing / cursor should drive the motion — hooks, `xo-position-vars` coverflow and centre-card-grows recipe, range vars, typing once; DOM inserted after load (`xo:dom:load`, `xoGlobal.init`, `[xo-measure]`) |
| `references/motion-migration.md` | A section on `xo-animate` / `xo-parallax-*` / looping `@keyframes` moves to xo-motion — every `xo-type`, easing name, parallax property and hover option mapped, worked examples |
| `references/animate.md` | Maintaining an existing `xo-animate` (legacy) — attributes, easing list, archetype × motion taste matrix |
| `references/parallax-scroll.md` | Maintaining an existing `xo-parallax-scroll` (legacy) — the `xo-start` / `xo-end` innerHeight trap, computed values, step-mode |
| `references/parallax-hover.md` | Maintaining an existing `xo-parallax-hover` (legacy), or Z-layered `xo-3d` depth |

## Related skills

- `polish` — finishing-pass proposals (still `xo-animate xo-cascade`; xo-motion equivalent in recipes §2). `design-to-liquid` / `figma-to-liquid` — invoke this skill for a design's motion.
- `web-components` — new bespoke behaviour (pause control, touch switch, custom drag).
- `liquid` / `snippet` / `schema` — the Liquid, snippet bodies and any new setting. `scss` / `xo-css` — the styles motion reflects.
- `editor-qa`, `lighthouse-audit`, `theme-store-review` — live editor pass, LCP / CLS check, pre-submit gate.
