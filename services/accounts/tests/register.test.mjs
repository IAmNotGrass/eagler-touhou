import assert from 'node:assert/strict';
import {after, before, test} from 'node:test';
import {DatabaseSync} from 'node:sqlite';
import {mkdtempSync, rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {openAccountStore, passwordProblem, verifyPassword} from '../src/account-store.mjs';
import {createAccountServer} from '../src/account-server.mjs';

const directory = mkdtempSync(join(tmpdir(), 'eagler-accounts-')), database = join(directory, 'accounts.db');
let store, server, base;
before(async () => {
  store = openAccountStore(database);
  server = createAccountServer({store, trustedProxies: new Set(['127.0.0.1'])});
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  base = `http://127.0.0.1:${server.address().port}/api/accounts/register`;
});
after(() => {server.close(); store.close(); rmSync(directory, {recursive: true, force: true});});

const register = (body, client = '203.0.113.1', type = 'application/json') => fetch(base, {method: 'POST',
  headers: {'Content-Type': type, 'CF-Connecting-IP': client}, body: typeof body === 'string' ? body : JSON.stringify(body)});

test('a registration is stored with a salted password hash and no verification', async () => {
  const response = await register({username: 'Grass1337', password: 'correct-horse9', email: 'grass@example.com', code: ''});
  assert.equal(response.status, 201);
  assert.deepEqual(await response.json(), {username: 'Grass1337'});
  const row = new DatabaseSync(database).prepare('SELECT * FROM accounts WHERE username = ?').get('Grass1337');
  assert.equal(row.email, 'grass@example.com');
  assert.equal(row.email_verified, 0, 'without mail the address stays unverified');
  assert.match(row.password_hash, /^scrypt\$32768\$8\$1\$/);
  assert.ok(!row.password_hash.includes('correct-horse9'));
  assert.equal(await verifyPassword('correct-horse9', row.password_hash), true);
  assert.equal(await verifyPassword('wrong-horse9', row.password_hash), false);
});

test('names and addresses are unique regardless of case', async () => {
  const name = await register({username: 'grass1337', password: 'another-1', email: 'other@example.com'}, '203.0.113.2');
  assert.equal(name.status, 409); assert.deepEqual(await name.json(), {error: 'username-taken'});
  const email = await register({username: 'Someone', password: 'another-1', email: 'GRASS@example.com'}, '203.0.113.2');
  assert.equal(email.status, 409); assert.deepEqual(await email.json(), {error: 'email-taken'});
});

test('passwords need a letter and a digit from the printable ASCII set', () => {
  for (const [password, problem] of [['abc12', 'password-short'], ['a1'.repeat(65), 'password-long'], ['abcd efg1', 'password-chars'],
    ['ｐａｓｓｗｏｒｄ1', 'password-chars'], ['abcdefgh', 'password-mix'], ['12345678', 'password-mix'], ['ABCDEFG1', null], ['p@ss-w0rd!', null], ['~!@#$%^&*()_+a1', null]])
    assert.equal(passwordProblem(password), problem, password);
});

test('invalid fields are refused with a reason', async () => {
  for (const [body, error] of [
    [{username: 'ab', password: 'long-enough1', email: 'a@example.com'}, 'username-invalid'],
    [{username: 'has space', password: 'long-enough1', email: 'a@example.com'}, 'username-invalid'],
    [{username: 'Valid_1', password: 'short', email: 'a@example.com'}, 'password-invalid'],
    [{username: 'Valid_1', password: 'onlyletters', email: 'a@example.com'}, 'password-invalid'],
    [{username: 'Valid_1', password: '1234567890', email: 'a@example.com'}, 'password-invalid'],
    [{username: 'Valid_1', password: 'has space 1', email: 'a@example.com'}, 'password-invalid'],
    [{username: 'Valid_1', password: '密码password1', email: 'a@example.com'}, 'password-invalid'],
    [{username: 'Valid_1', password: 'long-enough1', email: 'not-an-address'}, 'email-invalid'],
  ]) {
    const response = await register(body, '203.0.113.3');
    assert.equal(response.status, 400); assert.deepEqual(await response.json(), {error});
  }
  assert.equal((await register('{oops', '203.0.113.3')).status, 400);
  assert.equal((await register('x=1', '203.0.113.3', 'application/x-www-form-urlencoded')).status, 415);
  assert.equal((await fetch(base)).status, 405);
});

test('each client gets a limited number of attempts', async () => {
  const statuses = [];
  for (let index = 0; index < 11; index++) statuses.push((await register({username: 'x', password: '', email: ''}, '198.51.100.9')).status);
  assert.deepEqual(statuses.slice(0, 10), Array(10).fill(400));
  assert.equal(statuses[10], 429);
  assert.equal((await register({username: 'x', password: '', email: ''}, '198.51.100.10')).status, 400, 'another client is unaffected');
});

const call = (path, {body, cookie, client = '203.0.113.50'} = {}) => fetch(base.replace('/register', path), {method: body === undefined ? (path === '/me' ? 'GET' : 'POST') : 'POST',
  headers: {'Content-Type': 'application/json', 'CF-Connecting-IP': client, ...(cookie ? {Cookie: cookie} : {})}, ...(body === undefined ? {} : {body: JSON.stringify(body)})});

test('signing in by username or email sets a session cookie that /me reads and sign-out ends', async () => {
  assert.equal((await register({username: 'Sanae', password: 'miracle-fruit7', email: 'sanae@example.com'}, '203.0.113.50')).status, 201);
  const wrong = await call('/login', {body: {identifier: 'Sanae', password: 'wrong-password7'}});
  assert.equal(wrong.status, 401); assert.deepEqual(await wrong.json(), {error: 'invalid-credentials'}); assert.equal(wrong.headers.get('set-cookie'), null);
  const unknown = await call('/login', {body: {identifier: 'nobody', password: 'miracle-fruit7'}});
  assert.deepEqual(await unknown.json(), {error: 'invalid-credentials'}, 'an unknown name gives the same answer');
  const byEmail = await call('/login', {body: {identifier: 'SANAE@example.com', password: 'miracle-fruit7'}});
  assert.equal(byEmail.status, 200); assert.deepEqual(await byEmail.json(), {username: 'Sanae'});
  const login = await call('/login', {body: {identifier: 'sanae', password: 'miracle-fruit7'}});
  const cookie = login.headers.get('set-cookie');
  assert.match(cookie, /^eagler_session=[\w-]{43}; Path=\/; Max-Age=2592000; HttpOnly; Secure; SameSite=Lax$/);
  const token = cookie.split(';')[0];
  const stored = new DatabaseSync(database).prepare('SELECT token_hash FROM sessions').all().map(row => row.token_hash);
  assert.ok(!stored.includes(token.split('=')[1]), 'the token itself is not stored');
  const me = await call('/me', {cookie: token});
  assert.equal(me.status, 200);
  const account = await me.json();
  assert.equal(account.username, 'Sanae'); assert.equal(account.email, 'sanae@example.com'); assert.equal(account.emailVerified, false); assert.ok(account.createdAt);
  assert.equal((await call('/me')).status, 401, 'no cookie, no account');
  const out = await call('/logout', {cookie: token});
  assert.match(out.headers.get('set-cookie'), /^eagler_session=; Path=\/; Max-Age=0;/);
  assert.equal((await call('/me', {cookie: token})).status, 401, 'the session ends with sign-out');
});
