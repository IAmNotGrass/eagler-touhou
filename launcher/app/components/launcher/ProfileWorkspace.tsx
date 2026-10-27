import {useEffect, useRef, useState, type CSSProperties} from 'react';
import {useLocale} from '../../i18n';
import {isUiMessageKey} from '../../../src/launcher/i18n.mts';
import {useSurfaceNavigation} from '../../navigation/surface-navigation';
import {PROFILE_THEMES, profileTheme} from '../../models/profile-themes';
import {ProfileAvatar} from '../notices/ProfileDialog';
import {launcherBackgroundUrl} from '../startup/OriginalBootstrap';

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
  reset: 'M12 5V1L7 6l5 5V7a6 6 0 1 1-6 6H4a8 8 0 1 0 8-8',
  theme: 'M12 3a9 9 0 0 0 0 18 1.5 1.5 0 0 0 1.1-2.5 1.5 1.5 0 0 1 1.1-2.5H16a5 5 0 0 0 5-5c0-4.4-4-8-9-8M6.5 12a1.5 1.5 0 1 1 0-3 1.5 1.5 0 0 1 0 3m3-4a1.5 1.5 0 1 1 0-3 1.5 1.5 0 0 1 0 3m5 0a1.5 1.5 0 1 1 0-3 1.5 1.5 0 0 1 0 3m3 4a1.5 1.5 0 1 1 0-3 1.5 1.5 0 0 1 0 3',
};
const Icon = ({path}: {path: string}) => <svg viewBox="0 0 24 24" aria-hidden="true"><path d={path}/></svg>;

/** A user page: one fixed-width card below the header. A 3:1 cover runs across
 * its top, the avatar sits on the cover's lower edge and the name beside it;
 * the chosen theme colours the page behind the card. `me` shows the local
 * profile, which its owner can edit; other ids have no account to show yet. */
export function ProfileWorkspace({name, avatar, cover, theme, assetUrl, onEdit, onCover, onTheme}: {
  name: string; avatar?: string | null; cover: string | null; theme: string; assetUrl(path: string): string;
  onEdit(): void; onCover(cover: string | null): boolean; onTheme(id: string): void;
}) {
  const {t} = useLocale(), navigation = useSurfaceNavigation(), own = navigation.profileUserId === 'me';
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
      <div className="profile-cover"><img src={own && cover ? cover : launcherBackgroundUrl} alt="" decoding="async" draggable={false}/></div>
      {own && <div className="profile-cover-tools" ref={tools} onKeyDown={event => {if (event.key === 'Escape' && themesOpen) {event.stopPropagation(); setThemesOpen(false); tools.current?.querySelector<HTMLElement>('#profileThemeOpen')?.focus();}}}>
        {coverError && <p className="profile-cover-error" role="alert">{coverError}</p>}
        <button type="button" className="profile-cover-tool" id="profileThemeOpen" aria-label={t('profile.theme')} title={t('profile.theme')} aria-expanded={themesOpen} aria-controls="profileThemePicker" onClick={() => setThemesOpen(open => !open)}><Icon path={icons.theme}/></button>
        {cover && <button type="button" className="profile-cover-tool" id="profileCoverReset" aria-label={t('profile.coverReset')} title={t('profile.coverReset')} onClick={() => {setCoverError(''); onCover(null);}}><Icon path={icons.reset}/></button>}
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
      <div className="profile-identity-text">
        <h1 className="profile-page-name" id="profilePageName" data-empty={own && name ? undefined : true}>{own ? name || t('profile.unnamed') : t('profile.userMissing')}</h1>
        {!own && <p className="profile-page-hint">{t('profile.userMissingHint')}</p>}
      </div>
    </div>
  </section>;
}
