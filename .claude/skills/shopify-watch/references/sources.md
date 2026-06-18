# shopify-watch — Sources

Curated, **theme-filtered** source list for the radar scan. Prefer primary sources (shopify.dev, Dawn GitHub) over secondary (blog posts). Cite URL + date-accessed for every kept item.

## Primary — themes / Liquid

- **Shopify.dev changelog** — `https://shopify.dev/changelog` — THE primary source. Filter to **Themes** / **Liquid** entries (the changelog spans the whole platform; most of it is app/API and goes to the ignored tail).
- **Shopify Editions** — `https://www.shopify.com/editions` — biannual product launches (Summer ~Jun, Winter ~Jan). The headline "what's new" — but read each item through the theme/app filter.
- **Themes docs** — `https://shopify.dev/docs/storefronts/themes` — theme architecture, section schemas, theme settings. Watch for new capabilities + deprecations.
- **Liquid reference** — `https://shopify.dev/docs/api/liquid` — new objects / filters / tags. context7 library: `/websites/shopify_dev_api_liquid` (use for doc-level confirmation).
- **Dawn releases** — `https://github.com/Shopify/dawn/releases` — the reference theme; release notes reveal new best-practice patterns + section conventions.
- **Horizon** — `https://github.com/Shopify/horizon` — the newer reference theme; check for patterns Dawn doesn't have yet.
- **Theme Store requirements** — `https://shopify.dev/docs/storefronts/themes/store/requirements` — when these rules change they affect our `.claude/skills/design-to-liquid/references/theme-store-requirements.md`.

## Secondary

- **Shopify Partners / dev blog** — `https://www.shopify.com/partners/blog` — announcements, context, trend framing. Confirm anything actionable against a primary source.
- **Accessibility** — `https://www.shopify.com/accessibility` — EAA / WCAG context for storefront a11y rules.

## Research rules

- **Primary > secondary.** Cite URL + date-accessed on every kept item.
- **Cross-check 2+ sources** before treating a non-trivial claim as real.
- **Recency:** a source < 6 months old = current; > 1 year = may be stale, verify it still stands.
- **Evidence or drop:** no citation → the item doesn't go in the digest. "Nothing theme-relevant since `<window>`" is a valid, useful result.

## Shopify change → which of our skills it likely touches

| Shopify change | Likely touches |
| --- | --- |
| New Liquid object / filter / tag; render-scope or `paginate`/`image_url` rule change | `liquid` (`references/{objects,filters,tags,gotchas}.md`) |
| New / changed section or block **schema** setting type; preset / default rules | `schema` (+ `validate-schema.py` rule set) |
| Theme Store requirement / label-hygiene rule change | `.claude/skills/design-to-liquid/references/theme-store-requirements.md` |
| New Dawn / Horizon section archetype or pattern | `design-to-liquid` references (sections / components) |
| Storefront CSS capability / design-token change | `scss` / `xo-css` |
| New theme-editor capability (blocks, app-block slots, settings) | `schema` / `design-to-liquid` block strategy |

This is a routing **hint** for the `/system-upgrade` handoff — `system-upgrade` confirms whether our skill is actually stale (its Step 2 drift check), then routes any edit to `skill-creator`.
