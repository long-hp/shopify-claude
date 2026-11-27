#!/usr/bin/env node
// Theme CSS composition: compile src/styles/main.scss with sass + sourcemap, attribute every output byte to its
// source file, group by origin (core basehtml / atomic / base / pages / sections / snippets / groups). Run from the
// theme root:
//   node .claude/skills/stylesheet-scope/scripts/css-composition.mjs [--top N] [--entry src/styles/main.scss]
// Use BEFORE installing stylesheet-scope (how much can move) and AFTER (what is left in the shared file).
import fs from 'node:fs';
import path from 'node:path';
import zlib from 'node:zlib';
import { createRequire } from 'node:module';
import { pathToFileURL } from 'node:url';

const root = process.cwd();
const args = process.argv.slice(2);
const opt = (k, d) => (args.includes(k) ? args[args.indexOf(k) + 1] : d);
const TOP = Number(opt('--top', 15));
const entry = path.resolve(root, opt('--entry', 'src/styles/main.scss'));

async function loadSass() {
  const req = createRequire(path.join(root, 'package.json'));
  const bases = [root];
  for (const pkg of ['vite', '@xotiny-private/vite-xotiny', 'xo-css']) {
    try {
      bases.push(path.dirname(req.resolve(`${pkg}/package.json`)));
    } catch {
      try {
        bases.push(path.dirname(req.resolve(pkg)));
      } catch {}
    }
  }
  for (const base of bases) {
    try {
      const mod = await import(pathToFileURL(req.resolve('sass', { paths: [base] })).href);
      return mod.compile ? mod : mod.default;
    } catch {}
  }
  throw new Error('cannot resolve the sass package');
}

const sass = await loadSass();
const result = sass.compile(entry, { style: 'compressed', sourceMap: true, sourceMapIncludeSources: false, loadPaths: [root], quietDeps: true, logger: { warn() {}, debug() {} } });
const code = result.css;
const map = result.sourceMap;

// VLQ decode
const B64 = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
const M = {};
[...B64].forEach((c, i) => (M[c] = i));
function vlq(s, p) {
  let r = 0, sh = 0, c, d;
  do {
    d = M[s[p++]];
    c = d & 32;
    r += (d & 31) << sh;
    sh += 5;
  } while (c);
  return [r & 1 ? -(r >> 1) : r >> 1, p];
}
const lines = code.split('\n');
const ml = map.mappings.split(';');
const by = new Map();
let src = 0;
for (let li = 0; li < lines.length; li++) {
  const len = Buffer.byteLength(lines[li]) + 1;
  const segs = ml[li] || '';
  let col = 0, p = 0;
  const cols = [];
  while (p < segs.length) {
    if (segs[p] === ',') {
      p++;
      continue;
    }
    let v;
    [v, p] = vlq(segs, p);
    col += v;
    let s = -1;
    if (p < segs.length && segs[p] !== ',' && segs[p] !== ';') {
      [v, p] = vlq(segs, p);
      src += v;
      s = src;
      [v, p] = vlq(segs, p);
      [v, p] = vlq(segs, p);
      if (p < segs.length && segs[p] !== ',' && segs[p] !== ';') [v, p] = vlq(segs, p);
    }
    cols.push([col, s]);
  }
  for (let i = 0; i < cols.length; i++) {
    const e = i + 1 < cols.length ? cols[i + 1][0] : len;
    const n = Math.max(0, e - cols[i][0]);
    if (cols[i][1] >= 0) by.set(cols[i][1], (by.get(cols[i][1]) || 0) + n);
  }
}

const group = (f) => {
  if (/basehtml\/src\/styles/.test(f)) return 'core basehtml (normalize, root, grid, hover effects…)';
  if (/styles\/atomic\./.test(f)) return 'atomic (utility classes generated from liquid)';
  if (/styles\/(base|main|global)/.test(f)) return 'base theme';
  if (/\/pages\//.test(f)) return 'pages/* (.global.scss)';
  if (/\/sections\//.test(f)) return 'sections/* (.global.scss)';
  if (/\/snippets\//.test(f)) return 'snippets/* (.global.scss)';
  if (/\/groups\/|\/blocks\//.test(f)) return 'groups + blocks (.global.scss)';
  return 'other';
};
const grp = new Map();
const files = [];
for (const [i, n] of by) {
  const f = decodeURIComponent(map.sources[i]).replace(/^file:\/\//, '');
  grp.set(group(f), (grp.get(group(f)) || 0) + n);
  files.push([f.replace(/^.*\/(src|html)\//, ''), n]);
}
const total = Buffer.byteLength(code);
const kb = (n) => `${(n / 1024).toFixed(1).padStart(7)} KB`;
console.log(`${path.relative(root, entry)} → ${kb(total)} raw | gzip ${kb(zlib.gzipSync(code, { level: 9 }).length)} | brotli ${kb(zlib.brotliCompressSync(code).length)}`);
console.log('\n-- By group --');
[...grp].sort((a, b) => b[1] - a[1]).forEach(([g, n]) => console.log(`${kb(n)}  ${((n / total) * 100).toFixed(1).padStart(5)}%  ${g}`));
console.log(`\n-- Top ${TOP} files --`);
files.sort((a, b) => b[1] - a[1]).slice(0, TOP).forEach(([f, n]) => console.log(`${kb(n)}  ${f}`));
