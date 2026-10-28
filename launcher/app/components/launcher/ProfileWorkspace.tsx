import {useEffect, useRef, useState, type CSSProperties} from 'react';
import {useLocale} from '../../i18n';
import {isUiMessageKey} from '../../../src/launcher/i18n.mts';
import {useSurfaceNavigation} from '../../navigation/surface-navigation';
import {PROFILE_THEMES, profileTheme} from '../../models/profile-themes';
import {ProfileAvatar} from '../notices/ProfileDialog';
import {launcherBackgroundUrl} from '../startup/OriginalBootstrap';
import type {AccountSnapshot} from '../../services/account';
import {emptyInfoShowcase, SHOWCASE_LIMITS, type ProfileShowcase} from '../../models/profile-showcases';
import {PlaytimeShowcase, type PlaytimeSlice} from './PlaytimeShowcase';

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
const Icon = ({path}: {path: string}) => <svg viewBox="0 0 24 24" aria-hidden="true"><path d={path}/></svg>;

/** A user page: one fixed-width card below the header. A cover runs across
 * its top (4:1 by default, 3:1 once the owner uploads one), the avatar sits
 * on the cover's lower edge and the name beside it;
 * the chosen theme colours the page behind the card. `me` shows the local
 * profile, which its owner can edit; other ids have no account to show yet. */
export function ProfileWorkspace({account, name, avatar, cover, theme, showcases, playtime, assetUrl, onEdit, onCover, onTheme, onShowcases, onName}: {
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
  const [draftName, setDraftName] = useState('');
  const startEditing = () => {setDraft(showcases.map(showcase => ({...showcase}))); setDraftName(name); setSaveError(''); setEditing(true);};
  const save = () => {
    if (draftName !== name) onName(draftName);
    if (onShowcases(draft)) setEditing(false); else setSaveError(t('profile.showcaseSaveFailed'));
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
    {isEditing ? <div className="profile-showcases" data-editing="true">
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
      {saveError && <p className="login-notice" role="alert">{saveError}</p>}
    </div> : own && <div className="profile-showcases">
      {showcases.map((showcase, index) => <section key={index} className="profile-showcase" aria-labelledby={`profileShowcase${index}`}>
        <h2 id={`profileShowcase${index}`}>{showcase.title.trim() || t('profile.showcase.info')}</h2>
        {showcase.body.trim() && <p>{showcase.body}</p>}
      </section>)}
      <PlaytimeShowcase slices={playtime}/>
    </div>}
  </section>;
}
