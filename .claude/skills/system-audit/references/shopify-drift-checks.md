# Shopify drift — topic shortlists

The audit samples 5-8 topics per run across the four Shopify-facing skills. Don't try to cover everything — the goal is high-signal spot checks, not exhaustive sync.

## How to query context7

For each topic below, call:

```
mcp__plugin_context7_context7__query-docs
  query: "<topic phrasing — see examples below>"
  library: "/shopify/dev" or similar Shopify doc library
```

If unsure which library to use, first call `mcp__plugin_context7_context7__resolve-library-id` with the topic to find the right one. Common library IDs for Shopify theme work:

- `/shopify/dev/docs/api/liquid` — Liquid reference
- `/shopify/dev/docs/storefronts/themes` — theme architecture, sections, blocks
- `/shopify/dev/docs/storefronts/themes/store/requirements` — Theme Store rules

## Topic shortlist per skill

Pick 1-3 topics per skill per audit run. Rotate over time so coverage is gradually broad. The "freshness" note flags topics with known recent churn.

### `liquid` skill

| Topic | Example query | Freshness |
|-------|---------------|-----------|
| Filter list | "list of liquid filters with examples" | rotating |
| `inline_richtext` / `richtext` allowed tags | "inline_richtext vs richtext setting type allowed HTML tags" | medium churn |
| `image_url` filter params | "image_url filter parameters and supported transformations" | medium churn |
| Pagination | "paginate tag rules and limits in liquid sections" | low churn |
| Section render isolation | "render tag scope isolation rules for sections vs snippets" | low churn |
| `localization` object | "localization object properties for country, currency, language" | high churn (markets API) |
| `predictive_search` | "predictive_search object structure and resources" | medium churn |
| New / experimental tags | "experimental or newly released liquid tags" | high churn (open-ended) |

Local material to compare against: `.claude/skills/liquid/references/idioms.md`, `gotchas.md`, body of `SKILL.md`.

### `schema` skill

| Topic | Example query | Freshness |
|-------|---------------|-----------|
| Settings field types | "section schema setting input types complete list" | medium churn |
| `select` / `radio` option limits | "max number of options for select setting type" | low churn |
| Color schemes | "color_scheme and color_scheme_group setting types" | high churn |
| Block schema | "section blocks schema with type and limit" | medium churn |
| Theme blocks | "theme blocks vs section blocks differences" | high churn (active area) |
| Preset values | "section preset settings and blocks JSON shape" | medium churn |
| `inline_richtext` constraints | (same as liquid skill — cross-referenced) | medium churn |
| Range setting bounds | "range setting min max step rules" | low churn |
| Visible conditions | "settings visible_if conditional visibility expression syntax" | medium churn |

Local material: `.claude/skills/schema/references/*.md`, `src/snippets/_base/input-settings/`.

### `scss` skill

| Topic | Example query | Freshness |
|-------|---------------|-----------|
| Theme Store CSS performance rules | "theme store requirements CSS bundle size and performance" | medium churn |
| Asset URL filters | "asset_url and asset_img_url filters in stylesheets" | low churn |
| Sass deprecation in Shopify themes | "sass support in shopify themes preprocessing" | low churn |

Note: most SCSS knowledge is project-internal (BaseHTML framework), so drift exposure is small. Focus drift checks on Shopify-imposed constraints.

Local material: `.claude/skills/scss/references/*.md`.

### `xo-css` skill

| Topic | Example query | Freshness |
|-------|---------------|-----------|
| Theme Store CSS performance | (same as scss — cross-referenced) | medium churn |

XO-CSS is a project-local framework — drift exposure is minimal. Most audits skip this skill entirely.

Local material: `.claude/skills/xo-css/references/*.md`.

## Recording findings — evidence template

For each topic checked, record one of three outcomes:

1. **up-to-date** — skill content matches current shopify.dev. No finding emitted.
2. **drift (additive)** — shopify.dev has new material the skill doesn't cover, but existing skill content is still correct. Severity: minor.
3. **drift (incorrect)** — skill content contradicts shopify.dev or recommends deprecated patterns. Severity: major (or critical if it would cause editor errors).

Finding template:

```
Skill: <name>
Topic: <topic-from-shortlist>
Outcome: drift-additive | drift-incorrect
Evidence:
  - URL: <shopify.dev URL from context7 response, if any>
  - Quote: "<short quoted text from context7 result>"
Local material:
  - File: <skill ref path>
  - Line / section: <if knowable>
Severity: critical | major | minor
Suggested patch summary: <one line>
```

**If you cannot produce a URL or quoted-text evidence, DO NOT emit the finding.** The whole value of this category is verifiable drift detection — vibes-only findings would erode user trust in the report.

## Topic budget discipline

5-8 topics total per audit run. Distribution suggestion:

- `liquid`: 3 topics
- `schema`: 3 topics
- `scss`: 1 topic (optional)
- `xo-css`: 1 topic (optional, usually skip)

If the user named specific topics in their audit request, allocate the budget to those first, then fill with rotation choices.
