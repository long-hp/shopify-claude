/**
 * <xo-theme-settings> — bảng "Tuỳ biến giao diện" nổi, chỉ đặt trên store DEMO của tác giả theme. Khách thử:
 * đổi header / footer / section bất kỳ sang bản khác, đổi màu / kích thước, ẩn hiện section, nhảy sang bộ demo khác.
 *
 * Tải sau: main import theme-settings-loader.ts ( vài trăm byte ), file này là chunk riêng do bộ nạp import() khi cần
 * ( lúc rảnh / khi chạm nút / ngay nếu có bản lưu ). Nút tĩnh <button class="xo-ts-fab"> + <style> của snippet có sẵn trong
 * <xo-theme-settings>: component dùng lại nút đó ( bọc vào xo-modal-trigger, giữ <style> ), không có thì tự tạo.
 * Attribute xo-open-on-load ( bộ nạp đặt khi khách bấm trước lúc chunk về ): mở drawer khi xo-modal sẵn sàng.
 * File tự chứa ( chép thẳng vào theme cùng bộ nạp ), không import động bên trong. Cần:
 *   - xo-critical.js: @xo/utils ( window.XotinyUtils );
 *   - xo-webcomponents ( JS + CSS ): xo-modal / xo-modal-trigger / window.xoModal ( nút + drawer ), xo-collapse /
 *     xo-collapse-trigger ( nhóm đóng mở ). Thiếu xo-modal thì console.error, không im lặng.
 * Mọi thứ ở light DOM ( xo-modal, xo-collapse dùng store chung, CSS toàn cục và document.querySelector của thư viện ).
 * Chống CSS theme: <style data-xo-theme-settings> trong <head>, selector bắt đầu bằng xo-theme-settings / .xo-ts.xo-ts,
 * class xo-ts__*; trong bảng all:revert ( độ ưu tiên cao hơn button {…}, h3 {…}, input {…} của theme ) rồi mới đặt style.
 * Drawer mặc định không che trang: không backdrop, không khoá cuộn, Tab ra được ( schema.drawer.overlay / lockScroll bật
 * lại ). Esc, nút đóng, nút mở ( đứng cạnh drawer khi mở trên desktop ), top layer, trả focus khi đóng: của xo-modal.
 * Nội dung bảng dựng ở lần mở đầu. Markup sinh ra:
 *   <xo-theme-settings xo-schema="…">
 *     <xo-modal-trigger xo-name="xo-theme-settings"><button class="xo-ts-fab" data-pos="bottom-right">…</button></xo-modal-trigger>
 *     <xo-modal xo-name="xo-theme-settings" xo-placement="top-right" xo-animate="slide-left" xo-duration="350"
 *               xo-backdrop-disabled xo-scroll-disabled="false" xo-focus-trap="false">
 *       <xo-theme-settings-panel class="xo-ts">
 *         <div class="xo-ts__drawer" role="dialog"> header ( nút đóng: xo-modal-trigger ) · các nhóm
 *           <xo-collapse-trigger xo-name="…"><button class="xo-ts__group-btn" aria-expanded>…</button></xo-collapse-trigger>
 *           <xo-collapse xo-name="…">…</xo-collapse> · footer </div>
 *       </xo-theme-settings-panel>
 *     </xo-modal>
 *     <div class="xo-ts-spin" hidden></div>
 *   </xo-theme-settings>
 * Nút ở bên trái ( button.position *-left ): xo-placement="top-left" xo-animate="slide-right".
 *
 *   <xo-theme-settings xo-schema="{{ settings.theme_settings_schema | escape }}"></xo-theme-settings>
 *
 * Schema: JSON ( hoặc JSON "lỏng" ) đọc bằng objectParse, không chạy code. Khung:
 *   { "title"?, "button"?: { "label", "position" }, "drawer"?: { "overlay"?, "lockScroll"? },
 *     "footer"?: { "reset"?: "Đặt lại" | false, "apply"?: "Áp dụng" | false }, "cache"?: giây,
 *     "groups": [ { "title", "open"?, "fields": [ … ] } ] }
 * Field ( "type" ): section-swap, visibility, color, range, toggle, select, preset, link — khoá của từng loại xem validate().
 *
 * section-swap: mỗi bản thay là 1 file section riêng ( ví dụ dựng trong khu "showcase" của theme ), ghi section_id của nó
 * vào lựa chọn; render bằng setting mặc định của file section đó. Tải `<path hiện tại>?section_id=<section>`, thay
 * outerHTML của section đích bằng thẻ <div id="shopify-section-…" class="shopify-section"> trả về, chạy lại <script>
 * bên trong, bắn shopify:section:unload ( section cũ ) / shopify:section:load ( section mới ) { sectionId } như theme editor.
 * "Mặc định" ( value "default" ) gắn lại đúng phần tử gốc. Phản hồi được cache ( bộ nhớ + sessionStorage ), tải trước khi
 * rê / focus vào lựa chọn.
 *
 * Xem thử / Áp dụng / Đặt lại ( 1 quy tắc: đóng mà không Áp dụng là bỏ ):
 *   - đổi lựa chọn: áp ngay lên trang ( xem thử ), CHƯA lưu;
 *   - "Áp dụng": lưu localStorage theo host ( giữ khi chuyển trang ) rồi đóng drawer;
 *   - "Đặt lại": trả theme về như cũ ( section gốc, biến / class / attribute gốc ), xoá bản lưu, drawer vẫn mở;
 *   - X, Esc, bấm lại nút mở, close(): như "Đặt lại" rồi đóng ( đi chung 1 chỗ: sự kiện đóng của xo-modal ).
 *   Mở lại sau khi Áp dụng: thấy đúng giá trị đã áp dụng; Đặt lại / X từ đó về theme gốc.
 *   footer.apply: false thì không còn cách lưu.
 * Dùng chung cả theme: field có target không có trên trang ( trang sản phẩm không có hero → ẩn field Hero ) bị ẩn, nhóm
 *   hết field thì ẩn, không còn gì thì hiện 1 dòng thông báo. Tính lại mỗi lần mở drawer và sau khi đổi section ( chỉ là
 *   vài lần querySelector, không làm khi cuộn ). Giá trị đã Áp dụng giữ qua mọi trang: chỉ áp ở trang có target, field
 *   vắng mặt vẫn được giữ và lưu lại khi Áp dụng ở trang khác; preset áp field có mặt, lưu cả field vắng mặt.
 * Sự kiện ( trên phần tử, bubbles ): xo:theme-settings:change { id, value } mỗi lần đổi ( xem thử );
 *   xo:theme-settings:apply { values }; xo:theme-settings:reset.
 * Sửa schema ( tác giả ): ?xo-theme-settings-edit hoặc attribute xo-editor → thêm tab "Schema".
 * Style từ ngoài: biến --xo-ts-accent / -accent-fg / -bg / -fg / -muted / -line / -radius / -width / -font / -z / -backdrop
 * đặt trên xo-theme-settings; class xo-ts-fab, xo-ts__drawer, xo-ts__group-btn, xo-ts__opt… ( viết selector
 * .xo-ts.xo-ts .xo-ts__… để thắng lớp reset ).
 * API: open(), close() ( = X: bỏ thay đổi ), apply(), reset(), getValues(), setValue( id, value ).
 */
import { XoComponent, customElements, clamp, debounce, objectParse, storage, PropTypes, PropUpdateParams } from '@xo/utils';

type Value = string | number | boolean;
type Dict<T = any> = Record<string, T>;

interface Target {
  /** Chuỗi con trong id của section ( "__header" ) hoặc 1 class trên .shopify-section */
  match?: string;
  selector?: string;
  /** Vị trí trong document.querySelectorAll('.shopify-section') */
  index?: number;
  /** Field không phải section-swap: selector bên trong section tìm được ( ví dụ "header" ). Không có: chính section */
  inner?: string;
}

interface Opt {
  value: string;
  label?: string;
  image?: string;
  /** section-swap: section_id của bản thay ( mỗi bản là 1 file section riêng ) */
  section?: string;
  /** link */
  url?: string;
  /** preset */
  values?: Dict<Value>;
}

interface Field {
  type: string;
  id: string;
  label?: string;
  info?: string;
  /** section-swap / visibility: Target ( hoặc selector ). color / range / toggle / select: selector. link: "_blank" */
  target?: Target | string;
  section?: string;
  options: Opt[];
  var?: string;
  unit?: string;
  min?: number;
  max?: number;
  step?: number;
  swatches?: string[];
  attr?: string;
  class?: string;
  on?: string;
  off?: string;
  default?: Value;
  keep?: boolean;
}

interface Group {
  title?: string;
  open?: boolean;
  fields: Field[];
}

interface Schema {
  title?: string;
  button?: { label?: string; position?: string };
  /** Mặc định drawer không che trang: không backdrop, không khoá cuộn ( khách vừa cuộn vừa xem trang đổi ) */
  drawer?: { overlay?: boolean; lockScroll?: boolean };
  /** Nút cuối drawer: chuỗi = đổi chữ, false = ẩn ( ẩn cả 2 thì không có thanh cuối ) */
  footer?: { reset?: string | boolean; apply?: string | boolean };
  cache?: number;
  groups: Group[];
}

/** 1 section trên trang: phần tử gốc ( giữ để "Mặc định" gắn lại ) + phần tử đang hiện */
interface Slot {
  original: Element;
  current: Element;
  /** Tăng mỗi lần chọn: phản hồi về muộn của lần chọn cũ bị bỏ */
  token: number;
  busy: number;
}

interface Checked {
  schema: Schema | null;
  errors: string[];
  warnings: string[];
}

interface Props {
  xoSchema?: string;
  xoEditor?: boolean;
}

const TAG = 'xo-theme-settings';
const EVENT = 'xo:theme-settings:change';
const EVENT_APPLY = 'xo:theme-settings:apply';
const EVENT_RESET = 'xo:theme-settings:reset';
const LOADING = 'data-xo-ts-loading';
const DEFAULT = 'default';
const TYPES = ['section-swap', 'visibility', 'color', 'range', 'toggle', 'select', 'preset', 'link'];
/** Loại có giá trị ( lưu khi Áp dụng ): bắt buộc id */
const VALUED = ['section-swap', 'visibility', 'color', 'range', 'toggle', 'select'];
const POSITIONS = ['bottom-right', 'bottom-left', 'middle-right', 'middle-left', 'top-right', 'top-left'];
const HEX = /^#(?:[0-9a-f]{3}|[0-9a-f]{6})$/i;
const JS_TYPE = /^(?:|text\/javascript|application\/javascript|module)$/i;
const ICON =
  '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><path d="M4 6h10M18 6h2M4 12h4M12 12h8M4 18h12M20 18h0"/><circle cx="16" cy="6" r="2"/><circle cx="10" cy="12" r="2"/><circle cx="18" cy="18" r="2"/></svg>';
const CLOSE = '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><path d="M6 6l12 12M18 6 6 18"/></svg>';

/** Cần xo-webcomponents ( xo-modal ): không có thì báo rõ, không im lặng */
const MISSING = `[${TAG}] Cần xo-modal của xo-webcomponents ( @xo/webcomponents ) nhưng chưa được định nghĩa: nút Tuỳ biến không mở được drawer. Nạp xo-webcomponents.js ( và CSS của nó ) cùng xo-critical.js.`;

interface ModalApi {
  open(name: string): void;
  close(name: string): void;
  on(type: 'open' | 'close', name: string, cb: () => void): () => void;
}

const xoModalApi = () => (window as any).xoModal as ModalApi | undefined;

/** Số instance: xo-name của xo-modal không trùng khi có nhiều bảng */
let instances = 0;

const isObj = (v: unknown): v is Dict => !!v && typeof v === 'object' && !Array.isArray(v);
const enc = encodeURIComponent;
const sectionIdOf = (el: Element) => el.id.replace(/^shopify-section-/, '');
let uidN = 0;
const uid = () => `xts${++uidN}`;

type Kid = Node | string | null | undefined | false;

/** Tạo phần tử: chữ đi qua textContent / setAttribute, không innerHTML → nhãn trong schema không chèn được HTML */
function h<K extends keyof HTMLElementTagNameMap>(tag: K, props: Dict = {}, ...kids: Kid[]): HTMLElementTagNameMap[K] {
  const el = document.createElement(tag);
  Object.keys(props).forEach((k) => {
    const v = props[k];
    if (v == null || v === false) return;
    if (k === 'text') el.textContent = String(v);
    else el.setAttribute(k, v === true ? '' : String(v));
  });
  kids.forEach((c) => c && el.append(c));
  return el;
}

/** Chỉ nhận http: / https: ( link tương đối thành URL cùng trang ); javascript:, data:, … bị loại */
function safeUrl(raw: unknown): URL | null {
  if (typeof raw !== 'string' || !raw.trim()) return null;
  try {
    const u = new URL(raw.trim(), location.href);
    return /^https?:$/.test(u.protocol) ? u : null;
  } catch {
    return null;
  }
}

/** Thông báo lỗi cú pháp kèm dòng / cột nếu trình duyệt cho vị trí ( Chrome, Firefox; Safari không có ) */
function syntaxMsg(text: string, e: unknown) {
  const msg = String((e as Error)?.message || e);
  const lc = /line (\d+) column (\d+)/i.exec(msg);
  const pos = /position (\d+)/i.exec(msg);
  if (lc) return `Lỗi cú pháp ở dòng ${lc[1]}, cột ${lc[2]} ( ${msg} )`;
  if (!pos) return `Lỗi cú pháp ( ${msg} )`;
  const before = text.slice(0, +pos[1]).split('\n');
  return `Lỗi cú pháp ở dòng ${before.length}, cột ${before[before.length - 1].length + 1} ( ${msg} )`;
}

/** Chuỗi → object. objectParse ( an toàn, nhận JSON lỏng ); lỗi thì JSON.parse để lấy vị trí lỗi */
function parseText(text: string): { data?: Dict; error?: string } {
  if (!text || !text.trim()) return { error: 'Chưa có schema ( attribute xo-schema trống )' };
  const data = objectParse<Dict>(text);
  if (isObj(data) && Object.keys(data).length) return { data };
  try {
    const json = JSON.parse(text);
    return isObj(json) ? { data: json } : { error: 'Schema phải là một object { … }' };
  } catch (e) {
    return { error: syntaxMsg(text, e) };
  }
}

/** Lựa chọn "giữ section gốc" của section-swap */
const isOriginal = (f: Field, o: Opt) => o.value === DEFAULT || !(o.section || f.section);

/**
 * Kiểm schema, trả bản đã chuẩn hoá. Lỗi ( errors ) = không dựng được panel; cảnh báo ( warnings ) = bỏ field / lựa chọn
 * sai, phần còn lại vẫn chạy. Khoá theo loại:
 *   section-swap  id, target { match | selector | index }, options [ { label, value, section, image? } ] ( khoá khác: bỏ qua )
 *   visibility    id, target, label, default? ( true = hiện )
 *   color         id, var, target?, default?, swatches?
 *   range         id, var, target?, min, max, step, unit?, default?
 *   toggle        id, target?, attr ( + on / off ) | class, default?
 *   select        id, target?, attr | class ( tiền tố: bỏ mọi class cùng tiền tố, thêm 1 ) | var, options [ { label, value, image? } ], default?
 * target của color / range / toggle / select / visibility: selector ( mặc định :root ) hoặc section như section-swap
 * { match | selector | index, inner? } ( inner: selector bên trong section ). Target section được áp lại sau mỗi lần đổi section.
 *   preset        options [ { label, values: { id: value }, image? } ] ( hoặc label + values ở field )
 *   link          options [ { label, url, image? } ], target?: "_blank", keep?: true
 */
function validate(data: Dict): Checked {
  const errors: string[] = [];
  const warnings: string[] = [];
  if (!Array.isArray(data.groups)) {
    errors.push('Thiếu "groups": cần một mảng, ví dụ { "groups": [ { "title": "Màu", "fields": [ … ] } ] }');
    return { schema: null, errors, warnings };
  }
  const ids = new Set<string>();
  const presets: [string, Field][] = [];
  let auto = 0;

  const field = (raw: unknown, at: string): Field | null => {
    const f = raw as Dict;
    const bad = (m: string) => {
      warnings.push(`${at}${isObj(f) && f.id != null ? ` ( "${f.id}" )` : ''}: ${m} → bỏ qua`);
      return null;
    };
    if (!isObj(f)) return bad('field phải là object');
    if (!TYPES.includes(f.type)) return bad(`"type" không hỗ trợ: ${JSON.stringify(f.type)} ( có: ${TYPES.join(', ')} )`);
    const { type } = f;
    let id = typeof f.id === 'string' || typeof f.id === 'number' ? String(f.id) : '';
    if (VALUED.includes(type) && !id) return bad('thiếu "id"');
    if (!id) id = `__${type}${auto++}`;
    if (ids.has(id)) return bad(`"id" bị trùng`);
    if ((type === 'section-swap' || type === 'visibility') && !(f.target != null && (typeof f.target === 'string' || isObj(f.target)))) {
      return bad('thiếu "target" ( { "match" | "selector" | "index" } )');
    }
    if ((type === 'color' || type === 'range') && !/^--\S+$/.test(f.var)) return bad('"var" phải là biến CSS, ví dụ "--color-primary"');
    if (type === 'toggle' && !f.attr && !f.class) return bad('cần "attr" hoặc "class"');
    if (type === 'select' && !f.attr && !('class' in f) && !f.var) return bad('cần "attr", "class" hoặc "var"');
    if (typeof f.attr === 'string' && /^on/i.test(f.attr)) return bad('không cho đặt attribute on…');

    let options: Opt[] = [];
    if (['section-swap', 'select', 'preset', 'link'].includes(type)) {
      const list = Array.isArray(f.options) ? f.options : type === 'preset' && isObj(f.values) ? [{ label: f.label, image: f.image, values: f.values }] : null;
      if (!list || !list.length) return bad('thiếu "options" ( mảng )');
      list.forEach((o: unknown, i: number) => {
        const oat = `${at}.options[${i}]`;
        if (!isObj(o)) return warnings.push(`${oat}: phải là object → bỏ qua`);
        const opt = { ...o, value: String(o.value ?? o.section ?? i) } as Opt;
        if (type === 'link' && !safeUrl(o.url)) return warnings.push(`${oat}: url không hợp lệ ( chỉ http / https ): ${JSON.stringify(o.url)} → bỏ qua`);
        if (type === 'preset' && !isObj(o.values)) return warnings.push(`${oat}: thiếu "values" → bỏ qua`);
        // Ảnh: http / https hoặc data:image ( ảnh nhỏ nhúng thẳng )
        if (opt.image && !(safeUrl(opt.image) || /^data:image\//.test(opt.image))) delete opt.image;
        return options.push(opt);
      });
      if (!options.length) return bad('không còn lựa chọn hợp lệ');
      // section-swap luôn có lựa chọn giữ section gốc
      if (type === 'section-swap' && !options.some((o) => isOriginal(f as Field, o))) options = [{ label: 'Mặc định', value: DEFAULT }, ...options];
    }
    const out = { ...f, id, options } as Field;
    if (type === 'range') {
      out.min = Number(f.min ?? 0);
      out.max = Number(f.max ?? 100);
      out.step = Number(f.step ?? 1);
    }
    if (type === 'preset') presets.push([at, out]);
    ids.add(id);
    return out;
  };

  const groups = (data.groups as unknown[])
    .map((g, gi) => {
      if (!isObj(g) || !Array.isArray(g.fields)) {
        warnings.push(`groups[${gi}]: thiếu "fields" ( mảng ) → bỏ qua`);
        return null;
      }
      return { ...g, fields: g.fields.map((f: unknown, fi: number) => field(f, `groups[${gi}].fields[${fi}]`)).filter(Boolean) } as Group;
    })
    .filter(Boolean) as Group[];

  presets.forEach(([at, p]) =>
    p.options.forEach((o) => Object.keys(o.values || {}).forEach((k) => !ids.has(k) && warnings.push(`${at}: values.${k} không khớp field nào`))),
  );
  if (!groups.some((g) => g.fields.length)) warnings.push('Schema chưa có field hợp lệ nào');
  return { schema: { ...data, groups } as Schema, errors, warnings };
}

/** Giá trị thô ( localStorage, API ) → giá trị hợp lệ của field, sai thì undefined */
function coerce(f: Field, v: unknown): Value | undefined {
  switch (f.type) {
    case 'section-swap':
    case 'select': {
      const s = String(v);
      return f.options.some((o) => o.value === s) ? s : undefined;
    }
    case 'toggle':
    case 'visibility':
      if (v === true || v === 'true' || v === '1' || v === 1) return true;
      return v === false || v === 'false' || v === '0' || v === 0 ? false : undefined;
    case 'range': {
      const n = typeof v === 'number' ? v : parseFloat(String(v));
      return Number.isFinite(n) ? clamp(n, f.min!, f.max!) : undefined;
    }
    case 'color': {
      let s = String(v).trim();
      if (s[0] !== '#') s = `#${s}`;
      if (!HEX.test(s)) return undefined;
      if (s.length === 4) s = `#${s[1]}${s[1]}${s[2]}${s[2]}${s[3]}${s[3]}`;
      return s.toLowerCase();
    }
    default:
      return undefined;
  }
}

/** HTML trả về từ ?section_id= → thẻ wrapper .shopify-section ( script trong <template> chưa chạy ) */
function toSection(html: string): Element | null {
  const tpl = document.createElement('template');
  tpl.innerHTML = html;
  return tpl.content.querySelector('.shopify-section,[id^="shopify-section-"]') || tpl.content.firstElementChild;
}

const fire = (el: Element, name: string) => el.dispatchEvent(new CustomEvent(name, { bubbles: true, detail: { sectionId: sectionIdOf(el) } }));

/**
 * CSS ( thẻ <style data-xo-theme-settings> chèn 1 lần vào <head> ). Mọi selector bắt đầu bằng xo-theme-settings hoặc
 * .xo-ts.xo-ts ( không rò ra theme ); class xo-ts__* ( theme không nhắm tới ). Chống CSS theme lọt vào: nút dùng
 * all:unset; trong bảng, mọi phần tử ( trừ svg và custom element của thư viện: xo-collapse cần CSS của nó ) all:revert
 * với độ ưu tiên .xo-ts.xo-ts ( cao hơn button {…}, .foo input {…} của theme ), rồi mới đặt style riêng
 */
const CSS_SHELL = `
xo-theme-settings{display:contents;--xo-backdrop-color:var(--xo-ts-backdrop,rgba(17,17,17,.2))}
xo-theme-settings .xo-ts-fab.xo-ts-fab{all:unset;box-sizing:border-box;position:fixed;z-index:var(--xo-ts-z,2147483000);display:inline-flex;align-items:center;gap:8px;padding:11px 16px 11px 13px;border-radius:999px;background:var(--xo-ts-accent,#161616);color:var(--xo-ts-accent-fg,#fff);font:600 14px/1.2 var(--xo-ts-font,system-ui,-apple-system,"Segoe UI",Roboto,sans-serif);letter-spacing:normal;text-transform:none;white-space:nowrap;box-shadow:0 8px 28px rgba(0,0,0,.22);cursor:pointer;-webkit-tap-highlight-color:transparent;transition:right .35s cubic-bezier(.2,.8,.2,1),left .35s cubic-bezier(.2,.8,.2,1)}
xo-theme-settings .xo-ts-fab.xo-ts-fab svg{display:block;flex:none;width:18px;height:18px;fill:none;stroke:currentColor}
xo-theme-settings .xo-ts-fab.xo-ts-fab>span{all:unset}
xo-theme-settings .xo-ts-fab.xo-ts-fab>span:empty{display:none}
xo-theme-settings .xo-ts-fab.xo-ts-fab:focus-visible{outline:2px solid var(--xo-ts-accent,#161616);outline-offset:3px}
xo-theme-settings .xo-ts-fab[data-pos$=right]{right:max(16px,env(safe-area-inset-right))}
xo-theme-settings .xo-ts-fab[data-pos$=left]{left:max(16px,env(safe-area-inset-left))}
xo-theme-settings .xo-ts-fab[data-pos^=bottom]{bottom:max(16px,env(safe-area-inset-bottom))}
xo-theme-settings .xo-ts-fab[data-pos^=top]{top:16px}
xo-theme-settings .xo-ts-fab[data-pos^=middle]{top:50%;transform:translateY(-50%)}
@media (min-width:641px){
xo-theme-settings .xo-ts-fab[aria-expanded=true][data-pos$=right]{right:calc(min(var(--xo-ts-width,380px),100vw) + 16px)}
xo-theme-settings .xo-ts-fab[aria-expanded=true][data-pos$=left]{left:calc(min(var(--xo-ts-width,380px),100vw) + 16px)}
}
xo-theme-settings .xo-ts-spin.xo-ts-spin{all:unset;position:fixed;z-index:var(--xo-ts-z,2147483000);width:30px;height:30px;margin:-15px 0 0 -15px;box-sizing:border-box;border:3px solid rgba(127,127,127,.3);border-top-color:var(--xo-ts-accent,#161616);border-radius:50%;animation:xo-ts-rot .8s linear infinite;pointer-events:none}
xo-theme-settings .xo-ts-fab[aria-busy=true] svg{animation:xo-ts-rot .8s linear infinite}
xo-theme-settings .xo-ts-spin[hidden]{display:none}
@keyframes xo-ts-rot{to{transform:rotate(1turn)}}
@media (prefers-reduced-motion:reduce){xo-theme-settings .xo-ts-fab.xo-ts-fab{transition:none}}
`;

/**
 * CSS của bảng ( & = .xo-ts.xo-ts, gốc là <xo-theme-settings-panel class="xo-ts"> trong xo-modal ). Kích thước drawer đặt
 * ở gốc ( xo-modal-content co theo nội dung ). all:revert giữ visibility / pointer-events kế thừa từ xo-modal ( đóng thì
 * ẩn, đang chạy hiệu ứng thì chưa nhận chuột )
 */
const CSS_PANEL = `
&{all:revert;display:block;box-sizing:border-box;width:min(var(--xo-ts-width,380px),100vw);height:100vh;height:100dvh;--bg:var(--xo-ts-bg,#fff);--fg:var(--xo-ts-fg,#161616);--mu:var(--xo-ts-muted,#6b6b6b);--ln:var(--xo-ts-line,rgba(0,0,0,.12));--ac:var(--xo-ts-accent,#161616);--on:var(--xo-ts-accent-fg,#fff);--rd:var(--xo-ts-radius,12px);font:400 14px/1.45 var(--xo-ts-font,system-ui,-apple-system,"Segoe UI",Roboto,sans-serif);color:var(--fg);text-align:start;letter-spacing:normal;word-spacing:normal;text-transform:none;text-indent:0;text-shadow:none;white-space:normal;word-break:normal;overflow-wrap:normal;font-feature-settings:normal}
& *:not(svg,svg *,xo-collapse,xo-collapse-trigger,xo-modal-trigger),& *::before,& *::after{all:revert;box-sizing:border-box}
& :is(xo-collapse,xo-collapse-trigger,xo-modal-trigger){margin:0;padding:0;border:0;font:inherit;color:inherit;letter-spacing:inherit;word-spacing:inherit;text-transform:inherit;text-align:inherit;white-space:inherit;text-shadow:inherit}
& [hidden]{display:none!important}
& svg{display:block;fill:none;stroke:currentColor}
& button,& input,& textarea{font:inherit;color:inherit;letter-spacing:inherit;text-transform:none}
& :focus-visible{outline:2px solid var(--ac);outline-offset:2px}
@keyframes xo-ts-rot{to{transform:rotate(1turn)}}
& .xo-ts__drawer{display:flex;flex-direction:column;height:100%;background:var(--bg);color:var(--fg);box-shadow:-12px 0 40px rgba(0,0,0,.18);overflow:hidden}
& .xo-ts__drawer--left{box-shadow:12px 0 40px rgba(0,0,0,.18)}
& .xo-ts__head{display:flex;align-items:center;gap:12px;padding:14px 12px 12px 20px;border-bottom:1px solid var(--ln)}
& .xo-ts__title{flex:1;margin:0;font-size:16px;font-weight:650;line-height:1.3}
& .xo-ts__close{display:grid;place-items:center;width:38px;height:38px;margin:0;padding:0;border:0;border-radius:50%;background:none;cursor:pointer}
& .xo-ts__close:hover{background:rgba(127,127,127,.12)}
& .xo-ts__close svg{width:18px;height:18px}
& .xo-ts__tabs{display:flex;gap:6px;padding:10px 20px 0}
& .xo-ts__tab{margin:0;padding:6px 14px;border:1px solid var(--ln);border-radius:99px;background:none;cursor:pointer;font-weight:550}
& .xo-ts__tab[aria-pressed=true]{background:var(--ac);border-color:var(--ac);color:var(--on)}
& .xo-ts__body{flex:1;min-height:0;overflow:auto;overscroll-behavior:contain;padding:6px 20px 20px}
& .xo-ts__group{border-bottom:1px solid var(--ln)}
& .xo-ts__group-btn{display:flex;width:100%;align-items:center;justify-content:space-between;gap:12px;margin:0;padding:15px 0;border:0;background:none;font-weight:650;text-align:start;cursor:pointer}
& .xo-ts__group-btn::after{content:"";width:7px;height:7px;margin-right:4px;border:solid currentColor;border-width:0 1.5px 1.5px 0;transform:rotate(45deg);transition:transform .2s}
& .xo-ts__group-btn[aria-expanded=true]::after{transform:rotate(-135deg)}
& .xo-ts__group-body{display:grid;gap:20px;padding:2px 0 20px}
& .xo-ts__label{display:flex;align-items:baseline;justify-content:space-between;gap:8px;margin:0 0 8px;font-weight:550}
& .xo-ts__info{margin:6px 0 0;color:var(--mu);font-size:12.5px}
& .xo-ts__empty{margin:24px 0;color:var(--mu);font-size:13px;text-align:center}
& .xo-ts__err{margin:8px 0 0;color:#b42318;font-size:13px}
& .xo-ts__opts{display:flex;flex-wrap:wrap;gap:8px}
& .xo-ts__opts--img{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:10px}
& .xo-ts__opt{position:relative;display:flex;flex-direction:column;gap:6px;min-width:0;margin:0;padding:8px 12px;border:1px solid var(--ln);border-radius:calc(var(--rd)*.75);background:none;color:inherit;font-weight:400;text-align:start;text-decoration:none;cursor:pointer;overflow-wrap:anywhere}
& .xo-ts__opts--img .xo-ts__opt{padding:6px 6px 8px}
& .xo-ts__opts--img .xo-ts__opt span,& .xo-ts__opts--img .xo-ts__opt small{padding:0 4px}
& .xo-ts__opt img{display:block;width:100%;height:auto;aspect-ratio:16/10;object-fit:cover;border-radius:calc(var(--rd)*.5);background:rgba(127,127,127,.12)}
& .xo-ts__opt small{color:var(--mu);font-size:12px}
& .xo-ts__opt:hover{border-color:rgba(127,127,127,.6)}
& .xo-ts__opt[aria-pressed=true],& .xo-ts__opt[aria-current=true]{border-color:var(--ac);box-shadow:inset 0 0 0 1px var(--ac)}
& .xo-ts__opt:disabled{opacity:.45;cursor:not-allowed}
& .xo-ts__opt[data-loading]::after{content:"";position:absolute;top:8px;right:8px;width:14px;height:14px;box-sizing:border-box;border:2px solid rgba(127,127,127,.35);border-top-color:var(--ac);border-radius:50%;background:var(--bg);animation:xo-ts-rot .8s linear infinite}
& .xo-ts__swatches{display:flex;flex-wrap:wrap;align-items:center;gap:10px;padding:4px}
& .xo-ts__swatch,& .xo-ts__color{position:relative;flex:none;width:28px;height:28px;margin:0;border:0;border-radius:50%;cursor:pointer;transition:transform .15s,box-shadow .15s}
& .xo-ts__swatch{padding:0;background:var(--c);box-shadow:inset 0 0 0 1px rgba(0,0,0,.14)}
& .xo-ts__swatch:hover,& .xo-ts__color:hover{transform:scale(1.08)}
& .xo-ts__swatch[aria-pressed=true]{box-shadow:inset 0 0 0 1px rgba(0,0,0,.14),0 0 0 2px var(--bg),0 0 0 4px var(--ac)}
& .xo-ts__color{-webkit-appearance:none;appearance:none;padding:3px;background:conic-gradient(#f43f5e,#f59e0b,#22c55e,#06b6d4,#6366f1,#d946ef,#f43f5e)}
& .xo-ts__color::-webkit-color-swatch-wrapper{padding:0}
& .xo-ts__color::-webkit-color-swatch{border:2px solid var(--bg);border-radius:50%}
& .xo-ts__color::-moz-color-swatch{border:2px solid var(--bg);border-radius:50%}
& .xo-ts__color[data-on]{box-shadow:0 0 0 2px var(--bg),0 0 0 4px var(--ac)}
& .xo-ts__swatch:focus-visible,& .xo-ts__color:focus-visible{outline:2px solid var(--ac);outline-offset:4px}
& .xo-ts__swatch:disabled,& .xo-ts__color:disabled{opacity:.45;cursor:not-allowed;transform:none}
& .xo-ts__code{font:12px/1.4 ui-monospace,Menlo,monospace;color:var(--mu)}
& .xo-ts__range{-webkit-appearance:none;appearance:none;display:block;width:100%;height:22px;margin:0;padding:0;background:none;cursor:pointer}
& .xo-ts__range::-webkit-slider-runnable-track{height:4px;border-radius:4px;background:linear-gradient(to right,var(--ac) var(--p,50%),var(--ln) var(--p,50%))}
& .xo-ts__range::-moz-range-track{height:4px;border-radius:4px;background:var(--ln)}
& .xo-ts__range::-moz-range-progress{height:4px;border-radius:4px;background:var(--ac)}
& .xo-ts__range::-webkit-slider-thumb{-webkit-appearance:none;appearance:none;width:18px;height:18px;margin-top:-7px;border:2px solid var(--ac);border-radius:50%;background:var(--bg);box-shadow:0 1px 4px rgba(0,0,0,.18);transition:transform .15s}
& .xo-ts__range::-moz-range-thumb{width:14px;height:14px;border:2px solid var(--ac);border-radius:50%;background:var(--bg);box-shadow:0 1px 4px rgba(0,0,0,.18);transition:transform .15s}
& .xo-ts__range:hover::-webkit-slider-thumb,& .xo-ts__range:active::-webkit-slider-thumb{transform:scale(1.12)}
& .xo-ts__range:hover::-moz-range-thumb,& .xo-ts__range:active::-moz-range-thumb{transform:scale(1.12)}
& .xo-ts__range:focus-visible{outline:none}
& .xo-ts__range:focus-visible::-webkit-slider-thumb{box-shadow:0 0 0 4px rgba(127,127,127,.25)}
& .xo-ts__range:focus-visible::-moz-range-thumb{box-shadow:0 0 0 4px rgba(127,127,127,.25)}
& .xo-ts__range:disabled{opacity:.45;cursor:not-allowed}
& output.xo-ts__code{min-width:2.4em;padding:1px 8px;border-radius:99px;background:rgba(127,127,127,.12);color:var(--fg);text-align:center}
& .xo-ts__switch{display:flex;align-items:center;justify-content:space-between;gap:12px;margin:0;font-weight:550;cursor:pointer}
& .xo-ts__switch input{-webkit-appearance:none;appearance:none;position:relative;flex:none;width:40px;height:24px;margin:0;padding:0;border:0;border-radius:99px;background:rgba(127,127,127,.35);cursor:pointer;transition:background .2s}
& .xo-ts__switch input::after{content:"";position:absolute;top:3px;left:3px;width:18px;height:18px;border-radius:50%;background:#fff;box-shadow:0 1px 3px rgba(0,0,0,.25);transition:transform .2s}
& .xo-ts__switch input:checked{background:var(--ac)}
& .xo-ts__switch input:checked::after{transform:translateX(16px)}
& .xo-ts__note{display:flex;flex-wrap:wrap;align-items:center;gap:8px;margin:14px 0 4px;padding:12px 14px;border:1px solid var(--ln);border-radius:calc(var(--rd)*.75);font-size:13px}
& .xo-ts__note--err{border-color:#f4c5bf;background:#fff4f2;color:#9b1c1c}
& .xo-ts__drawer{position:relative}
& .xo-ts__foot{position:relative;display:flex;gap:8px;padding:12px 20px max(12px,env(safe-area-inset-bottom));border-top:1px solid var(--ln)}
& .xo-ts__btn{flex:1;margin:0;padding:10px 14px;border:1px solid var(--ln);border-radius:calc(var(--rd)*.75);background:none;font-weight:600;line-height:1.3;cursor:pointer;white-space:nowrap}
& .xo-ts__btn--pri{border-color:var(--ac);background:var(--ac);color:var(--on)}
& .xo-ts__btn--sm{flex:none;padding:5px 10px;font-size:12.5px}
& .xo-ts__btn:disabled{opacity:.45;cursor:not-allowed}
& .xo-ts__status{position:absolute;left:50%;bottom:calc(100% + 10px);z-index:1;width:max-content;max-width:calc(100% - 40px);margin:0;padding:7px 14px;border-radius:12px;background:var(--fg);color:var(--bg);font-size:12.5px;line-height:1.4;text-align:center;white-space:normal;transform:translateX(-50%);pointer-events:none;transition:opacity .2s}
& .xo-ts__status:empty{opacity:0}
& .xo-ts__drawer > .xo-ts__status{bottom:max(16px,env(safe-area-inset-bottom))}
& .xo-ts__editor{padding-top:14px}
& .xo-ts__textarea{display:block;width:100%;min-height:50vh;margin:0;padding:12px;border:1px solid var(--ln);border-radius:calc(var(--rd)*.75);background:rgba(127,127,127,.06);font:12.5px/1.5 ui-monospace,Menlo,monospace;white-space:pre;tab-size:2;resize:vertical}
& .xo-ts__msgs{display:grid;gap:4px;margin:10px 0;padding:0;font-size:12.5px;list-style:none}
& .xo-ts__msg--e{color:#b42318}
& .xo-ts__msg--w{color:#9a6700}
& .xo-ts__msg--ok{color:#067647}
& .xo-ts__row{display:flex;flex-wrap:wrap;gap:8px}
@media (max-width:640px){&{width:100vw}& .xo-ts__drawer{box-shadow:none}& .xo-ts__textarea{font-size:16px}}
`.replace(/&/g, '.xo-ts.xo-ts');

/** Chèn CSS 1 lần vào <head> ( dùng chung mọi instance ) */
function injectStyle(name: string, css: string) {
  if (document.querySelector(`style[data-xo-theme-settings="${name}"]`)) return;
  document.head.append(h('style', { 'data-xo-theme-settings': name, text: css }));
}

@customElements(TAG)
export class ThemeSettings extends XoComponent<Props> {
  static propTypes: PropTypes<Props> = { xoSchema: 'string', xoEditor: 'boolean' };

  static observedProps: (keyof Props)[] = ['xoSchema'];

  private ac = new AbortController();

  private started = false;

  private schema: Schema | null = null;

  /** Lỗi làm schema không dùng được ( hiện trong drawer ) */
  private problem = '';

  /** Mọi field theo id ( preset / link không có id thì được đặt id tự động ) */
  private fields = new Map<string, Field>();

  private defaults: Dict<Value> = {};

  /** Giá trị khách đã chọn ( đang xem thử ); lưu localStorage khi Áp dụng */
  private values: Dict<Value> = {};

  /** id field section-swap / visibility → section của nó ( null: trang này không có ) */
  private slots = new Map<string, Slot | null>();

  /** Giá trị gốc của mọi thứ đã sửa trên trang ( biến CSS, attribute, class ) để "Đặt lại" trả về đúng như cũ */
  private touched = new Map<Element, Map<string, string | null>>();

  /** src các script đã có trên trang ( không nạp lại khi section mới chứa cùng script ) */
  private seenSrc = new Set<string>();

  private html = new Map<string, string>();

  private pending = new Map<string, Promise<string>>();

  private errs = new Map<string, string>();

  private loadingOpt = new Map<string, string>();

  private loadingN = 0;

  private editorOn = false;

  /** xo-name của xo-modal ( duy nhất mỗi instance ) */
  private modalName = '';

  /** Tuỳ chọn xo-modal đang áp ( đổi bên / overlay khi sửa schema thì đặt lại ) */
  private modalKey = '';

  private fab!: HTMLButtonElement;

  private spin!: HTMLElement;

  private modal: HTMLElement | null = null;

  /** <xo-theme-settings-panel class="xo-ts">: gốc của bảng, nằm trong xo-modal ( light DOM ) */
  private panel!: HTMLElement;

  /** Khung drawer ( null: chưa dựng, dựng ở lần mở đầu ) */
  private dw: HTMLElement | null = null;

  /** Lần dựng nhóm: xo-name của xo-collapse không trùng trạng thái cũ khi dựng lại */
  private renderN = 0;

  private isOpen = false;

  /** Mục đã lưu không thuộc schema hiện tại: giữ nguyên khi Áp dụng ( không làm mất ) */
  private extra: Dict = {};

  /** Nhóm trong drawer + id các field của nó ( ẩn nhóm khi không còn field nào dùng được ) */
  private groupEls: { el: HTMLElement; ids: string[] }[] = [];

  private emptyEl: HTMLElement | null = null;

  /** Lần đóng sắp tới không bỏ thay đổi ( Áp dụng; xo-modal tự đóng khi đọc lại tuỳ chọn ) */
  private keep = false;

  private titleEl!: HTMLElement;

  private ui!: HTMLElement;

  private ed: HTMLElement | null = null;

  private statusEl!: HTMLElement;

  /** Thanh cuối ( hoặc riêng dòng thông báo khi ẩn cả 2 nút ): dựng lại khi schema đổi */
  private footEl: HTMLElement | null = null;

  private boxes = new Map<string, HTMLElement>();

  private timer = 0;

  private checkLater = debounce(() => this.checkEditor(), 250);

  mount() {
    this.ac = new AbortController();
    if (!this.modalName) this.modalName = TAG + (instances++ ? `-${instances}` : '');
    // Gắn lại ( phần tử bị di chuyển ): dựng lại UI, giữ nguyên trạng thái trang
    this.renderShell();
    if (!this.started) {
      this.started = true;
      this.editorOn = !!this.props.xoEditor || /[?&]xo-theme-settings-edit(?:[=&]|$)/.test(location.search);
      document.querySelectorAll<HTMLScriptElement>('script[src]').forEach((s) => this.seenSrc.add(s.src));
      this.useSchema(this.sourceRaw(), true);
    } else {
      this.updateFab();
    }
    // xo-modal tạo sau khi đọc schema: biết drawer mở bên trái hay phải ngay từ đầu
    this.mountModal();
    // Bộ nạp ghi nhận khách đã bấm nút trước khi component về: mở drawer khi xo-modal sẵn sàng
    if (this.hasAttribute('xo-open-on-load')) this.openWhenReady();
  }

  /** Chờ xo-modal dựng xong ( định nghĩa + mount, có xo-modal-content ) rồi mở; tối đa ~5 giây */
  private openWhenReady(tries = 0) {
    const ready = window.customElements.get('xo-modal') && this.modal?.shadowRoot?.querySelector('xo-modal-content');
    if (!ready && tries < 100 && !this.ac.signal.aborted) {
      window.setTimeout(() => this.openWhenReady(tries + 1), 50);
      return;
    }
    this.removeAttribute('xo-open-on-load');
    this.fab.removeAttribute('aria-busy');
    if (ready) this.open();
  }

  unmount() {
    this.ac.abort();
    clearTimeout(this.timer);
  }

  propUpdate({ name }: PropUpdateParams<Props>) {
    if (name === 'xoSchema' && this.started && !this.override()) this.useSchema(this.props.xoSchema || '', false);
  }

  // ---------- API ----------

  /** Mở drawer qua API của xo-modal ( window.xoModal ) */
  public open() {
    if (!this.modalReady()) return;
    this.build();
    xoModalApi()!.open(this.modalName);
  }

  /** Đóng như nút X: bỏ thay đổi chưa áp dụng ( theme về như cũ ) */
  public close() {
    if (this.modalReady()) xoModalApi()!.close(this.modalName);
  }

  /** Lưu lựa chọn đang xem ( localStorage, giữ khi chuyển trang ) rồi đóng drawer ( không bỏ thay đổi ) */
  public apply() {
    this.save();
    this.emit(EVENT_APPLY, { detail: { values: { ...this.values } }, bubbles: true });
    if (this.isOpen && this.modalReady()) {
      this.keep = true;
      xoModalApi()!.close(this.modalName);
    }
  }

  /** Giá trị khách đã chọn ( chỉ các field khác mặc định ) */
  public getValues(): Dict<Value> {
    return { ...this.values };
  }

  /** Đặt giá trị 1 field ( như khách bấm ). Trả về false nếu id / giá trị sai hoặc tải section lỗi */
  public async setValue(id: string, raw: unknown, emit = true): Promise<boolean> {
    const f = this.fields.get(id);
    if (!f || !VALUED.includes(f.type)) return false;
    const v = coerce(f, raw);
    if (v === undefined) return false;
    if (f.type === 'section-swap') {
      this.errs.delete(id);
      this.loadingOpt.set(id, v as string);
      this.sync();
      let ok = false;
      try {
        ok = await this.swap(f, v as string);
      } catch (error) {
        if (!this.ac.signal.aborted) {
          this.errs.set(id, `Không tải được mẫu này ( ${(error as Error).message} ). Đang giữ section cũ.`);
          console.warn(`[${TAG}] section-swap "${id}":`, error);
        }
      }
      if (this.loadingOpt.get(id) === v) this.loadingOpt.delete(id);
      if (!ok) {
        this.sync();
        return false;
      }
    } else {
      this.applyField(f, v);
    }
    // Giữ cả giá trị trùng mặc định: phải áp lại lên section mới sau khi đổi section. Chỉ xem thử: lưu khi Áp dụng
    this.values[id] = v;
    this.sync();
    if (emit) this.emit(EVENT, { detail: { id, value: v }, bubbles: true });
    return true;
  }

  /** Đặt lại: theme về như cũ ( section gốc, biến CSS / attribute / class gốc ), xoá bản đã lưu. Không đóng drawer */
  public reset() {
    this.values = {};
    this.extra = {};
    storage.removeItem(this.key());
    this.errs.clear();
    this.restoreAll();
    this.sync();
    this.emit(EVENT_RESET, { bubbles: true });
  }

  // ---------- Schema + trạng thái ----------

  private key(k = '') {
    return `${TAG}${k && `-${k}`}:${location.host}`;
  }

  private override() {
    return storage.getItem(this.key('schema'));
  }

  private sourceRaw() {
    return this.override() ?? this.props.xoSchema ?? this.getAttribute('xo-schema') ?? '';
  }

  /** Áp schema: trả trang về gốc, đọc field, tìm section, áp giá trị ( lần đầu: bản đã Áp dụng trong localStorage ) */
  private useSchema(text: string, first: boolean) {
    const parsed = parseText(text);
    const res: Checked = parsed.error ? { schema: null, errors: [parsed.error], warnings: [] } : validate(parsed.data!);
    this.restoreAll();
    this.schema = res.schema;
    this.problem = res.errors[0] || '';
    this.fields.clear();
    this.slots.clear();
    this.errs.clear();
    this.defaults = {};
    if (this.problem) {
      console.error(`[${TAG}] Schema không hợp lệ: ${this.problem}. Kiểm tra attribute xo-schema ( JSON ); trong Liquid nhớ thêm | escape: xo-schema="{{ settings.theme_settings_schema | escape }}".`);
    }
    res.warnings.forEach((w) => console.warn(`[${TAG}] ${w}`));
    const raw: Dict = first ? objectParse<Dict>(storage.getItem(this.key()) || '{}') : this.values;
    this.values = {};
    if (this.schema) {
      const byEl = new Map<Element, Slot>();
      this.schema.groups.forEach((g) => g.fields.forEach((f) => this.fields.set(f.id, f)));
      this.fields.forEach((f) => {
        // section-swap / visibility / field có target dạng object: gắn với 1 section ( theo section qua mỗi lần đổi )
        if (f.type === 'section-swap' || f.type === 'visibility' || isObj(f.target)) {
          const el = this.resolve(typeof f.target === 'string' ? { selector: f.target } : (f.target as Target));
          if (el && !byEl.has(el)) byEl.set(el, { original: el, current: el, token: 0, busy: 0 });
          this.slots.set(f.id, el ? byEl.get(el)! : null);
        }
        if (VALUED.includes(f.type)) this.defaults[f.id] = this.defaultOf(f);
      });
      if (first) this.extra = {};
      // Giá trị của mọi field ( kể cả field có target không có trên trang này: chỉ áp ở trang có, vẫn giữ để lưu lại )
      Object.keys(raw).forEach((id) => {
        const f = this.fields.get(id);
        const v = f && VALUED.includes(f.type) ? coerce(f, raw[id]) : undefined;
        if (v !== undefined) this.values[id] = v;
        else if (first && !f) this.extra[id] = raw[id];
      });
      this.applyLocal();
      // Section đổi được tải ngay ( song song ); đã có trong sessionStorage thì thay luôn, không chờ
      Object.keys(this.values).forEach((id) => {
        const f = this.fields.get(id)!;
        if (f.type === 'section-swap') this.swap(f, this.values[id] as string).catch((e) => !this.ac.signal.aborted && console.warn(`[${TAG}] section-swap "${id}":`, e));
      });
    }
    this.updateFab();
    if (this.dw) this.renderBody();
  }

  private save() {
    storage.setItem(this.key(), JSON.stringify({ ...this.extra, ...this.values }));
  }

  private val(id: string): Value {
    return id in this.values ? this.values[id] : this.defaults[id];
  }

  private defaultOf(f: Field): Value {
    const given = f.default !== undefined ? coerce(f, f.default) : undefined;
    if (given !== undefined) return given;
    const el = this.els(f)[0];
    switch (f.type) {
      case 'section-swap':
        return f.options.find((o) => isOriginal(f, o))!.value;
      case 'visibility':
        return true;
      case 'toggle':
        return !!el && (f.class ? el.classList.contains(f.class) : el.getAttribute(f.attr!) === (f.on ?? ''));
      case 'select': {
        const css = el && f.var ? getComputedStyle(el).getPropertyValue(f.var).trim() : '';
        const hit = el && f.options.find((o) => (f.attr ? (el.getAttribute(f.attr) ?? '') === o.value : f.var ? css === o.value : el.classList.contains((f.class || '') + o.value)));
        return (hit || f.options[0]).value;
      }
      default: {
        const css = el ? getComputedStyle(el).getPropertyValue(f.var!).trim() : '';
        return coerce(f, css) ?? (f.type === 'color' ? '#000000' : f.min!);
      }
    }
  }

  // ---------- Áp lên trang ----------

  /** Section đích: match ( id chứa / class ) → selector → index */
  private resolve(t: Target): Element | null {
    const all = Array.from(document.querySelectorAll('.shopify-section'));
    let el: Element | null | undefined = null;
    if (t.match) el = all.find((s) => s.id.includes(t.match!) || s.classList.contains(t.match!));
    if (!el && t.selector) {
      try {
        const hit = document.querySelector(t.selector);
        el = hit && (hit.closest('.shopify-section') || hit);
      } catch {
        // selector sai cú pháp
      }
    }
    if (!el && typeof t.index === 'number') el = all[t.index];
    return el || null;
  }

  /**
   * Phần tử đích của field. target object ( hoặc visibility ): section đang hiện của field ( đổi section thì là phần tử
   * mới ), có inner thì các phần tử khớp inner bên trong. target chuỗi: selector trên cả trang ( mặc định :root )
   */
  /**
   * Field dùng được trên trang này không ( theo target có mặt, tự động, không cần khai báo trang ):
   * section-swap / visibility: section tìm được; target section + inner: section và inner đều có; target selector: có
   * phần tử khớp ( :root / html / body luôn có ); preset: có ít nhất 1 field trong values dùng được; link: luôn có
   */
  private available(f: Field): boolean {
    if (f.type === 'link') return true;
    if (f.type === 'preset') {
      return f.options.some((o) => Object.keys(o.values || {}).some((k) => {
        const x = this.fields.get(k);
        return !!x && x.type !== 'preset' && this.available(x);
      }));
    }
    if (this.slots.has(f.id)) {
      const slot = this.slots.get(f.id);
      if (!slot || !slot.current.isConnected) return false;
      return f.type === 'section-swap' || f.type === 'visibility' || this.els(f).length > 0;
    }
    return this.targets(f.target as string).length > 0;
  }

  /**
   * Tìm lại section chưa có / đã bị gỡ ( template khác, section thêm bớt ), áp giá trị cho field vừa dùng được, rồi ẩn
   * field / nhóm không dùng được ( hết field thì hiện dòng thông báo ). Chạy khi mở drawer và sau khi đổi section
   */
  private refresh() {
    const found = new Map<Element, Slot>();
    this.slots.forEach((slot) => slot && found.set(slot.current, slot).set(slot.original, slot));
    this.fields.forEach((f) => {
      if (!this.slots.has(f.id)) return;
      const slot = this.slots.get(f.id);
      if (slot && slot.current.isConnected) return;
      const el = this.resolve(typeof f.target === 'string' ? { selector: f.target } : (f.target as Target));
      // Không tìm thấy: giữ slot cũ ( section bị gỡ tạm, gắn lại đúng phần tử đó thì dùng được lại )
      if (!el) return;
      const next = found.get(el) || { original: el, current: el, token: 0, busy: 0 };
      found.set(el, next);
      this.slots.set(f.id, next);
      if (!(f.id in this.values)) return;
      if (f.type === 'section-swap') this.swap(f, this.values[f.id] as string).catch(() => {});
      else this.applyField(f, this.values[f.id]);
    });
    if (!this.dw) return;
    let any = false;
    this.groupEls.forEach(({ el, ids }) => {
      let n = 0;
      ids.forEach((id) => {
        const ok = this.available(this.fields.get(id)!);
        this.boxes.get(id)!.hidden = !ok;
        if (ok) n++;
      });
      el.hidden = !n;
      any = any || n > 0;
    });
    if (this.emptyEl) this.emptyEl.hidden = any || !this.schema || !this.groupEls.length;
  }

  private els(f: Field): HTMLElement[] {
    if (!this.slots.has(f.id)) return this.targets(f.target as string);
    const slot = this.slots.get(f.id);
    const inner = isObj(f.target) ? (f.target as Target).inner : '';
    const root = slot?.current as HTMLElement | undefined;
    if (!root || !inner) return root ? [root] : [];
    try {
      return root.matches(inner) ? [root] : Array.from(root.querySelectorAll<HTMLElement>(inner));
    } catch {
      return [];
    }
  }

  private targets(t?: Target | string): HTMLElement[] {
    const sel = typeof t === 'string' ? t : t?.selector;
    if (!sel || sel === ':root' || sel === 'html') return [document.documentElement];
    if (sel === 'body') return [document.body];
    try {
      return Array.from(document.querySelectorAll<HTMLElement>(sel));
    } catch {
      return [];
    }
  }

  /** Ghi lại giá trị gốc ( 1 lần ) rồi sửa. key: "p:" style, "a:" attribute, "c:" class */
  private touch(el: HTMLElement, key: string, value: string | null, important = false) {
    let saved = this.touched.get(el);
    if (!saved) this.touched.set(el, (saved = new Map()));
    const n = key.slice(2);
    if (!saved.has(key)) {
      saved.set(key, key[0] === 'p' ? el.style.getPropertyValue(n) || null : key[0] === 'a' ? el.getAttribute(n) : el.classList.contains(n) ? '' : null);
    }
    this.write(el, key, value, important);
  }

  private write(el: HTMLElement, key: string, value: string | null, important = false) {
    const n = key.slice(2);
    if (key[0] === 'p') {
      if (value == null) el.style.removeProperty(n);
      else el.style.setProperty(n, value, important ? 'important' : '');
    } else if (key[0] === 'a') {
      if (value == null) el.removeAttribute(n);
      else el.setAttribute(n, value);
    } else if (/^\S+$/.test(n)) {
      el.classList.toggle(n, value != null);
    }
  }

  private untouch(el: HTMLElement, key: string) {
    const saved = this.touched.get(el);
    if (!saved || !saved.has(key)) return;
    this.write(el, key, saved.get(key)!);
    saved.delete(key);
  }

  private applyField(f: Field, v: Value) {
    if (f.type === 'visibility') {
      const slot = this.slots.get(f.id);
      if (!slot) return;
      if (!v) this.els(f).forEach((el) => this.touch(el, 'p:display', 'none', true));
      else {
        // Hiện lại mọi phần tử đã ẩn của section này, cả phần tử gốc ( có thể bị ẩn trước khi đổi section, rồi gắn lại )
        this.touched.forEach((saved, el) => saved.has('p:display') && (slot.original.contains(el) || slot.current.contains(el)) && this.untouch(el as HTMLElement, 'p:display'));
      }
      return;
    }
    this.els(f).forEach((el) => {
      if (f.type === 'color') this.touch(el, `p:${f.var}`, String(v));
      else if (f.type === 'range') this.touch(el, `p:${f.var}`, `${v}${f.unit || ''}`);
      else if (f.type === 'toggle') {
        if (f.class) this.touch(el, `c:${f.class}`, v ? '' : null);
        if (f.attr) this.touch(el, `a:${f.attr}`, v ? f.on ?? '' : f.off || null);
      } else if (f.type === 'select') {
        if (f.attr) this.touch(el, `a:${f.attr}`, v === '' ? null : String(v));
        if (f.var) this.touch(el, `p:${f.var}`, v === '' ? null : String(v));
        if ('class' in f) {
          // Tiền tố ( "xo-border-radius--" ): bỏ MỌI class cùng tiền tố, thêm đúng 1. Không tiền tố: bỏ class của các lựa chọn khác
          const prefix = f.class || '';
          const others = prefix ? Array.from(el.classList).filter((c) => c.startsWith(prefix)) : f.options.map((o) => o.value);
          others.forEach((c) => c && c !== prefix + v && this.touch(el, `c:${c}`, null));
          if (v !== '') this.touch(el, `c:${prefix}${v}`, '');
        }
      }
    });
  }

  /** Áp lại các field không phải section-swap ( sau khi thay section: phần tử mới chưa có ). visibility luôn áp */
  private applyLocal() {
    this.fields.forEach((f) => {
      if (f.type === 'visibility' || (f.type !== 'section-swap' && f.id in this.values)) this.applyField(f, this.val(f.id));
    });
  }

  /** Trả trang về gốc: section gốc, giá trị gốc của mọi thứ đã sửa */
  private restoreAll() {
    new Set(this.slots.values()).forEach((s) => {
      if (!s) return;
      s.token++;
      this.replace(s, s.original, false, false);
    });
    this.touched.forEach((saved, el) => saved.forEach((v, k) => this.write(el as HTMLElement, k, v)));
    this.touched.clear();
  }

  // ---------- Đổi section ----------

  /** URL ( cũng là khoá cache ): đúng <đường dẫn hiện tại>?section_id=<section>, không tham số nào khác */
  private sectionUrl(f: Field, o: Opt) {
    return `${location.pathname}?section_id=${enc(o.section || f.section!)}`;
  }

  /** HTML đã có sẵn ( bộ nhớ / sessionStorage còn hạn ), không thì null */
  private peek(url: string): string | null {
    const mem = this.html.get(url);
    if (mem != null) return mem;
    const ttl = (this.schema?.cache ?? 600) * 1000;
    try {
      const hit = ttl > 0 && JSON.parse(sessionStorage.getItem(`xo-ts:${url}`) || 'null');
      if (hit && Date.now() - hit.t < ttl && typeof hit.h === 'string') {
        this.html.set(url, hit.h);
        return hit.h;
      }
    } catch {
      // sessionStorage bị chặn / hỏng
    }
    return null;
  }

  private fetchSection(url: string): Promise<string> {
    let p = this.pending.get(url);
    if (p) return p;
    // Chỉ tải cùng origin ( HTML section của chính store, tin như theme editor )
    if (new URL(url, location.href).origin !== location.origin) return Promise.reject(new Error('chỉ tải section cùng origin'));
    p = fetch(url, { credentials: 'same-origin', signal: this.ac.signal })
      .then((res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return res.text();
      })
      .then((text) => {
        this.html.set(url, text);
        try {
          if ((this.schema?.cache ?? 600) > 0) sessionStorage.setItem(`xo-ts:${url}`, JSON.stringify({ t: Date.now(), h: text }));
        } catch {
          // đầy / bị chặn: chỉ cache trong bộ nhớ
        }
        return text;
      })
      .finally(() => this.pending.delete(url));
    this.pending.set(url, p);
    return p;
  }

  /** Thay section. false: đã có lần chọn mới hơn. Trang không có section này: true ( vẫn lưu giá trị ) */
  private async swap(f: Field, value: string): Promise<boolean> {
    const slot = this.slots.get(f.id);
    if (!slot) return true;
    const o = f.options.find((x) => x.value === value)!;
    const token = ++slot.token;
    if (isOriginal(f, o)) {
      this.replace(slot, slot.original, false);
      return true;
    }
    const url = this.sectionUrl(f, o);
    let html = this.peek(url);
    if (html == null) {
      this.busy(slot, true);
      try {
        html = await this.fetchSection(url);
      } finally {
        this.busy(slot, false);
      }
    }
    if (token !== slot.token) return false;
    const el = toSection(html);
    if (!el) throw new Error('phản hồi không có section');
    this.replace(slot, el, true);
    return true;
  }

  /**
   * Gắn section mới ( hoặc gắn lại phần tử gốc ). Thứ tự: unload ở section cũ → thay → áp lại các field ( class bo góc,
   * ẩn hiện, biến CSS… lên phần tử mới ) → chạy script → load ở section mới. reapply false: đang trả trang về gốc
   */
  private replace(slot: Slot, next: Element, fresh: boolean, reapply = true) {
    const prev = slot.current;
    prev.removeAttribute(LOADING);
    if (prev === next || !prev.isConnected) return;
    fire(prev, 'shopify:section:unload');
    prev.replaceWith(next);
    slot.current = next;
    if (reapply) this.applyLocal();
    if (fresh) this.runScripts(next);
    fire(next, 'shopify:section:load');
    if (reapply) this.refresh();
  }

  /** Script chèn bằng innerHTML không chạy: tạo lại thẻ. Script src đã có trên trang thì không nạp lại */
  private runScripts(root: Element) {
    document.querySelectorAll<HTMLScriptElement>('script[src]').forEach((s) => !root.contains(s) && this.seenSrc.add(s.src));
    root.querySelectorAll('script').forEach((old) => {
      if (!JS_TYPE.test(old.type.trim())) return; // application/json, ld+json, template: để nguyên
      const src = old.getAttribute('src');
      if (src) {
        const abs = new URL(src, location.href).href;
        if (this.seenSrc.has(abs)) return;
        this.seenSrc.add(abs);
      }
      const s = document.createElement('script');
      Array.from(old.attributes).forEach((a) => s.setAttribute(a.name, a.value));
      if (!src) s.textContent = old.textContent;
      else if (!old.hasAttribute('async')) s.async = false; // giữ thứ tự giữa các script src
      old.replaceWith(s);
    });
  }

  /** Đang tải: làm mờ section ( style toàn cục 1 dòng, chèn khi cần ) + vòng xoay giữa phần section đang thấy */
  private busy(slot: Slot, on: boolean) {
    slot.busy += on ? 1 : -1;
    this.loadingN += on ? 1 : -1;
    const el = slot.current;
    if (slot.busy > 0) {
      if (!document.getElementById('xo-ts-style')) {
        document.head.append(h('style', { id: 'xo-ts-style', text: `[${LOADING}]{opacity:.4!important;transition:opacity .2s!important;pointer-events:none!important;cursor:progress}` }));
      }
      el.setAttribute(LOADING, '');
    } else {
      el.removeAttribute(LOADING);
    }
    if (on) {
      const r = el.getBoundingClientRect();
      const top = Math.max(r.top, 0);
      const bottom = Math.min(r.bottom, innerHeight);
      this.spin.hidden = bottom <= top;
      this.spin.style.left = `${(Math.max(r.left, 0) + Math.min(r.right, innerWidth)) / 2}px`;
      this.spin.style.top = `${(top + bottom) / 2}px`;
    } else if (!this.loadingN) {
      this.spin.hidden = true;
    }
  }

  // ---------- UI ----------

  /**
   * Khung ở light DOM ( xo-modal / xo-modal-trigger là custom element chạy theo store chung nên phải ở light DOM ):
   *   <xo-modal-trigger><button class="xo-ts-fab"> · vòng xoay ( CSS: <style data-xo-theme-settings> trong <head> ).
   * xo-modal tạo riêng ở mountModal()
   */
  private renderShell() {
    const sig = { signal: this.ac.signal };
    // Nút tĩnh do snippet in ra ( hiện trước khi JS chạy ): dùng lại, không tạo nút thứ 2. Không có thì tạo mới
    const own = this.querySelector<HTMLButtonElement>('button.xo-ts-fab');
    const focused = !!own && document.activeElement === own;
    // Giữ <style> của snippet ( CSS tối thiểu của nút tĩnh )
    this.replaceChildren(...Array.from(this.querySelectorAll(':scope > style')));
    this.modal = null;
    this.dw = null;
    this.footEl = null;
    this.ed = null;
    this.boxes.clear();
    this.fab = own || h('button', { type: 'button', class: 'xo-ts-fab' });
    this.fab.setAttribute('aria-haspopup', 'dialog');
    this.fab.setAttribute('aria-expanded', 'false');
    if (!this.fab.querySelector('svg')) this.fab.insertAdjacentHTML('afterbegin', ICON);
    if (!this.fab.querySelector(':scope > span')) this.fab.append(h('span'));
    this.spin = h('div', { class: 'xo-ts-spin', hidden: true, 'aria-hidden': 'true' });
    injectStyle('shell', CSS_SHELL);
    this.append(h('xo-modal-trigger' as 'div', { 'xo-name': this.modalName }, this.fab), this.spin);
    // Di chuyển nút làm mất focus: trả lại
    if (focused) this.fab.focus({ preventScroll: true });
    // Dựng nội dung trước khi trigger mở ( xo-modal-trigger chờ 1 task rồi mới đổi store )
    this.fab.addEventListener('click', () => this.modalReady() && this.build(), sig);
  }

  /**
   * <xo-modal xo-name xo-placement xo-animate …> chứa <xo-theme-settings-panel class="xo-ts">. Mặc định không che trang:
   * xo-backdrop-disabled, xo-scroll-disabled="false", xo-focus-trap="false" ( khách vừa cuộn, bấm trang vừa xem đổi ).
   * schema.drawer.overlay / lockScroll bật lại backdrop / khoá cuộn ( có overlay thì giữ Tab trong drawer ). Esc, nút
   * đóng, top layer ( xo-portal tự bật nếu có Popover API ), trả focus khi đóng: của xo-modal
   */
  private mountModal() {
    const sig = this.ac.signal;
    this.panel = h('xo-theme-settings-panel' as 'div', { class: 'xo-ts' });
    const attrs = this.modalAttrs();
    this.modalKey = JSON.stringify(attrs);
    this.modal = h('xo-modal' as 'div', { 'xo-name': this.modalName, 'xo-duration': 350, 'xo-observed': 0, ...attrs }, this.panel);
    this.insertBefore(this.modal, this.spin);
    const ce = window.customElements;
    if (!ce.get('xo-modal')) {
      const t = window.setTimeout(() => !ce.get('xo-modal') && console.error(MISSING), 3000);
      sig.addEventListener('abort', () => clearTimeout(t));
    }
    ce.whenDefined('xo-modal').then(() => {
      const api = xoModalApi();
      if (sig.aborted || !api?.on) return;
      const offs = [
        api.on('open', this.modalName, () => {
          this.isOpen = true;
          this.build();
          // Trang có thể đã đổi ( section thêm / bớt ): tính lại field nào dùng được
          this.refresh();
          this.fab.setAttribute('aria-expanded', 'true');
        }),
        api.on('close', this.modalName, () => {
          if (!this.isOpen) return;
          this.isOpen = false;
          this.fab.setAttribute('aria-expanded', 'false');
          // Mọi cách đóng ( X là xo-modal-trigger, Esc, bấm lại nút mở, close() ) đi qua đây: đóng mà không Áp dụng là
          // bỏ thay đổi, theme về như cũ. Áp dụng đặt keep trước khi đóng
          if (this.keep) this.keep = false;
          else this.reset();
          // xo-modal trả focus về phần tử được focus lúc mở; Safari không focus nút khi bấm chuột nên có thể chưa có:
          // focus còn ở body / trong drawer thì đưa về nút
          const active = document.activeElement;
          if (!active || active === document.body || this.modal?.contains(active)) this.fab.focus({ preventScroll: true });
        }),
      ];
      sig.addEventListener('abort', () => offs.forEach((off) => off()));
    });
  }

  /** Thuộc tính xo-modal theo schema ( null: bỏ thuộc tính ) */
  private modalAttrs(): Dict<string | null> {
    const left = (this.schema?.button?.position || '').endsWith('left');
    const { overlay = false, lockScroll = false } = this.schema?.drawer || {};
    return {
      'xo-placement': left ? 'top-left' : 'top-right',
      'xo-animate': left ? 'slide-right' : 'slide-left',
      'xo-backdrop-disabled': overlay ? null : '',
      'xo-scroll-disabled': lockScroll ? null : 'false',
      'xo-focus-trap': overlay ? null : 'false',
    };
  }

  private modalReady() {
    if (window.customElements.get('xo-modal') && xoModalApi()) return true;
    console.error(MISSING);
    return false;
  }

  private updateFab() {
    const b = this.schema?.button || {};
    const label = b.label ?? 'Tuỳ biến';
    const pos = POSITIONS.includes(b.position!) ? b.position! : 'bottom-right';
    this.fab.querySelector(':scope > span')!.textContent = label;
    this.fab.dataset.pos = pos;
    this.fab.setAttribute('aria-label', label || 'Tuỳ biến giao diện');
    this.dw?.classList.toggle('xo-ts__drawer--left', pos.endsWith('left'));
    // Đổi bên / overlay khi xo-modal đã chạy ( sửa schema ): đổi xo-observed để xo-modal đọc lại tuỳ chọn
    const attrs = this.modalAttrs();
    const key = JSON.stringify(attrs);
    if (!this.modal || key === this.modalKey) return;
    this.modalKey = key;
    Object.keys(attrs).forEach((k) => (attrs[k] == null ? this.modal!.removeAttribute(k) : this.modal!.setAttribute(k, attrs[k]!)));
    // xo-modal đọc lại tuỳ chọn thì tự đóng: lần đóng đó không phải khách bỏ thay đổi
    if (this.isOpen) this.keep = true;
    this.modal.setAttribute('xo-observed', String(Date.now()));
  }

  /** Dựng nội dung drawer ( 1 lần, ở lần mở đầu ) trong <xo-theme-settings-panel> */
  private build() {
    if (this.dw || !this.modal) return;
    const sig = { signal: this.ac.signal };
    injectStyle('panel', CSS_PANEL);
    const titleId = uid();
    this.titleEl = h('h2', { class: 'xo-ts__title', id: titleId });
    // Nút đóng là xo-modal-trigger của chính modal
    const close = h('button', { type: 'button', class: 'xo-ts__close', 'aria-label': 'Đóng' });
    close.innerHTML = CLOSE;
    this.ui = h('div', { class: 'xo-ts__ui' });
    this.statusEl = h('p', { class: 'xo-ts__status', role: 'status' });
    const tab = (text: string, name: string, on: boolean) => h('button', { type: 'button', class: 'xo-ts__tab', 'data-act': 'tab', 'data-tab': name, 'aria-pressed': String(on), text });
    const d = h(
      'div',
      { class: 'xo-ts__drawer', role: 'dialog', 'aria-labelledby': titleId },
      h('header', { class: 'xo-ts__head' }, this.titleEl, h('xo-modal-trigger' as 'div', { 'xo-name': this.modalName }, close)),
      this.editorOn && h('div', { class: 'xo-ts__tabs' }, tab('Tuỳ biến', 'ui', true), tab('Schema', 'ed', false)),
      h('div', { class: 'xo-ts__body' }, this.ui),
      (this.footEl = this.renderFoot()),
    );
    d.addEventListener('click', this.onClick, sig);
    d.addEventListener('input', this.onInput, sig);
    d.addEventListener('change', this.onInput, sig);
    d.addEventListener('pointerover', this.onHover, sig);
    d.addEventListener('focusin', this.onHover, sig);
    // xo-collapse-trigger chỉ đổi xo-active: aria-expanded của nút nhóm theo đó
    const mo = new MutationObserver((records) =>
      records.forEach((r) => {
        const t = r.target as HTMLElement;
        if (t.localName === 'xo-collapse-trigger') t.firstElementChild?.setAttribute('aria-expanded', String(t.hasAttribute('xo-active') && t.getAttribute('xo-active') !== 'false'));
      }),
    );
    mo.observe(d, { subtree: true, attributes: true, attributeFilter: ['xo-active'] });
    this.ac.signal.addEventListener('abort', () => mo.disconnect());
    this.panel.append(d);
    this.dw = d;
    this.updateFab();
    this.renderBody();
  }

  private renderBody() {
    this.titleEl.textContent = this.schema?.title || 'Tuỳ biến giao diện';
    // schema.footer có thể đổi ( attribute / bản sửa ): dựng lại thanh cuối
    const foot = this.renderFoot();
    if (this.footEl && this.footEl !== foot) this.footEl.replaceWith(foot);
    this.footEl = foot;
    this.boxes.clear();
    this.groupEls = [];
    this.ui.replaceChildren();
    if (this.override()) {
      this.ui.append(
        h(
          'div',
          { class: 'xo-ts__note' },
          'Đang dùng schema sửa tạm ( lưu trong trình duyệt này ).',
          h('button', { type: 'button', class: 'xo-ts__btn xo-ts__btn--sm', 'data-act': 'discard', text: 'Bỏ bản sửa' }),
        ),
      );
    }
    if (this.problem) {
      this.ui.append(h('div', { class: 'xo-ts__note xo-ts__note--err', role: 'alert' }, h('b', { text: 'Schema không hợp lệ.' }), ' ', this.problem));
    }
    // Mỗi nhóm: xo-collapse-trigger ( nút ) + xo-collapse ( nội dung ), xo-name riêng. open: false thì đóng sẵn
    const run = ++this.renderN;
    this.schema?.groups.forEach((g, i) => {
      if (!g.fields.length) return;
      const name = `${this.modalName}-${run}-${i}`;
      const open = g.open !== false;
      const cid = uid();
      const group = h(
          'div',
          { class: 'xo-ts__group' },
          h(
            'xo-collapse-trigger' as 'div',
            { 'xo-name': name, 'xo-active': open },
            h('button', { type: 'button', class: 'xo-ts__group-btn', 'aria-expanded': String(open), 'aria-controls': cid, text: g.title || 'Tuỳ chọn' }),
          ),
          h('xo-collapse' as 'div', { 'xo-name': name, id: cid, 'xo-duration': 250, 'xo-active': open }, h('div', { class: 'xo-ts__group-body' }, ...g.fields.map((f) => this.renderField(f)))),
        );
      this.groupEls.push({ el: group, ids: g.fields.map((f) => f.id) });
      this.ui.append(group);
    });
    this.emptyEl = h('p', { class: 'xo-ts__empty', hidden: true, text: 'Trang này không có tuỳ chọn nào để đổi. Mở bảng ở trang khác ( trang chủ, sản phẩm… ) để thấy thêm.' });
    this.ui.append(this.emptyEl);
    this.refresh();
    this.dw!.querySelectorAll<HTMLButtonElement>('.xo-ts__foot [data-act=reset],.xo-ts__foot [data-act=apply]').forEach((b) => (b.disabled = !this.schema));
    this.sync();
  }

  private renderField(f: Field) {
    const lid = uid();
    const name = f.label || f.id;
    const box = h('div', { class: 'xo-ts__field' });
    if (f.type === 'toggle' || f.type === 'visibility') {
      box.append(h('label', { class: 'xo-ts__switch' }, h('span', { text: name }), h('input', { type: 'checkbox', role: 'switch', 'data-f': f.id })));
    } else if (f.type === 'range') {
      const iid = uid();
      box.append(
        h('label', { class: 'xo-ts__label', for: iid }, name, h('output', { class: 'xo-ts__code', for: iid })),
        h('input', { type: 'range', class: 'xo-ts__range', id: iid, min: f.min, max: f.max, step: f.step, 'data-f': f.id }),
      );
    } else if (f.type === 'color') {
      const sws = (f.swatches || []).map((c, i) =>
        HEX.test(c)
          ? h('button', { type: 'button', class: 'xo-ts__swatch', style: `--c:${c}`, 'aria-label': c, 'aria-pressed': 'false', 'data-f': f.id, 'data-o': i, 'data-sw': '' })
          : null,
      );
      box.append(
        h('div', { class: 'xo-ts__label', id: lid }, name, h('code', { class: 'xo-ts__code' })),
        h(
          'div',
          { class: 'xo-ts__swatches', role: 'group', 'aria-labelledby': lid },
          ...sws,
          h('input', { type: 'color', class: 'xo-ts__color', 'aria-label': `${name}: màu khác`, 'data-f': f.id }),
        ),
      );
    } else {
      const list = h('div', { class: f.options.some((o) => o.image) ? 'xo-ts__opts xo-ts__opts--img' : 'xo-ts__opts', role: 'group', 'aria-labelledby': f.label ? lid : null });
      f.options.forEach((o, i) => list.append(this.renderOption(f, o, i)));
      if (f.label) box.append(h('div', { class: 'xo-ts__label', id: lid, text: f.label }));
      box.append(list);
    }
    if (f.info) box.append(h('p', { class: 'xo-ts__info', text: f.info }));
    box.append(h('p', { class: 'xo-ts__err', role: 'alert', hidden: true }));
    this.boxes.set(f.id, box);
    return box;
  }

  private renderOption(f: Field, o: Opt, i: number) {
    const kids = [o.image ? h('img', { src: o.image, alt: '', loading: 'lazy', decoding: 'async' }) : null, h('span', { text: o.label || o.value })];
    if (f.type === 'link') {
      const u = safeUrl(o.url)!;
      // keep: sang store khác vẫn ở đúng loại trang ( giữ query của link, ví dụ ?preview_theme_id= )
      if (f.keep) u.pathname = location.pathname;
      const current = u.host === location.host;
      const blank = f.target === '_blank';
      return h('a', { class: 'xo-ts__opt', href: u.href, target: blank ? '_blank' : null, rel: blank ? 'noopener' : null, 'aria-current': current ? 'true' : null }, ...kids, current && h('small', { text: 'Đang xem' }));
    }
    return h('button', { type: 'button', class: 'xo-ts__opt', 'data-f': f.id, 'data-o': i, 'aria-pressed': 'false' }, ...kids);
  }

  /**
   * Thanh cuối: "Đặt lại" + "Áp dụng" ( chính ). schema.footer.reset / apply là chuỗi thì đổi chữ, false thì ẩn nút
   * ( ẩn Áp dụng thì không lưu được ). Thông báo ( lỗi, đã bỏ bản sửa… ) nổi phía
   * trên thanh, không chiếm chỗ ( trước đây dòng trạng thái rỗng làm khoảng dưới lớn hơn khoảng trên ). Ẩn cả 2 nút: thông
   * báo nổi ở đáy drawer
   */
  private renderFoot() {
    const cfg = this.schema?.footer || {};
    const label = (v: unknown, def: string) => (v === false ? null : typeof v === 'string' && v.trim() ? v : def);
    const reset = label(cfg.reset, 'Đặt lại');
    const apply = label(cfg.apply, 'Áp dụng');
    if (!reset && !apply) return this.statusEl;
    return h(
      'footer',
      { class: 'xo-ts__foot' },
      reset && h('button', { type: 'button', class: 'xo-ts__btn', 'data-act': 'reset', text: reset }),
      apply && h('button', { type: 'button', class: 'xo-ts__btn xo-ts__btn--pri', 'data-act': 'apply', text: apply }),
      this.statusEl,
    );
  }

  /** Đồng bộ UI theo giá trị hiện tại */
  private sync() {
    if (!this.dw) return;
    this.boxes.forEach((box, id) => {
      const f = this.fields.get(id)!;
      const v = this.val(id);
      box.querySelectorAll<HTMLElement>('[data-o]').forEach((b) => {
        const i = +b.dataset.o!;
        const o = f.options[i];
        let on: boolean;
        if (b.hasAttribute('data-sw')) on = (coerce(f, f.swatches![i]) ?? '') === v;
        else if (f.type === 'preset') on = Object.keys(o.values!).every((k) => this.fields.has(k) && coerce(this.fields.get(k)!, o.values![k]) === this.val(k));
        else on = o.value === v;
        b.setAttribute('aria-pressed', String(on));
        b.toggleAttribute('data-loading', !!o && this.loadingOpt.get(id) === o.value && !b.hasAttribute('data-sw'));
      });
      const input = box.querySelector<HTMLInputElement>('input');
      // Ô chọn màu tự do: sáng viền khi màu đang dùng không nằm trong các ô mẫu
      if (input?.type === 'color') input.toggleAttribute('data-on', !(f.swatches || []).some((c) => (coerce(f, c) ?? '') === v));
      if (input?.type === 'checkbox') input.checked = !!v;
      else if (input && input.value !== String(v)) input.value = String(v);
      // Thanh trượt: phần đã kéo tô màu nhấn ( WebKit / Blink không có ::range-progress )
      if (input?.type === 'range') input.style.setProperty('--p', `${((+v - f.min!) / Math.max(f.max! - f.min!, 1e-9)) * 100}%`);
      const out = box.querySelector('output,code');
      if (out) out.textContent = f.type === 'range' ? `${v}${f.unit || ''}` : String(v);
      const err = box.querySelector<HTMLElement>('.xo-ts__err')!;
      err.textContent = this.errs.get(id) || '';
      err.hidden = !this.errs.has(id);
      box.setAttribute('aria-busy', String(this.loadingOpt.has(id)));
    });
  }

  private onClick = (e: MouseEvent) => {
    const b = (e.target as Element).closest<HTMLElement>('[data-act],[data-o]');
    if (!b) return;
    const act = b.dataset.act;
    if (act) {
      this.act(act, b);
      return;
    }
    const f = this.fields.get(b.dataset.f!);
    const i = +b.dataset.o!;
    if (!f) return;
    if (b.hasAttribute('data-sw')) this.setValue(f.id, f.swatches![i]);
    else if (f.type === 'preset') Promise.all(Object.keys(f.options[i].values!).map((k) => this.setValue(k, f.options[i].values![k])));
    else this.setValue(f.id, f.options[i].value);
  };

  private onInput = (e: Event) => {
    const el = e.target as HTMLInputElement;
    if (el.hasAttribute('data-ed')) {
      this.checkLater();
      return;
    }
    const f = this.fields.get(el.dataset.f || '');
    if (!f) return;
    const commit = e.type === 'change';
    if (el.type === 'checkbox') {
      if (commit) this.setValue(f.id, el.checked);
    } else {
      // Kéo / chọn màu: áp ngay, sự kiện change mới bắn xo:theme-settings:change
      this.setValue(f.id, el.value, commit);
    }
  };

  /** Rê / focus vào lựa chọn section-swap: tải trước */
  private onHover = (e: Event) => {
    const b = (e.target as Element).closest?.<HTMLElement>('[data-o]');
    const f = b && this.fields.get(b.dataset.f!);
    if (!b || f?.type !== 'section-swap' || !this.slots.get(f.id)) return;
    const o = f.options[+b.dataset.o!];
    if (!isOriginal(f, o)) {
      const url = this.sectionUrl(f, o);
      if (this.peek(url) == null) this.fetchSection(url).catch(() => {});
    }
  };

  private act(name: string, b: HTMLElement) {
    if (name === 'reset') {
      this.reset();
      this.say('Đã đặt lại như ban đầu.');
    } else if (name === 'apply') this.apply();
    else if (name === 'tab') {
      const ed = b.dataset.tab === 'ed';
      if (ed && !this.ed) this.buildEditor();
      this.dw!.querySelectorAll('.xo-ts__tab').forEach((x) => x.setAttribute('aria-pressed', String(x === b)));
      this.ui.hidden = ed;
      if (this.ed) this.ed.hidden = !ed;
    } else if (name === 'ed-apply') this.applyEditor();
    else if (name === 'discard') {
      storage.removeItem(this.key('schema'));
      this.useSchema(this.props.xoSchema || '', false);
      if (this.ed) {
        this.edArea().value = this.sourceText();
        this.checkEditor();
      }
      this.say('Đã bỏ bản sửa, dùng lại schema của theme.');
    } else if (name === 'copy-json') {
      const { data } = parseText(this.edArea().value);
      if (data) this.copy(JSON.stringify(data)).then(() => this.say('Đã chép JSON. Dán vào ô cài đặt của theme.'));
    }
  }

  private say(text: string) {
    this.statusEl.textContent = text;
    clearTimeout(this.timer);
    this.timer = window.setTimeout(() => (this.statusEl.textContent = ''), 3000);
  }

  private copy(text: string): Promise<void> {
    const fallback = () => {
      const area = h('textarea', { readonly: true, style: 'position:fixed;opacity:0;pointer-events:none' });
      area.value = text;
      (this.dw || this).append(area);
      area.select();
      document.execCommand('copy');
      area.remove();
    };
    if (navigator.clipboard && window.isSecureContext) return navigator.clipboard.writeText(text).catch(fallback);
    fallback();
    return Promise.resolve();
  }

  // ---------- Tab sửa schema ( tác giả ) ----------

  /** Nội dung cho ô sửa: bản sửa giữ nguyên chữ, schema của theme thì định dạng lại cho dễ đọc */
  private sourceText() {
    const own = this.override();
    if (own != null) return own;
    const raw = this.props.xoSchema || '';
    const { data } = parseText(raw);
    return data ? JSON.stringify(data, null, 2) : raw;
  }

  private edArea() {
    return this.ed!.querySelector('textarea')!;
  }

  private buildEditor() {
    const id = uid();
    const area = h('textarea', { id, class: 'xo-ts__textarea', spellcheck: 'false', autocapitalize: 'off', autocomplete: 'off', 'data-ed': '' });
    area.value = this.sourceText();
    this.ed = h(
      'div',
      { class: 'xo-ts__editor', hidden: true },
      h('label', { class: 'xo-ts__label', for: id, text: 'Schema ( JSON )' }),
      area,
      h('ul', { class: 'xo-ts__msgs', 'aria-live': 'polite' }),
      h(
        'div',
        { class: 'xo-ts__row' },
        h('button', { type: 'button', class: 'xo-ts__btn xo-ts__btn--pri', 'data-act': 'ed-apply', text: 'Áp dụng' }),
        h('button', { type: 'button', class: 'xo-ts__btn', 'data-act': 'copy-json', text: 'Sao chép JSON' }),
        h('button', { type: 'button', class: 'xo-ts__btn', 'data-act': 'discard', text: 'Bỏ bản sửa' }),
      ),
    );
    this.ui.after(this.ed);
    this.checkEditor();
  }

  private checkEditor(): Checked | null {
    if (!this.ed) return null;
    const text = this.edArea().value;
    const parsed = parseText(text);
    const res: Checked = parsed.error ? { schema: null, errors: [parsed.error], warnings: [] } : validate(parsed.data!);
    const fields = res.schema ? res.schema.groups.reduce((n, g) => n + g.fields.length, 0) : 0;
    const items = [...res.errors.map((m) => h('li', { class: 'xo-ts__msg--e', text: `✗ ${m}` })), ...res.warnings.map((m) => h('li', { class: 'xo-ts__msg--w', text: `! ${m}` }))];
    if (!res.errors.length) items.unshift(h('li', { class: 'xo-ts__msg--ok', text: `✓ Hợp lệ: ${res.schema!.groups.length} nhóm, ${fields} field` }));
    this.ed.querySelector('.xo-ts__msgs')!.replaceChildren(...items);
    this.ed.querySelector<HTMLButtonElement>('[data-act=ed-apply]')!.disabled = !!res.errors.length;
    this.ed.querySelector<HTMLButtonElement>('[data-act=copy-json]')!.disabled = !!parsed.error;
    this.ed.querySelector<HTMLButtonElement>('[data-act=discard]')!.hidden = this.override() == null;
    return res;
  }

  private applyEditor() {
    const res = this.checkEditor();
    if (!res || res.errors.length) return;
    const text = this.edArea().value;
    storage.setItem(this.key('schema'), text);
    this.useSchema(text, false);
    this.checkEditor();
    this.say('Đã áp dụng schema sửa ( chỉ trong trình duyệt này ).');
  }
}
