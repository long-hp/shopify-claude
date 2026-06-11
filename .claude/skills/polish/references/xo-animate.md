# xo-animate — scroll-reveal entrance animation

`xo-animate` is a real xo-webcomponent (registered in the xo-components system, used throughout `design/` and `src/`). It plays a CSS entrance animation when the element scrolls into view. It already **respects `prefers-reduced-motion`** and auto-plays inside `xo-carousel` / `xo-modal` / `xo-popover` / `xo-tabs-pane` when the parent becomes visible.

**Source of truth for the full option set:** the xo-components MCP — `mcp__xo-components__get_component` with name `xo-animate`. Pull exact `xo-type` / `xo-easing` values from there when proposing a manual effect; the shortlist below is for fast judgment, not a substitute.

## Default recommendation: `xo-cascade` (auto mode)

For most polish proposals, recommend the **auto-stagger** form. It inherits the global motion rhythm and auto-orders siblings — no per-element tuning, no magic numbers:

```html
<xo-animate xo-cascade>
  <div>…content…</div>
</xo-animate>
```

Put `xo-cascade` on each sibling in a group (heading, then subheading, then a row of cards) and they reveal in sequence automatically. This is the "ăn theo global settings" mode the project wants by default — prefer it unless the design calls for a specific effect.

## Manual mode (only when a specific effect is needed)

When the design clearly wants a particular motion (e.g. a horizontal slide-in, a zoom, a gooey reveal), set attributes explicitly:

| Attribute | Default | Use |
| --- | --- | --- |
| `xo-type` | `fade-up` | effect: `fade`, `fade-up/down/left/right`, `zoom-in/out`, `rotate-left-up/right-up`, `width-increment`, `snake-*`, `3d-up`, `goo-1`…`goo-7` |
| `xo-duration` | `500` | ms |
| `xo-order` | `0` | manual stagger index (NOT needed with `xo-cascade`) |
| `xo-constant` | `75` | ms between staggered siblings |
| `xo-strength` | `1` | intensity for directional/rotate types |
| `xo-easing` | `easeLight` | named easing (see MCP for the full allowed list) |
| `xo-disabled` | `false` | render visible immediately, no animation |
| `xo-item-used` + `<xo-animate-item>` | — | animate individual children inside one wrapper instead of the container |

```html
<xo-animate xo-type="fade-right" xo-duration="700" xo-easing="easeOutCubic">
  <img src="…">
</xo-animate>
```

Verify any value you don't use daily against the MCP doc before writing it — don't guess an `xo-type`/`xo-easing` name from memory.

## Where it's worth animating (and where it isn't)

Good candidates (propose these):
- Section heading / eyebrow / subheading → `xo-cascade` on each.
- A grid or row of cards (products, collections, articles) → `xo-cascade` on each card so they stagger in.
- A hero image / featured media reveal.

Skip (don't propose):
- Already-animated elements (the detector reports `has xo-animate` — don't double-wrap).
- Continuous / looping motion — that's CSS `@keyframes`, not `xo-animate` (and needs its own reduced-motion guard).
- Tiny UI affordances (a single icon, a label) — animating everything is noise.
- Content that must be readable instantly (legal text, error messages).

## Gotchas

- Inside a carousel/modal you usually want the default (plays on visible). Only add `xo-scroll-forced` if you specifically need scroll-triggering there.
- `xo-cascade` orders among **sibling** `xo-animate` elements — siblings, not arbitrary descendants. If the elements aren't siblings, either restructure or use `xo-order` manually.
- It wraps content in a custom element; make sure the wrapper doesn't break a grid/flex layout that targets direct children (you may need the wrapper itself to carry the grid-item class). When in doubt, check the rendered layout.
