# shopify-claude

Portable **`.claude/` agent system** for porting HTML designs into a Shopify Liquid theme with Claude Code.

This repository is **only the agent layer** — AGENT.md, 13 skills, the skill-reminder hook, and settings, plus a thin bridge (`AGENTS.md` + `.codex/`) so the Codex CLI runs the same skills and hook. It is kept in its own repo for versioning, then pulled into a real Liquid project where `design/`, `src/`, and `shopify/` live.

## What's inside

```
.claude/
├── AGENT.md            # the contract Claude reads first (philosophy, conventions, anchor map)
├── README.md           # full system docs (English)
├── README.vi.md        # full system docs (Tiếng Việt)
├── settings.json       # model pin, plugins, hook registration
├── hooks/
│   └── skill-reminder.cjs   # PreToolUse nudge: right skill by file path on every Edit/Write
└── skills/             # 13 skills (planner, design-to-liquid, design-sync, polish,
                        #   liquid, snippet, schema, scss, xo-css, liquid-doc, git,
                        #   extract-icon, system-audit)
AGENTS.md               # Codex entry file: points Codex at .claude/AGENT.md (no rules of its own)
.codex/
├── skills -> ../.claude/skills   # symlink: Codex lists the same skills
├── hooks.json          # the .claude/settings.json hooks, run through the adapter below
├── hooks/claude-adapter.mjs      # reshapes Codex hook payloads into Claude's
├── scripts/            # sync-codex-config.mjs (.mcp.json -> config.toml), mcp-headers.mjs
└── README.md
```

## Install into a Liquid project

From the root of your Shopify Liquid project:

```bash
# one-time
git clone <this-repo-url> .claude

# updating later
git -C .claude pull
```

Then point the project's `CLAUDE.md` at the agent entry file:

```md
@.claude/AGENT.md
```

For Codex, also copy `AGENTS.md` and `.codex/` to the project root (keep the `.codex/skills` symlink), then generate its MCP config from the project's `.mcp.json`:

```bash
node .codex/scripts/sync-codex-config.mjs
```

Details (trusting hooks via `/hooks`, the xo-design panel): [.codex/README.md](./.codex/README.md).

On the next Claude Code session the agent reads `CLAUDE.md → .claude/AGENT.md`, then the `planner` skill seeds/reads `.agent-state/` and tells you what to do next.

> Note: `.agent-state/`, `.mcp.json`, `design/`, `src/`, and `shopify/` are **project-owned**, not part of this repo. They are created/owned by the host Liquid project.

## Docs

- **[.claude/README.md](./.claude/README.md)** — full system documentation (layers, the 13 skills, validator + commit workflows, project lifecycle).
- **[.claude/README.vi.md](./.claude/README.vi.md)** — bản tiếng Việt đầy đủ.
- **[.claude/AGENT.md](./.claude/AGENT.md)** — the working contract Claude follows on every change.
