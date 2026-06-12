# Setup — Playwright extension mode against a logged-in editor

This is the one-time wiring that lets the agent drive the **merchant's own logged-in** Theme Editor instead of a fresh headless browser (which would hit Shopify's admin login wall). It's **already done in this project** — this doc exists so a future contributor, or you on a new machine, can reproduce or repair it.

## Why extension mode

The default Playwright MCP launches its own headless Chromium with no Shopify session → every admin URL bounces to login. Extension mode instead **attaches to a tab in the Chrome you're already logged into**. No re-auth, and you operate the exact dev theme you have open.

## The pieces

### 1. `.mcp.json` — extension mode + token

The `playwright` server runs with the `--extension` flag and a token in `env`:

```json
"playwright": {
  "command": "npx",
  "args": ["@playwright/mcp@latest", "--extension"],
  "env": {
    "PLAYWRIGHT_MCP_EXTENSION_TOKEN": "<token-from-the-extension-page>"
  }
}
```

- `--extension` tells the MCP server to wait for a browser extension to connect rather than launching its own browser.
- `PLAYWRIGHT_MCP_EXTENSION_TOKEN` **bypasses the per-connect approval dialog**. The token is shown on the extension's connect page; if you reinstall the extension or regenerate it (the ⟳ button on that page), update this value.
- The token is local to your machine's extension instance — not a high-value secret, but it does live in the checked-in `.mcp.json`, so treat it like any local dev token.

### 2. The Chrome extension

Install **"Playwright Extension"** (mask icon 🎭, by the Playwright team) from the Chrome Web Store, into the **Chrome profile you actually use to log into Shopify admin**.

- It must be in **Chrome's** profile. If you log into Shopify in **Arc** or another Chromium browser, the extension lives there instead — and you must point the MCP at that browser with `--executable-path` + `--user-data-dir` (e.g. Arc: `/Applications/Arc.app/Contents/MacOS/Arc` and `~/Library/Application Support/Arc/User Data`). Simplest is to keep the Shopify login and the extension in plain Chrome.

### 3. Disable Chrome's Local Network Access Checks

Set `chrome://flags/#local-network-access-check` to **Disabled** and **relaunch Chrome** (a working Chrome shows `--disable-features=LocalNetworkAccessChecks` in its launch flags). In your everyday Chrome this flag matters for **two** things:

1. The extension can connect to the MCP — it reaches the relay over a **localhost websocket** (`ws://[::1]:<port>/extension/…`), which Local Network Access Checks otherwise blocks/prompts.
2. The editor's **storefront-preview iframe actually renders** — with the check on, the preview comes up blank. This is Shopify-side behaviour; the exact mechanism is unclear, but empirically disabling the flag is what makes the preview show.

Caveat on scope: this is about **your everyday Chrome** (extension-mode editor-qa). A native `@playwright/test` run uses Playwright's own bundled Chromium, which in practice rendered the editor preview iframe fine without touching this flag — so the native e2e path isn't gated on it.

### 4. Per-use connect step

Every working session:

1. Open the editor tab in Chrome (logged into Shopify admin).
2. Click the **Playwright Extension** icon 🎭 on that tab → **connect / share** it.
3. Now `/editor-qa` (and any `browser_*` tool) operates that tab.

Only one tab is attached at a time — to test a different tab, click the extension and switch.

### 4. After any `.mcp.json` change — restart

The MCP server reads `.mcp.json` only at startup, so **restart Claude Code** after editing it. Until you do, the old config (e.g. `--headless`) is still live and the connection will fail.

## Quick repair checklist

| Symptom | Fix |
| --- | --- |
| `Playwright Extension not found in <path>` | Extension installed in a different browser/profile than the MCP points at — install it in Chrome, or set `--executable-path`/`--user-data-dir` to the right browser. |
| `No clients are currently connected` | The MCP is up but no tab shared — click the extension icon on the editor tab and connect. |
| Extension won't connect, or the editor **preview iframe is blank** | Chrome's Local Network Access Checks is enabled — set `chrome://flags/#local-network-access-check` to Disabled and relaunch Chrome (see § 3). |
| Connection prompt every time | `PLAYWRIGHT_MCP_EXTENSION_TOKEN` missing/stale in `.mcp.json` — copy the current token from the extension page. |
| Config edits seem ignored | Claude Code wasn't restarted after the `.mcp.json` change. |
| Admin URL bounces to login | Not actually in extension mode (still headless), or the shared tab's Chrome isn't logged into that store. |
