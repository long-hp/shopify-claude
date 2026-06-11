# Liquid Filters Reference

Filters transform values via the pipe `|`. Source: <https://shopify.dev/docs/api/liquid/filters>.

## Index

| Group | Filters |
| --- | --- |
| Media | `image_url`, `image_tag`, `asset_url`, `asset_img_url`, `file_url`, `file_img_url`, `global_asset_url`, `stylesheet_tag`, `script_tag`, `inline_asset_content` |
| Money | `money`, `money_with_currency`, `money_without_currency`, `money_without_trailing_zeros` |
| String | `escape`, `escape_once`, `url_encode`, `url_decode`, `newline_to_br`, `strip_html`, `strip_newlines`, `strip`, `lstrip`, `rstrip`, `default`, `append`, `prepend`, `replace`, `replace_first`, `remove`, `remove_first`, `capitalize`, `downcase`, `upcase`, `handleize`, `handle`, `truncate`, `truncatewords`, `pluralize`, `md5`, `sha1`, `sha256`, `hmac_sha1`, `hmac_sha256`, `base64_encode`, `base64_decode`, `base64_url_safe_encode`, `base64_url_safe_decode` |
| Array | `where`, `where_exists`, `sort`, `sort_natural`, `map`, `join`, `split`, `slice`, `first`, `last`, `size`, `reverse`, `uniq`, `compact`, `concat`, `find`, `find_index` |
| Math | `plus`, `minus`, `times`, `divided_by`, `modulo`, `round`, `ceil`, `floor`, `abs`, `at_most`, `at_least` |
| URL / link | `link_to`, `link_to_type`, `link_to_vendor`, `link_to_tag`, `link_to_add_tag`, `link_to_remove_tag`, `url_for_type`, `url_for_vendor`, `within`, `payment_button`, `payment_type_img_url`, `payment_type_svg_tag`, `login_button` |
| Translation / formatting | `t`, `default_pagination`, `format_address`, `time_tag`, `date`, `json`, `format_code` |
| Cart / customer | `customer_login_link`, `customer_logout_link`, `customer_register_link` |

---

## Media

### `image_url`

Returns the CDN URL for an image. **Requires `width` OR `height` parameter.**

```liquid
{{ product.featured_image | image_url: width: 800 }}
{{ product | image_url: width: 600 }}
{{ image | image_url: width: 1200, height: 800, crop: 'center' }}
```

Parameters:
- `width: N` — px, max 5760
- `height: N` — px, max 5760
- `crop: 'top'|'center'|'bottom'|'left'|'right'|'region'` — how to crop when both width and height set
- `crop_left`, `crop_top`, `crop_width`, `crop_height` — for `crop: 'region'`

Common responsive recipe (project uses this in `_base/image/image.liquid`):

```liquid
{{ image | image_url: width: image.width | image_tag:
   widths: '180, 360, 540, 720, 900, 1080, 1296, 1512, 1728, 2048, 4472',
   sizes: '(min-width: 750px) 50vw, 100vw',
   alt: image.alt | escape,
   loading: 'lazy' }}
```

### `image_tag`

Wraps an image URL into a full `<img>` tag with optional HTML attributes.

```liquid
{{ product | image_url: width: 400 | image_tag }}
{{ product | image_url: width: 400 | image_tag: class: 'card__img', loading: 'lazy', alt: product.title }}
```

Common attributes: `alt`, `class`, `loading` (`lazy`/`eager`), `width`, `height`, `widths` (srcset), `sizes`, `decoding`, `fetchpriority`.

> [!IMPORTANT]
> **Deprecated:** `img_url` and `img_tag` (no underscore). Always use `image_url` / `image_tag`.

### `asset_url`

URL of a file in the theme's `assets/` directory.

```liquid
{{ 'theme.css' | asset_url }}
{{ 'cart.js' | asset_url | script_tag }}
{{ 'theme.css' | asset_url | stylesheet_tag }}
```

### `asset_img_url`

URL of an image asset in `assets/`. Like `image_url` but for theme-bundled images. Same width/height params.

```liquid
{{ 'placeholder.svg' | asset_img_url: '300x' }}
```

### `file_url`, `file_img_url`

URL of a file uploaded to the Shopify admin's Files section.

```liquid
{{ 'brochure.pdf' | file_url }}
{{ 'hero.jpg' | file_img_url: '1500x' }}
```

### `stylesheet_tag` / `script_tag`

Wrap a URL into a `<link rel="stylesheet">` or `<script>` tag.

```liquid
{{ 'theme.css' | asset_url | stylesheet_tag }}
{{ 'theme.js' | asset_url | script_tag }}
```

### `inline_asset_content`

Inline the raw contents of an asset (for inlining SVGs, critical CSS).

```liquid
{{ 'logo.svg' | inline_asset_content }}
```

---

## Money

All money filters take a `number` in the currency's subunit (cents for USD, whole-units for JPY/KRW — Shopify handles this). The customer's locale + presentment currency apply.

```liquid
{{ product.price | money }}                   → $19.99
{{ product.price | money_with_currency }}     → $19.99 USD
{{ product.price | money_without_currency }}  → 19.99
{{ product.price | money_without_trailing_zeros }} → $20  (when .00)
```

For unit prices: `{{ variant.unit_price | money }}`. For compare-at: `{{ variant.compare_at_price | money }}`.

---

## String

### `escape`

HTML-escapes a string: `&` → `&amp;`, `<` → `&lt;`, etc.

```liquid
{{ user_input | escape }}
<input value="{{ section.settings.placeholder | escape }}">
```

> Use `escape` on any user-controlled string in HTML attributes or text. Already auto-applied to `{{ }}` for safety inside text content of HTML, but **not** inside `style=`/`href=`/JSON contexts.

### `escape_once`

Like `escape` but won't double-encode already-encoded entities (`&amp;` stays `&amp;`).

### `url_encode` / `url_decode`

Percent-encode / decode strings for URLs:

```liquid
<a href="/search?q={{ query | url_encode }}">…</a>
```

### `strip_html`

Strips all HTML tags.

```liquid
{{ article.content | strip_html | truncatewords: 30 }}
{{ play_label | strip_html | escape }}   ← good for aria-label
```

### `strip_newlines`, `strip`, `lstrip`, `rstrip`

`strip_newlines` removes `\n` / `\r`. `strip` trims whitespace both sides; `lstrip` / `rstrip` only one side.

### `default`

```liquid
{{ section.settings.heading | default: 'Untitled' }}
```

**Critical idiom for booleans:** the bare `default` filter treats `false` as falsy and substitutes the default. Use `allow_false: true` to keep `false`:

```liquid
{% assign show_cta = block.settings.show_cta | default: true, allow_false: true %}
```

Without `allow_false: true`, a setting explicitly set to `false` would silently become `true`.

### `newline_to_br`

Converts `\n` to `<br>`. Useful for `textarea` settings.

```liquid
{{ section.settings.message | newline_to_br }}
```

### `append` / `prepend`

```liquid
{{ 'hello' | append: ' world' }}        → hello world
{{ 'hello' | prepend: 'oh, ' }}         → oh, hello
```

Use in `assign` to compose strings:

```liquid
{% assign container_class = 'xo-block' %}
{% if variant == 'large' %}
  {% assign container_class = container_class | append: ' xo-block--large' %}
{% endif %}
```

### `replace`, `replace_first`, `remove`, `remove_first`

```liquid
{{ 'Hello World' | replace: 'World', 'Liquid' }}    → Hello Liquid
{{ 'foo bar foo' | replace_first: 'foo', 'baz' }}   → baz bar foo
{{ 'foo bar foo' | remove: 'foo' }}                 → ' bar '
{{ 'foo bar foo' | remove_first: 'foo' }}           → ' bar foo'
```

### `capitalize`, `downcase`, `upcase`

```liquid
{{ 'Hello' | upcase }}     → HELLO
{{ 'Hello' | downcase }}   → hello
{{ 'hello' | capitalize }} → Hello   (first letter only)
```

### `handleize`, `handle`

Converts to URL-safe handle (lowercase, hyphens, no special chars).

```liquid
{{ 'Hello World!' | handleize }}   → hello-world
```

### `truncate`, `truncatewords`

```liquid
{{ 'Long text here' | truncate: 8 }}             → Long ... (default truncation at 8 chars including ellipsis)
{{ 'Long text here' | truncate: 8, '—' }}        → Long t—
{{ 'one two three four' | truncatewords: 2 }}    → one two...
{{ 'one two three four' | truncatewords: 2, '' }} → one two
```

### `pluralize`

```liquid
{{ cart.item_count }} {{ cart.item_count | pluralize: 'item', 'items' }}
{# 1 item / 2 items #}
```

### Crypto / encoding

`md5`, `sha1`, `sha256`, `hmac_sha1`, `hmac_sha256` — hash functions, mostly for gravatar URLs.

`base64_encode`, `base64_decode`, `base64_url_safe_encode`, `base64_url_safe_decode` — Base64 with optional URL-safe charset.

---

## Array

### `where`

Filter array of objects by a property:

```liquid
{% assign blue_socks = collection.products | where: 'type', 'socks' | where: 'tags', 'blue' %}
```

### `where_exists`

Filter by presence of a property (regardless of value):

```liquid
{% assign products_with_sku = collection.products | where_exists: 'sku' %}
```

### `sort` / `sort_natural`

`sort` is case-sensitive; `sort_natural` is case-insensitive.

```liquid
{% assign sorted = products | sort: 'price' %}
{% assign sorted = products | sort: 'title' | reverse %}
```

### `map`

Extract a single property from each item:

```liquid
{% assign titles = products | map: 'title' %}
{% assign first_images = products | map: 'featured_image' | map: 'src' %}
```

### `join`

```liquid
{{ product.tags | join: ', ' }}   → 'tag1, tag2, tag3'
```

### `split`

```liquid
{% assign parts = 'a,b,c' | split: ',' %}   → ['a', 'b', 'c']
```

### `slice`

For strings: slice characters. For arrays: slice items.

```liquid
{{ 'hello' | slice: 0, 3 }}   → hel
{{ 'hello' | slice: -3, 3 }}  → llo  (negative = from end)
{% assign first_two = products | slice: 0, 2 %}
```

### `first`, `last`, `size`

```liquid
{{ collection.products | first }}
{{ collection.products | last }}
{{ collection.products | size }}
```

### `reverse`, `uniq`, `compact`, `concat`

```liquid
{{ array | reverse }}
{{ ['a', 'b', 'a'] | uniq }}              → ['a', 'b']
{{ ['a', nil, 'b'] | compact }}           → ['a', 'b']
{{ array1 | concat: array2 }}
```

### `find`, `find_index`

Find first matching element:

```liquid
{% assign first_sale = products | find: 'on_sale', true %}
{% assign sale_index = products | find_index: 'on_sale', true %}
```

---

## Math

```liquid
{{ 4 | plus: 2 }}         → 6
{{ 10 | minus: 3 }}       → 7
{{ 3 | times: 4 }}        → 12
{{ 10 | divided_by: 3 }}  → 3        (integer division when both ints)
{{ 10 | divided_by: 3.0 }} → 3.333…  (force float)
{{ 10 | modulo: 3 }}      → 1
{{ 4.7 | round }}         → 5
{{ 4.5 | round: 1 }}      → 4.5      (with decimals)
{{ 4.2 | ceil }}          → 5
{{ 4.8 | floor }}         → 4
{{ -5 | abs }}            → 5
{{ 10 | at_most: 5 }}     → 5        (min(value, 5))
{{ 2 | at_least: 5 }}     → 5        (max(value, 5))
```

---

## URL / link

### `link_to`

Wraps a URL into an `<a>`:

```liquid
{{ 'Shop now' | link_to: '/collections/all' }}
{{ 'Shop now' | link_to: '/collections/all', 'class="button"' }}
```

### `link_to_type` / `link_to_vendor` / `link_to_tag`

```liquid
{{ 'Tee shirts' | link_to_type }}             → <a href="/collections/types?q=Tee shirts">…</a>
{{ 'Acme Co' | link_to_vendor }}              → <a href="/collections/vendors?q=Acme Co">…</a>
{{ 'sale' | link_to_tag: 'View sale' }}       → <a href="/collections/all/sale">View sale</a>
{{ 'red' | link_to_add_tag: 'Filter red' }}
{{ 'red' | link_to_remove_tag: 'Remove red' }}
```

### `url_for_type`, `url_for_vendor`

URL-only versions (no `<a>` wrap).

### `payment_button`

Renders the Shop Pay / additional checkout buttons block (required by Theme Store):

```liquid
{% form 'product', product %}
  …
  {{ form | payment_button }}
{% endform %}
```

### `payment_type_img_url`, `payment_type_svg_tag`

Renders payment-method logos:

```liquid
{% for type in shop.enabled_payment_types %}
  {{ type | payment_type_svg_tag }}
{% endfor %}
```

### `login_button`

Renders the "Login with Shop" button (Theme Store required):

```liquid
{{ shop | login_button }}
```

---

## Translation / formatting

### `t` (translate)

Look up a key from the locale files (`locales/<lang>.json`):

```liquid
{{ 'general.cart.title' | t }}
{{ 'general.cart.items_count' | t: count: cart.item_count }}
```

The key must exist in your locale files. Falls back to the default locale if missing.

### `format_address`

Renders a customer / shop address with locale-aware formatting:

```liquid
{{ customer.default_address | format_address }}
```

### `time_tag`

Wraps a date into an HTML5 `<time>` element with `datetime` attribute:

```liquid
{{ article.published_at | time_tag: '%B %-d, %Y' }}
{# → <time datetime="2026-05-25T10:00:00Z">May 25, 2026</time> #}
```

### `date`

Format a date (without the `<time>` wrapper):

```liquid
{{ article.published_at | date: '%Y-%m-%d' }}
{{ 'now' | date: '%B %-d, %Y' }}
```

Format tokens follow `strftime`: `%Y` (4-digit year), `%m` (month), `%d` (day), `%B` (full month name), `%-d` (day without leading zero), etc.

### `json`

Serialize a value to JSON. Useful for passing data to JavaScript:

```liquid
<script>
  var product = {{ product | json }};
</script>
```

### `default_pagination`

Render default pagination HTML (rarely used — most themes write their own pagination).

```liquid
{{ paginate | default_pagination }}
```

---

## Common chains

```liquid
{# Image URL → tag, lazy-loaded #}
{{ product.featured_image | image_url: width: 800 | image_tag: class: 'card__img', loading: 'lazy', alt: product.title | escape }}

{# Money with fallback #}
{{ product.price | money_without_trailing_zeros }}

{# Boolean with allow_false #}
{% assign show = block.settings.show | default: true, allow_false: true %}

{# Truncated description, HTML stripped #}
{{ article.content | strip_html | truncatewords: 30 }}

{# URL-safe filename for asset #}
{{ section.id | append: '.css' | asset_url | stylesheet_tag }}
```

## Related

- `references/tags.md` — `assign`, `capture`, `liquid` block use filters
- `references/objects.md` — what data the filters can be applied to
- `references/idioms.md` — `default | allow_false` pattern, image responsive sizing
