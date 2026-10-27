import {useLocale} from '../../i18n';
import {useSurfaceNavigation} from '../../navigation/surface-navigation';
import {ProfileAvatar} from '../notices/ProfileDialog';

/** The profile page: one card below the header that grows with its content.
 * The avatar opens the profile editor. */
export function ProfileWorkspace({name, avatar, assetUrl, onEdit}: {
  name: string; avatar?: string | null; assetUrl(path: string): string; onEdit(): void;
}) {
  const {t} = useLocale(), navigation = useSurfaceNavigation();
  return <section className="workspace-panel profile-workspace" id="profilePage" aria-labelledby="profilePageTitle"
    onKeyDown={event => {if (event.key === 'Escape' && !event.defaultPrevented) {event.preventDefault(); navigation.closeProfile();}}}>
    <div className="settings-workspace-heading profile-workspace-heading">
      <div><h1 id="profilePageTitle">{t('profile.title')}</h1></div>
      <button type="button" id="profilePageClose" onClick={navigation.closeProfile}>{t('action.back')}</button>
    </div>
    <div className="profile-workspace-content">
      <button type="button" className="profile-page-avatar" id="profilePageAvatar" aria-label={name ? `${t('profile.title')}：${name}` : t('profile.title')} title={name || t('profile.title')} onClick={onEdit}>
        <ProfileAvatar name={name} src={avatar} assetUrl={assetUrl}/>
      </button>
      <p className="profile-page-name" data-empty={name ? undefined : true}>{name || t('profile.unnamed')}</p>
    </div>
  </section>;
}
