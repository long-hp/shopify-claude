# lighthouse-audit — setup & running

## Prerequisites (verified on this machine)

- **Google Chrome** installed (`/Applications/Google Chrome.app`). Lighthouse drives a headless Chrome.
- **Node + npx** (`node --version` → v24.x). Lighthouse itself is **not installed** — `npx --yes lighthouse` fetches it on demand, so nothing pollutes the repo.

If `npx --yes lighthouse --version` fails the first time, it's usually the npm download — re-run once. If Chrome can't launch, the wrapper passes `--headless=new --no-sandbox`; on locked-down machines you may need to drop `--no-sandbox`.

## The target must be a STOREFRONT URL

Lighthouse measures a rendered page. The repo's `.editor` file points at the **admin Theme Editor** (`…/admin/themes/<id>/editor`) — that's behind login and is **not** a valid target. The wrapper refuses any URL containing `/admin/` or `/editor`.

Valid targets:

| Source | URL shape | Notes |
|--------|-----------|-------|
| **Theme preview** (unpublished theme) | `https://<store>.myshopify.com/?preview_theme_id=<THEME_ID>` | The theme id is the number in the `.editor` URL. Best for auditing a port before it goes live. Append a path for inner pages: `/products/<handle>?preview_theme_id=<id>`. |
| **Published storefront** | `https://<store>.myshopify.com/<path>` or the custom domain | Audits the live theme. |

The **user supplies the finished URL each run** — this skill is stateless and never hardcodes a store or reads `.editor` as the target.

### Password-page caveat (dev/preview stores)

Development and unpublished stores are often behind a **storefront password**. Lighthouse will then audit the *password splash page*, not the real content — the scores are meaningless. Symptoms: suspiciously tiny DOM, Performance ~100, every content/SEO audit empty.

If you suspect this, tell the user and ask them either to (a) give a `preview_theme_id` URL **with the storefront password disabled**, or (b) provide a public URL. Don't report scores off a password page.

## Running

Use the bundled wrapper (runs **both** mobile and desktop by default — Shopify perf is mobile-weighted, but merchants care about both):

```bash
bash .claude/skills/lighthouse-audit/scripts/run-lighthouse.sh "<storefront-url>" .lighthouse both
```

- Arg 1: URL (required).
- Arg 2: output dir (default `./.lighthouse`).
- Arg 3: `mobile` | `desktop` | `both` (default `both`).

It writes `<stem>-<formfactor>.report.json` and `.report.html` into the output dir and prints the JSON paths on the final stdout lines. Then compact them:

```bash
python .claude/skills/lighthouse-audit/scripts/parse-report.py \
  .lighthouse/<stem>-mobile.report.json \
  .lighthouse/<stem>-desktop.report.json --pass 90
```

The parser emits a small text summary (scores + metrics + top failing audits by weight) — paste that into the digest rather than loading the multi-MB JSON.

## Output files & git

Reports land in `.lighthouse/` by default. They're throwaway artifacts — **don't commit them**. If `.lighthouse/` isn't already ignored, suggest adding it to `.gitignore` (the skill itself writes nothing else and keeps no ledger). The shareable HTML report path is worth surfacing to the user so they can open the full interactive report in a browser.

## Auditing several pages

Lighthouse scores one URL at a time. For a representative read, run home + a product page + a collection page and report them as separate blocks. Ask the user which paths matter if they only gave a base URL.
