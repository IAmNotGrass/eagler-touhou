/** Profile settings kept beside the showcases: links to the owner's pages on
 * other sites, and which overview sections other people may see. */

export const LINK_PLATFORM_IDS = ['bilibili', 'discord'] as const;
export type ProfileLinkId = typeof LINK_PLATFORM_IDS[number];
export type ProfileLinks = Partial<Record<ProfileLinkId, string>>;

/** The page each platform's link must lead to, and how a bare id becomes one. */
const LINK_RULES: Readonly<Record<ProfileLinkId, {hosts: readonly string[]; id: RegExp; page(id: string): string}>> = {
  bilibili: {hosts: ['space.bilibili.com', 'b23.tv'], id: /^\d{1,20}$/, page: id => `https://space.bilibili.com/${id}`},
  discord: {hosts: ['discord.com', 'www.discord.com', 'discord.gg'], id: /^\d{15,25}$/, page: id => `https://discord.com/users/${id}`},
};

/** What the owner typed, as a link to keep: a bare id (a Bilibili UID or a
 * Discord user id) becomes that user's page, and an address must be https
 * on the platform's own site. Empty gives '', anything else null. */
export function normalizeLink(platform: ProfileLinkId, value: string): string | null {
  const text = value.trim(), rule = LINK_RULES[platform];
  if (!text) return '';
  if (rule.id.test(text)) return rule.page(text);
  let url: URL;
  try {url = new URL(/^[a-z][a-z\d+.-]*:/i.test(text) ? text : `https://${text}`);} catch {return null;}
  if (url.protocol !== 'https:' && url.protocol !== 'http:') return null;
  if (!rule.hosts.includes(url.hostname.toLowerCase()) || url.username || url.password) return null;
  url.protocol = 'https:';
  return url.href;
}

/** Stored links, keeping only the ones still valid. */
export function parseLinks(value: unknown): ProfileLinks {
  if (!value || typeof value !== 'object') return {};
  const links: ProfileLinks = {};
  for (const platform of LINK_PLATFORM_IDS) {
    const raw = (value as Record<string, unknown>)[platform];
    const link = typeof raw === 'string' ? normalizeLink(platform, raw) : null;
    if (link) links[platform] = link;
  }
  return links;
}

/** Overview sections whose visibility the owner chooses. A section added to
 * the overview later is listed here, so it gets its own setting. */
export const OVERVIEW_SECTIONS = ['playtime', 'clears'] as const;
export type OverviewSection = typeof OVERVIEW_SECTIONS[number];
/** Whether others may see each section; every section is public until the owner hides it. */
export type ProfilePrivacy = Readonly<Record<OverviewSection, boolean>>;
export const DEFAULT_PRIVACY: ProfilePrivacy = Object.freeze({playtime: true, clears: true});

export function parsePrivacy(value: unknown): ProfilePrivacy {
  const stored = value && typeof value === 'object' ? value as Record<string, unknown> : {};
  return Object.freeze(Object.fromEntries(OVERVIEW_SECTIONS.map(section =>
    [section, typeof stored[section] === 'boolean' ? stored[section] : DEFAULT_PRIVACY[section]])) as Record<OverviewSection, boolean>);
}
