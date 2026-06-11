# Pages → JSON Templates

Convert a design page HTML file into a Shopify JSON template under `src/pages/<template>/`.

## Where the Page Lands

Match the design page to the right Shopify template directory under `src/pages/`. Common mapping:

| Design page intent          | Template directory (`src/pages/<template>/`) |
| --------------------------- | -------------------------------------------- |
| Home / landing              | `home/`                                      |
| Product detail              | `product/`                                   |
| Collection / category       | `list-collections/` (or as the project uses) |
| Cart                        | `cart/`                                      |
| Article / blog post         | `article/`                                   |
| Blog index                  | `blog/`                                      |
| Generic CMS page (about, contact) | `page/`                                |
| Search                      | `search-filters/`                            |
| 404                         | `404/`                                       |

> [!IMPORTANT]
> **Header and footer are NOT part of the page JSON.** They live in section-groups under `src/groups/headers/` and `src/groups/footers/`. The page JSON only lists `main`-area sections.
>
> Modal-only sections (search overlay, cart drawer) also live under `src/groups/popups/` or `src/groups/overlay/`, not in the page JSON.

## JSON Template Shape

```json
{
  "sections": {
    "<unique_id_1>": {
      "type": "<section-name>",
      "settings": { /* section.settings */ },
      "blocks": {
        "<block_id_1>": {
          "type": "<block-type>",
          "settings": { /* block.settings */ }
        }
      },
      "block_order": ["<block_id_1>", "..."]
    },
    "<unique_id_2>": { ... }
  },
  "order": ["<unique_id_1>", "<unique_id_2>"]
}
```

### Conventions

- `<unique_id>` — short suffix on the section type, e.g. `featured_collection_ef3VQR`. Use random suffixes; never reuse an id within one template.
- Block ids — `<block-type>_<random>` works.
- `order` — render order in `<main>`; required.
- `block_order` — required when blocks exist.

### Naming presets

Pages can have multiple presets. The convention used in this project:

```
src/pages/home/index.preset-1.json
src/pages/home/index.preset-2.json
src/pages/product/product.preset-1.json
```

The preset number / suffix is a project choice — match what's already there.

## Mapping Steps

### 1. Walk the design page

Open the design page HTML. Sections are between `<main>...</main>`:

```html
<main id="xo-main-content">
  <xo-include src="sections/hero/hero.html"></xo-include>
  <xo-include src="sections/<name-a>/<name-a>.html"></xo-include>
  <xo-include src="sections/<name-b>/<name-b>.html"></xo-include>
</main>
```

Each `<xo-include>` becomes one entry in the JSON `sections` map and one slot in `order`.

### 2. Per section, reuse vs new

For each section name:

- Check `src/sections/<name>/` — if present, reuse the type as-is.
- Check for a generic equivalent already in the theme (search by purpose, not name).
- Only if neither exists, create the section first (see `./sections-to-liquid.md`).

### 3. Extract settings from the design section

Open the design section HTML. Every hardcoded value → a setting in the JSON template:

- Headings / overlines / labels → string settings
- Links → url settings
- Images → image_picker settings (or omit and let the section fall back to placeholders)
- Choices (layout, color scheme) → select/radio settings
- Lists of similar children → blocks

### 4. Map repeating children to blocks

If the design section renders N similar children via `<xo-component>` repeats, each child becomes a block. Example pattern:

```html
<!-- design -->
<div xo-grid class="xo-grid-block">
  <xo-component src="product-card" data="{ /* product 1 */ }"></xo-component>
  <xo-component src="product-card" data="{ /* product 2 */ }"></xo-component>
  <xo-component src="product-card" data="{ /* product 3 */ }"></xo-component>
</div>
```

```json
"blocks": {
  "card_1": { "type": "product", "settings": { "product": "shopify://products/<handle-1>" } },
  "card_2": { "type": "product", "settings": { "product": "shopify://products/<handle-2>" } },
  "card_3": { "type": "product", "settings": { "product": "shopify://products/<handle-3>" } }
},
"block_order": ["card_1", "card_2", "card_3"]
```

### 5. Use Shopify resource URIs

For `product`, `collection`, `article`, `blog`, `page`, `metaobject` settings, the value in JSON is a Shopify resource URI:

```
shopify://products/<handle>
shopify://collections/<handle>
shopify://articles/<handle>
shopify://blogs/<handle>
shopify://pages/<handle>
```

Never inline product/collection objects.

### 6. Assemble `order`

Use the original section order from the design page top-to-bottom.

## Pitfalls

| Pitfall                                                       | Fix                                                                |
| ------------------------------------------------------------- | ------------------------------------------------------------------ |
| Including header/footer in the page JSON                      | They live in section-groups under `src/groups/`.                   |
| Reusing the same `<unique_id>` across sections                | Generate a new random suffix per entry.                            |
| Hardcoding product/collection objects                         | Always use `shopify://products/<handle>` etc.                      |
| Missing `block_order` when blocks are present                 | Required — without it, block order is non-deterministic.           |
| Forgetting `color_scheme` for sections that need a non-default scheme | Look at the design section's `class="… color-background-N"`. |
| Treating modal/popup sections as page entries                 | They belong in `src/groups/popups/` or `src/groups/overlay/`.      |

## Related

- `./sections-to-liquid.md` — when the section needs to be created
- `./data-to-settings.md` — designing the section's schema
- `./blueprint-protocol.md` — using design docs as the planning input
