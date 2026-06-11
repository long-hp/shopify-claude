# Editor DOM — how to drive the Shopify Theme Editor reliably

The Theme Editor is a React app rendered inside nested iframes. That shapes everything about how you locate and click things. These are the rules that came out of actually driving it; ignore them and you'll chase stale refs and dump 60KB snapshots into context.

## Iframe nesting — editor is `f2e*`, preview is `f6e*`

The editor chrome (sidebar, panels, toolbar) lives in a **nested iframe**, so every editor element ref is prefixed `f2e…` (frame 2), not the top-level `e…`.

The **storefront preview** is a *further* iframe nested **inside** the editor iframe — `iframe[name="1"]` — and its elements carry a different ref prefix, **`f6e*`**. So a nav link in the rendered page reads `f6e122`, while the editor's "Add section" button is `f2e169`. When you want to interact with the *rendered output* (hover a menu, click a card), you're targeting `f6e*` refs; when you operate the *editor UI* (pickers, settings, toolbar) you're on `f2e*`. Don't expect a single flat ref space — and the hover/click won't even reach `f6e*` content until you turn off the inspector (next section).

## Inspector overlay — turn it OFF to test interaction

The editor's default "inspect" mode (the arrow-cursor toolbar button, blue when active) lays a **transparent click-to-select overlay across the entire preview**. Its job is to let a human click anywhere in the page to select the corresponding section/block. The side effect: that overlay **intercepts every pointer event**, so hovers and clicks you dispatch hit the selection layer instead of the real storefront content. Hover states and dropdowns never fire, and you'd wrongly report them broken.

Before any hover/scroll interaction test, click the toolbar button **"Deactivate inspector"** (name flips to **"Activate inspector"** when off; `⌘⇧I` is the human hotkey but doesn't fire via `browser_press_key` — use the button). With it off, `f6e*` preview elements respond to real hover/click. **Re-activate it when you're done** so the editor returns to normal section-selecting behavior.

Verified live: inspector on → hovering a nav dropdown does nothing; inspector off → the same hover opens the mega-menu.

## React ⇒ refs are volatile

Element refs change between snapshots because React re-renders. **Take a fresh `browser_snapshot` immediately before each click**, and never reuse a ref you captured before an intervening action (a click, a navigation, a panel open). A ref from two steps ago is very likely pointing at nothing — or worse, the wrong element.

The healthy rhythm is: snapshot → find the ref you need → act → snapshot again → act. One snapshot per action, not one snapshot for a whole plan.

## Snapshots are huge — save to file, grep, don't inline

A full editor snapshot is ~60KB. Pulling that into context every step is wasteful and noisy. Use the snapshot's **`filename`** parameter to write it to disk, then grep for the labels you need.

**Always namespace the file under `.playwright-mcp/` and reuse one name** — a bare `filename: "panel.md"` lands in the **repo root** (cwd), not the MCP output dir, so it litters the project and isn't gitignored. Passing `.playwright-mcp/qa.md` keeps every pass in one scratch file alongside the screenshots:

```
browser_snapshot(filename: ".playwright-mcp/qa.md")
```

Then either grep directly:

```bash
grep -nE "Add section|Heading|Add block" .playwright-mcp/qa.md
```

…or use the bundled helper, which pulls the `[ref=…]` token together with the role+name so you don't hand-roll a parser:

```bash
python .claude/skills/editor-qa/scripts/grep-refs.py .playwright-mcp/qa.md "Add section" "Heading"
```

(Reusing `qa.md` means each snapshot overwrites the last — which is what you want, since old refs are stale anyway. If `.playwright-mcp/` isn't gitignored yet in this project, add it.)

## Disambiguating the many "Add section" buttons

"Add section" appears **many times** in one snapshot — once per section group (Header, Template, Footer, Overlay, Popup Group…) plus the between-section insert points. They all have the same accessible name, so the ref alone is ambiguous.

Resolve it by the **group heading that precedes the button** in the snapshot order. Example shape:

```
- heading "Template" [level=3] [ref=f2e308]
- button "Add section" [ref=f2e316]     ← this one belongs to Template
- button "Featured product" [ref=f2e320]
```

So: grep for the headings and the buttons together, find the heading you want, take the next `Add section` ref after it.

## Pickers have a search box — search, don't scroll

The section picker and the add-block picker both open with a search field (e.g. *Search sections*) and Sections / Apps tabs. Type the name and click the result rather than scrolling a long list — it's faster and the ref is unambiguous.

## Mobile view

**Click the toolbar button** whose accessible name is **"Show mobile view"** (phone icon). It's the only reliable toggle — the editor's `⌘⌃M` hotkey works for a human, but `browser_press_key("Meta+Control+m")` does **not** fire it through the MCP (the key event lands on the wrong frame/focus and nothing happens — verified in a live run). A select/edit-mode toggle sits next to the phone icon; don't confuse them.

The button is a **toggle whose name flips**: in desktop it reads "Show mobile view"; once in mobile it reads "Show desktop view" — so re-snapshot to get the current ref before clicking back. Confirm the state by the URL: mobile adds `&previewMode=mobile`, desktop drops it.

Screenshot mobile, then toggle back to desktop and screenshot again.

## Liquid errors in the preview are theme bugs

If the preview renders something like `Liquid error (sections/image-banner line 14): Could not find asset snippets/img-banner.liquid`, that's a **pre-existing theme/asset problem**, not something your editor actions caused. Report it so the user knows, but don't treat it as an editor-qa failure — the setting values can still be correct even when the preview can't render them.

## Save button

The **Save** button darkens (activates) as soon as any change is staged. Staged edits are **non-destructive until Save is pressed** — so you can exercise freely, and nothing is committed to the merchant's theme until someone clicks Save. Per the skill, that someone is never you autonomously.

## Worked locator examples

Once you have the right ref, `browser_click` with the `f2e…` ref works directly. Under the hood Playwright resolves role-based locators inside the editor iframe, e.g.:

```js
// Picking a section from the picker
getByRole('button', { name: 'Image banner' }).click()

// Filling a setting field
getByRole('textbox', { name: 'Heading' }).fill('Xin chào từ Claude 👋')
```

You don't write these by hand — you pass the snapshot ref to `browser_click` / `browser_type` and the MCP generates the locator — but knowing the shape helps when you read back the generated code or need to disambiguate two fields with similar names (the `name` comes from the visible label / aria, so a field labelled "Heading" resolves by that exact text).
