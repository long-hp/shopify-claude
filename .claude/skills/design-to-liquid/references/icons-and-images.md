# Icons & Images

How to translate the design's icon library and image URLs into the Liquid theme.

## Icons

### Common design pattern

Many design systems use an icon library like Lucide via inline data-attributes:

```html
<i data-lucide="search"></i>
<i data-lucide="shopping-bag"></i>
```

Or named SVG snippets:

```html
<svg class="icon-search"><!-- … --></svg>
```

### Liquid pattern

This project ships its own icon set under `src/snippets/icons/icon-<name>.liquid`, rendered through a dispatcher snippet:

```liquid
{% render 'icon', name: '<name>', size: '24' %}
```

`name` matches a file in `src/snippets/icons/` (drop the `icon-` prefix). `size` is the px size.

### Mapping workflow

1. **List existing icons:**
   ```bash
   ls src/snippets/icons/ | sed 's/^icon-//' | sed 's/\.liquid$//'
   ```
2. **For each design icon name**, check whether a matching file exists. Some libraries use slightly different names:
   - design `user` ↔ liquid `account`
   - design `shopping-bag` ↔ liquid `cart` or `cart-bag`
   - design `menu` ↔ liquid `hamburger`
   - design `x` / `close` ↔ liquid `close` / `close-small`
   - design `arrow-up-right` may not have a direct equivalent — project may use a single `arrow` icon + rotate via CSS
3. **If a design icon doesn't exist in `src/snippets/icons/`:**
   - Source the SVG from the design's icon library.
   - Create `src/snippets/icons/icon-<name>.liquid` containing the SVG markup.
   - Make sure the dispatcher routes the new name correctly (check how existing icons are wired).

### Pitfalls

| Pitfall                                                | Fix                                                                |
| ------------------------------------------------------ | ------------------------------------------------------------------ |
| Using an icon name from design without verifying       | List `src/snippets/icons/` first.                                  |
| Hardcoding raw `<svg>` in section liquid               | Add it as an `icon-<name>.liquid` and render via `'icon'`.         |
| Forgetting to set `size`                               | Pass an explicit `size` so styles can target it consistently.      |

## Images

### Common design pattern

Hardcoded URLs from a stock provider:

```html
<div class="xo-image" style="--object-fit:cover; --ratio-percent:75/100;">
  <img src="https://images.unsplash.com/photo-…?w=2000&q=80"
       alt="Description" loading="eager">
</div>
```

### Liquid pattern (preferred — project's image snippet)

If `src/snippets/image/` or `src/snippets/media/` exists, use it (always do — it handles `srcset`, `sizes`, `loading`, `width`/`height`, placeholder fallback consistently):

```liquid
{% render 'image',
  image: section.settings.image,
  loading: 'eager',
  aspect_ratio: '75/100',
  object_fit: 'cover',
  alt: section.settings.image.alt
%}
```

Find the right param names by reading the snippet's liquid-doc and grepping existing sections for sample calls.

### Liquid pattern (fallback — inline)

> [!IMPORTANT]
> **This project always ships the `image` snippet** (`src/snippets/_base/image/image.liquid`), so this fallback essentially never applies here — it's shown only to illustrate the markup the snippet produces under the hood. Every `<img>` rendered into the DOM goes through `{% render 'image' %}`, including scroll / parallax / fill-the-parent cases (use `aspect_ratio: 'none'` + `height_fill: true` — the `.xo-image` wrapper fills its parent and animation wrappers act on their own element, not the `<img>`). The only `image_url`-direct case is a CSS `background-image`. See `liquid` skill → `idioms.md` §7.

When no project image snippet exists (other projects only):

```liquid
{%- if section.settings.image != blank -%}
  <div class="xo-image" style="--object-fit:cover; --ratio-percent:75/100;">
    <img
      src="{{ section.settings.image | image_url: width: 2000 }}"
      srcset="
        {{ section.settings.image | image_url: width: 800 }} 800w,
        {{ section.settings.image | image_url: width: 1200 }} 1200w,
        {{ section.settings.image | image_url: width: 2000 }} 2000w
      "
      sizes="100vw"
      alt="{{ section.settings.image.alt | escape }}"
      width="{{ section.settings.image.width }}"
      height="{{ section.settings.image.height }}"
      loading="lazy"
    >
  </div>
{%- else -%}
  <div class="xo-image" style="--object-fit:cover; --ratio-percent:75/100;">
    {{ 'lifestyle-1' | placeholder_svg_tag: 'placeholder-svg' }}
  </div>
{%- endif -%}
```

### Schema setting

```javascript
{ type: "image_picker", id: "image", label: "Image" }
```

### Per-device images

When the design ships a different image per device:

```javascript
{ type: "image_picker", id: "desktop_image", label: "Desktop image" },
{ type: "image_picker", id: "mobile_image",  label: "Mobile image" },
```

Render with a `<picture>` element or the project's image snippet's per-device option.

### Aspect ratio container

Many designs wrap every `<img>` in an aspect-ratio container:

```html
<div class="xo-image" style="--object-fit:cover; --ratio-percent:75/100;">
```

Keep this wrapper verbatim in liquid; only the inner `<img>` changes (URL + srcset). The aspect-ratio is wired through CSS to `padding-bottom: calc(<ratio> * 100%)`.

### Alt text

- For merchant-uploaded images, use `image.alt` (Shopify image metafield).
- For hero/feature images where the alt is editorial, add a sibling `text` setting (e.g. `image_alt`) and fall back:

```liquid
<img … alt="{{ section.settings.image.alt | default: section.settings.image_alt | escape }}">
```

### Pitfalls

| Pitfall                                              | Fix                                                                |
| ---------------------------------------------------- | ------------------------------------------------------------------ |
| Leaving the design's stock URLs in production liquid | Always promote to `image_picker`.                                  |
| `image_url` without a `width`                        | Always pass a `width` — Shopify needs it for the CDN transform.    |
| Missing `width` / `height` on `<img>`                | Provide via `image.width` / `image.height` to prevent CLS.         |
| `loading="eager"` for below-the-fold images          | Use `loading="lazy"` except for LCP / above-the-fold.              |
| Missing alt text                                     | Always render alt (image alt or fallback setting).                 |

## Related

- `./sections-to-liquid.md` — where you render icons / images in the section
- `./components-to-snippets.md` — when creating a snippet that takes an image param
- `schema` skill → `setting-types.md` — `image_picker`, `color`, etc.
