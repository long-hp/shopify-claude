# Theme integration — making xo-motion behave like a Theme Store theme

The rules that are about THIS Shopify theme rather than the component: the merchant's global Animation settings, the assets the bundle needs, LCP / audits, the Theme Editor, merchant settings and images, accessibility controls, and how to verify. Read before shipping any xo-motion section.

## Contents

1. Bundle version and lazy-chunk assets
2. The global Animation settings bridge (`settings.animate_*`)
3. Accessibility — reduced motion, pause control, hover / touch, screen readers
4. LCP, first section, Lighthouse / PageSpeed
5. Theme Editor and DOM inserted later
6. Merchant settings and merchant images
7. GL images in Liquid — `crossorigin`
8. Verify

---

## 1. Bundle version and lazy-chunk assets

Everything in this skill marked V1.9.29 (smear, vortex `release`, `xo-position-vars`, `parent` on `xo-collapse` / `xo-scroll-x-item` / `xo-item`, `xo:dom:load`, `window.xoGlobal.init`, self-re-measuring `[xo-measure]`, `xo-typing xo-once`, range / circle-bar vars) needs the theme's `xo-webcomponents.min.js` to be at least that build. Older builds ignore unknown attributes silently. Check: the bundle logs `WC V1.9.29` in the browser console, or `grep -o 'WC V[0-9.]*' <assets>/xo-webcomponents.min.js`.

The main bundle is UMD, so rarely used parts ship as separate files loaded by a script tag **from the same folder as the main script** (URL derived from its `src`, keeping its `?v=`): `xo-webcomponents.min.js` → `xo-<name>.lazy.min.js`. The theme assets must contain every chunk, or that feature 404s and silently stays off:

| File | Contains | Loaded when |
|---|---|---|
| `xo-motion-gl.lazy.min.js` | every `[xo-motion-gl]` effect (in-frame, smear, bend, ribbon GL) | an `xo-motion` mounts with a GL element |
| `xo-extras.lazy.min.js` | `xo-scroll-scene`, `xo-scroll-x`, `xo-scroll-y`, `xo-cursor`, `xo-magnetic`, `xo-magic-move`, photoswipe, `xo-carousel-trigger` / `-bullet` / `-dynamic-bullets` / `-size` / `-page`, `xo-modal-pan` | the DOM contains one of those tags |
| `xo-collection.lazy.min.js` | `xo-filters*`, `xo-range*`, `xo-column-options*` | those tags appear |
| `xo-product.lazy.min.js` | product variants / media / recommendations / pickup / bundle parts | those tags appear (preloaded idle when a quick-view trigger exists) |
| `xo-gallery.lazy.min.js` | `xo-gallery` lightbox | idle after `load` on pages with `xo-gallery` |
| `xo-ce-polyfill.lazy.min.js` | customized built-ins polyfill (`<img is="xo-lazyload">`) | Safari only |

`<xo-motion>` itself and the engine (`window.xoMotion`) stay in the main bundle. Check the compiled theme (`ls shopify/assets | grep -E '^xo-.*\.lazy\.min\.js$'`) and the Network panel (no 404 on `xo-*.lazy.min.js`). A different folder can be forced with `window.xoChunks = { 'motion-gl': '…' }` set before the main script. In local dev the main script comes from the dev server, so the chunks must be served from the same origin and folder.

## 2. The global Animation settings bridge (`settings.animate_*`)

Theme settings → Animation (`src/config/global-schema/animation.js`) store `animate_disabled`, `animate_duration` (ms), `animate_effect` (an `xo-type` name) and `animate_strength`. `theme.liquid` writes `<html xo-animate-disabled>`; `settings-adapter/general-js-adapter.liquid` writes `window.settings`. **`xo-animate` reads all four; `xo-motion` reads none of them** (verified in the library source). Every xo-motion section must therefore bridge them in Liquid, or a merchant who turns animation off still gets motion.

Section prelude (render cannot return variables, so this lives in each section that uses xo-motion):

```liquid
{%- liquid
  assign motion_tag = 'xo-motion'
  if settings.animate_disabled
    assign motion_tag = 'div'
  endif
  assign motion_preset = settings.animate_effect | default: 'fade-up' | replace: 'rotate-left-up', 'swing-left' | replace: 'rotate-right-up', 'swing-right'
  assign motion_duration = settings.animate_duration | default: 500 | divided_by: 1000.0
  assign motion_strength = settings.animate_strength | default: 1
-%}
```

- **Off switch**: write every host as `<{{ motion_tag }} …>…</{{ motion_tag }}>`. As a plain `div` the step attributes are inert (the hide-until-ready rule only matches inside `xo-motion`), so content renders in place; GL, hover, pointer and velocity hosts go inert too.
- **Static layout**: anything that only works while animated (tall pinned rooms, stacked absolute steps, a ribbon grid) gets the same static fallback under both `@media (prefers-reduced-motion: reduce)` and `html[xo-animate-disabled]` (write the two blocks; a media query and an ancestor selector cannot share one rule).
- **Global-settings reveal** (the xo-motion equivalent of the bare `<xo-animate xo-cascade>` that `polish` proposes): a reveal the merchant tunes globally takes `xo-motion-preset="{{ motion_preset }}"`, `xo-preset-strength="{{ motion_strength }}"`, `xo-defaults="{ duration: {{ motion_duration }}, ease: 'cubic-bezier(0, 0, 0.3, 1)' }"` (xo-animate's `easeLight`) and `xo-start="top bottom-50px"` (xo-animate's trigger line). Sibling stagger of 75 ms = `xo-motion-at="<0.075"` on each following step, or `stagger: 0.075` on a target group. Recipes: `motion-recipes.md` §2.
- **Signature motion** (split text, scrub, pinned stories, GL, pointer) is designed, not merchant-tuned: it honours `animate_disabled` via `motion_tag` but keeps its own preset / duration.
- The `replace` mapping covers the only two names that differ (`rotate-*-up` → `swing-*`); every other option value of `animate_effect` is a valid xo-motion preset. If the schema gains new effect options, re-check them against the preset list (`xo-motion.md` §8).

## 3. Accessibility — reduced motion, pause control, hover / touch, screen readers

- **Reduced motion**: xo-motion jumps timelines to their end, stops loops, holds velocity / pointer at rest and skips WebGL (`xo-motion.md` §13). Design every end frame as a complete layout; un-pin stories (`story-patterns.md` §6). Hand-written CSS animation needs its own `@media (prefers-reduced-motion: reduce)` guard.
- **Pause / Stop / Hide (WCAG 2.2.2)**: anything that starts on its own, runs > 5 s and sits beside other content — `xo-carousel xo-autoplay`, `xo-marquee`, `xo-repeat="-1"` loops on scroll / load triggers, autoplay video — ships a visible, keyboard-reachable pause control. Hover-pause alone fails keyboard and touch users. A real `<button type="button" aria-pressed="false">` with a translated label (`'sections.slideshow.pause_slideshow' | t` / `'sections.slideshow.play_slideshow' | t` already exist), wired to: carousel `el.pause()` / `el.play()`; loop `motionEl.timeline.hold(true / false)`; marquee — a class on a wrapper that sets `xo-marquee-item { animation-play-state: paused !important }` (the component rewrites its own `xo-paused` on visibility changes, so do not toggle that attribute). Under reduced motion the carousel never autoplays — start the button in the paused state. If the theme has no reusable pause control yet, ask before adding a script; a reusable one is a `web-components` job. Alternatives: loop on hover only, or a finite `xo-repeat`.
- **Never hide content behind hover or pointer**: pointer motion ignores touch, hover never fires on phones. Prices, CTAs, size pickers revealed on hover need `:focus-within` and `@media (hover: none)` overrides (`!important` over the WAAPI fill). A second product image shown only by a GL hover is a bonus, never the only way to see it.
- **Screen readers**: split text keeps a visually hidden copy automatically. Decorative duplicates (drift bands repeating a phrase, ribbon captions copied) get `aria-hidden="true"` with the sentence once in `xo-visually-hidden` text. CSS counters driven by `--in1` are not read — keep the number in text.
- **Focus inside moving tracks**: scrubbed horizontal tracks do not scroll to a focused card. Keep CTAs reachable in the static layout, or use `xo-scroll-x` / `xo-carousel`, which handle focus.

## 4. LCP, first section, Lighthouse / PageSpeed

- Until `xo-ready`, from / fromto / keyframes / preset steps are `visibility: hidden`. The project `image` snippet loads the first template section's image `eager` + `fetchpriority="high"` (it is the LCP) — never make that image, or a wrapper around it, a step, and never put a GL effect on it (shader compile shows one long frame). Animate the copy and secondary media; reveal a decorative wrapper only when it is not the LCP.
- The library treats PageSpeed Insights / GTmetrix / Lighthouse's emulated devices as bots and **never defines `<xo-motion>` for them** (`customElements` decorator skips bots), so step content stays hidden in those reports: Lighthouse picks another LCP element and its screenshots show missing copy. Real browsers and crawlers are unaffected. When the first section's headline is a step, run `lighthouse-audit` and say which element became LCP; if the report must show the headline, keep it out of from-steps.
- `smear` card images must not be `loading="lazy"` (a card reaching the rim before its texture is ready shows the plain clipped image) — keep smear strips short. In-frame hover images can stay lazy: textures upload when the element is within 50 % of the viewport.

## 5. Theme Editor and DOM inserted later

- A section re-render in the Theme Editor replaces its DOM; the new `<xo-motion>` elements build fresh timelines on connect (custom-element lifecycle), so no re-init code is needed. Scroll toggles replay after every setting change — expected.
- The page-level jobs of the library (hover levels, `[xo-measure]`, anchors, YouTube `enablejsapi`) re-run on `shopify:section:load` **only when `Shopify.designMode`** is true. Markup inserted on the live storefront (AJAX section rendering, quick view, cart drawer, the theme-settings panel swapping a header) must fire `newEl.dispatchEvent(new CustomEvent('xo:dom:load', { bubbles: true }))` or call `window.xoGlobal.init(newEl)` — both are safe to repeat (`component-motion.md` §4).
- Keep `{{ block.shopify_attributes }}` on each block's root element; a step element may carry it.
- `xo-markers` and `?xo-markers` are dev-only — never commit them.

## 6. Merchant settings and merchant images

- Do not add a setting per tween. Expose a section-level control only where a merchant would reasonably want it: an "Enable motion" checkbox for a heavy signature (pinned story, GL hover family), or a `select` for an image hover effect (values map to whole `xo-motion-gl` strings). Labels go through `validate-schema.py` (Theme Store copy rules — no "slider", "CTA", etc.).
- Every image comes from an `image_picker` or the product — effects must survive the merchant swapping the photo (`image-effects.md` §1). A focal point that matters is the merchant's (`image.presentation.focal_point`), never a constant — and GL ignores `object-position` (it crops from the centre), so do not rely on focal point inside a GL frame.
- An optional second image (`block.settings.image_2`, `product.images[1]`) needs a `{% if %}` and a fallback effect that works with one image (`image-effects.md` §2).
- Story length scales with merchant block count: drive travel by measured expressions, not hard-coded `%` per card, and cap block counts in the schema (`max_blocks`).

## 7. GL images in Liquid — `crossorigin`

WebGL can only read an image fetched in CORS mode; without `crossorigin="anonymous"` a cross-origin image taints the texture and the effect silently stays off. Shopify image URLs (`cdn.shopify.com` and `/cdn/shop/files/…` on the store domain) answer with `access-control-allow-origin: *` (checked 2026-11-27), so the attribute is safe on every GL `<img>` and required whenever the page origin differs from the image origin (preview domains, custom domains).

`image_tag` turns any named parameter into an HTML attribute (Shopify docs; this project already passes `is:` and `xo-intrinsic-width:` the same way):

```liquid
{{ block.settings.image | image_url: width: 1200 | image_tag:
  widths: '600, 900, 1200',
  sizes: '(min-width: 990px) 33vw, 90vw',
  loading: 'lazy',
  crossorigin: 'anonymous'
}}
```

- `image_tag` fills `alt` from the image's alt text, and `width` / `height` from the image.
- Do not route GL images through the shared `image` snippet: it has no `crossorigin` parameter and starts with a 100 px `xo-lazyload` placeholder. Write `image_tag` directly in the section; changing the shared snippet ripples theme-wide — ask first.
- Verify once in the rendered HTML (view source / Playwright) that `crossorigin="anonymous"` is present, and that the Network panel shows the image request in CORS mode.

## 8. Verify

1. Attributes and option keys exist: the `xo-components` MCP — `get_component` (docs) for every tag used, compare the markup with `get_component_example` (demo), `get_component_source` for behaviour questions. Unknown keys fail silently.
2. `python .claude/skills/design-to-liquid/scripts/validate-liquid.py src/sections/<name>/` after every `.liquid` edit; `validate-schema.py` after any `schema.js` edit; `validate-templates.py` after removing a setting.
3. Run it: `npm run dev` / Playwright MCP screenshots at desktop and mobile widths, scrolled through every stop of a story; `?xo-markers` while tuning (remove after).
4. Emulate `prefers-reduced-motion: reduce` (DevTools → Rendering) and toggle Theme settings → Animation → "Animate disabled": the section must read as a complete static layout both ways.
5. Network: no 404 on `xo-*.lazy.min.js`; GL images requested with CORS.
6. Keyboard: Tab through the section — focus visible, pause control reachable, nothing hidden behind hover.
7. Theme Editor: `/editor-qa` — add the section, add / remove / reorder blocks, swap images, check the story still measures correctly.
8. Before submission: `/theme-store-review` and `/lighthouse-audit` (LCP element, CLS from late reveals).
