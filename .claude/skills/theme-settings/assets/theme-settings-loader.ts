/**
 * Bộ nạp nhỏ của <xo-theme-settings>: main ( main.ts / src/index.ts ) import file NÀY, không import theme-settings.ts.
 * Component đầy đủ ( theme-settings.ts ) là 1 chunk riêng ( import() động: webpack / Vite tách file ), chỉ tải khi cần
 * → không tốn JS / thời gian chạy lúc tải trang ( Lighthouse đo đúng trang thật, không dò Lighthouse ).
 *
 * Nút mở là HTML tĩnh do snippet in ra ( <button class="xo-ts-fab"> + CSS nhỏ ): hiện ngay, không cần JS, không xê dịch
 * bố cục; component tải xong thì dùng lại chính nút đó.
 *
 * Khi nào tải chunk ( mỗi <xo-theme-settings> ):
 *   - đã có lựa chọn Áp dụng trong localStorage ( "xo-theme-settings:<host>" ) hoặc ?xo-theme-settings-edit: ngay sau
 *     DOMContentLoaded ( section đổi được áp sớm );
 *   - xo-preload="eager": ngay; "interaction": khi rê / focus / nhấn / bấm nút; "idle" ( mặc định ): như interaction,
 *     hoặc lúc rảnh ( requestIdleCallback, không có thì setTimeout ) 3,5 giây sau sự kiện load.
 *   Bấm nút trước khi chunk về: nút có aria-busy ( vòng xoay ), mở drawer ngay khi component sẵn sàng.
 * Không tải cho bot ( isBot, như component ) và trong theme editor ( Shopify.designMode ): ẩn nút.
 */
import { isBot } from '@xo/utils';

const TAG = 'xo-theme-settings';
let chunk: Promise<unknown> | null = null;

const load = () =>
  (chunk ||= import(/* webpackChunkName: "theme-settings" */ './theme-settings').catch((error) => {
    chunk = null;
    console.error(`[${TAG}] Không tải được component:`, error);
  }));

function setup(el: HTMLElement) {
  const fab = el.querySelector<HTMLElement>('.xo-ts-fab');
  if (isBot() || (window as any).Shopify?.designMode) {
    if (fab) fab.style.display = 'none';
    return;
  }
  let stored = '';
  try {
    stored = localStorage.getItem(`${TAG}:${location.host}`) || '';
  } catch {
    // localStorage bị chặn
  }
  const mode = el.getAttribute('xo-preload') || 'idle';
  if (/[^{}\s]/.test(stored) || mode === 'eager' || /[?&]xo-theme-settings-edit/.test(location.search)) {
    load();
    return;
  }
  const hover = new AbortController();
  const go = () => {
    hover.abort();
    load();
  };
  if (fab) {
    ['pointerenter', 'focus', 'pointerdown'].forEach((type) => fab.addEventListener(type, go, { signal: hover.signal, passive: true }));
    // Bấm trước khi component chạy: ghi nhận, component mở drawer khi sẵn sàng
    const click = new AbortController();
    window.customElements.whenDefined(TAG).then(() => click.abort());
    fab.addEventListener(
      'click',
      () => {
        el.setAttribute('xo-open-on-load', '');
        fab.setAttribute('aria-busy', 'true');
        go();
      },
      { signal: click.signal },
    );
  }
  // Không có nút tĩnh thì không có tương tác để chờ: tải lúc rảnh
  if (mode === 'idle' || !fab) {
    const idle = () =>
      setTimeout(() => {
        const ric = (window as any).requestIdleCallback as ((cb: () => void, o?: object) => void) | undefined;
        if (ric) ric(go, { timeout: 2000 });
        else go();
      }, 3500);
    if (document.readyState === 'complete') idle();
    else window.addEventListener('load', idle, { once: true });
  }
}

const start = () => document.querySelectorAll<HTMLElement>(TAG).forEach(setup);
if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start, { once: true });
else start();

export {};
