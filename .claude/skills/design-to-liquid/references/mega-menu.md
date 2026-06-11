# Mega Menu — Dispatch Architecture

This project's mega menu is a **separate group section** living at `src/groups/headers/mega-menu/`. It is rendered into the page by Shopify's `{% sections 'header-group' %}` alongside the main header, BUT it does NOT render visible content until the `<xo-mega-menu>` custom element in `menu-horizontal` finds it by name + index.

## Dispatch model

```
src/snippets/menu/menu-horizontal/menu-horizontal.liquid
  └─ <li> for each link in menu.links
       └─ <xo-mega-menu xo-name="header-mega-menu" xo-index="{{ forloop.index0 }}"></xo-mega-menu>
            ↑ EMPTY element. The xo-mega-menu web component looks up:
              document.querySelector('template[xo-mega-menu-name="header-mega-menu"][xo-mega-menu-index="0"]')
              and clones its content INTO the menu item's hover/click panel.

src/groups/headers/mega-menu/mega-menu.liquid
  <template xo-mega-menu-name="header-mega-menu" xo-mega-menu-index="{{ section.settings.index_nav }}">
    <div data-id="{{ section.id }}">
      {% render 'section', content: content %}    ← content = {% content_for 'blocks' %}
    </div>
  </template>
```

So each mega-menu **section instance** in `header-group.json` corresponds to ONE top-level link in the merchant's `link_list`. The `index_nav` schema setting (`0..9`) tells the dispatcher which link the panel belongs to.

## Authoring a new mega-menu instance

1. Open `src/groups/headers/header-group.json`.
2. Add a new entry to the `sections` map keyed by a unique id (e.g. `mega_menu_AaBbCc`):
   ```json
   "mega_menu_AaBbCc": {
     "type": "mega-menu",
     "name": "Mega menu — Shop",
     "blocks": { /* nested @theme blocks via builder */ },
     "block_order": [ /* … */ ],
     "settings": {
       "index_nav": "0",         /* matches the FIRST link in the merchant's link_list */
       ...sectionSchemaSettings defaults (width, padding, color_scheme, ...)
     }
   }
   ```
3. Append the new id to the `order` array.
4. **The instance's `settings.index_nav`** decides which link triggers it. If the merchant's `main-menu` link_list reads `[Shop, Collections, Journal, Ritual]`, then:
   - `index_nav: "0"` → opens on hover/click of `Shop`
   - `index_nav: "1"` → opens on `Collections`
   - etc.

## Content composition (blocks)

`mega-menu/schema.js` declares `blocks: [{ type: '@theme' }, { type: '@app' }]`. So merchants compose mega-menu panels using ANY theme block (layout / image / text / link-list / featured-product / etc.) via the Theme Editor's block picker. The `mega-menu.liquid` body just dumps `{% content_for 'blocks' %}` inside the wrapper.

This means there is no project-specific "mega-menu-panel" snippet — content shape is entirely block-driven, and the layout grid is achieved with the `layout` theme block (`grid` mode + `col_desktop: 3` etc.).

## How `menu-horizontal` knows which links have mega menus

It doesn't, at liquid render time. `menu-horizontal` outputs `<xo-mega-menu>` for **every** link unconditionally:

```liquid
<xo-mega-menu class="xo-menu-horizontal__mega-menu" xo-name="header-mega-menu" xo-index="{{ forloop.index0 }}"></xo-mega-menu>
```

The web component then queries the DOM at runtime for a matching `<template>`. If none exists for a given index, the element stays empty + the hover panel never appears. So adding/removing mega-menu instances is purely a `header-group.json` operation — no markup change in `menu-horizontal` required.

## Don't confuse with `link.links` sub-menu

`menu-horizontal` also renders `<ul class="xo-menu-horizontal__sub-menu">` when `link.links != blank` (standard Shopify nested link_list). That's a SEPARATE mechanism — flat 2-level link list, no block-builder content, no images.

| Pattern | Use when |
|---|---|
| `link.links` flat sub-menu | Simple link tree (link → child links → grandchild links), text-only |
| Mega menu instance | Rich content: images, columns, featured products, custom layout |

A single nav link CAN have both — `link.links` for the text drop AND a mega-menu instance for the rich panel. The web component decides visual priority (typically mega-menu wins when present).

## Wiring checklist when porting a design with mega-menu

1. **Map design's mega-menu panels** → count them, identify which top-level nav item each belongs to.
2. **For each panel:**
   - Add a `mega_menu_<id>` entry to `header-group.json`.
   - Set `index_nav` to the position (0-based) of the matching nav link.
   - Compose `blocks` to match the design's content shape (image grid / link columns / featured product).
3. **Restyle** `mega-menu.global.scss` (or the section snippet's SCSS) for the design's panel chrome — bg, padding, animation, max-height.
4. **DON'T** modify `menu-horizontal.liquid` or `mega-menu.liquid` markup — the dispatcher is generic; all variation goes through schema + blocks + SCSS.

## When the design has NO mega menu (e.g. Folio cosmetics)

- Leave the existing `mega_menu_*` instance(s) in `header-group.json` alone — they're harmless infrastructure that only activates if `<template>` is found by name+index.
- If you want to remove them entirely for a cleaner editor: delete the entries from `sections` map AND from the `order` array. Don't touch `mega-menu.liquid` or its schema.

## Related

- `src/groups/headers/mega-menu/mega-menu.liquid` — the 10-line dispatcher template
- `src/groups/headers/mega-menu/schema.js` — `index_nav` setting + `...sectionSchemaSettings()`
- `src/snippets/menu/menu-horizontal/menu-horizontal.liquid` — emits the `<xo-mega-menu>` per link
- `src/snippets/menu/menu-hamburger/menu-hamburger.liquid` — mobile drawer also references mega-menu (verify wiring before assuming mobile parity)
