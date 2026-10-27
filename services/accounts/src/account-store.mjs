import {createHash, randomBytes, scrypt, timingSafeEqual} from 'node:crypto';
import {DatabaseSync} from 'node:sqlite';
import {promisify} from 'node:util';

const scryptAsync = promisify(scrypt);
/** scrypt cost: N=2^15, r=8, p=1, 64-byte key (needs 32 MiB per hash). */
const SCRYPT = Object.freeze({N: 32768, r: 8, p: 1, keylen: 64, maxmem: 64 * 1024 * 1024});

/** Usernames appear in @handles and user page addresses. */
export const USERNAME_PATTERN = /^[A-Za-z0-9_]{3,20}$/;
export const PASSWORD_LENGTH = Object.freeze({min: 8, max: 128});
/** Passwords use letters, digits and the printable ASCII symbols (no spaces),
 * and contain at least one letter and one digit; case is free. */
export function passwordProblem(password) {
  if (typeof password !== 'string' || password.length < PASSWORD_LENGTH.min) return 'password-short';
  if (password.length > PASSWORD_LENGTH.max) return 'password-long';
  if (!/^[\x21-\x7e]+$/.test(password)) return 'password-chars';
  if (!/[A-Za-z]/.test(password) || !/[0-9]/.test(password)) return 'password-mix';
  return null;
}
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
/** How long a sign-in lasts. */
export const SESSION_DAYS = 30;
const tokenHash = token => createHash('sha256').update(String(token)).digest('base64url');

/** Checks a registration and returns the first problem's code, or null. */
export function registrationProblem({username, password, email}) {
  if (typeof username !== 'string' || !USERNAME_PATTERN.test(username)) return 'username-invalid';
  if (passwordProblem(password)) return 'password-invalid';
  if (typeof email !== 'string' || email.length > 254 || !EMAIL_PATTERN.test(email)) return 'email-invalid';
  return null;
}

export async function hashPassword(password) {
  const salt = randomBytes(16), key = await scryptAsync(password, salt, SCRYPT.keylen, SCRYPT);
  return ['scrypt', SCRYPT.N, SCRYPT.r, SCRYPT.p, salt.toString('base64'), key.toString('base64')].join('$');
}

export async function verifyPassword(password, stored) {
  const [kind, N, r, p, salt, hash] = String(stored).split('$');
  if (kind !== 'scrypt') return false;
  const expected = Buffer.from(hash, 'base64');
  const key = await scryptAsync(password, Buffer.from(salt, 'base64'), expected.length, {N: Number(N), r: Number(r), p: Number(p), maxmem: SCRYPT.maxmem});
  return timingSafeEqual(key, expected);
}

/** Accounts and their sign-in sessions kept in one SQLite file. Usernames and
 * emails are unique without regard to case. Email addresses are stored
 * unverified until mail is set up. Sessions are stored by the hash of their
 * token only. */
export function openAccountStore(path) {
  const db = new DatabaseSync(path);
  db.exec(`PRAGMA journal_mode = WAL;
    PRAGMA foreign_keys = ON;
    CREATE TABLE IF NOT EXISTS accounts (
      id INTEGER PRIMARY KEY,
      username TEXT NOT NULL UNIQUE COLLATE NOCASE,
      email TEXT NOT NULL UNIQUE COLLATE NOCASE,
      password_hash TEXT NOT NULL,
      email_verified INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL
    ) STRICT;
    CREATE TABLE IF NOT EXISTS sessions (
      token_hash TEXT PRIMARY KEY,
      account_id INTEGER NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
      created_at TEXT NOT NULL,
      expires_at TEXT NOT NULL
    ) STRICT;
    CREATE INDEX IF NOT EXISTS sessions_account ON sessions(account_id);`);
  const taken = db.prepare('SELECT username = ? COLLATE NOCASE AS sameName FROM accounts WHERE username = ? OR email = ? LIMIT 1');
  const insert = db.prepare('INSERT INTO accounts (username, email, password_hash, created_at) VALUES (?, ?, ?, ?)');
  const byIdentifier = db.prepare('SELECT id, username, password_hash FROM accounts WHERE username = ? OR email = ? LIMIT 1');
  const addSession = db.prepare('INSERT INTO sessions (token_hash, account_id, created_at, expires_at) VALUES (?, ?, ?, ?)');
  const sessionAccount = db.prepare(`SELECT accounts.username, accounts.email, accounts.email_verified, accounts.created_at FROM sessions
    JOIN accounts ON accounts.id = sessions.account_id WHERE sessions.token_hash = ? AND sessions.expires_at > ?`);
  const dropSession = db.prepare('DELETE FROM sessions WHERE token_hash = ?');
  const dropExpired = db.prepare('DELETE FROM sessions WHERE expires_at <= ?');
  // Unknown names still pay for one hash, so timing does not tell which names exist.
  const decoy = hashPassword(randomBytes(12).toString('base64'));
  return {
    /** Creates an account; returns {username} or {problem}. */
    async register({username, password, email}) {
      const problem = registrationProblem({username, password, email});
      if (problem) return {problem};
      const clash = taken.get(username, username, email);
      if (clash) return {problem: clash.sameName ? 'username-taken' : 'email-taken'};
      const hash = await hashPassword(password);
      try {
        insert.run(username, email, hash, new Date().toISOString());
      } catch (error) {
        // Another registration took the name or address while this one hashed.
        if (String(error?.message).includes('UNIQUE')) return {problem: String(error.message).includes('email') ? 'email-taken' : 'username-taken'};
        throw error;
      }
      return {username};
    },
    /** Checks a username or email and password; returns {token, username} or {problem}. */
    async signIn({identifier, password}) {
      if (typeof identifier !== 'string' || typeof password !== 'string' || !identifier || !password || password.length > PASSWORD_LENGTH.max) return {problem: 'invalid-credentials'};
      const account = byIdentifier.get(identifier.trim(), identifier.trim());
      const matches = await verifyPassword(password, account?.password_hash ?? await decoy);
      if (!account || !matches) return {problem: 'invalid-credentials'};
      const token = randomBytes(32).toString('base64url'), now = new Date();
      dropExpired.run(now.toISOString());
      addSession.run(tokenHash(token), account.id, now.toISOString(), new Date(now.getTime() + SESSION_DAYS * 86400000).toISOString());
      return {token, username: account.username};
    },
    /** The account a session token belongs to, or null once it has expired or ended. */
    account(token) {
      if (!token) return null;
      const row = sessionAccount.get(tokenHash(token), new Date().toISOString());
      return row ? {username: row.username, email: row.email, emailVerified: row.email_verified === 1, createdAt: row.created_at} : null;
    },
    signOut(token) {if (token) dropSession.run(tokenHash(token));},
    close() {db.close();},
  };
}
