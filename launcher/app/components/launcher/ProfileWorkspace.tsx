import {useEffect, useRef, useState, type CSSProperties} from 'react';
import {useLocale} from '../../i18n';
import {isUiMessageKey} from '../../../src/launcher/i18n.mts';
import {useSurfaceNavigation} from '../../navigation/surface-navigation';
import {PROFILE_THEMES, profileTheme} from '../../models/profile-themes';
import {ProfileAvatar} from '../notices/ProfileDialog';
import {launcherBackgroundUrl} from '../startup/OriginalBootstrap';
import {discordMark} from './LoginWorkspace';
import type {AccountSnapshot} from '../../services/account';
import {emptyInfoShowcase, SHOWCASE_LIMITS, type ProfileShowcase} from '../../models/profile-showcases';
import type {PlaytimeSlice} from './PlaytimeShowcase';
import type {ClearGame} from './ClearShowcase';
import {ProfileOverview} from './ProfileOverview';
import {ProfileComments} from './ProfileComments';
import type {ProfileComment} from '../../models/profile-comments';
import {LINK_PLATFORM_IDS, normalizeLink, OVERVIEW_SECTIONS, type ProfileLinkId, type ProfileLinks, type ProfilePrivacy} from '../../models/profile-settings';

/** Covers are stored at this size, the 3:1 shape the page shows them in. */
const COVER_WIDTH = 1620, COVER_HEIGHT = 540;

/** Centre-crops an image file to the cover shape and encodes it as a data: URL. */
async function coverDataUrl(file: File): Promise<string> {
  const bitmap = await createImageBitmap(file);
  const canvas = document.createElement('canvas');
  canvas.width = COVER_WIDTH; canvas.height = COVER_HEIGHT;
  const context = canvas.getContext('2d');
  if (!context) throw new Error('Canvas unavailable');
  const scale = Math.max(COVER_WIDTH / bitmap.width, COVER_HEIGHT / bitmap.height);
  const width = bitmap.width * scale, height = bitmap.height * scale;
  context.drawImage(bitmap, (COVER_WIDTH - width) / 2, (COVER_HEIGHT - height) / 2, width, height);
  bitmap.close();
  const webp = canvas.toDataURL('image/webp', 0.86);
  return webp.startsWith('data:image/webp') ? webp : canvas.toDataURL('image/jpeg', 0.86);
}

const icons = {
  edit: 'M3 17.25V21h3.75L17.81 9.94l-3.75-3.75zM20.71 7.04a1 1 0 0 0 0-1.41l-2.34-2.34a1 1 0 0 0-1.41 0l-1.83 1.83 3.75 3.75z',
  theme: 'M12 3a9 9 0 0 0 0 18 1.5 1.5 0 0 0 1.1-2.5 1.5 1.5 0 0 1 1.1-2.5H16a5 5 0 0 0 5-5c0-4.4-4-8-9-8M6.5 12a1.5 1.5 0 1 1 0-3 1.5 1.5 0 0 1 0 3m3-4a1.5 1.5 0 1 1 0-3 1.5 1.5 0 0 1 0 3m5 0a1.5 1.5 0 1 1 0-3 1.5 1.5 0 0 1 0 3m3 4a1.5 1.5 0 1 1 0-3 1.5 1.5 0 0 1 0 3',
};
const Icon = ({path, box = 24}: {path: string; box?: number}) => <svg viewBox={`0 0 ${box} ${box}`} aria-hidden="true"><path d={path}/></svg>;

/** Each link platform's icon, in the order the buttons appear. Each button
 * opens the owner's page there; one not set yet is shown dimmed. */
const LINK_PLATFORMS: readonly {id: ProfileLinkId; box: number; path: string}[] = [
  {id: 'bilibili', box: 640, path: 'M552.6 168.1c16.7 18.1 24.4 39.7 23.3 65.7v202.4c-.4 26.4-9.2 48.1-26.5 65.1c-17.2 17-39.1 25.9-65.5 26.7H156c-26.4-.8-48.2-9.8-65.3-27.2s-26-40.3-26.7-68.6V233.8c.8-26 9.7-47.6 26.7-65.7c17.1-16.3 38.8-25.3 65.3-26.1h29.4L160 116.2c-5.7-5.7-8.6-13-8.6-21.8s2.9-16.1 8.6-21.8s13-8.6 21.9-8.6s16.1 2.9 21.9 8.6l73.3 69.4h88l74.5-69.4c6.1-5.7 13.6-8.6 22.4-8.6s16.1 2.9 21.9 8.6c5.7 5.7 8.6 13 8.6 21.8s-2.9 16.1-8.6 21.8L458.6 142h29.3c26.4.8 48 9.8 64.7 26.1m-38.8 69.7c-.4-9.6-3.7-17.4-10.7-23.5c-5.2-6.1-14-9.4-22.7-9.8H160c-9.6.4-17.4 3.7-23.6 9.8c-6.1 6.1-9.4 13.9-9.8 23.5v194.4c0 9.2 3.3 17 9.8 23.5s14.4 9.8 23.6 9.8h320.4c9.2 0 17-3.3 23.3-9.8s9.7-14.3 10.1-23.5zm-264.3 42.7c6.3 6.3 9.7 14.1 10.1 23.2V337c-.4 9.2-3.7 16.9-9.8 23.2c-6.2 6.3-14 9.5-23.6 9.5s-17.5-3.2-23.6-9.5s-9.4-14-9.8-23.2v-33.3c.4-9.1 3.8-16.9 10.1-23.2s13.2-9.6 23.3-10c9.2.4 17 3.7 23.3 10m191.5 0c6.3 6.3 9.7 14.1 10.1 23.2V337c-.4 9.2-3.7 16.9-9.8 23.2s-14 9.5-23.6 9.5s-17.4-3.2-23.6-9.5c-7-6.3-9.4-14-9.7-23.2v-33.3c.3-9.1 3.7-16.9 10-23.2s14.1-9.6 23.3-10c9.2.4 17 3.7 23.3 10'},
  {id: 'discord', box: 24, path: discordMark},
];

/** A user page: one fixed-width card below the header. A cover runs across
 * its top (4:1 by default, 3:1 once the owner uploads one), the avatar sits
 * on the cover's lower edge and the name beside it;
 * the chosen theme colours the page behind the card. `me` shows the local
 * profile, which its owner can edit; other ids have no account to show yet. */
export function ProfileWorkspace({account, name, avatar, cover, theme, showcases, playtime, clears = null, comments = [], onComment = () => false, onRemoveComment = () => {}, links, privacy, onLinks, onPrivacy, assetUrl, onEdit, onCover, onTheme, onShowcases, onName}: {
  /** The owner's page on each platform, and which overview sections others may see. */
  links: ProfileLinks; privacy: ProfilePrivacy; onLinks(links: ProfileLinks): boolean; onPrivacy(privacy: ProfilePrivacy): boolean;
  /** Each game's clears, null while saves are read. */
  clears?: readonly ClearGame[] | null;
  comments?: readonly ProfileComment[]; onComment?(body: string, author: string | null): boolean; onRemoveComment?(id: string): void;
  /** Stores a nickname and returns the one now in effect (an empty one keeps the old). */
  onName(value: string): string;
  account: AccountSnapshot; playtime: readonly PlaytimeSlice[] | null; showcases: readonly ProfileShowcase[]; onShowcases(showcases: readonly ProfileShowcase[]): boolean; name: string; avatar?: string | null; cover: string | null; theme: string; assetUrl(path: string): string;
  onEdit(): void; onCover(cover: string | null): boolean; onTheme(id: string): void;
}) {
  const {t} = useLocale(), navigation = useSurfaceNavigation(), signedIn = account.status === 'signed-in';
  // `me`, or the signed-in visitor's own username, is the visitor's own page.
  const own = navigation.profileUserId === 'me' || (signedIn && navigation.profileUserId?.toLowerCase() === account.username?.toLowerCase());
  // Who is looking: the profile's owner, a signed-in member, or a visitor.
  const relation = own ? 'self' : signedIn ? 'member' : 'visitor';
  // Editing works on a copy of the showcases; saving stores it, cancelling drops it.
  const [editing, setEditing] = useState(false), [draft, setDraft] = useState<ProfileShowcase[]>([]), [saveError, setSaveError] = useState('');
  const [draftName, setDraftName] = useState(''), [draftLinks, setDraftLinks] = useState<Record<ProfileLinkId, string>>({bilibili: '', discord: ''});
  const [draftPrivacy, setDraftPrivacy] = useState(privacy), [linkErrors, setLinkErrors] = useState<readonly ProfileLinkId[]>([]);
  const startEditing = () => {
    setDraft(showcases.map(showcase => ({...showcase}))); setDraftName(name); setSaveError(''); setLinkErrors([]);
    setDraftLinks(Object.fromEntries(LINK_PLATFORM_IDS.map(id => [id, links[id] ?? ''])) as Record<ProfileLinkId, string>); setDraftPrivacy(privacy); setEditing(true);
  };
  const save = () => {
    // Every link is checked first, so nothing is stored while one is wrong.
    const checked = LINK_PLATFORM_IDS.map(id => [id, normalizeLink(id, draftLinks[id])] as const);
    const wrong = checked.filter(([, link]) => link === null).map(([id]) => id);
    setLinkErrors(wrong);
    if (wrong.length) return;
    if (draftName !== name) onName(draftName);
    const stored = [onShowcases(draft), onLinks(Object.fromEntries(checked.filter(([, link]) => link)) as ProfileLinks), onPrivacy(draftPrivacy)];
    if (stored.every(Boolean)) setEditing(false); else setSaveError(t('profile.showcaseSaveFailed'));
  };
  const change = (index: number, field: 'title' | 'body', value: string) => setDraft(list => list.map((showcase, at) => at === index ? {...showcase, [field]: value} : showcase));
  const isEditing = own && editing;
  const file = useRef<HTMLInputElement>(null), tools = useRef<HTMLDivElement>(null);
  const [themesOpen, setThemesOpen] = useState(false), [coverError, setCoverError] = useState('');
  const shownTheme = profileTheme(own ? theme : null);
  useEffect(() => {
    if (!shownTheme.backdrop) return;
    const root = document.documentElement;
    root.dataset.profileTheme = shownTheme.id;
    root.style.setProperty('--profile-backdrop', shownTheme.backdrop);
    return () => {delete root.dataset.profileTheme; root.style.removeProperty('--profile-backdrop');};
  }, [shownTheme]);
  useEffect(() => {
    if (!themesOpen) return;
    const outside = (event: PointerEvent) => {if (!tools.current?.contains(event.target as Node)) setThemesOpen(false);};
    document.addEventListener('pointerdown', outside);
    return () => document.removeEventListener('pointerdown', outside);
  }, [themesOpen]);
  const chooseCover = async (picked: File | undefined) => {
    if (!picked) return;
    setCoverError('');
    let data: string;
    try {data = await coverDataUrl(picked);} catch {setCoverError(t('profile.coverFailed')); return;}
    if (!onCover(data)) setCoverError(t('profile.coverNoRoom'));
  };
  const themeName = (id: string) => {const key = `profile.theme.${id}`; return isUiMessageKey(key) ? t(key) : id;};
  return <section className="workspace-panel profile-workspace" id="profilePage" aria-labelledby="profilePageName">
    <div className="profile-cover-frame">
      <div className="profile-cover" data-custom={own && cover ? true : undefined}><img src={own && cover ? cover : launcherBackgroundUrl} alt="" decoding="async" draggable={false}/></div>
      {own && <div className="profile-cover-tools" ref={tools} onKeyDown={event => {if (event.key === 'Escape' && themesOpen) {event.stopPropagation(); setThemesOpen(false); tools.current?.querySelector<HTMLElement>('#profileThemeOpen')?.focus();}}}>
        {coverError && <p className="profile-cover-error" role="alert">{coverError}</p>}
        <button type="button" className="profile-cover-tool" id="profileThemeOpen" aria-label={t('profile.theme')} title={t('profile.theme')} aria-expanded={themesOpen} aria-controls="profileThemePicker" onClick={() => setThemesOpen(open => !open)}><Icon path={icons.theme}/></button>
        <button type="button" className="profile-cover-tool" id="profileCoverEdit" aria-label={t('profile.coverEdit')} title={t('profile.coverEdit')} onClick={() => file.current?.click()}><Icon path={icons.edit}/></button>
        <input ref={file} type="file" accept="image/*" hidden onChange={event => {void chooseCover(event.currentTarget.files?.[0]); event.currentTarget.value = '';}}/>
        {themesOpen && <div className="profile-theme-picker" id="profileThemePicker" role="radiogroup" aria-label={t('profile.theme')}>
          {PROFILE_THEMES.map(option => <button key={option.id} type="button" role="radio" aria-checked={option.id === shownTheme.id} className="profile-theme-option"
            style={{'--swatch': option.swatch} as CSSProperties} onClick={() => onTheme(option.id)}><i aria-hidden="true"/><span>{themeName(option.id)}</span></button>)}
        </div>}
      </div>}
    </div>
    <div className="profile-identity">
      {own
        ? <button type="button" className="profile-page-avatar" id="profilePageAvatar" aria-label={name ? `${t('profile.title')}：${name}` : t('profile.title')} title={name || t('profile.title')} onClick={onEdit}>
          <ProfileAvatar name={name} src={avatar} assetUrl={assetUrl}/>
        </button>
        : <span className="profile-page-avatar"><ProfileAvatar name=""/></span>}
      <div className="profile-identity-main">
        <div className="profile-identity-text">
          {isEditing ? <label className="profile-name-edit">
            <span className="visually-hidden">{t('profile.nickname')}</span>
            <input id="profileNameInput" type="text" value={draftName} placeholder={t('profile.unnamed')} maxLength={24} autoComplete="nickname" aria-describedby="profileNameHint"
              onChange={event => setDraftName(event.target.value)} onKeyDown={event => {if (event.key === 'Enter') {event.preventDefault(); save();}}}/>
            <small id="profileNameHint">{t('profile.nicknameHint')}</small>
          </label>
            : <h1 className="profile-page-name" id="profilePageName" data-empty={own && name ? undefined : true}>{own ? name || t('profile.unnamed') : t('profile.userMissing')}</h1>}
          {/* The own page shows the account's username, or that no one is signed in. */}
          <p className="profile-page-handle" data-empty={own && !signedIn ? true : undefined}>{own ? signedIn ? `@${account.username}` : t('profile.notSignedIn') : `@${navigation.profileUserId}`}</p>
        </div>
        {/* Following is not available yet; its button marks where it will be. */}
        {isEditing ? <div className="profile-page-actions">
          <button type="button" className="profile-page-action" data-relation="self" id="profileEditCancel" onClick={() => setEditing(false)}>{t('profile.editCancel')}</button>
          <button type="button" className="profile-page-action" id="profileEditSave" onClick={save}>{t('profile.editSave')}</button>
        </div> : <button type="button" className="profile-page-action" id="profilePageAction" data-relation={relation} onClick={relation === 'self' ? startEditing : undefined}>
          {t(relation === 'self' ? 'profile.editProfile' : relation === 'member' ? 'profile.follow' : 'profile.signInToFollow')}
        </button>}
      </div>
    </div>
    {!own && <p className="profile-page-hint">{t('profile.userMissingHint')}</p>}
    {/* Following has no data yet: the counts are placeholders, and the
        follower and following lists they will open come later. */}
    <div className="profile-social">
      <div className="profile-stats">
        {(['followers', 'following'] as const).map(kind => <button key={kind} type="button" className="profile-stat" id={`profile${kind === 'followers' ? 'Followers' : 'Following'}`}>
          <strong>{own ? 0 : '–'}</strong><span>{t(`profile.${kind}`)}</span>
        </button>)}
      </div>
      <ul className="profile-links" aria-label={t('profile.links')}>
        {LINK_PLATFORMS.map(platform => {
          const label = t(`profile.link.${platform.id}`), href = links[platform.id];
          return <li key={platform.id}>{href
            ? <a className="profile-link" data-platform={platform.id} href={href} target="_blank" rel="noopener noreferrer" aria-label={label} title={label}><Icon path={platform.path} box={platform.box}/></a>
            : <span className="profile-link" data-platform={platform.id} data-unset="true" role="img" aria-label={t('profile.linkUnset', {name: label})} title={t('profile.linkUnset', {name: label})}><Icon path={platform.path} box={platform.box}/></span>}</li>;
        })}
      </ul>
    </div>
    {isEditing ? <div className="profile-showcases" data-editing="true">
      <section className="profile-showcase profile-settings-card" aria-labelledby="profileLinksEditTitle">
        <header><h2 id="profileLinksEditTitle">{t('profile.links')}</h2><p>{t('profile.linksNote')}</p></header>
        {LINK_PLATFORMS.map(platform => {
          const label = t(`profile.link.${platform.id}`), wrong = linkErrors.includes(platform.id);
          return <label key={platform.id} className="profile-link-field" data-invalid={wrong || undefined}>
            <span className="profile-link" data-platform={platform.id} aria-hidden="true"><Icon path={platform.path} box={platform.box}/></span>
            <span className="visually-hidden">{label}</span>
            <input type="text" id={`profileLinkInput-${platform.id}`} value={draftLinks[platform.id]} inputMode="url" autoComplete="off" spellCheck={false}
              placeholder={t(`profile.linkPlaceholder.${platform.id}`)} aria-invalid={wrong || undefined}
              onChange={event => {const value = event.target.value; setDraftLinks(current => ({...current, [platform.id]: value}));}}/>
            {wrong && <small role="alert">{t(`profile.linkInvalid.${platform.id}`)}</small>}
          </label>;
        })}
      </section>
      <h2 className="profile-showcases-heading">{t('profile.showcases')}</h2>
      {draft.map((showcase, index) => <section key={index} className="profile-showcase profile-showcase-editor" aria-label={t('profile.showcase.info')}>
        <header><span>{t('profile.showcase.info')}</span>
          <button type="button" onClick={() => setDraft(list => list.filter((_, at) => at !== index))}>{t('profile.showcaseRemove')}</button></header>
        <label className="login-field"><span>{t('profile.showcaseTitle')}</span>
          <input type="text" value={showcase.title} maxLength={SHOWCASE_LIMITS.title} placeholder={t('profile.showcase.info')} onChange={event => change(index, 'title', event.target.value)}/></label>
        <label className="login-field"><span>{t('profile.showcaseBody')}</span>
          <textarea rows={6} value={showcase.body} maxLength={SHOWCASE_LIMITS.body} onChange={event => change(index, 'body', event.target.value)}/>
          <small>{showcase.body.length} / {SHOWCASE_LIMITS.body}</small></label>
      </section>)}
      {!draft.some(showcase => showcase.type === 'info') && <button type="button" className="profile-showcase-add" id="profileShowcaseAdd" onClick={() => setDraft(list => [...list, emptyInfoShowcase()])}>
        + {t('profile.showcaseAdd', {name: t('profile.showcase.info')})}</button>}
      <p className="profile-showcases-note">{t('profile.showcaseNote')}</p>
      <section className="profile-showcase profile-settings-card" aria-labelledby="profilePrivacyTitle">
        <header><h2 id="profilePrivacyTitle">{t('profile.privacy')}</h2><p>{t('profile.privacyNote')}</p></header>
        {OVERVIEW_SECTIONS.map(section => <label key={section} className="profile-privacy-option">
          <span><b>{t(`profile.privacy.${section}`)}</b><small>{t(draftPrivacy[section] ? 'profile.privacyPublic' : 'profile.privacyPrivate')}</small></span>
          <input type="checkbox" role="switch" id={`profilePrivacy-${section}`} checked={draftPrivacy[section]}
            onChange={event => {const shown = event.target.checked; setDraftPrivacy(current => ({...current, [section]: shown}));}}/>
        </label>)}
      </section>
      {saveError && <p className="login-notice" role="alert">{saveError}</p>}
    </div> : own && <div className="profile-showcases">
      {showcases.map((showcase, index) => <section key={index} className="profile-showcase" aria-labelledby={`profileShowcase${index}`}>
        <h2 id={`profileShowcase${index}`}>{showcase.title.trim() || t('profile.showcase.info')}</h2>
        {showcase.body.trim() && <p>{showcase.body}</p>}
      </section>)}
      <ProfileOverview playtime={playtime} clears={clears} privacy={privacy} owner={own} assetUrl={assetUrl}/>
      <ProfileComments comments={comments} name={name} avatar={avatar} handle={signedIn ? account.username ?? null : null} signedIn={signedIn} owner={own} assetUrl={assetUrl}
        onAdd={body => onComment(body, signedIn ? account.username ?? null : null)} onRemove={onRemoveComment} onSignIn={navigation.openLogin}/>
    </div>}
  </section>;
}
