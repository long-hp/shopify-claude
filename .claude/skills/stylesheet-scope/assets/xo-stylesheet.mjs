#!/usr/bin/env node
// CLI for xo-stylesheet.vite-plugin.js (lives at scripts/xo-stylesheet.mjs inside the theme).
//   node scripts/xo-stylesheet.mjs            one pass: write global.shared.scss + inject {% stylesheet %} under shopify/
//   node scripts/xo-stylesheet.mjs --check    write nothing; exit 1 if any file would change (CI / pre-push)
//   node scripts/xo-stylesheet.mjs --report   table: scoped files with bytes and target liquid, files kept shared
//   node scripts/xo-stylesheet.mjs --cleanup  remove every injected block under shopify/
import path from 'node:path';
import { pathToFileURL } from 'node:url';

const root = process.cwd();
const args = process.argv.slice(2);
const plugin = await import(pathToFileURL(path.join(root, 'xo-stylesheet.vite-plugin.js')).href);

if (args.includes('--cleanup')) {
  const n = await plugin.cleanup(root);
  console.log(`xo-stylesheet: removed blocks from ${n} files`);
  process.exit(0);
}

if (args.includes('--report')) {
  const cfg = plugin.loadConfig(root);
  const sass = await plugin.loadSass(root);
  const { scoped, shared } = plugin.collect(root, cfg);
  const rows = [];
  for (const f of scoped) {
    try {
      const css = await plugin.compileScoped(root, cfg, sass, f);
      rows.push([Buffer.byteLength(css), f, plugin.sourceLiquids(root, cfg, f).map((l) => path.basename(l)).join(', ') || '(no target)']);
    } catch (e) {
      rows.push([0, f, `error: ${e.message.split('\n')[0]}`]);
    }
  }
  rows.sort((a, b) => b[0] - a[0]);
  const kb = (n) => `${(n / 1024).toFixed(1)} KB`.padStart(9);
  console.log(`Scoped (into {% stylesheet %}): ${scoped.length} files, ${kb(rows.reduce((s, r) => s + r[0], 0))}`);
  rows.forEach(([n, f, l]) => console.log(`${kb(n)}  ${f}  →  ${l}`));
  console.log(`\nKept in the shared stylesheet (${cfg.sharedFile}): ${shared.length} files`);
  shared.forEach((f) => console.log(`           ${f}`));
  process.exit(0);
}

const check = args.includes('--check');
const stats = await plugin.run(root, { check });
console.log(plugin.summary(stats));
if (check) {
  const dirty = stats.injected.length;
  if (dirty) {
    console.log(`--check: ${dirty} files would change:\n  ${stats.injected.join('\n  ')}`);
    process.exit(1);
  }
  console.log('--check: clean');
}
if (stats.errors.length) process.exit(1);
