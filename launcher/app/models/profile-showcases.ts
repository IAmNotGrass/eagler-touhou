/** Profile showcases, shown in order below the profile's name. Only the custom
 * information box exists so far; its text is shown as written, without markup. */
export interface InfoShowcase {type: 'info'; title: string; body: string}
export type ProfileShowcase = InfoShowcase;

export const SHOWCASE_LIMITS = Object.freeze({title: 40, body: 2000});

/** An empty information box, ready to fill in. */
export const emptyInfoShowcase = (): InfoShowcase => ({type: 'info', title: '', body: ''});

/** A box with neither title nor text shows nothing and is not kept. */
export const showcaseIsEmpty = (showcase: ProfileShowcase) => !showcase.title.trim() && !showcase.body.trim();

/** Stored showcases, or none for anything unreadable. Empty boxes are dropped. */
export function parseShowcases(value: unknown): ProfileShowcase[] {
  if (!Array.isArray(value)) return [];
  return value.flatMap(entry => {
    if (!entry || typeof entry !== 'object' || (entry as {type?: unknown}).type !== 'info') return [];
    const {title, body} = entry as {title?: unknown; body?: unknown};
    const showcase: InfoShowcase = {type: 'info', title: typeof title === 'string' ? title.slice(0, SHOWCASE_LIMITS.title) : '',
      body: typeof body === 'string' ? body.slice(0, SHOWCASE_LIMITS.body) : ''};
    return showcaseIsEmpty(showcase) ? [] : [showcase];
  });
}
