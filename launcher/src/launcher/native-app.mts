/** The launcher inside the Tauri app (desktop and Android). It runs from
 * bundled files at an app origin, so a few things differ from the website:
 * services live at a separate origin named by the packaged page, links to
 * other sites open in the system browser, and there are no Service Workers. */

interface TauriInternals {invoke(command: string, args?: Record<string, unknown>): Promise<unknown>}
const internals = (): TauriInternals | null =>
  typeof window === 'undefined' ? null : (window as unknown as {__TAURI_INTERNALS__?: TauriInternals}).__TAURI_INTERNALS__ ?? null;

/** True inside the Tauri app; Tauri defines its bridge before any page script runs. */
export function nativeApp(): boolean {
  return internals() !== null;
}

/** The origin of the website's services (accounts, play relay), which the app
 * package writes into its pages; null on the website, where they share the page's origin. */
export function serviceOrigin(doc: Document | undefined = typeof document === 'undefined' ? undefined : document): string | null {
  const value = doc?.querySelector('meta[name="eagler-service-origin"]')?.getAttribute('content');
  if (!value) return null;
  try {
    const url = new URL(value);
    return url.protocol === 'https:' || url.protocol === 'http:' ? url.origin : null;
  } catch {return null;}
}

/** Opens a page of another site in the system browser. Returns false outside the app. */
export function openExternal(url: string): boolean {
  const bridge = internals();
  if (!bridge) return false;
  void bridge.invoke('plugin:opener|open_url', {url}).catch(() => {});
  return true;
}

/** Inside the app: links to other origins open in the system browser instead
 * of replacing the app, and the mouse's back and forward buttons walk the
 * page history the way a browser's would. Does nothing on the website. */
export function installNativeAppNavigation(win: Window = window): void {
  if (!nativeApp()) return;
  win.document.addEventListener('click', event => {
    if (event.defaultPrevented || event.button !== 0) return;
    const link = (event.target as Element | null)?.closest?.('a[href]') as HTMLAnchorElement | null;
    if (!link) return;
    let url: URL;
    try {url = new URL(link.href, win.location.href);} catch {return;}
    if (url.origin === win.location.origin || !/^(https?|mailto):$/.test(url.protocol)) return;
    event.preventDefault();
    openExternal(url.href);
  }, true);
  win.addEventListener('mouseup', event => {
    if (event.button === 3) {event.preventDefault(); win.history.back();}
    if (event.button === 4) {event.preventDefault(); win.history.forward();}
  });
}
