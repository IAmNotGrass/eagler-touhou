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

/** Where the app keeps the account's sign-in token. */
export interface TokenVault {read(): Promise<string | null>; write(token: string | null): Promise<void>}

/** A vault in page storage under one key: the app's private storage. */
export function storageTokenVault(storage: Storage | null, key = 'eagler-touhou-account-token-v1'): TokenVault {
  return {
    async read() {try {return storage?.getItem(key) ?? null;} catch {return null;}},
    async write(token) {try {if (token) storage?.setItem(key, token); else storage?.removeItem(key);} catch {}},
  };
}

/** The system's credential store through the app shell. Where the shell has
 * none (Android) the token stays in `fallback`; a token left there by an
 * earlier version moves into the credential store on first read. */
export function credentialTokenVault(fallback: TokenVault): TokenVault {
  const bridge = internals();
  let usable: boolean | null = bridge ? null : false;
  const read = async (): Promise<string | null> => {
    if (usable === false || !bridge) return fallback.read();
    try {
      const stored = await bridge.invoke('account_token_get') as string | null;
      usable = true;
      if (stored) return stored;
      const earlier = await fallback.read();
      if (earlier) {await bridge.invoke('account_token_set', {token: earlier}); await fallback.write(null);}
      return earlier;
    } catch {usable = false; return fallback.read();}
  };
  return {
    read,
    async write(token) {
      if (usable !== false && bridge) {
        try {await bridge.invoke('account_token_set', {token}); usable = true; await fallback.write(null); return;}
        catch {usable = false;}
      }
      await fallback.write(token);
    },
  };
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
