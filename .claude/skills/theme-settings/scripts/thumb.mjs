#!/usr/bin/env node
/**
 * SVG thumbnail data URIs for <xo-theme-settings> option cards (160×100 wireframes).
 *
 *   node thumb.mjs header-left                 → one data URI
 *   node thumb.mjs header-left footer-dark     → one per line
 *   node thumb.mjs --json header-left hero-split → { "header-left": "data:…", … }
 *   node thumb.mjs --list                      → available kinds
 *   node thumb.mjs swatch:#c0392b              → color dot
 *   node thumb.mjs preset:#ff7a9a,#ffb547      → two-blob preset card
 *   --bg=#f4f1ea --ink=#1f1f1f                 → recolor
 *
 * Output is percent-encoded, safe inside JSON and Liquid `| escape`. Users can later replace any `image` with a
 * screenshot URL.
 */
const args = process.argv.slice(2);
const opt = (name, def) => args.find((a) => a.startsWith(`--${name}=`))?.split('=')[1] ?? def;
const BG = opt('bg', '#f4f1ea');
const INK = opt('ink', '#1f1f1f');
const SOFT = '#ddd6c8';
const SOFT2 = '#e8e2d6';
const MUTE = '#9b9384';

const svg = (body, bg = BG) =>
  `data:image/svg+xml,${encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 160 100"><rect width="160" height="100" fill="${bg}"/>${body}</svg>`)}`;
const page = (y = 34) =>
  `<rect x="12" y="${y}" width="136" height="30" rx="3" fill="${SOFT}"/>` +
  [12, 59, 106].map((x) => `<rect x="${x}" y="${y + 36}" width="42" height="22" rx="3" fill="${SOFT2}"/>`).join('');
const menu = (x, y = 15) => `<g fill="${INK}">${[0, 16, 32].map((d) => `<rect x="${x + d}" y="${y}" width="12" height="3" rx="1.5"/>`).join('')}</g>`;
const logo = (x, y = 12) => `<rect x="${x}" y="${y}" width="24" height="9" rx="2" fill="${INK}"/>`;
const cols = (y, fill = MUTE) => `<g fill="${fill}">${[12, 62, 112].map((x) => `<rect x="${x}" y="${y}" width="30" height="3"/><rect x="${x}" y="${y + 8}" width="22" height="3"/>`).join('')}</g>`;

const KINDS = {
  'header-left': () => svg(logo(12) + menu(100) + page()),
  'header-center': () => svg(menu(12) + logo(68) + `<circle cx="140" cy="16.5" r="4" fill="${INK}"/>` + page()),
  'header-burger': () => svg(logo(12) + `<g fill="${INK}"><rect x="128" y="12" width="20" height="2.5" rx="1"/><rect x="128" y="18" width="20" height="2.5" rx="1"/></g>` + page()),
  'header-topbar': () => svg(`<rect x="0" y="0" width="160" height="8" fill="${INK}"/>${logo(68)}<rect x="12" y="13" width="40" height="7" rx="3.5" fill="${SOFT}"/>${menu(56, 26)}` + page(36)),
  'footer-columns': () => svg(`<rect x="0" y="62" width="160" height="38" fill="#e3ddd0"/>${cols(72)}`),
  'footer-newsletter': () => svg(`<rect x="0" y="56" width="160" height="44" fill="#e3ddd0"/><rect x="12" y="66" width="60" height="4" fill="${INK}"/><rect x="12" y="76" width="58" height="10" rx="5" fill="#fff"/><g fill="${MUTE}"><rect x="100" y="66" width="22" height="3"/><rect x="128" y="66" width="20" height="3"/><rect x="100" y="74" width="18" height="3"/><rect x="128" y="74" width="16" height="3"/></g>`),
  'footer-dark': () => svg(`<rect x="0" y="56" width="160" height="44" fill="${INK}"/>${cols(68, '#8a8578')}<rect x="12" y="88" width="136" height="1" fill="#444"/>`),
  'hero-left': () => svg(`<rect x="12" y="20" width="60" height="7" rx="2" fill="${INK}"/><rect x="12" y="32" width="46" height="7" rx="2" fill="${INK}"/><rect x="12" y="48" width="30" height="9" rx="4.5" fill="${INK}"/><rect x="84" y="12" width="64" height="76" rx="4" fill="#d9a066"/>`),
  'hero-split': () => svg(`<rect x="0" y="0" width="80" height="100" fill="#8f6bd8"/><rect x="92" y="30" width="56" height="7" rx="2" fill="${INK}"/><rect x="92" y="42" width="40" height="7" rx="2" fill="${INK}"/><rect x="92" y="58" width="30" height="9" rx="4.5" fill="${INK}"/>`),
  'hero-full': () => svg(`<rect x="0" y="0" width="160" height="100" fill="#7d8f7a"/><rect x="40" y="36" width="80" height="8" rx="2" fill="#fff"/><rect x="56" y="50" width="48" height="5" rx="2" fill="#eef"/><rect x="65" y="62" width="30" height="9" rx="4.5" fill="#fff"/>`),
  grid: () => svg(`<g fill="${SOFT}">${[12, 47, 82, 117].map((x) => `<rect x="${x}" y="20" width="31" height="44" rx="3"/>`).join('')}</g><g fill="${INK}">${[12, 47, 82, 117].map((x) => `<rect x="${x}" y="70" width="24" height="3" rx="1"/>`).join('')}</g>`),
  'image-text': () => svg(`<rect x="12" y="14" width="64" height="72" rx="4" fill="#c9b79c"/><rect x="88" y="30" width="56" height="6" rx="2" fill="${INK}"/><g fill="${MUTE}"><rect x="88" y="42" width="56" height="3"/><rect x="88" y="49" width="48" height="3"/></g><rect x="88" y="60" width="30" height="9" rx="4.5" fill="${INK}"/>`),
};

const make = (kind) => {
  if (KINDS[kind]) return KINDS[kind]();
  if (kind.startsWith('swatch:')) return svg(`<circle cx="80" cy="50" r="34" fill="${kind.slice(7)}"/>`);
  if (kind.startsWith('preset:')) {
    const [a = '#ff7a9a', b = '#ffb547', bg = '#f3eee6'] = kind.slice(7).split(',');
    return svg(`<circle cx="120" cy="30" r="44" fill="${a}"/><circle cx="40" cy="90" r="40" fill="${b}"/>`, bg);
  }
  throw new Error(`Unknown kind "${kind}". Use --list.`);
};

const kinds = args.filter((a) => !a.startsWith('--'));
if (args.includes('--list') || !kinds.length) {
  console.log([...Object.keys(KINDS), 'swatch:<hex>', 'preset:<hex>,<hex>[,<bg>]'].join('\n'));
  process.exit(kinds.length ? 0 : args.includes('--list') ? 0 : 1);
}
try {
  if (args.includes('--json')) console.log(JSON.stringify(Object.fromEntries(kinds.map((k) => [k, make(k)])), null, 2));
  else kinds.forEach((k) => console.log(make(k)));
} catch (e) {
  console.error(e.message);
  process.exit(1);
}
