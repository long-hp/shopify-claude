# Picker MCP — Entry Point Protocol

The companion `design/` folder runs a portable **xo-design** preview alongside
Vite. When the user views the design in xo-design's canvas/preview, they can
click a `◎ Pick section` toolbar button → click any `<section>` in the rendered
page → the selection is captured server-side. xo-design exposes that state to
this theme's Claude session via the **`xo-design` MCP server** (configured in
`.mcp.json`), so you don't have to ask "which section?" — the user has already
pointed at it.

## When to consult the picker

**At the entry of any `/design-to-liquid` invocation**, BEFORE Step 1 (survey).
Three triggering patterns:

| User says | What to do |
|---|---|
| `/design-to-liquid` (bare) | Check picker first. If selection → use it. Else → Step 1 survey. |
| `/design-to-liquid làm section này` / `port this one` / `cái này` | The "này / this" is a pointer to the picker. Selection MUST exist; if missing, ask the user to click Pick in xo-design first. |
| `/design-to-liquid hero` / `/design-to-liquid sections/hero` | Explicit name overrides the picker. Skip MCP check. |

Picker presence is a **signal of intent**, not a requirement. Studio-mode
previews (the factory `shopify-design-2/`) don't expose the picker — the MCP
returns 404 there. Treat any error as "no selection" and fall through.

## Tools surface (`xo-design` MCP)

| Tool | Use |
|---|---|
| `mcp__xo-design__get_selection()` | Read the current pick. Returns `{ selection: Selection \| null }`. |
| `mcp__xo-design__select_section({ sectionName, page? })` | Set selection programmatically (when user types the name in chat instead of clicking). |
| `mcp__xo-design__clear_selection()` | Wipe. Call after the section has been ported so the next invocation doesn't accidentally re-process the same one. |

### `Selection` shape

```ts
{
  project: string         // e.g. "design"  (= folder name)
  page: string            // "home"
  pagePath: string        // "src/pages/home.html"  (relative to design root)
  sectionName: string     // "hero"
  sectionDir: string      // "src/sections/hero"     (relative to design root)
  htmlPath: string        // absolute path to the design's hero.html
  scssPath: string | null // sibling .scss; null if no scss exists
  boundingRect?: { x, y, w, h }
  capturedAt: string      // ISO timestamp
}
```

Paths are **absolute on disk** — pass them straight to `Read()`. The base
prefix is xo-design's project root (= `design/` of this theme), auto-detected
at runtime from the xo-design folder location.

## Entry-point algorithm

```
on /design-to-liquid invocation:

  if user message explicitly named a section (e.g. "/design-to-liquid hero"):
    skip picker
    proceed to Step 1 with that name

  else:
    try:
      sel = mcp__xo-design__get_selection()
    catch (mcp unreachable / 404):
      sel = null    # studio mode or xo-design not running

    if sel:
      confirm with user:
        "Convert {sel.page}.{sel.sectionName} → src/sections/{sel.sectionName}/ ?"
        (allow override if wrong)
      proceed to Step 1, but skip "find the section" — read sel.htmlPath +
      sel.scssPath directly

    else if user message contains "này" / "this" / "the one I selected":
      ask: "I don't see a selection in the xo-design picker. Click ◎ Pick
            section in the xo-design toolbar and pick the section first,
            then re-invoke."
      stop

    else:
      proceed with normal Step 1 (survey + ask user what to port)
```

## After porting

Once the new `src/sections/<name>/<name>.liquid` + `schema.js` are written and
the validator passes, **clear the selection**:

```
mcp__xo-design__clear_selection()
```

This:
- Makes the xo-design UI chip disappear → clear signal that work is done.
- Prevents the next `/design-to-liquid` from re-targeting the same section if
  the user invoked it without clicking Pick again.

Optional but recommended.

## Edge cases

- **MCP unreachable** (xo-design not started, port mismatch). Treat as "no
  selection" — never block the user on infra. Mention it once: "xo-design MCP
  unreachable; falling back to manual section discovery."
- **Selection points to a page that doesn't match user's stated intent**
  (e.g. picker has `about-hero` but user typed "make hero"). Confirm: "Picker
  has `about-hero`, but you said 'hero'. Which one?"
- **Selection file path doesn't exist on disk** (design folder was moved /
  pulled). Report + clear stale selection; fall through to manual.
- **Studio-mode preview** (the `shopify-design-2/` factory) — picker tools
  return 404 because they're only registered when `XO_DESIGN_MODE=design`.
  Detect and silently fall through.
