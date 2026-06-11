# Translations — the `| t` filter + `src/locales/` convention

> Source of truth for **string translation in `.liquid` markup only**. Decides whether a hardcoded string should go through `'<key>' | t`, how this project's locale source files are laid out, and how to reuse / add a key.

> [!IMPORTANT]
> **Scope: `.liquid` markup strings.** Schema (`schema.js`) labels and `default:` values are NOT `| t` — they are plain strings (merchant-facing content / editor labels) handled by Shopify's own schema-locale extraction at Theme Store submission, not by this skill. Don't wrap schema labels/defaults in `| t`. This reference is only about strings you write directly in a `.liquid` body.

## Decision — does this `.liquid` string go through `| t`?

When you're about to hardcode a visible string in a `.liquid` file, classify it:

| The string is… | → | Why |
| --- | --- | --- |
| **Theme UI / chrome** the merchant doesn't edit per-instance — button labels on fixed actions ("Add to cart", "Quick view"), nav/aux labels, pagination, "Sort by", tab labels | **`'<key>' \| t`** | Fixed by the theme author, must translate across storefront languages |
| **Accessibility text** — `aria-label`, `visually-hidden` text, `alt` for functional icons, form-control labels | **`'<key>' \| t`** | A11y strings must localise too; never hardcode them |
| **Status / system messages** — empty states ("Your cart is empty"), errors ("Wrong password!"), loading, "No results" | **`'<key>' \| t`** | Theme-owned copy, language-dependent |
| **Merchant-edited content** — the section's heading, body copy, CTA text the merchant types in the Theme Editor | **schema setting** (NOT `\| t`) | This is content, not translation — see `design-to-liquid/references/data-to-settings.md`. Out of `\| t` scope. |
| **Brand-fixed, never-translated** literal (rare — e.g. a brand name) | hardcode | No translation needed; but when in doubt prefer `\| t` |

Rule of thumb: **if the theme owns the words AND a French/German storefront would show different words → `| t`.** If the *merchant* owns the words → schema setting. If neither → hardcode (rare).

## Project locale source layout (NOT the compiled shape)

> [!IMPORTANT]
> You author keys in **`src/locales/NN-<namespace>.json`**, never in `shopify/locales/en.default.json` (that's compiled output — hand-editing it is overwritten on build).

- Files are named `NN-<namespace>.json` — `NN` is a 2-digit ordering prefix, `<namespace>` is the top-level key bucket.
- The build pipeline **merges every file into `shopify/locales/en.default.json`, nesting each file's contents under its `<namespace>`.** The file does NOT contain the namespace wrapper itself.
- So the lookup key is **`<namespace>.<path-inside-the-file>`**.

**Worked example** — `src/locales/10-general.json`:

```json
{
  "password_page": {
    "login_form_heading": "Enter store using password:"
  }
}
```
→ compiles under `general` → referenced in `.liquid` as:
```liquid
{{ 'general.password_page.login_form_heading' | t }}
```

Current namespaces (one per file): `general` (10), `newsletter` (15), `accessibility` (20), `blogs` (25), `onboarding` (30), `products` (35), `templates` (40), `sections` (45), `localization` (50), `customer` (55), `gift_cards` (60), `placeholders` (65). Re-scan `src/locales/` — the set evolves.

## Authoring a `| t` call

```liquid
{{ 'general.cart.title' | t }}                              {# plain lookup #}
{{ 'products.product.items_count' | t: count: cart.item_count }}   {# pluralization #}
{{ 'customer.greeting' | t: first_name: customer.first_name }}     {# interpolation #}
```

- **Interpolation:** pass named args (`| t: name: value`). In the locale value use `{{ name }}` placeholders.
- **Pluralization:** pass `count:`; the locale value must be an object with `one` / `other` (and optionally `zero`/`few`/`many`) keys. Without `count:` no pluralization happens.
- **`_html` suffix = no escaping.** A key whose final segment ends in `_html` is rendered **unescaped** (so it may contain markup like `<a>` or `{{ shopify }}`). A key without `_html` is HTML-escaped. Name accordingly: copy that contains tags → `..._html`; plain text → no suffix. (See `10-general.json` → `password_page.admin_link_html`.)

## Reuse-first — search before adding a key (mandatory)

Mirror the snippet/variant audit philosophy: **a key probably already exists.** Before adding one:

```bash
# search by the literal text or by a likely key fragment
grep -rin "add to cart" src/locales/
grep -rin "quick_view\|quick view" src/locales/
```

If a fitting key exists → use it. Only add a key when none fits.

## Adding a new key

1. Pick the **namespace file** that fits the string's domain (`sections`-level UI → `45-sections.json`; product UI → `35-products.json`; generic chrome → `10-general.json`; a11y-only → `20-accessibility.json`).
2. Nest it under the existing object structure (e.g. a new section's labels under `sections.<section-name>.…`). Keep sibling keys grouped/ordered as the file already is.
3. Use the key in markup as `<namespace>.<path> | t`.
4. The key must resolve at build — a missing key renders as the **key string itself** (or default-locale fallback), which is the usual "why is my button showing `sections.x.y`?" bug.

> Only `en.default.json` is shipped by default here. If/when other locales are added, every referenced key must exist in each shipped locale.

## Anti-patterns

| Anti-pattern | Fix |
| --- | --- |
| Editing `shopify/locales/en.default.json` directly | Edit the `src/locales/NN-<ns>.json` source; build regenerates the compiled file. |
| Wrapping a **schema** label/default in `\| t` | Schema strings are not `\| t` — leave them plain (out of scope). |
| Putting **merchant content** (a heading the merchant edits) behind `\| t` | That's a schema setting, not a translation. |
| Referencing a key that isn't in the locale file | Add it first; missing keys render as the raw key text. |
| Inventing a new key when an equivalent exists | `grep src/locales/` first — reuse. |
| Hardcoding an `aria-label` / `visually-hidden` / functional `alt` | Always `\| t` — a11y strings localise too. |
| Naming a key `_html` for plain text (or omitting `_html` for markup copy) | Suffix controls escaping — match it to whether the value contains tags. |

## Related

- `references/filters.md` § `t` — the bare filter signature
- `references/gotchas.md` § 13 + § 28 — missing-key + pluralization pitfalls
- `design-to-liquid/references/data-to-settings.md` — the *other* branch: merchant content → schema setting
- `polish` skill — a11y strings (consumer of this reference)
