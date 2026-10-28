/** The visitor's account as the account service reports it. `checking` lasts
 * until the first answer; an unreachable service counts as signed out. */
export interface AccountSnapshot {status: 'checking' | 'signed-out' | 'signed-in'; username: string | null}

export const ACCOUNT_TOKEN_STORAGE_KEY = 'eagler-touhou-account-token-v1';

/** Signing in, signing out and the signed-in account, mirrored here for the
 * page. On the website the service keeps the sign-in in its HttpOnly session
 * cookie. The app reaches the service from another origin, where that cookie
 * is not sent, so it asks for the session token instead, keeps it in `tokens`
 * (the app's own storage) and sends it as a bearer token. */
export function createAccountStore({fetch, baseUrl, tokens = null}: {fetch: typeof window.fetch; baseUrl: string; tokens?: Storage | null}) {
  const listeners = new Set<() => void>();
  let snapshot: AccountSnapshot = Object.freeze({status: 'checking', username: null});
  const publish = (next: AccountSnapshot) => {
    if (next.status === snapshot.status && next.username === snapshot.username) return;
    snapshot = Object.freeze(next); listeners.forEach(listener => listener());
  };
  const endpoint = (name: string) => new URL(`api/accounts/${name}`, baseUrl).href;
  const token = () => {try {return tokens?.getItem(ACCOUNT_TOKEN_STORAGE_KEY) ?? null;} catch {return null;}};
  const keepToken = (value: string | null) => {try {if (value) tokens?.setItem(ACCOUNT_TOKEN_STORAGE_KEY, value); else tokens?.removeItem(ACCOUNT_TOKEN_STORAGE_KEY);} catch {}};
  const auth = (): Record<string, string> => {const value = token(); return value ? {Authorization: `Bearer ${value}`} : {};};
  const credentials: RequestCredentials = tokens ? 'omit' : 'same-origin';
  const post = (name: string, body?: unknown) => fetch(endpoint(name), {method: 'POST', credentials,
    headers: {'Content-Type': 'application/json', ...auth()}, body: JSON.stringify(body ?? {})});
  return {
    subscribe(listener: () => void) {listeners.add(listener); return () => {listeners.delete(listener);};},
    getSnapshot: () => snapshot,
    /** The address of one of the account service's endpoints. */
    endpoint,
    async refresh() {
      try {
        if (tokens && !token()) {publish({status: 'signed-out', username: null}); return;}
        const response = await fetch(endpoint('me'), {credentials, cache: 'no-store', headers: auth()});
        if (response.status === 401) keepToken(null);
        const body = response.ok ? await response.json() : null;
        publish(body?.username ? {status: 'signed-in', username: String(body.username)} : {status: 'signed-out', username: null});
      } catch {publish({status: 'signed-out', username: null});}
    },
    /** Signs in by username or email. Resolves to null, or the reason it failed. */
    async signIn(identifier: string, password: string): Promise<string | null> {
      try {
        const response = await post('login', {identifier, password, ...(tokens ? {session: 'token'} : {})}), body = await response.json().catch(() => ({}));
        if (!response.ok) return String(body.error ?? 'server-error');
        if (tokens) {if (typeof body.token !== 'string') return 'server-error'; keepToken(body.token);}
        publish({status: 'signed-in', username: String(body.username)});
        return null;
      } catch {return 'network';}
    },
    async signOut() {
      try {await post('logout');} catch {}
      keepToken(null);
      publish({status: 'signed-out', username: null});
    },
  };
}
export type AccountStore = ReturnType<typeof createAccountStore>;
