/** The visitor's account as the account service reports it. `checking` lasts
 * until the first answer; an unreachable service counts as signed out. */
export interface AccountSnapshot {status: 'checking' | 'signed-out' | 'signed-in'; username: string | null}

import type {TokenVault} from '../../src/launcher/native-app.mts';

/** Signing in, signing out and the signed-in account, mirrored here for the
 * page. On the website the service keeps the sign-in in its HttpOnly session
 * cookie. The app reaches the service from another origin, where that cookie
 * is not sent, so it asks for the session token instead, keeps it in `tokens`
 * (the system's credential store) and sends it as a bearer token. */
export function createAccountStore({fetch, baseUrl, tokens = null}: {fetch: typeof window.fetch; baseUrl: string; tokens?: TokenVault | null}) {
  const listeners = new Set<() => void>();
  let snapshot: AccountSnapshot = Object.freeze({status: 'checking', username: null});
  const publish = (next: AccountSnapshot) => {
    if (next.status === snapshot.status && next.username === snapshot.username) return;
    snapshot = Object.freeze(next); listeners.forEach(listener => listener());
  };
  const endpoint = (name: string) => new URL(`api/accounts/${name}`, baseUrl).href;
  // The token is read from the vault once and then kept in memory.
  let held: Promise<string | null> | null = null;
  const token = () => held ??= tokens ? tokens.read().catch(() => null) : Promise.resolve(null);
  const keepToken = async (value: string | null) => {held = Promise.resolve(value); await tokens?.write(value).catch(() => {});};
  const auth = async (): Promise<Record<string, string>> => {const value = await token(); return value ? {Authorization: `Bearer ${value}`} : {};};
  const credentials: RequestCredentials = tokens ? 'omit' : 'same-origin';
  const post = async (name: string, body?: unknown) => fetch(endpoint(name), {method: 'POST', credentials,
    headers: {'Content-Type': 'application/json', ...await auth()}, body: JSON.stringify(body ?? {})});
  return {
    subscribe(listener: () => void) {listeners.add(listener); return () => {listeners.delete(listener);};},
    getSnapshot: () => snapshot,
    /** The address of one of the account service's endpoints. */
    endpoint,
    async refresh() {
      try {
        if (tokens && !await token()) {publish({status: 'signed-out', username: null}); return;}
        const response = await fetch(endpoint('me'), {credentials, cache: 'no-store', headers: await auth()});
        if (response.status === 401) await keepToken(null);
        const body = response.ok ? await response.json() : null;
        publish(body?.username ? {status: 'signed-in', username: String(body.username)} : {status: 'signed-out', username: null});
      } catch {publish({status: 'signed-out', username: null});}
    },
    /** Signs in by username or email. Resolves to null, or the reason it failed. */
    async signIn(identifier: string, password: string): Promise<string | null> {
      try {
        const response = await post('login', {identifier, password, ...(tokens ? {session: 'token'} : {})}), body = await response.json().catch(() => ({}));
        if (!response.ok) return String(body.error ?? 'server-error');
        if (tokens) {if (typeof body.token !== 'string') return 'server-error'; await keepToken(body.token);}
        publish({status: 'signed-in', username: String(body.username)});
        return null;
      } catch {return 'network';}
    },
    async signOut() {
      try {await post('logout');} catch {}
      await keepToken(null);
      publish({status: 'signed-out', username: null});
    },
  };
}
export type AccountStore = ReturnType<typeof createAccountStore>;
