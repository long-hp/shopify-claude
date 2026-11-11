#!/usr/bin/env node
// sync-codex-config.mjs: generate .codex/config.toml (Codex CLI's project config) from .mcp.json.
//
// .mcp.json stays the single source of truth for MCP servers (Claude Code reads it directly).
// Codex reads `[mcp_servers.<name>]` from <theme>/.codex/config.toml when the project is trusted;
// this script writes that table. Re-run it after any .mcp.json change (e.g. the xo-design port).
// Ported from the XO Design Studio repo; kept inside .codex/ so the theme's .claude/ stays untouched.
//
//   node .codex/scripts/sync-codex-config.mjs           write .codex/config.toml
//   node .codex/scripts/sync-codex-config.mjs --check   exit 1 when the file is stale
//
// Translation (codexMcpServers below; the xo-design panel's codex.ts mcpServersFrom() applies
// the same rules per thread):
//   stdio  {command, args, env}            -> command / args / env, startup_timeout_sec 30
//                                             (npx may download on first start; Codex's default is 10)
//   http   {url, headers}                  -> url; headers come from the http_headers_helper
//                                             command (.codex/scripts/mcp-headers.mjs), which reads
//                                             them from .mcp.json at connect time: the bearer token
//                                             is never copied into .codex/
//   sse    {type: "sse"}                   -> skipped: Codex 0.167 has no SSE client
//   xo-design                              -> + tool_timeout_sec 1800: its ask_user_question waits for a
//                                             person (Codex's default 60 s would cut the question off)
// Codex names MCP tools mcp__<server with "-" -> "_">__<tool> (mcp__xo_design__set_status).
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..')
export const STDIO_STARTUP_TIMEOUT_SEC = 30
/** Per-server MCP tool timeout (Codex default 60 s). Same table as codex.ts TOOL_TIMEOUT_SEC. */
export const TOOL_TIMEOUT_SEC = { 'xo-design': 1800 }

// The helper runs from Codex's cwd (any subfolder of the theme): find the theme root first.
export const helperCommand = (name) =>
  `r="$PWD"; while [ ! -f "$r/.codex/scripts/mcp-headers.mjs" ] && [ "$r" != / ]; do r="$(dirname "$r")"; done; node "$r/.codex/scripts/mcp-headers.mjs" ${name}`

/**
 * .mcp.json `mcpServers` -> Codex `mcp_servers`.
 * headers: 'helper' (terminal file: a command prints them) | 'inline' (panel: per-thread, in memory).
 */
export function codexMcpServers(mcpServers, { headers = 'helper', helper = helperCommand } = {}) {
  const out = {}
  const skipped = {}
  for (const [name, s] of Object.entries(mcpServers || {})) {
    if (!s || typeof s !== 'object') continue
    if (s.type === 'sse') { skipped[name] = 'SSE transport (Codex has no SSE client)'; continue }
    if (s.url) {
      const h = s.headers && typeof s.headers === 'object' && Object.keys(s.headers).length ? s.headers : null
      out[name] = {
        url: s.url, ...(h ? (headers === 'inline' ? { http_headers: h } : { http_headers_helper: helper(name) }) : {}),
        ...(TOOL_TIMEOUT_SEC[name] ? { tool_timeout_sec: TOOL_TIMEOUT_SEC[name] } : {}),
      }
    } else if (s.command) {
      out[name] = {
        command: s.command,
        ...(Array.isArray(s.args) ? { args: s.args } : {}),
        ...(s.env && typeof s.env === 'object' && Object.keys(s.env).length ? { env: s.env } : {}),
        startup_timeout_sec: STDIO_STARTUP_TIMEOUT_SEC,
      }
    }
  }
  return { servers: out, skipped }
}

const tomlKey = (k) => (/^[A-Za-z0-9_-]+$/.test(k) ? k : JSON.stringify(k))
const tomlValue = (v) => {
  if (Array.isArray(v)) return `[${v.map(tomlValue).join(', ')}]`
  if (v && typeof v === 'object') return `{ ${Object.entries(v).map(([k, x]) => `${tomlKey(k)} = ${tomlValue(x)}`).join(', ')} }`
  if (typeof v === 'number' || typeof v === 'boolean') return String(v)
  return JSON.stringify(String(v)) // a JSON string is a valid TOML basic string
}

export function renderToml(servers, skipped) {
  const lines = [
    '# GENERATED from .mcp.json by .codex/scripts/sync-codex-config.mjs.',
    '# Do not edit: change .mcp.json, then run `node .codex/scripts/sync-codex-config.mjs`.',
    '#',
    '# Codex CLI loads this file only when the project is trusted. Servers with the same name in',
    '# ~/.codex/config.toml are overridden by these. Hooks live in .codex/hooks.json (see .codex/README.md).',
    ...Object.entries(skipped).map(([n, why]) => `# Skipped "${n}": ${why}.`),
    '',
  ]
  for (const [name, cfg] of Object.entries(servers)) {
    lines.push(`[mcp_servers.${tomlKey(name)}]`)
    for (const [k, v] of Object.entries(cfg)) lines.push(`${k} = ${tomlValue(v)}`)
    lines.push('')
  }
  return lines.join('\n')
}

function main() {
  const mcp = JSON.parse(fs.readFileSync(path.join(ROOT, '.mcp.json'), 'utf8'))
  const { servers, skipped } = codexMcpServers(mcp.mcpServers)
  const file = path.join(ROOT, '.codex', 'config.toml')
  const next = renderToml(servers, skipped)
  const cur = fs.existsSync(file) ? fs.readFileSync(file, 'utf8') : ''
  if (process.argv.includes('--check')) {
    if (cur !== next) { console.error('STALE: .codex/config.toml differs from .mcp.json (run node .codex/scripts/sync-codex-config.mjs)'); process.exit(1) }
    console.log('OK: .codex/config.toml matches .mcp.json')
    return
  }
  if (cur === next) { console.log('OK: .codex/config.toml already up to date'); return }
  fs.mkdirSync(path.dirname(file), { recursive: true })
  fs.writeFileSync(file, next)
  console.log(`OK: .codex/config.toml <- .mcp.json (${Object.keys(servers).join(', ')}${Object.keys(skipped).length ? `; skipped ${Object.keys(skipped).join(', ')}` : ''})`)
}

// Run as a CLI (not when imported). realpath: /tmp vs /private/tmp on macOS.
const isMain = () => { try { return fs.realpathSync(process.argv[1]) === fs.realpathSync(fileURLToPath(import.meta.url)) } catch { return false } }
if (process.argv[1] && isMain()) main()
