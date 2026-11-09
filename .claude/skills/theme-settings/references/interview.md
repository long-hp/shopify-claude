# Interview question bank

Ask only what the request + audit leave open. 2–4 questions per `AskUserQuestion` round, recommended option first,
in the user's language. Skip a question when the audit already answers it (state the answer instead).

## Scope
- **Which areas can visitors change?** (multi-select) Header · Footer · Announcement bar · Hero / other home
  sections · Colors · Corner radius · Fonts · Button style · Dark mode · Show/hide sections · Presets · Links to other
  demo stores.

## Section swaps (per area)
- **Which variants?** List variant section ids found in the audit; let the user pick. If none exist: "Build variant
  sections first (recommended), or add placeholders you'll create later?" — placeholders must be clearly marked in
  the hand-off because they 404 until built.
- **Labels and thumbnails**: auto SVG thumbnails (recommended, replace with screenshots later) vs. screenshot URLs now.

## Global controls
- **Corner radius**: expose all theme values (recommended) or a subset; default = current theme setting.
- **Accent color**: which CSS variable (from audit) and which swatches (brand palette? ask for hex codes; don't invent).
- **Fonts**: only font stacks the theme already loads (recommended) vs. adding web fonts (extra requests).

## Presets & links
- **Presets** (one click applies several values): names + values per preset.
- **Other demo stores** (`link` cards): URLs, labels, open in new tab?, keep the current path (`keep: true`)?

## Placement & behaviour
- **When to show the panel**: only when a theme setting is on (recommended — add a checkbox in the theme's global
  settings) · only on a specific store domain (`shop.permanent_domain == '…'`) · always.
  Always wrap in `{% unless request.design_mode %}` (recommended) so it never runs inside the theme editor.
- **Button**: label, position (`bottom-right` default · `bottom-left` · `middle-right` · `middle-left` · `top-right` ·
  `top-left`).
- **Drawer**: non-blocking (no overlay, page scrolls — recommended for live preview) vs. overlay + scroll lock.
- **Footer buttons**: labels for Reset / Apply (defaults "Đặt lại" / "Áp dụng" — localise to the store language).
- **Panel language**: visible labels in which language?
