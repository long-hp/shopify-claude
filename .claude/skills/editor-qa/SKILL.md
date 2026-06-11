---
name: editor-qa
argument-hint: "<section/block just ported> | [editor-url]"
description: Use as the LIVE-BROWSER QA pass that drives the real Shopify Theme Editor (the merchant's own logged-in session, via the Playwright extension-mode MCP) to exercise a freshly ported section or block — call it whenever you say "/editor-qa", "test trên editor", "kiểm tra trên editor", "chạy editor test", "drive the editor", "test responsive", "test mobile view", "kiểm tra responsive / mobile", "xem section vừa port chạy thật thế nào", "add block test trên editor", "exercise the settings", or accept the handoff that design-to-liquid prints when a port completes. It adds the section, adds representative blocks, sets fields (text / checkbox / select / range) with sample values, scrolls the preview, toggles desktop↔mobile to check responsive, screenshots both viewports to compare against the design/ source, and reports layout/responsive defects — then ASKS before ever pressing Save (it's the merchant's theme). REQUIRES the Playwright MCP running in `--extension` mode with the "Playwright Extension" installed in Chrome and a logged-in editor tab connected (see references/setup.md); if no browser client is connected it stops and tells the user how to connect rather than guessing. Do NOT use it for static markup a11y/animation/hover review (that's `polish`), for porting a design from scratch (that's `design-to-liquid`), or for auditing/upgrading the .claude system (that's `system-upgrade`).
---

# editor-qa

The **live** finishing check. `polish` reads markup statically; this skill opens the actual Theme Editor in the merchant's browser and *operates* it — adding the section, filling settings, flipping to mobile — so you see the ported unit render for real and catch what only shows up at runtime (responsive breakage, a setting that doesn't wire through, overflow, a block that won't add).

It works because the Playwright MCP runs in **extension mode**: it attaches to a Chrome tab the user has already logged into Shopify with, so there's no auth wall. That same fact is the main constraint — the editor must be open and the tab shared before this skill can do anything.

## 0 · Preflight — confirm a live connection

Before any other step, verify the browser is actually reachable. Call `browser_tabs` (list).

- **Success** → you get a tab list back. Continue.
- **Error** (`Playwright Extension not found`, `No clients are currently connected`, or similar) → **STOP**. The MCP server is up but no browser is attached. Tell the user, in their language:
  1. Open the editor tab in **Chrome** (logged into Shopify admin).
  2. Click the **Playwright Extension** icon (🎭) on that tab → connect / share it.
  3. Then re-run `/editor-qa`.

  Point them at `references/setup.md` if the extension itself isn't installed or `.mcp.json` isn't in extension mode. Never try to brute-force past a missing connection — you'll only produce confusing errors.

## 1 · Resolve the editor target (3-tier, in order)

You need the editor URL for the template that contains the just-ported section. Resolve it in this priority — the first tier that succeeds wins:

1. **Already-connected tab** — if the connected tab is already on a `…/themes/<id>/editor` URL, **use it as-is**. This is the most robust path: the user opened the exact dev theme they want tested, so it's automatically the right one even after a dev-theme ID rotates. Don't navigate away from a good tab.
2. **Saved default** — otherwise read the project's `.editor` file at the repo root: a single line holding the editor URL (`https://<store>.myshopify.com/admin/themes/<id>/editor`). If it exists, `browser_navigate` there.
3. **Ask + offer to save** — if there's no `.editor` file, ask the user for the editor URL. After it works, offer to write it to `.editor` so next time is zero-friction. (Dev-theme IDs rotate when a new `shopify theme dev` session starts — when the saved URL 404s or redirects to the theme list, that's the signal `.editor` is stale; offer to update it.)

After navigating, confirm the session is live: the URL should redirect to `admin.shopify.com/store/<store>/themes/<id>/editor` and the page title reads `… · Edit <theme> · Shopify`. That redirect means the logged-in session is in use.

## 2 · Exercise the unit

This is the core loop. Work against the editor chrome, which lives inside a nested iframe — **read `references/editor-dom.md` first** for how refs, snapshots, and the iframe nesting behave; the rules there (re-snapshot before every click, refs are volatile, snapshots go to a file not into context) are what keep this from thrashing.

**Add the section** (if not already on the template):
- Find the right group's **"Add section"** button (there are many — one per group plus between-section inserts; disambiguate by the group heading that precedes it in the snapshot).
- The **section picker** opens with a *Search sections* box and Sections / Apps tabs. Type the section name, then click the result. Searching beats scrolling.

**Add blocks** (if the section takes blocks):
- Select the section, use **"Add block"**, pick each representative block type. Add a couple so repetition/layout is visible, not just one.

**Set fields** with representative sample values — the point is to see them render, so don't leave defaults everywhere:
- Text / richtext → `browser_type` (default mode fills/replaces the field).
- Checkbox / toggle → click.
- Select → `browser_select_option` (or click → pick).
- Range → set the value.
- After each meaningful change, glance at the preview (screenshot) to confirm it wired through.

**Scroll** the preview to verify the whole section renders top-to-bottom, not just the part in view.

## 3 · Interaction & motion — hover + scroll (deactivate the inspector first)

Rendering correctly is only half of it — the design also has *behavior*: hover states, dropdown/mega-menu reveals, button transitions, scroll-reveal animations (`xo-animate`), sticky headers. Verify these against the design, because they're exactly what static review can't see.

**Critical first move — deactivate the inspector.** By default the editor runs in "inspect" mode (the arrow-cursor toolbar button, blue when active), which lays a **transparent click-to-select overlay over the whole preview**. That overlay swallows pointer events, so any hover/click you send hits the editor's selection layer, not the real storefront content — hover states never fire and you'll wrongly conclude "the hover is broken". So:

- Click the toolbar button named **"Deactivate inspector"** (keyboard `⌘⇧I` is the human hotkey but, like `⌘⌃M`, doesn't fire reliably via `browser_press_key` — use the button). Its name flips to **"Activate inspector"** when off; re-snapshot for the current ref.
- Now hover/scroll reach the real content. **Re-activate it afterwards** so the editor is back in its normal selecting state.

Then exercise the behavior:

- **Hover** interactive elements — nav items with dropdowns/mega-menus, buttons, product cards — and screenshot the hovered state. Confirm the reveal/transition matches the design.
- **Scroll** through the page (not just the section) to trigger scroll-reveal animations and check sticky/parallax behavior.

Preview content lives in a **deeper frame than the editor chrome** — its refs are `f6e*` (the storefront iframe, `iframe[name="1"]` nested inside the editor iframe), not the `f2e*` editor refs. See `references/editor-dom.md`.

## 4 · Responsive — desktop ↔ mobile

Shopify's editor has a built-in mobile preview; use it rather than resizing the browser.

- Toggle mobile by **clicking the toolbar button** whose accessible name is **"Show mobile view"** (phone icon). Don't rely on the `⌘⌃M` keyboard shortcut — it's the editor's human hotkey, but sending it via `browser_press_key` (`Meta+Control+m`) does **not** reliably toggle (the chord lands on the wrong focus/frame). The button is the dependable path; confirm it worked by the URL gaining `&previewMode=mobile`.
- Screenshot the **mobile** viewport.
- Toggle back to **desktop**: the same button's name flips to **"Show desktop view"** (re-snapshot to get its current ref — it's volatile like everything else). Screenshot that too.

You want both so the report can show the same section in each form factor.

## 5 · Compare against the design

Open the matching `design/` source for the section and compare your desktop + mobile screenshots against it. You're checking that the ported unit *matches the intended design at both breakpoints* — spacing, type scale, image behavior, stacking order on mobile.

## 6 · Report

Summarize what you exercised and what you found. Be specific and separate two kinds of issue:

- **editor-qa defects** (this is what the skill exists to catch): content overflow, broken/misaligned layout, a setting that doesn't render or wires to the wrong element, blocks that won't add, a hover/dropdown/animation that doesn't behave like the design, mobile stacking that's wrong or missing.
- **Pre-existing theme bugs** — e.g. a Liquid error in the preview like `Could not find asset snippets/X.liquid`. **Surface it** (the user should know) but don't score it as an editor-qa failure; it's a theme/asset problem, not a defect in how the section was exercised.

Where a defect maps to a fix, name the likely culprit (a missing mobile media wrap in the section SCSS, a schema setting not read in the liquid, etc.) so it can be routed back to the right skill (`scss`, `schema`, `snippet`, `design-to-liquid`).

## 7 · Save discipline — never autonomously

This is the merchant's theme. Changes you make in the editor are **staged but non-destructive until Save is pressed** — the Save button merely darkens to show there's something to commit.

**Do not click Save on your own.** When the pass is done, tell the user what's staged and ask how to proceed: **Save** the changes, **revert** (discard / undo), or **leave as-is** for them to decide in the editor. Wait for their call.

## References

- `references/editor-dom.md` — how the editor DOM behaves: editor-chrome `f2e*` vs preview `f6e*` iframe refs, the inspector overlay (turn it off to test hover/click), why refs change between snapshots, saving snapshots to `.playwright-mcp/qa.md` + grepping for refs (and the bundled `scripts/grep-refs.py` helper), picker search, disambiguating the many "Add section" buttons, the mobile toggle, and worked role-locator examples.
- `references/setup.md` — one-time setup (already done in this project): `.mcp.json` extension mode + token, installing the Playwright Extension in the right Chrome profile, the per-use connect step, and restarting Claude Code after `.mcp.json` edits.

## Bundled script

`scripts/grep-refs.py` — extract element refs from a saved snapshot by label, so you don't hand-roll a parser each pass:

```bash
python .claude/skills/editor-qa/scripts/grep-refs.py <snapshot-file> "Add section" "Heading"
```
