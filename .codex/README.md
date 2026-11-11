# .codex/ — Codex CLI project config

`.claude/` stays the single source of truth. This folder only plugs it into Codex (everything Codex-specific lives here, so `.claude/` holds no Codex rules):

| File | What it is |
|---|---|
| `skills` | Symlink to `../.claude/skills`. Codex lists the theme skills from it once the project is trusted (`$design-to-liquid`, …). Windows clones need `core.symlinks=true`; otherwise AGENTS.md still tells Codex to read `.claude/skills/<name>/SKILL.md`. |
| `hooks.json` | The hooks from `.claude/settings.json`, 1:1 (today: `skill-reminder.cjs` before edits). Each entry runs `hooks/claude-adapter.mjs <.claude script>`. |
| `hooks/claude-adapter.mjs` | Reshapes Codex hook payloads into Claude's (`apply_patch` becomes per-file `Write`/`Edit` with an absolute `file_path`, `request_user_input` and `mcp__xo_design__ask_user_question` become `AskUserQuestion`, `spawn_agent` becomes `Agent`), sets `CLAUDE_PROJECT_DIR`, runs the unchanged script (`.js/.cjs/.mjs` with node, others with bash), and maps the result back. Holds no rules of its own. |
| `config.toml` | **Generated** from the project's `.mcp.json` by `scripts/sync-codex-config.mjs`. `.mcp.json` is project-owned, so this file is not shipped (gitignored in shopify-claude): run `node .codex/scripts/sync-codex-config.mjs` once after installing, and again after changing `.mcp.json` (e.g. the xo-design port). Don't edit it by hand. |
| `scripts/mcp-headers.mjs` | `http_headers_helper` for HTTP MCP servers: prints the headers `.mcp.json` declares, so the `xo-components` token is never copied into `.codex/`. |

## Terminal (`codex` CLI)

1. Trust the project when Codex asks. Project config and hooks only load in trusted projects.
2. Run `/hooks` once and trust the theme's hooks. Codex silently skips untrusted hooks. Trust is stored per hook hash in your `~/.codex/config.toml`, so after any edit to `hooks.json` you must trust them again.
3. MCP: `xo-design`, `xo-components` and `playwright` come from `config.toml`. Same-named servers in `~/.codex/config.toml` are merged field by field, and this file wins. `xo-design` gets `tool_timeout_sec = 1800` because its `ask_user_question` waits for a person; in the terminal it replies that no panel is attached and the agent asks in plain text instead.

## xo-design panel (`design/xo-design`)

No setup needed. Panel threads start with `bypass_hook_trust: true`, so these hooks run without the trust prompt, and the panel passes the `.mcp.json` servers per thread with `xo-design` pointed at its own port. Codex questions arrive as the same question cards as Claude's.
