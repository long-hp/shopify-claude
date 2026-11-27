#!/usr/bin/env node
// Finds HTML that arrives via AJAX (quick view, Section Rendering API, predictive search, recommendations…) and lists
// the *.global.scss files that MUST stay in the shared stylesheet: Shopify only bundles the {% stylesheet %} CSS of
// files in the initial render tree, so HTML fetched later has no CSS if its file was scoped.
//
//   node .claude/skills/stylesheet-scope/scripts/find-ajax-sections.mjs            # print the proposal
//   node .claude/skills/stylesheet-scope/scripts/find-ajax-sections.mjs --json     # JSON { entries, exclude, chain }
//   node .claude/skills/stylesheet-scope/scripts/find-ajax-sections.mjs --apply      # merge the HARD list into theme-config/stylesheet.config.json (keeps existing excludes)
//   node .claude/skills/stylesheet-scope/scripts/find-ajax-sections.mjs --apply=all  # also merge the SOFT list (most conservative)
//
// Heuristics (run from the theme root):
//   1. Entry points: literal `section_id=<name>` / `sections=<a,b>` in liquid / ts; routes.predictive_search_url or
//      /search/suggest; product recommendations URLs; file names matching quick-view*, predictive-search*,
//      pickup-availability*, cart-drawer, cart-notification.
//   2. From each entry, follow {% render 'x' %} / {% include 'x' %} / {% section 'x' %} recursively, including the bare
//      `render 'x'` lines inside {% liquid %} blocks. Liquids using web components that re-fetch HTML (xo-cart-mini,
//      xo-products-fetcher, xo-filters…) count as entries too.
//   3. Every .global.scss next to those liquids → exclude. Conservative on purpose: a few KB kept shared is cheaper
//      than an unstyled quick view.
import fs from 'node:fs';
import path from 'node:path';

// Lives under .claude/skills with no node_modules → walk directories instead of fast-glob
function walkDir(dir, test, acc = []) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    if (e.name === 'node_modules' || e.name.startsWith('.')) continue;
    const p = path.join(dir, e.name);
    if (e.isDirectory()) walkDir(p, test, acc);
    else if (test(e.name)) acc.push(path.relative(root, p).split(path.sep).join('/'));
  }
  return acc;
}

const root = process.cwd();
const args = process.argv.slice(2);
const CONFIG = 'theme-config/stylesheet.config.json';

const liquidFiles = walkDir(path.join(root, 'src'), (n) => n.endsWith('.liquid'));
// Snippets and sections are separate namespaces: `render 'x'` only targets snippets, `section 'x'` / section_id only
// targets sections. The same basename on both sides (snippet `section`, section `section`) must not be mixed up.
const snippetsByName = new Map();
const sectionsByName = new Map();
for (const f of liquidFiles) {
  const n = path.basename(f, '.liquid');
  const map = /(^|\/)snippets\//.test(f) ? snippetsByName : /^src\/(sections|pages|groups)\//.test(f) ? sectionsByName : null;
  if (!map) continue;
  if (!map.has(n)) map.set(n, []);
  map.get(n).push(f);
}
const has = (n) => snippetsByName.has(n) || sectionsByName.has(n);
const filesOf = (n) => [...(sectionsByName.get(n) || []), ...(snippetsByName.get(n) || [])];
const read = (f) => fs.readFileSync(path.join(root, f), 'utf8');

// 1. entry points
const entries = new Map(); // name → { why: Set, level: 'hard' | 'soft' }
// hard: the file is NOT in the initial render tree (fetched with ?section_id=, predictive search, recommendations…)
// soft: the section renders initially but is re-fetched later (filters, cart); only children rendered
//       conditionally for the first time after load (empty cart → items, "no results"…) are at risk
const add = (name, why, level = 'hard') => {
  if (!name || !has(name)) return;
  if (!entries.has(name)) entries.set(name, { why: new Set(), level });
  entries.get(name).why.add(why);
  if (level === 'hard') entries.get(name).level = 'hard';
};
const codeFiles = walkDir(path.join(root, 'src'), (n) => /\.(liquid|ts|js)$/.test(n) && n !== 'schema.js' && !/^preset-/.test(n) && !n.endsWith('.d.ts'));
for (const f of codeFiles) {
  const src = read(f);
  for (const m of src.matchAll(/section_id=([a-z0-9_-]+)/g)) add(m[1], `${f}: section_id=${m[1]}`);
  for (const m of src.matchAll(/sections=([a-z0-9_,-]+)/g)) m[1].split(',').forEach((n) => add(n, `${f}: sections=${m[1]}`));
  if (/predictive_search_url|\/search\/suggest/.test(src)) {
    for (const n of [...sectionsByName.keys(), ...snippetsByName.keys()]) if (/predictive-search/.test(n)) add(n, `${f}: predictive search`);
  }
  if (/product_recommendations_url|recommendations\/products/.test(src)) {
    for (const n of [...sectionsByName.keys(), ...snippetsByName.keys()]) if (/recommend/.test(n)) add(n, `${f}: recommendations`);
  }
}
for (const n of [...sectionsByName.keys(), ...snippetsByName.keys()]) {
  if (/^quick-view|pickup-availability|predictive-search|cart-drawer|cart-notification|cart-mini/.test(n)) add(n, 'file name suggests late-loaded content');
}
// Web components whose JS re-fetches HTML through the Section Rendering API with URLs built in TypeScript
// (xo-webcomponents package, not visible in the theme source). Any liquid using the tag is treated as an entry:
// its subtree may render for the first time after the initial page (e.g. cart items when the cart starts empty).
const FETCHING_TAGS = ['xo-cart-mini', 'xo-cart', 'xo-products-fetcher', 'xo-product-quick-view', 'xo-filters', 'xo-collection-tabs'];
for (const f of liquidFiles) {
  const src = read(f);
  for (const tag of FETCHING_TAGS) {
    if (new RegExp(`<${tag}[\\s>]`).test(src)) add(path.basename(f, '.liquid'), `${f}: uses <${tag}> (re-fetches HTML via Section Rendering API)`, 'soft');
  }
}

// 2. follow renders
// Tag form `{% render 'x' %}` AND the bare form inside `{% liquid %}` blocks: a line starting with `render 'x'`
const RENDER_RE = /(?:\{%-?\s*|^\s*)(?:render|include)\s+['"]([^'"]+)['"]/gm;
const SECTION_RE = /(?:\{%-?\s*|^\s*)section\s+['"]([^'"]+)['"]/gm;
const chain = new Map(); // liquid file → { via, level }
function walk(files, via, level) {
  for (const file of files) {
    const seen = chain.get(file);
    if (seen && (seen.level === 'hard' || level === 'soft')) continue;
    chain.set(file, { via, level });
    const src = read(file);
    for (const m of src.matchAll(RENDER_RE)) walk(snippetsByName.get(m[1]) || [], `${file} → render '${m[1]}'`, level);
    for (const m of src.matchAll(SECTION_RE)) walk(sectionsByName.get(m[1]) || [], `${file} → section '${m[1]}'`, level);
  }
}
// hard entries first so a file reachable both ways is recorded as hard
for (const [name, e] of [...entries].sort((a, b) => (a[1].level === 'hard' ? -1 : 1))) walk(filesOf(name), [...e.why][0], e.level);

// 3. scss next to those liquids
const exclude = new Map(); // scss → { via, level }
for (const [file, { via, level }] of chain) {
  const dir = path.dirname(file);
  for (const scss of fs.readdirSync(path.join(root, dir)).filter((n) => /\.global\.(scss|css)$/.test(n))) {
    const rel = `${dir}/${scss}`;
    const prev = exclude.get(rel);
    if (!prev || (prev.level === 'soft' && level === 'hard')) exclude.set(rel, { via, level });
  }
}
const sorted = [...exclude].sort((a, b) => a[0].localeCompare(b[0]));
const hard = sorted.filter(([, v]) => v.level === 'hard').map(([k]) => k);
const soft = sorted.filter(([, v]) => v.level === 'soft').map(([k]) => k);

const out = {
  entries: [...entries].map(([name, e]) => ({ name, level: e.level, files: filesOf(name), why: [...e.why] })),
  exclude: hard,
  excludeSoft: soft,
  chain: Object.fromEntries(sorted.map(([k, v]) => [k, v.via])),
};

const applyAll = args.includes('--apply=all');
if (args.includes('--json')) {
  console.log(JSON.stringify(out, null, 2));
} else {
  console.log(`AJAX entry points: ${out.entries.length} sections / snippets`);
  for (const e of out.entries) console.log(`  [${e.level}] ${e.name}  ← ${e.why[0]}`);
  console.log(`\nHARD — not in the initial render tree, must stay shared (exclude): ${hard.length} files`);
  for (const f of hard) console.log(`  ${f}\n      via: ${out.chain[f]}`);
  console.log(`\nSOFT — section renders initially but re-fetches later; only children that first render after load are at risk: ${soft.length} files`);
  console.log('  (applied with --apply=all; otherwise review and add individually, e.g. cart item / empty-state snippets)');
  for (const f of soft) console.log(`  ${f}\n      via: ${out.chain[f]}`);
}

if (args.includes('--apply') || applyAll) {
  const p = path.join(root, CONFIG);
  const cfg = fs.existsSync(p) ? JSON.parse(fs.readFileSync(p, 'utf8')) : {};
  const add = applyAll ? [...hard, ...soft] : hard;
  const merged = [...new Set([...(cfg.exclude || []), ...add])].sort();
  fs.writeFileSync(p, `${JSON.stringify({ ...cfg, exclude: merged }, null, 2)}\n`);
  console.log(`\nWrote ${merged.length} exclude entries to ${CONFIG} (${applyAll ? 'hard + soft' : 'hard only'})`);
}
