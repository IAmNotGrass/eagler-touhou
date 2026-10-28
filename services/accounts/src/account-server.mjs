import {createServer} from 'node:http';
import {mkdirSync} from 'node:fs';
import {dirname, resolve} from 'node:path';
import {pathToFileURL} from 'node:url';
import {openAccountStore, SESSION_DAYS} from './account-store.mjs';

const MAX_BODY = 4096;
/** Registration or sign-in attempts allowed per client address and window. */
const ATTEMPTS = Object.freeze({perClient: 10, windowMs: 10 * 60 * 1000});

/** The client address: the one Cloudflare or the proxy reports when the request
 * comes through a trusted proxy, else the socket's. */
function clientAddress(request, trustedProxies) {
  const remote = request.socket.remoteAddress ?? '';
  if (!trustedProxies.has(remote.replace(/^::ffff:/, ''))) return remote;
  const forwarded = request.headers['cf-connecting-ip'] ?? String(request.headers['x-forwarded-for'] ?? '').split(',')[0];
  return String(forwarded).trim() || remote;
}

const SESSION_COOKIE = 'eagler_session';
/** The session cookie: sent to every page of the site, never readable by scripts. */
const sessionCookie = (token, maxAge) => `${SESSION_COOKIE}=${token}; Path=/; Max-Age=${maxAge}; HttpOnly; Secure; SameSite=Lax`;
/** The app's pages live at these origins (its own eagler scheme, and Tauri's
 * default for older builds); they may call the service and send a bearer token. */
export const APP_ORIGINS = Object.freeze(['eagler://localhost', 'http://eagler.localhost', 'https://eagler.localhost', 'tauri://localhost', 'http://tauri.localhost', 'https://tauri.localhost']);
/** A session from the app's bearer token, else from the website's cookie. */
function sessionToken(request) {
  const bearer = /^Bearer ([\w-]{20,})$/.exec(String(request.headers.authorization ?? ''));
  if (bearer) return bearer[1];
  for (const part of String(request.headers.cookie ?? '').split(';')) {
    const [name, ...value] = part.trim().split('=');
    if (name === SESSION_COOKIE) return value.join('=');
  }
  return '';
}

function send(response, status, body, cookie) {
  const text = JSON.stringify(body);
  response.writeHead(status, {'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store', 'Content-Length': Buffer.byteLength(text),
    ...(cookie ? {'Set-Cookie': cookie} : {}), ...response.corsHeaders});
  response.end(text);
}

async function readJson(request) {
  let size = 0; const chunks = [];
  for await (const chunk of request) {
    size += chunk.length;
    if (size > MAX_BODY) throw Object.assign(new Error('too large'), {status: 413});
    chunks.push(chunk);
  }
  try {return JSON.parse(Buffer.concat(chunks).toString('utf8'));}
  catch {throw Object.assign(new Error('bad json'), {status: 400});}
}

/** HTTP front of the account store: registration, signing in and out, and the
 * signed-in account. The website's sign-ins are kept in an HttpOnly session
 * cookie; the app, at its own origins, receives the token and sends it back as
 * a bearer token. */
export function createAccountServer({store, trustedProxies = new Set(), appOrigins = APP_ORIGINS}) {
  const allowed = new Set(appOrigins);
  const attempts = new Map();
  const limited = client => {
    const now = Date.now(), recent = (attempts.get(client) ?? []).filter(time => now - time < ATTEMPTS.windowMs);
    recent.push(now); attempts.set(client, recent);
    if (attempts.size > 10000) for (const [key, times] of attempts) if (now - times.at(-1) >= ATTEMPTS.windowMs) attempts.delete(key);
    return recent.length > ATTEMPTS.perClient;
  };
  return createServer(async (request, response) => {
    try {
      const {pathname} = new URL(request.url ?? '/', 'http://accounts.invalid');
      const method = {'/api/accounts/register': 'POST', '/api/accounts/login': 'POST', '/api/accounts/logout': 'POST', '/api/accounts/me': 'GET'}[pathname];
      // The app's origins may read the answers; they authenticate with a bearer
      // token, never with the cookie, so no credentials are allowed.
      const origin = String(request.headers.origin ?? '');
      response.corsHeaders = allowed.has(origin) ? {'Access-Control-Allow-Origin': origin, Vary: 'Origin'} : {};
      if (!method) return send(response, 404, {error: 'not-found'});
      if (request.method === 'OPTIONS' && allowed.has(origin)) {
        response.writeHead(204, {...response.corsHeaders, 'Access-Control-Allow-Methods': method, 'Access-Control-Allow-Headers': 'Content-Type, Authorization', 'Access-Control-Max-Age': '600'});
        return response.end();
      }
      if (request.method !== method) {response.setHeader('Allow', method); return send(response, 405, {error: 'method-not-allowed'});}
      if (pathname === '/api/accounts/me') {
        const account = store.account(sessionToken(request));
        return account ? send(response, 200, account) : send(response, 401, {error: 'signed-out'});
      }
      if (pathname === '/api/accounts/logout') {store.signOut(sessionToken(request)); return send(response, 200, {}, sessionCookie('', 0));}
      // Bodies are JSON only, which a cross-site form cannot send without permission.
      if (!String(request.headers['content-type'] ?? '').startsWith('application/json')) return send(response, 415, {error: 'unsupported-type'});
      if (limited(`${pathname} ${clientAddress(request, trustedProxies)}`)) return send(response, 429, {error: 'rate-limited'});
      const body = await readJson(request);
      if (pathname === '/api/accounts/login') {
        const result = await store.signIn({identifier: body?.identifier, password: body?.password});
        if (result.problem) return send(response, 401, {error: result.problem});
        // The app asks for the token itself; the website gets it as a cookie only.
        if (body?.session === 'token') return send(response, 200, {username: result.username, token: result.token});
        return send(response, 200, {username: result.username}, sessionCookie(result.token, SESSION_DAYS * 86400));
      }
      const result = await store.register({username: body?.username, password: body?.password, email: body?.email});
      if (result.problem) return send(response, result.problem.endsWith('-taken') ? 409 : 400, {error: result.problem});
      send(response, 201, {username: result.username});
    } catch (error) {
      if (error?.status) return send(response, error.status, {error: error.status === 413 ? 'too-large' : 'bad-request'});
      console.error(error);
      send(response, 500, {error: 'server-error'});
    }
  });
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  const host = process.env.EAGLER_ACCOUNTS_HOST || '127.0.0.1';
  const port = Number.parseInt(process.env.EAGLER_ACCOUNTS_PORT || '18143', 10);
  const database = resolve(process.env.EAGLER_ACCOUNTS_DATABASE || 'data/accounts.db');
  const trustedProxies = new Set((process.env.EAGLER_ACCOUNTS_TRUSTED_PROXIES ?? '127.0.0.1,::1').split(',').map(value => value.trim()).filter(Boolean));
  mkdirSync(dirname(database), {recursive: true});
  const store = openAccountStore(database);
  createAccountServer({store, trustedProxies}).listen(port, host, () => console.log(`Eagler accounts listening http://${host}:${port} database=${database}`));
}
