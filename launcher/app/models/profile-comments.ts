/** Comments left on a profile, newest first. They are kept in this browser
 * until accounts can hold them, so every comment is the profile owner's own.
 * `author` is the username it was posted under, or null when signed out. */
export interface ProfileComment {id: string; body: string; at: string; author: string | null}

export const COMMENT_LIMITS = Object.freeze({body: 1000, count: 200});

/** A new comment with its text trimmed, or null for one with nothing to say. */
export function newComment(body: string, author: string | null = null, now = new Date(), id = globalThis.crypto?.randomUUID?.() ?? `${now.getTime()}-${Math.random().toString(36).slice(2)}`): ProfileComment | null {
  const text = body.trim().slice(0, COMMENT_LIMITS.body);
  return text ? {id, body: text, at: now.toISOString(), author} : null;
}

/** Stored comments, or none for anything unreadable; at most COMMENT_LIMITS.count are kept. */
export function parseComments(value: unknown): ProfileComment[] {
  if (!Array.isArray(value)) return [];
  return value.flatMap(entry => {
    if (!entry || typeof entry !== 'object') return [];
    const {id, body, at, author} = entry as {id?: unknown; body?: unknown; at?: unknown; author?: unknown};
    if (typeof id !== 'string' || !id || typeof body !== 'string' || !body.trim() || typeof at !== 'string' || Number.isNaN(Date.parse(at))) return [];
    return [{id, body: body.slice(0, COMMENT_LIMITS.body), at, author: typeof author === 'string' && author ? author : null}];
  }).slice(0, COMMENT_LIMITS.count);
}
