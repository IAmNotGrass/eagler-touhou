/** The app keeps the sign-in token in the system's credential store, moving
 * an older token out of app storage and falling back to it where the shell
 * has no credential store. */
import test from 'node:test';
import assert from 'node:assert/strict';
import {credentialTokenVault, storageTokenVault} from '../src/launcher/native-app.mts';

function memoryStorage(entries = {}) {
  const map = new Map(Object.entries(entries));
  return {getItem: key => map.get(key) ?? null, setItem: (key, value) => map.set(key, String(value)), removeItem: key => map.delete(key), map};
}
function shell(store) {
  const calls = [];
  globalThis.window = {__TAURI_INTERNALS__: {async invoke(command, args) {
    calls.push(command);
    if (!store) throw new Error('no credential store');
    if (command === 'account_token_get') return store.token ?? null;
    if (command === 'account_token_set') {store.token = args.token ?? null; return null;}
    throw new Error(`unexpected ${command}`);
  }}};
  return calls;
}
const key = 'eagler-touhou-account-token-v1';

test('tokens go to the credential store, not app storage', async () => {
  const keychain = {}, storage = memoryStorage();
  shell(keychain);
  const vault = credentialTokenVault(storageTokenVault(storage));
  assert.equal(await vault.read(), null);
  await vault.write('abc');
  assert.equal(keychain.token, 'abc'); assert.equal(storage.map.has(key), false);
  assert.equal(await vault.read(), 'abc');
  await vault.write(null);
  assert.equal(keychain.token, null);
});

test('a token an earlier version kept in app storage moves into the credential store', async () => {
  const keychain = {}, storage = memoryStorage({[key]: 'older'});
  shell(keychain);
  assert.equal(await credentialTokenVault(storageTokenVault(storage)).read(), 'older');
  assert.equal(keychain.token, 'older'); assert.equal(storage.map.has(key), false);
});

test('without a credential store the token stays in app storage', async () => {
  const storage = memoryStorage();
  const calls = shell(null);
  const vault = credentialTokenVault(storageTokenVault(storage));
  await vault.write('xyz');
  assert.equal(storage.map.get(key), 'xyz');
  assert.equal(await vault.read(), 'xyz');
  assert.deepEqual(calls, ['account_token_set'], 'a failed store is not asked again');
});

test('outside the app the vault is plain app storage', async () => {
  delete globalThis.window;
  const storage = memoryStorage({[key]: 'web'});
  assert.equal(await credentialTokenVault(storageTokenVault(storage)).read(), 'web');
});
