# Liquid hook

Keep the schema in one snippet so the layout stays clean. Follow the theme's snippet conventions (folder-per-snippet
in this theme family — consult the `snippet` skill for the exact shape and the `{% comment %}` header).

## Snippet (e.g. `src/snippets/xo-theme-settings/xo-theme-settings.liquid`)

```liquid
{%- comment -%}
  Demo-store customizer panel (<xo-theme-settings>). Schema reference: .claude/skills/theme-settings.
  Edit the JSON below; keep it valid JSON. Images may be SVG data URIs or screenshot URLs.
{%- endcomment -%}
{%- capture xo_ts_schema -%}
{
  "title": "Customize",
  "button": { "label": "Customize", "position": "bottom-right" },
  "groups": [ … ]
}
{%- endcapture -%}
{%- liquid
  assign xo_ts_label = 'Customize'
  assign xo_ts_position = 'bottom-right'
-%}
<xo-theme-settings xo-schema="{{ xo_ts_schema | strip_newlines | escape }}" xo-preload="idle">
  {%- comment -%} paste assets/static-button.liquid here (static <style> + <button class="xo-ts-fab">) {%- endcomment -%}
</xo-theme-settings>
```

`xo-preload`: `idle` (default — load on button hover/focus/click or when idle ~3.5 s after `load`), `interaction`
(only on hover/focus/click), `eager` (right away). Visitors with saved (applied) values always load right away so
their swaps apply early. Keep `xo_ts_label` / `xo_ts_position` in sync with `button.label` / `button.position` in the
schema so the static button and the loaded panel match (no visual jump).

`| escape` is mandatory: the JSON contains double quotes that would otherwise end the attribute. `strip_newlines`
keeps the attribute on one line. SVG data URIs are already percent-encoded by `scripts/thumb.mjs`, so they survive
`escape` unchanged.

## Layout (`src/layout/theme.liquid`, just before `</body>`)

Pick the guard agreed in the interview:

```liquid
{%- unless request.design_mode -%}
  {%- if settings.theme_settings_enable -%}        {%- comment -%} option A: theme setting (recommended) {%- endcomment -%}
    {% render 'xo-theme-settings' %}
  {%- endif -%}
{%- endunless -%}
```

- Option B — only on a given store: `{%- if shop.permanent_domain == 'my-demo.myshopify.com' -%}`.
- Option C — always (still keep `unless request.design_mode`).

Option A needs a checkbox in the theme's global settings (e.g. a new entry in `src/config/global-schema/` via the
`schema` skill): `{ "type": "checkbox", "id": "theme_settings_enable", "label": "Show demo customizer", "default": false }`.

The element must come after the `xo-critical` / `xo-webcomponents` scripts are referenced (they are in `<head>` in
this theme), and the loader must be in the bundle: `src/theme-settings-loader.ts` imported from `src/main.ts`
(`import "./theme-settings-loader";`); `src/theme-settings.ts` sits next to it (lazy chunk, not imported statically).
