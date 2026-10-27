/** The visitor's account as the account service reports it. `checking` lasts
 * until the first answer; an unreachable service counts as signed out. */
export interface AccountSnapshot {status: 'checking' | 'signed-out' | 'signed-in'; username: string | null}

/** Signing in, signing out and the signed-in account, kept in the service's
 * HttpOnly session cookie and mirrored here for the page. */
export function createAccountStore({fetch, baseUrl}: {fetch: typeof window.fetch; baseUrl: string}) {
  const listeners = new Set<() => void>();
  let snapshot: AccountSnapshot = Object.freeze({status: 'checking', username: null});
  const publish = (next: AccountSnapshot) => {
    if (next.status === snapshot.status && next.username === snapshot.username) return;
    snapshot = Object.freeze(next); listeners.forEach(listener => listener());
  };
  const endpoint = (name: string) => new URL(`api/accounts/${name}`, baseUrl).href;
  const post = (name: string, body?: unknown) => fetch(endpoint(name), {method: 'POST', credentials: 'same-origin',
    headers: {'Content-Type': 'application/json'}, body: JSON.stringify(body ?? {})});
  return {
    subscribe(listener: () => void) {listeners.add(listener); return () => {listeners.delete(listener);};},
    getSnapshot: () => snapshot,
    async refresh() {
      try {
        const response = await fetch(endpoint('me'), {credentials: 'same-origin', cache: 'no-store'});
        const body = response.ok ? await response.json() : null;
        publish(body?.username ? {status: 'signed-in', username: String(body.username)} : {status: 'signed-out', username: null});
      } catch {publish({status: 'signed-out', username: null});}
    },
    /** Signs in by username or email. Resolves to null, or the reason it failed. */
    async signIn(identifier: string, password: string): Promise<string | null> {
      try {
        const response = await post('login', {identifier, password}), body = await response.json().catch(() => ({}));
        if (!response.ok) return String(body.error ?? 'server-error');
        publish({status: 'signed-in', username: String(body.username)});
        return null;
      } catch {return 'network';}
    },
    async signOut() {
      try {await post('logout');} catch {}
      publish({status: 'signed-out', username: null});
    },
  };
}
export type AccountStore = ReturnType<typeof createAccountStore>;
