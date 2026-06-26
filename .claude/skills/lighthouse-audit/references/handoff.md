# lighthouse-audit — handoff map

This skill **reports and routes**; it fixes nothing. Each failing audit is mapped to the skill that owns the fix. Present a HANDOFF block at the end of the digest grouping failing audits by destination.

## Routing table

| Failing audit (examples by `audit id`) | Category | Route to | Why there |
|------------------------------------------|----------|----------|-----------|
| `color-contrast` | A11y | **`polish`** (+ note: rendered-DOM contrast — verify against the design's intended palette) | polish owns markup/contrast a11y fixes |
| `image-alt`, `input-image-alt`, `aria-*`, `label`, `link-name`, `button-name`, `heading-order`, `list`, `landmark-*`, `document-title` (a11y) | A11y | **`polish`** | alt text, aria-label, label association, heading order, landmarks are polish's a11y checklist items |
| `uses-responsive-images`, `uses-optimized-images`, `modern-image-formats`, `efficient-animated-content`, `image-size-responsive` | Perf (theme-owned) | **`design-to-liquid`** | image sizing via `image_url` width/height + `loading`/`fetchpriority`; this is core port work |
| `unsized-images`, `layout-shift-culprits` / high **CLS** | Perf (theme-owned) | **`design-to-liquid`** | add width/height (or aspect-ratio) so the browser reserves space |
| `render-blocking-resources`, `unused-css-rules`, `unminified-css`, `unused-javascript` pointing at **theme** assets | Perf (theme-owned) | **`design-to-liquid`** (+ build pipeline) | theme CSS/JS delivery; may also be a build-config concern |
| `lcp-lazy-loaded`, slow **LCP** element = a hero/banner image | Perf (theme-owned) | **`design-to-liquid`** | don't lazy-load the LCP image; set `fetchpriority="high"` and correct size |
| Any perf audit whose offending resources are **third-party / app / Shopify-injected** | Perf (app/platform) | **flag only — NOT a theme skill** | app scripts depress the score and aren't fixable from `src/` (see `thresholds.md`) |
| `errors-in-console`, `deprecations`, `doctype`, `geolocation-on-start`, `image-aspect-ratio`, insecure requests | Best Practices | **flag with the Lighthouse audit description**; if it traces to theme markup/JS, suggest `design-to-liquid` | usually small, sometimes app-caused |
| `meta-description`, `document-title`, `link-text`, `crawlable-anchors`, `hreflang`, `is-crawlable`, `tap-targets` | SEO | **flag with shopify.dev/Lighthouse reference**; theme-template fixes → `design-to-liquid` (e.g. meta in `theme.liquid`/templates) | many SEO items are template/markup; some are store-admin settings |

## Runtime-only a11y note

Lighthouse audits the **rendered** DOM, so it can catch a11y issues `polish` (static markup) cannot — most notably **`color-contrast`** (needs computed colours) and roles that only exist after JS runs. When routing these to `polish`, flag them as **"runtime-detected"** so the polish pass knows to verify against the live render / design palette, not just the `.liquid` source.

## Handoff block format (put at the end of the digest)

```markdown
## Handoff

**→ polish** (static markup a11y):
- color-contrast (runtime-detected) — hero CTA text on banner
- image-alt — 3 images missing alt

**→ design-to-liquid** (image/markup perf):
- uses-responsive-images — product grid images served oversized
- unsized-images / CLS 0.21 — reserve space on collection cards

**Flag only — app/platform (not theme-owned):**
- render-blocking-resources — `reviews-app.example.com/widget.js`

**Flag only — SEO/Best-Practices (reference):**
- meta-description missing on /products/* template
```

Keep it scannable. The user decides what to act on; this skill just makes the next step obvious.
