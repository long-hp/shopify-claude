# Modals — Architecture & Port Pattern

Every modal in this project (search overlay, cart drawer, quick-view, product-compare, popups, mobile menu drawer) is built on the same xo-webcomponent contract. Port any modal by tweaking settings + scoping SCSS — almost never by replacing the markup.

## The TRIGGER ↔ MODAL contract

```liquid
<!-- Trigger (anywhere in the page) -->
<xo-modal-trigger xo-name="cart">
  <button>Open cart</button>
</xo-modal-trigger>

<!-- Modal (rendered separately, typically inside a group section) -->
<xo-modal xo-name="cart" xo-animate="slide-left" xo-placement="top-right" xo-autofocus>
  …content…
</xo-modal>
```

**Pairing rule:** `xo-modal-trigger[xo-name="X"]` opens `xo-modal[xo-name="X"]`. The name is a string token; no vendor prefix, no leading `xo-`. Mismatch = trigger silently no-ops.

Before editing ANY modal — verify BOTH sides exist with matching `xo-name`:
- Trigger side (lives in another file — usually a header / section / snippet)
- Modal side (lives in a group section under `src/groups/...`)

## Modal attributes

`<xo-modal>` accepts these xo-* attributes:

| Attribute | Values | Purpose |
|---|---|---|
| `xo-name` | string | The unique identifier matched by `xo-modal-trigger` |
| `xo-animate` | `fade` / `fade-up` / `slide-down` / `slide-up` / `slide-left` / `slide-right` / `zoom` | Open/close animation |
| `xo-placement` | `center` / `top-center` / `bottom-center` / `top-left` / `top-right` / `bottom-left` / `bottom-right` | Where the modal anchors in viewport |
| `xo-autofocus` | (boolean attr — present or absent) | Auto-focus the first focusable inside on open |
| `xo-scroll-disabled` | (boolean attr) | Disable body scroll while open |
| `xo-backdrop-blur` | integer (px) | Apply backdrop-filter blur to the scrim (e.g. `"6"` = 6px blur) |
| `xo-portal` | (boolean attr) | Render the modal into a portal at body root (escape stacking contexts) |
| `xo-duration` | integer (ms) | Open/close transition duration (default 300) |
| `xo-breakpoints` | JSON string | Per-breakpoint override (e.g. `{ 992: { placement: 'center', animate: 'fade-up' } }`) |
| `xo-section-select` | (boolean) | Section-select enabled for the contained section (Theme Editor) |
| `xo-for-cart-mini` | (boolean) | Cart-specific routing hook |

Common combos:
- **Centered modal** (search/predictive overlay): `xo-animate="fade-up" xo-placement="center" xo-backdrop-blur="6"`
- **Slide drawer from right** (cart): `xo-animate="slide-left" xo-placement="top-right"`
- **Slide drawer from left** (mobile menu): `xo-animate="slide-right" xo-placement="top-left"`
- **Notification toast** (cart notification): `xo-animate="fade-up" xo-placement="center"` + breakpoint override

## The `modal-content` snippet (shared chrome)

`src/snippets/modal-content/modal-content.liquid` wraps modal content with standard chrome (inner card · header + title · close button · footer slot). Call it from inside any `<xo-modal>` body instead of hand-writing the inner shell.

```liquid
{% render 'modal-content',
  title: 'Your bag',                          # title text (optional)
  content: drawer_content,                    # captured HTML
  footer: drawer_footer,                      # captured HTML (optional)
  width: '58rem',                             # default 50rem
  height: '100vh',                            # default 100vh
  full_width: false,                          # bool
  full_height: true,                          # bool — drawer-like vertical fill
  icon_size: '2rem',                          # close button icon size
  title_class: 'fz:h5 fw:700',                # appended to title classes
  footer_class: 'pt:1rem',                    # appended to footer classes
  close_class: 'custom-close',                # appended to close button
  scroll_disabled: false,                     # disable inner scroll
  is_cart: true,                              # cart-specific tag change
  header_separator: false                     # add header/content divider
%}
```

Emits BEM classes you can target via scoped SCSS:
- `.xo-modal-content` — outer
- `.xo-modal-content__inner` — visible card (`bgc:background pe:auto`)
- `.xo-modal-content__title` — `<h3>` for title (base class: `fz:h5 fw:500 c:foreground|w`)
- `.xo-modal-content__content` — content slot
- `.xo-modal-content__footer` — footer slot (when `footer` param passed)
- `.xo-modal-content__close` — close button (auto-renders `<xo-modal-trigger>` with x icon at top-right)

## Where modals live

| Modal | Path | xo-name | Triggered from |
|---|---|---|---|
| Search overlay/drawer | `src/groups/headers/main-predictive-search/` | `search` | `header-action` snippet (`<xo-modal-trigger xo-name="search">`) |
| Cart mini (drawer/notification) | `src/groups/overlay/xo-cart-mini/` | `cart` | `header-action` snippet |
| Mobile menu drawer | `src/snippets/menu/menu-hamburger/` (rendered inside header-action) | `xo-menu-hamburger-1` | `header-action` hamburger button |
| Quick view (product overlay) | `src/groups/overlay/quick-view/` | (verify per use) | Product card "quick view" button |
| Product compare modal | `src/groups/overlay/product-compare-modal/` | (verify per use) | Product compare control |
| Age verification popup | `src/groups/popups/popup-age-verification/` | (auto-open) | Page load (cookie-gated) |
| Promo popup | `src/groups/popups/popup-promo/` | (auto-open) | Page load (timer-gated) |
| Countdown promo popup | `src/groups/popups/popup-countdown-promo/` | (auto-open) | Page load |
| Sign-up popup | `src/groups/popups/popup-sign-up/` | (auto-open) | Page load |

**Naming exception:** `main-predictive-search` lives under `src/groups/headers/` (not `src/groups/overlay/`) because Shopify section groups bucket it as a header group (sibling to announcement-bar). Architecturally it's a modal, organizationally it's a header.

## Port pattern — restyle a modal for a design

This is the modal-specific extension of the **Group port ladder** (see `sections-to-liquid.md`). Steps adapted:

| Step | Action | When |
|---|---|---|
| A | Tweak modal section's `<group>-group.json` defaults — color_scheme, header copy, block defaults | Schema already exposes what design needs |
| B | Restyle SCSS scoped to `xo-modal[xo-name="X"]` selector | Visual chrome (modal shell, header, item layout) doesn't match design |
| C | Tweak `<xo-modal>` attrs in the modal's `.liquid` body — animate / placement / backdrop-blur | Animation/positioning doesn't match design (e.g. swap slide-down → fade-up) |
| D | Add ONE schema setting OR ONE new block type to modal section's `schema.js` | Design needs a behavior toggle or content shape that has no existing schema |
| E | **STOP — ask user** before adding new block types that require markup edits to shared rendering snippets (`predictive-search-base`, `cart-mini-item-*`, etc.) | Markup changes ripple to every theme + every modal variant |

**Scope SCSS via attribute selector to avoid cross-modal leak:**

```scss
// ✗ DON'T — leaks to all cart variants (notification/popup)
.xo-cart-mini { … }

// ✓ DO — Folio chrome applies only to drawer modal
xo-modal[xo-name="cart"] {
  .xo-cart-mini-item-drawer { … }
}
```

**Verify TRIGGER ↔ MODAL match before any restyle.** Search globally for the `xo-name`:

```bash
grep -rn 'xo-name="cart"' src/
# Expect 2+ matches: one in modal definition (xo-modal), 1+ in triggers (xo-modal-trigger)
```

If trigger missing → modal will never open. If modal missing → trigger does nothing. Both must exist.

## Predictive search — dispatch architecture

> [!IMPORTANT]
> **Folio's predictive search port is currently DEFERRED — user maintains manually.**
> When the user has a standard implementation ready, this section's port guidance will be revised. Until then: do NOT modify `src/groups/headers/main-predictive-search/`, `src/snippets/predictive-search/`, or the `main-predictive-search` section in `src/groups/headers/header-group.json` as part of any port pipeline. The architecture description below is reference-only (still useful for understanding the dispatch pattern); the "When the design has NO predictive-search section" pattern at the end of this file does NOT apply to Folio.


```
src/groups/headers/main-predictive-search/main-predictive-search.liquid
  → renders 'predictive-search'                       ← dispatcher (1 line)
     └─ src/snippets/predictive-search/predictive-search.liquid
        ├─ case search_type:
        │  ├─ 'drawer'   → render 'predictive-search-drawer'  (slide-from-side)
        │  └─ 'overlay'  → render 'predictive-search-overlay' (centered modal)
        │
        └─ both render predictive-search-base for the form + result panel
           └─ src/snippets/predictive-search/predictive-search-base/
              ├─ <form> with input field
              ├─ <div data-predictive-search-result> (Shopify-native predictive search results)
              └─ {% render 'predictive-search-suggest' %} (renders SECTION BLOCKS — link + product)
```

**Variant choice** comes from `main-predictive-search` schema setting `search_type` (`drawer` | `overlay`). Header-group.json picks one; SCSS for each variant lives in its own `.global.scss`.

**Block system** — `main-predictive-search/schema.js` declares 2 block types:

| Block type | Settings | Renders as |
|---|---|---|
| `link` | `link_list` (link picker), `heading` (richtext) | Section heading + flat list of links from the chosen link_list |
| `product` | `spf_product_list` (product picker), `heading` (richtext) | Section heading + product cards |

Blocks render inside `predictive-search-suggest.liquid`. To add new block types (e.g. `tag-chips`, `collection-grid` for Folio design), schema.js needs a new entry AND the suggest snippet needs a `case block.type ... when 'X'` branch.

**xo-name pairing:** the modal uses `xo-name="search"` (NOT `"search-modal"` despite design HTML naming). The header trigger in `header-action.liquid` matches with `<xo-modal-trigger xo-name="search">`.

## Cart mini — dispatch architecture

```
src/groups/overlay/xo-cart-mini/xo-cart-mini.liquid
  ├─ captures static block: '_cart-mini-buttons' (checkout + cancel buttons)
  └─ renders 'cart-mini'
     └─ src/snippets/cart-mini/cart-mini.liquid
        ├─ <xo-modal xo-name="cart" xo-animate="{{animate}}" xo-placement="{{placement}}">
        │  (animate/placement derived from settings.cart_drawer_placement)
        └─ case settings.cart_type:
           ├─ 'drawer'       → render 'cart-drawer'        (full slide drawer)
           ├─ 'notification' → render 'cart-notification'  (top-center toast)
           └─ 'page'         → modal not rendered (cart icon links to /cart instead)
```

Each variant renders `modal-content` with appropriate header/content/footer captures.

**cart-drawer.liquid composition:**
- header: `'sections.cart.title' | t` (translation key — "Cart" / "Your bag" / …)
- content:
  - if `cart != empty`:
    - `cart-ready-to-ship` (free-shipping bar)
    - `cart-mini-item-drawer` × N (per-item cards)
    - `cart-free-shipping-suggestion` (upsell)
  - else: `cart-empty` (empty state)
- footer: `cart-mini-footer-drawer` which renders:
  - `cart-note` (toggled by `settings.show_cart_drawer_note`)
  - `cart-discount` (toggled by `settings.show_cart_drawer_discount`)
  - subtotal + total price
  - cart-level discount badges
  - tax note (multi-locale via `sections.cart.taxes_*` keys)
  - `{{ button_content }}` (the static `_cart-mini-buttons` block — checkout + cancel via theme block settings)

**Settings cascade (preset-1.js):**

| Setting | Drives |
|---|---|
| `cart_type` | `drawer` / `notification` / `page` — variant choice |
| `cart_drawer_placement` | `left` / `right` — `slide-right`/`slide-left` animate + `top-left`/`top-right` placement |
| `show_cart_drawer_note` | Whether `cart-note` snippet renders in drawer footer |
| `show_cart_drawer_discount` | Whether `cart-discount` snippet renders |
| `show_cart_free_shipping` | Whether `cart-free-shipping-suggestion` renders |
| `cart_free_shipping_min_amount` | Free-shipping threshold |
| `cart_color_scheme` | Color scheme applied to `<xo-modal>` |
| `redirect_to_cart_page` | Add-to-cart behavior |

**Checkout / cancel buttons** are theme blocks in `overlay-group.json` under `xo-cart-mini.blocks.static_cart_mini_buttons.blocks.static_button_checkout` and `static_button_cancel`. Style/variant controlled via block settings, NOT via cart-mini snippet markup.

## Popups (auto-open modals)

Popups in `src/groups/popups/*/` follow the same `<xo-modal>` contract but typically open automatically on page load (timer / cookie / event-gated) instead of trigger-driven. Each popup is its own section with its own schema (timing, condition, content). Restyle via SCSS scoped to its own root class (e.g. `.xo-popup-promo`).

## Pre-port checklist (modal-specific)

Before modifying ANY modal:

1. ✅ Identify the modal's path + verify it's a group section (not a free section)
2. ✅ Identify the trigger location(s) + verify `xo-name` matches
3. ✅ Read the modal section's `schema.js` — list every setting and block type
4. ✅ Read the rendering snippet (`modal-content` + variant-specific snippets like `predictive-search-base`)
5. ✅ Decide the ladder step (A settings / B SCSS / C attrs / D new schema field / E STOP-ask new block type)
6. ✅ Plan SCSS scope — always `xo-modal[xo-name="X"]` to avoid cross-modal leak
7. ✅ Mental model of dispatch (variant + block composition) so the change targets the right layer

## Related

- `sections-to-liquid.md` → Group port ladder (modal-shaped groups subsection)
- `../../AGENT.md` → Anchor map (groups/overlay row lists specific modals)
- `mega-menu.md` → Adjacent pattern (uses `<template xo-mega-menu-name>` dispatch instead of `<xo-modal>`)
- `tokens-mapping.md` → Color scheme + token cascade for modal chrome
