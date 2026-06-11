# Liquid Objects Reference

Global objects + drops available during template rendering. Source: <https://shopify.dev/docs/api/liquid/objects>.

## Index

| Group | Objects |
| --- | --- |
| Page context | `template`, `request`, `routes`, `shop`, `settings`, `theme`, `page_title`, `page_description`, `page_image`, `canonical_url`, `current_page`, `current_tags`, `powered_by_link` |
| Theme architecture | `section`, `block`, `paginate`, `content_for_layout`, `content_for_header`, `content_for_index` |
| Commerce — product | `product`, `variant`, `image`, `media`, `selling_plan`, `quantity_rule`, `quantity_price_break`, `swatch`, `selling_plan_allocation` |
| Commerce — cart / order | `cart`, `line_item`, `shipping_method`, `discount_allocation`, `discount_application`, `applied_gift_card`, `order`, `transaction`, `tax_line`, `fulfillment` |
| Commerce — customer | `customer`, `address`, `country`, `country_option_tags`, `currency` |
| Content | `article`, `blog`, `comment`, `collection`, `page`, `link`, `linklist`, `linklists`, `search`, `predictive_search`, `recommendations` |
| Metadata | `metafield`, `metaobject`, `taxonomy_category`, `tag`, `filter`, `filter_value` |
| Form | `form`, `additional_checkout_buttons` |

---

## Page context

### `template`

```liquid
{{ template }}            → 'product' | 'collection' | 'index' | 'page' | 'article' | …
{{ template.name }}       → base template name (same as above)
{{ template.suffix }}     → custom template suffix (e.g. 'minimal' from product.minimal.json)
{{ template.directory }}  → 'customers' for customer-related templates
```

### `request`

```liquid
{{ request.locale.iso_code }}          → 'en' / 'fr' / 'vi'  — used in <html lang>
{{ request.locale.endonym_name }}      → 'English' / 'Français'
{{ request.design_mode }}              → true in Theme Editor preview
{{ request.visual_preview_mode }}      → true in visual preview
{{ request.host }}                     → shop's hostname
{{ request.origin }}                   → protocol + host
{{ request.path }}                     → URL path
{{ request.page_type }}                → 'product' / 'collection' / 'index' / …
```

Use `request.design_mode` for placeholder fallbacks visible only in editor:

```liquid
{% if section.settings.image == blank and request.design_mode %}
  <placeholder-image data-type="general"></placeholder-image>
{% endif %}
```

### `routes`

URL helpers — **use these, don't hardcode paths**.

```liquid
{{ routes.root_url }}                 → '/'
{{ routes.collections_url }}          → '/collections'
{{ routes.cart_url }}                 → '/cart'
{{ routes.cart_add_url }}             → '/cart/add'
{{ routes.cart_change_url }}          → '/cart/change'
{{ routes.product_recommendations_url }}
{{ routes.search_url }}
{{ routes.predictive_search_url }}
{{ routes.account_url }}, account_login_url, account_logout_url, account_register_url, account_addresses_url, account_recover_url
{{ routes.all_products_collection_url }}
```

### `shop`

```liquid
{{ shop.name }}
{{ shop.email }}
{{ shop.currency }}
{{ shop.locale }}
{{ shop.money_format }}
{{ shop.money_with_currency_format }}
{{ shop.url }}
{{ shop.secure_url }}
{{ shop.domain }}
{{ shop.password_message }}
{{ shop.enabled_payment_types }}      → array used with payment_type_svg_tag
{{ shop.enabled_currencies }}, enabled_locales
```

### `settings`

Theme settings from `config/settings_data.json` (compiled from `src/config/global-schema/*.js` + `src/config/presets/preset-N.js`):

```liquid
{{ settings.color_button_background }}
{{ settings.font_heading_family }}
{{ settings.page_width }}
{{ settings.cart_type }}
```

The full key set is defined in `src/config/global-schema/` — see the `schema` skill.

### `theme`

```liquid
{{ theme.name }}
{{ theme.id }}
{{ theme.role }}      → 'main' | 'unpublished' | 'demo' | 'development'
```

### `page_title`, `page_description`, `page_image`, `canonical_url`

Set in templates' `<head>` for SEO:

```liquid
<title>{{ page_title }}</title>
<meta name="description" content="{{ page_description | escape }}">
<link rel="canonical" href="{{ canonical_url }}">

{# Social sharing — fallback to shop logo if no page image #}
{% if page_image %}
  <meta property="og:image" content="{{ page_image | image_url: width: 1200 }}">
{% endif %}
```

### `current_page`, `current_tags`

`current_page` is the current pagination page (1, 2, 3…). `current_tags` is the array of currently-filtered tags on a collection page.

### `powered_by_link`

Required in footer for non-paid plans:

```liquid
{{ powered_by_link }}   {# do NOT modify — Theme Store rule #}
```

---

## Theme architecture

### `section`

Inside a section's `.liquid`, `section` refers to the current section instance.

```liquid
{{ section.id }}                       → unique instance id
{{ section.settings.heading }}         → access this section's setting values
{{ section.blocks }}                   → array of block objects
{{ section.blocks.size }}              → block count
{{ section.location }}                 → 'template' | 'header' | 'footer' | … (the section group it lives in)
{{ section.index }}                    → 1-based index of the section in its location
{{ section.index0 }}                   → 0-based
{{ section.name }}                     → schema 'name' value
```

Use `section.location` to detect header/template position for LCP eager-load:

```liquid
{% liquid
  assign is_above_fold = false
  if section.index == 1 and section.location == 'template'
    assign is_above_fold = true
  endif
%}
{% render 'image', image: image, lazyload: is_above_fold == false %}
```

### `block`

Inside a `{% for block in section.blocks %}` loop, each `block` is a block instance:

```liquid
{{ block.id }}                         → unique instance id
{{ block.type }}                       → block 'type' string from schema
{{ block.settings.heading }}           → block's setting values
{{ block.shopify_attributes }}         → HTML attributes required for Theme Editor selection (data-shopify-…)
```

**Always emit `{{ block.shopify_attributes }}` on the block's root element** — Theme Editor uses it to highlight + select blocks.

### `paginate`

Available inside a `{% paginate %}` block:

```liquid
{{ paginate.current_page }}            → 1, 2, 3, …
{{ paginate.pages }}                   → total pages
{{ paginate.items }}                   → total items across pages
{{ paginate.page_size }}               → items per page (the `by N` value)
{{ paginate.parts }}                   → array of { is_link, title, url } for rendering page links
{{ paginate.previous.url }}            → previous page URL (nil on page 1)
{{ paginate.previous.title }}          → '« Previous'
{{ paginate.next.url }}                → next page URL (nil on last page)
{{ paginate.next.title }}              → 'Next »'
```

### `content_for_layout`

Yielded by `theme.liquid` — emits the page-specific template output:

```liquid
<main>
  {{ content_for_layout }}
</main>
```

### `content_for_header`

Shopify-injected scripts/styles. Emit once in `<head>`, **do not modify or parse**:

```liquid
<head>
  …
  {{ content_for_header }}
</head>
```

### `content_for_index`

Yields the `index.json` template's body inside `theme.liquid`. Rare — most themes use `content_for_layout` for everything.

---

## Commerce — product

### `product`

```liquid
{{ product.id }}
{{ product.title }}
{{ product.handle }}
{{ product.vendor }}
{{ product.type }}
{{ product.available }}                → true if any variant in stock
{{ product.price }}                    → current variant price (subunit)
{{ product.price_min }} / .price_max   → range across variants
{{ product.price_varies }}             → true if prices differ across variants
{{ product.compare_at_price }}         → current variant's compare_at
{{ product.compare_at_price_min }} / .compare_at_price_max
{{ product.compare_at_price_varies }}
{{ product.featured_image }}           → image object (first image)
{{ product.featured_media }}           → media object (first media — image/video/3d)
{{ product.images }}                   → array of image
{{ product.media }}                    → array of media
{{ product.description }}              → HTML body
{{ product.content }}                  → same as description (legacy alias)
{{ product.options }}                  → array of option names ['Size', 'Color', …]
{{ product.options_with_values }}      → array of {name, position, values, selected_value}
{{ product.variants }}                 → array of variant
{{ product.first_available_variant }}  → first in-stock variant (or nil)
{{ product.selected_variant }}         → variant matching ?variant= URL param (or nil)
{{ product.selected_or_first_available_variant }}
{{ product.tags }}                     → array of string
{{ product.collections }}              → array of collection (Online Store only)
{{ product.url }}                      → /products/<handle>
{{ product.metafields.<namespace>.<key> }}
{{ product.requires_selling_plan }}    → true if any variant requires a subscription
{{ product.selling_plan_groups }}      → array of selling_plan_group
```

### `variant`

```liquid
{{ variant.id }}
{{ variant.title }}                    → 'Small / Red' (option values joined by ' / ')
{{ variant.sku }}
{{ variant.price }}                    → subunit
{{ variant.compare_at_price }}         → subunit
{{ variant.unit_price }} / unit_price_measurement
{{ variant.available }}                → true if purchasable
{{ variant.inventory_quantity }}
{{ variant.inventory_management }}     → 'shopify' / nil
{{ variant.inventory_policy }}         → 'deny' / 'continue'
{{ variant.options }}                  → array — ['Small', 'Red']
{{ variant.option1 }} / option2 / option3
{{ variant.selected }}                 → true if matches ?variant= URL param
{{ variant.image }}                    → image object linked to variant (or nil)
{{ variant.featured_media }}
{{ variant.requires_shipping }}
{{ variant.taxable }}
{{ variant.weight }}                   → in grams
{{ variant.weight_unit }}              → display unit ('kg' etc)
{{ variant.metafields.<namespace>.<key> }}
{{ variant.url }}                      → product URL with ?variant=
{{ variant.selling_plan_allocations }} → array
{{ variant.selected_selling_plan_allocation }}
```

### `image`

```liquid
{{ image.src }}                        → URL (rarely used — prefer image_url)
{{ image.width }}, image.height
{{ image.aspect_ratio }}               → width / height as decimal
{{ image.alt }}                        → alt text from admin
{{ image.id }}
{{ image.position }}                   → 1-based position in product.images
{{ image.product_id }}                 → parent product id (nil if not product image)
{{ image.media_type }}                 → 'image'
{{ image.presentation.focal_point }}   → { x, y } as percentages — for object-position styling
{{ image.variants }}                   → array of variants linked to this image
```

### `media`

```liquid
{{ media.media_type }}                 → 'image' | 'video' | 'external_video' | 'model'
{{ media.preview_image }}              → image object (poster)
{{ media.alt }}
{{ media.position }}
{# video / external_video specifics #}
{{ media.sources }}                    → array of { url, mime_type, format, width, height }
{{ media.host }}                       → 'youtube' / 'vimeo' (external_video only)
{{ media.id }}                         → external id
{# model specifics #}
{{ media.sources }}, media.alt
```

### `selling_plan`, `quantity_rule`, `quantity_price_break`, `swatch`

For subscriptions, B2B quantity rules, and color swatches. See full docs.

---

## Commerce — cart

### `cart`

```liquid
{{ cart.item_count }}                  → 0, 1, 2, …
{{ cart.items }}                       → array of line_item
{{ cart.items_subtotal_price }}        → subunit, before cart-level discounts
{{ cart.total_price }}                 → subunit, after discounts
{{ cart.original_total_price }}        → subunit, before discounts
{{ cart.total_discount }}              → subunit (savings)
{{ cart.currency }}                    → currency object
{{ cart.note }}                        → string (captured via <textarea name="note">)
{{ cart.attributes }}                  → hash of additional cart attributes
{{ cart.cart_level_discount_applications }}
{{ cart.discount_codes }}              → array of code strings
{{ cart.applied_gift_cards }}          → array
{{ cart.taxes_included }}              → boolean — set in store tax settings
{{ cart.duties_included }}             → boolean
{{ cart.requires_shipping }}           → true if any line requires shipping
{{ cart.empty? }}                      → boolean
{{ cart.total_weight }}                → grams
```

### `line_item`

```liquid
{{ line_item.id }}
{{ line_item.key }}                    → unique key for line-item operations
{{ line_item.product_id }}, product
{{ line_item.variant_id }}, variant
{{ line_item.title }}                  → product.title + variant.title
{{ line_item.product_title }}
{{ line_item.variant_title }}
{{ line_item.quantity }}
{{ line_item.price }}                  → unit price, subunit
{{ line_item.final_price }}            → unit price after line-item discounts, subunit
{{ line_item.original_price }}         → unit price before discounts
{{ line_item.line_price }}             → quantity × price, subunit
{{ line_item.final_line_price }}       → quantity × final_price
{{ line_item.original_line_price }}    → quantity × original_price
{{ line_item.total_discount }}         → subunit (savings for this line)
{{ line_item.image }}                  → variant.image | product.featured_image
{{ line_item.url }}                    → product URL with variant
{{ line_item.url_to_remove }}          → click to remove
{{ line_item.options_with_values }}    → [{name, value}]
{{ line_item.properties }}             → custom line-item properties hash
{{ line_item.selling_plan_allocation }}
{{ line_item.unit_price }}, .unit_price_measurement
{{ line_item.discount_allocations }}
{{ line_item.line_level_discount_allocations }}
{{ line_item.gift_card }}              → boolean
{{ line_item.taxable }}, .grams, .sku
{{ line_item.requires_shipping }}
{{ line_item.fulfillment_service }}
```

### `discount_application`, `discount_allocation`

Discounts split into "applications" (the discount entity) and "allocations" (per-line breakdown). See full docs for property lists.

---

## Commerce — customer / order

### `customer`

```liquid
{{ customer.id }}
{{ customer.email }}
{{ customer.first_name }}, .last_name, .name
{{ customer.phone }}
{{ customer.orders }}                  → array of order
{{ customer.orders_count }}
{{ customer.total_spent }}             → subunit
{{ customer.default_address }}         → address object
{{ customer.addresses }}, .addresses_count
{{ customer.tags }}
{{ customer.tax_exempt }}
{{ customer.accepts_marketing }}
{{ customer.has_account }}             → false for guests
{{ customer.last_order }}              → order object
{{ customer.b2b? }}                    → true if B2B account
{{ customer.company }}, .company_available_locations, .current_location, .current_company
```

### `address`

```liquid
{{ address.first_name }}, .last_name, .name
{{ address.company }}
{{ address.address1 }}, .address2
{{ address.city }}, .province, .province_code, .country, .country_code
{{ address.zip }}
{{ address.phone }}
{{ address.summary }}                  → multi-line formatted address
```

### `order`

```liquid
{{ order.id }}, order.name, order.order_number, order.order_status_url
{{ order.created_at }}, order.cancelled_at, order.cancel_reason
{{ order.financial_status }}           → 'authorized' | 'paid' | 'partially_paid' | …
{{ order.fulfillment_status }}         → 'fulfilled' | 'partial' | 'unfulfilled'
{{ order.customer_url }}
{{ order.email }}, order.phone
{{ order.shipping_address }}, order.billing_address
{{ order.line_items }}, order.line_items_subtotal_price
{{ order.shipping_methods }}, order.shipping_price
{{ order.tax_lines }}, order.tax_price
{{ order.total_price }}, order.total_discounts, order.total_refunded_amount
{{ order.discount_applications }}, order.discount_codes
{{ order.transactions }}
{{ order.note }}, order.attributes
{{ order.payment_terms }}
```

### `currency`

```liquid
{{ currency.iso_code }}     → 'USD'
{{ currency.name }}         → 'US Dollar'
{{ currency.symbol }}       → '$'
```

---

## Content

### `article`

```liquid
{{ article.id }}, article.handle, article.url
{{ article.title }}
{{ article.author }}                   → string
{{ article.content }}                  → HTML body
{{ article.excerpt }}                  → user-set excerpt, may be blank
{{ article.excerpt_or_content }}       → excerpt if set, else content
{{ article.image }}                    → featured image
{{ article.published_at }}             → ISO timestamp (use date / time_tag)
{{ article.created_at }}
{{ article.updated_at }}
{{ article.tags }}                     → array
{{ article.comments }}                 → array of comment (paginated)
{{ article.comments_count }}
{{ article.comments_enabled? }}, .moderated?
{{ article.comment_post_url }}         → POST endpoint for new comments
{{ article.metafields }}
{{ article.user.first_name }}, .user.last_name, .user.email — author user
```

> [!IMPORTANT]
> **Use `article.published_at`, NOT `article.created_at`** (Theme Store rule).

### `blog`

```liquid
{{ blog.id }}, blog.handle, blog.url
{{ blog.title }}
{{ blog.articles }}                    → array of article (paginated)
{{ blog.articles_count }}
{{ blog.next_article }}, blog.previous_article   → on article pages
{{ blog.all_tags }}, blog.tags         → tag arrays
{{ blog.comments_enabled? }}, .moderated?
{{ blog.metafields }}
```

### `comment`

```liquid
{{ comment.id }}, comment.author, comment.email, comment.content
{{ comment.url }}, comment.status, comment.created_at, comment.updated_at
```

### `collection`

```liquid
{{ collection.id }}, collection.handle, collection.url
{{ collection.title }}
{{ collection.description }}
{{ collection.image }}                 → admin-set; fallback to first product's image
{{ collection.featured_image }}        → same as above (legacy alias)
{{ collection.products }}              → array (paginated — limit 50)
{{ collection.products_count }}        → in current view
{{ collection.all_products_count }}    → total before filters
{{ collection.all_tags }}              → tags across all products in the collection
{{ collection.tags }}                  → tags in current view
{{ collection.filters }}               → storefront filters (empty if >5000 products)
{{ collection.current_type }}          → for /collections/types
{{ collection.current_vendor }}        → for /collections/vendors
{{ collection.default_sort_by }}       → 'manual' | 'best-selling' | 'title-ascending' | ...
{{ collection.sort_options }}          → array of { name, value }
{{ collection.sort_by }}               → currently active sort
{{ collection.next_product }}, collection.previous_product   → on product pages within a collection
{{ collection.metafields }}
{{ collection.published_at }}, .updated_at
```

### `page`

```liquid
{{ page.title }}
{{ page.content }}                     → HTML body
{{ page.handle }}, page.url, page.id
{{ page.author }}                      → string
{{ page.template_suffix }}             → for alternate templates (e.g. 'contact')
{{ page.metafields }}
{{ page.published_at }}
```

### `link` / `linklist` / `linklists`

```liquid
{{ linklists.main-menu.links }}        → array of link
{{ linklists.footer.links }}

{% for link in linklists.main-menu.links %}
  <a href="{{ link.url }}" {% if link.current %}aria-current="page"{% endif %}>{{ link.title }}</a>
  {% for child in link.links %}
    <a href="{{ child.url }}">{{ child.title }}</a>
  {% endfor %}
{% endfor %}
```

`link` properties: `title`, `url`, `active` (boolean), `current` (boolean), `child_active`, `child_current`, `levels` (nesting depth), `links` (children), `type` (`collection_link` / `product_link` / `blog_link` / `article_link` / `page_link` / `frontpage_link` / `search_link` / `http_link`), `object` (linked entity).

### `search` / `predictive_search`

```liquid
{{ search.performed }}                 → true if a query was submitted
{{ search.terms }}                     → the query string
{{ search.results }}                   → array of mixed results (paginated)
{{ search.results_count }}
{{ search.types }}                     → array of types searched: ['product', 'page', 'article']
{{ search.filters }}                   → faceted search filters
```

For predictive search (autocomplete): `predictive_search.terms`, `predictive_search.resources.products` / `.collections` / `.pages` / `.articles` / `.queries`, `predictive_search.performed`.

### `recommendations`

```liquid
{{ recommendations.products }}         → array of recommended products
{{ recommendations.products_count }}
{{ recommendations.intent }}           → 'related' | 'complementary'
{{ recommendations.performed }}        → true after the recommendations endpoint has been hit
```

---

## Metadata

### `metafield`

```liquid
{{ product.metafields.specs.material }}             → metafield value
{{ product.metafields.specs.material.value }}       → same
{{ product.metafields.specs.material.type }}        → 'single_line_text_field' | 'rich_text_field' | 'list.color' | ...
```

For rich-text metafields, use `.value` filtered through specific render helpers as needed.

### `metaobject`

```liquid
{{ metaobject.fields.title }}
{{ metaobject.system.handle }}, .system.type, .system.id
```

Access via metafield references: `product.metafields.brand.brand` (where the metafield definition is `metaobject_reference`).

### `tag`, `filter`, `filter_value`

For collection/search faceted filtering. `filter` properties: `label`, `param_name`, `presentation` (`'text'` / `'swatch'` / ...), `values` (array of `filter_value`).

`filter_value` properties: `label`, `value`, `count`, `active`, `url_to_add`, `url_to_remove`.

---

## Form

### `form`

Available inside a `{% form 'type' %}` block:

```liquid
{{ form.errors }}                      → array of error field names (or nil)
{{ form.errors.translated_fields.email }} → 'Email'
{{ form.errors.messages.email }}       → "can't be blank"
{{ form.posted_successfully? }}        → true after a successful POST
{{ form.id }}                          → unique form id
{{ form.password_used }}, .password_needed   → for storefront_password
{{ form.email }}, .name, .body         → contact form fields
```

### `additional_checkout_buttons`

```liquid
{% if additional_checkout_buttons %}
  {{ content_for_additional_checkout_buttons }}
{% endif %}
```

Renders Shop Pay / accelerated checkout buttons. Required by Theme Store.

---

## Special-purpose

### `taxonomy_category`

```liquid
{{ product.category.id }}, product.category.name, product.category.full_name
```

### `country_option_tags`

Renders all country `<option>` tags for an address form:

```liquid
<select name="address[country]">{{ country_option_tags }}</select>
```

---

## Related

- `references/tags.md` — how to use these objects in tags (for / if / case)
- `references/filters.md` — apply filters to object values
- `references/idioms.md` — section/block patterns, settings access
- `references/gotchas.md` — common pitfalls (paginate ceiling, render isolation)
