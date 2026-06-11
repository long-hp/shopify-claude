---
name: liquid-doc
description: MUST be invoked (via Skill tool) BEFORE writing or updating any `{% comment %}` doc-block at the top of a snippet file in `src/snippets/`. Doc-block is the snippet's only API contract — wrong/missing param documentation = future callers misuse the snippet silently. Memory of JSDoc-style conventions is incomplete — agent skip = missing `@param`, mis-typed type tags, forgotten optional/default syntax. Covers the `@param` syntax, type tags (`{string}`/`{boolean}`/`{number}`/`{object}`/`{array}`/`{image}`), required vs `[optional=default]` parameter form, and the two patterns for snippets with vs without schema settings (pure-param vs context-pattern). Every modification to a snippet body's accepted parameters (snippet skill rule territory) requires a matching doc-block update.
---

# Liquid Doc

Standard format for documenting snippet parameters at the top of every snippet file.

## Rules

1. **Type annotation** — JSDoc-style: `{string}`, `{boolean}`, `{number}`, `{object}`, `{array}`
2. **Optional parameters** — wrap the name in square brackets: `[param_name]`
3. **Required vs optional** — mark with `(required)` or `(optional)`
4. **Default values** — always document defaults inside the brackets: `[param=default_value]`
5. **Language** — write descriptions in **English** for consistency across the codebase

## Type Reference

| Type        | Description       | Example                  |
| ----------- | ----------------- | ------------------------ |
| `{string}`  | Text value        | `'Hello'`, `'primary'`   |
| `{boolean}` | True/false        | `true`, `false`          |
| `{number}`  | Numeric value     | `42`, `3.14`             |
| `{object}`  | Liquid object     | `product`, `collection`  |
| `{array}`   | Liquid array      | `collection.products`    |

## Authoring Workflow

### Step 1 — Inspect the snippet

Before writing the doc, answer:

- What is the snippet's name?
- What does it do (one sentence)?
- What parameters does it accept?
- Does it have its own `schema.js` (settings)?

### Step 2 — Pick the right template

Use **Case 1** if the snippet has no schema settings, **Case 2** if it does (a schema-bearing snippet always receives a `context` object — the parent `section` or `block`).

#### Case 1 — Snippet without schema settings

```liquid
{% comment %}
  [Snippet Name]

  [One-line description of what the snippet does]

  @param {type} param_name - Description (required)
  @param {type} [optional_param=true] - Description (optional)

  @example
  {% render 'snippet-name',
    param_name: 'value',
    optional_param: true
  %}
{% endcomment %}
```

#### Case 2 — Snippet with schema settings

```liquid
{% comment %}
  [Snippet Name]

  [One-line description of what the snippet does]

  @param {object} context - Section or block object containing settings (required)
  @param {type} [optional_param=true] - Description (optional)

  Available settings:
  - setting_1 {type}: Description (required)
  - setting_2 {type}: Description (optional)

  @example
  {% render 'snippet-name',
    context: block
  %}
  {% render 'snippet-name',
    context: section
  %}
{% endcomment %}
```

## Tips

- The `@example` block is mandatory — it doubles as a usage smoke test for reviewers.
- For Case 2, list every setting the snippet reads from `context.settings.*`. If you only read a subset, document only that subset.
- Keep the one-line description action-oriented: "Renders…", "Outputs…", "Wraps…".
