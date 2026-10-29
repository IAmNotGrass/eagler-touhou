import {useEffect, useLayoutEffect, useRef, useState, type ReactNode} from 'react';
import {useLocale} from '../../i18n';
import {mastheadIcons} from './masthead-icons';
import {closeMainSelectMenus, MainSelectPrefix} from './MainSelect';
import {MastheadBrand} from './MastheadBrand';
import {ProfileAvatar} from '../notices/ProfileDialog';
import {MastheadNavMenu, type MastheadNavItem} from './MastheadNavMenu';

/** Icons for the header's play and community menus. */
const navIcons = {
  single: 'M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8m0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4',
  multi: 'M16 11a3 3 0 1 0 0-6 3 3 0 0 0 0 6m-8 0a3 3 0 1 0 0-6 3 3 0 0 0 0 6m0 2c-2.33 0-7 1.17-7 3.5V19h14v-2.5C15 14.17 10.33 13 8 13m8 0c-.29 0-.62.02-.97.05 1.16.84 1.97 1.97 1.97 3.45V19h6v-2.5c0-2.33-4.67-3.5-7-3.5',
  forum: 'M21 6h-2v9H6v2c0 .55.45 1 1 1h11l4 4V7c0-.55-.45-1-1-1m-4 6V3c0-.55-.45-1-1-1H3c-.55 0-1 .45-1 1v14l4-4h10c.55 0 1-.45 1-1',
  guide: 'M21 5c-1.11-.35-2.33-.5-3.5-.5-1.95 0-4.05.4-5.5 1.5-1.45-1.1-3.55-1.5-5.5-1.5S2.45 4.9 1 6v14.65c0 .25.25.5.5.5.1 0 .15-.05.25-.05C3.1 20.45 5.05 20 6.5 20c1.95 0 4.05.4 5.5 1.5 1.35-.85 3.8-1.5 5.5-1.5 1.65 0 3.35.3 4.75 1.05.1.05.15.05.25.05.25 0 .5-.25.5-.5V6c-.6-.45-1.25-.75-2-1m0 13.5c-1.1-.35-2.3-.5-3.5-.5-1.7 0-4.15.65-5.5 1.5V8c1.35-.85 3.8-1.5 5.5-1.5 1.2 0 2.4.15 3.5.5z',
};

export interface LauncherMastheadProps {
  /** Published pre-session markup has native links and no menu owner. */
  interactive?: boolean;
  variant: 'library' | 'lobby';
  assetUrl: (path: string) => string;
  launcherHref: string;
  faqHref: string;
  aboutHref: string;
  migrationHref?: string;
  migrationPolicyKnown?: boolean;
  updatedAge?: {text: string; title?: string; dateTime?: string};
  menuOpen: boolean;
  onMenuOpenChange: (open: boolean) => void;
  lessMotion: boolean;
  onToggleMotion: () => void;
  noticeEnabled: boolean;
  onToggleNotice: () => void;
  diagnosticsEnabled: boolean;
  onToggleDiagnostics: () => void;
  onDonation: () => void;
  donationAvailable?: boolean;
  onFirstUse: () => void;
  onSettings?: () => void;
  /** The stored nickname shown as the header avatar; empty before one is chosen. */
  profileName?: string;
  /** The chosen avatar preset's asset path, if any. */
  profileAvatar?: string | null;
  onProfile?: () => void;
  /** The brand returns to the site's home page. */
  onHome?: () => void;
  /** The play menu: single player is the home page, multiplayer the lobby. */
  onSingleplayer?: () => void;
  onMultiplayer?: () => void;
  /** Present while someone is signed in: the menu then offers to sign out. */
  onSignOut?: () => void;
  /** The shared MainSelect, with the original uiLanguageSelect native props. */
  languageControl: ReactNode;
}

/** Original index.html320–345 / lobby.html45–70 shared masthead.
 * Menu keyboard/outside-click behavior: main app.mts8749–8774.
 */
/** The first control in the menu panel that is shown at this screen size. */
const firstShown = (panel: HTMLElement | null) => [...panel?.querySelectorAll<HTMLElement>('.masthead-menu-group-toggle, .mizuki-select-trigger, .masthead-menu-item') ?? []]
  .find(control => control.getClientRects().length > 0);

export function LauncherMasthead(props: LauncherMastheadProps) {
  const {t} = useLocale();
  const {variant, menuOpen, onMenuOpenChange, interactive = true} = props;
  const menu = useRef<HTMLDivElement>(null), toggle = useRef<HTMLButtonElement>(null), panel = useRef<HTMLDivElement>(null);
  const focusFirst = useRef(false), callbacks = useRef(onMenuOpenChange); callbacks.current = onMenuOpenChange;
  // On a portrait phone the menu is a full page of groups that expand in place.
  const [group, setGroup] = useState<'play' | 'community' | 'other' | null>(null);
  const playItems: MastheadNavItem[] = [
    {id: 'mastheadSingleplayer', label: t('nav.singleplayer'), icon: navIcons.single, onSelect: props.onSingleplayer},
    {id: 'mastheadMultiplayer', label: t('nav.multiplayer'), icon: navIcons.multi, onSelect: props.onMultiplayer},
  ];
  // The forum and guides have no pages yet; their items mark where they will be.
  const communityItems: MastheadNavItem[] = [
    {id: 'mastheadForum', label: t('nav.forum'), icon: navIcons.forum},
    {id: 'mastheadGuides', label: t('nav.guides'), icon: navIcons.guide},
  ];
  const groupToggle = (id: 'play' | 'community' | 'other', label: string) => <button type="button" className="masthead-menu-group-toggle" id={`mastheadGroup-${id}`}
    aria-expanded={group === id} aria-controls={`mastheadGroupBody-${id}`} onClick={() => setGroup(current => current === id ? null : id)}>
    <span>{label}</span><svg viewBox="0 0 24 24" aria-hidden="true"><path d="m7 10 5 5 5-5"/></svg></button>;
  const groupItems = (items: readonly MastheadNavItem[], prefix: string) => items.map(item => <button key={item.id} type="button" className="masthead-menu-item" id={`${prefix}${item.id}`}
    disabled={!item.onSelect} onClick={() => {onMenuOpenChange(false); item.onSelect?.();}}>
    <svg className="masthead-menu-icon" viewBox="0 0 24 24" aria-hidden="true"><path d={item.icon}/></svg><span>{item.label}</span>
    {!item.onSelect && <small className="masthead-nav-soon">{t('nav.comingSoon')}</small>}</button>);
  useEffect(() => {
    if (!interactive) return;
    const outside = (event: MouseEvent) => {
      if (variant === 'lobby' && event.target instanceof Element && event.target.closest('.mizuki-select-menu')) return;
      if (event.target instanceof Node && !menu.current?.contains(event.target)) callbacks.current(false);
    };
    document.addEventListener('click', outside);
    return () => document.removeEventListener('click', outside);
  }, [variant, interactive]);
  useLayoutEffect(() => {
    if (!interactive) return;
    if (!menuOpen && variant === 'lobby') closeMainSelectMenus();
    if (menuOpen && focusFirst.current) {
      focusFirst.current = false;
      firstShown(panel.current)?.focus();
    }
  }, [menuOpen, variant, interactive]);
  return <header className="masthead">
    <MastheadBrand interactive={interactive} updatedAge={props.updatedAge} lessMotion={props.lessMotion} onHome={props.onHome}/>
    <nav className="masthead-links" aria-label={t('nav.siteInfo')}>
      <MastheadNavMenu id="mastheadPlay" label={t('nav.play')} interactive={interactive} onOpen={() => onMenuOpenChange(false)} items={playItems}/>
      <MastheadNavMenu id="mastheadCommunity" label={t('nav.community')} interactive={interactive} onOpen={() => onMenuOpenChange(false)} items={communityItems}/>
      <button className="masthead-link masthead-profile" id="profileOpen" type="button" aria-controls="profileDialog" disabled={!interactive || !props.onProfile}
        aria-label={props.profileName ? `${t('profile.title')}：${props.profileName}` : t('profile.title')} title={props.profileName || t('profile.title')} onClick={props.onProfile}>
        <ProfileAvatar name={props.profileName ?? ''} src={props.profileAvatar} assetUrl={props.assetUrl}/>
      </button>
      <a className="masthead-link masthead-github" href="https://github.com/YomotsuHisami/eagler-touhou" target="_blank" rel="noopener noreferrer" aria-label="GitHub" dangerouslySetInnerHTML={{__html: mastheadIcons.github}}/>
      <div ref={menu} className="masthead-menu" id="mastheadMenu" onKeyDown={event => {
        if (event.key !== 'Escape') return;
        if (variant === 'lobby') event.stopPropagation();
        event.preventDefault(); onMenuOpenChange(false); toggle.current?.focus();
      }}>
        <button ref={toggle} className="masthead-link masthead-menu-toggle" id="mastheadMenuToggle" type="button" aria-label={t('nav.more')} aria-expanded={menuOpen} aria-controls="mastheadMenuPanel" onClick={() => onMenuOpenChange(!menuOpen)} onKeyDown={event => {
          if (event.key !== 'ArrowDown') return;
          event.preventDefault();
          if (menuOpen) firstShown(panel.current)?.focus();
          else {focusFirst.current = true; onMenuOpenChange(true);}
        }}><svg viewBox="0 0 24 24" aria-hidden="true"><path d="m7 9 5-5 5 5M7 15l5 5 5-5"/></svg></button>
        <div ref={panel} className="masthead-menu-panel" id="mastheadMenuPanel" aria-hidden={!menuOpen} inert={!menuOpen}>
          {/* A portrait phone shows the menu as a page: play, community and the
              options under "other", each expanding in place. Wider screens show
              only the options, as a plain list. */}
          <header className="masthead-menu-sheet-header"><span>{t('nav.menu')}</span>
            <button type="button" className="masthead-menu-close" aria-label={t('nav.menuClose')} onClick={() => {onMenuOpenChange(false); toggle.current?.focus();}}>×</button></header>
          <section className="masthead-menu-group" data-group="play">{groupToggle('play', t('nav.play'))}
            <div className="masthead-menu-group-body" id="mastheadGroupBody-play">{groupItems(playItems, 'sheet-')}</div></section>
          <section className="masthead-menu-group" data-group="community">{groupToggle('community', t('nav.community'))}
            <div className="masthead-menu-group-body" id="mastheadGroupBody-community">{groupItems(communityItems, 'sheet-')}</div></section>
          <section className="masthead-menu-group" data-group="other">{groupToggle('other', t('nav.other'))}
            <div className="masthead-menu-group-body" id="mastheadGroupBody-other">
              <button className="masthead-menu-item" id="globalSettingsOpen" type="button" aria-controls="globalSettingsDialog" disabled={!interactive} onClick={() => {onMenuOpenChange(false); props.onSettings?.();}}><MenuIcon name="settings"/><span>{t('settings.globalTitle')}</span></button>
              <a className="masthead-menu-item" id="originMigrationOpen" href={props.migrationHref ?? 'migrate.html'} hidden={!props.migrationHref} data-policy={props.migrationPolicyKnown ? 'host-manifest-origin-migration-policy/1' : undefined}><MenuIcon name="migration"/><span className="masthead-label"><span>{t('nav.oldSitePart1')}</span><wbr/><span>{t('nav.migrationPart2')}</span></span></a>
              <button className="masthead-menu-item" id="donationOpenTop" type="button" hidden={props.donationAvailable === false} onClick={() => {onMenuOpenChange(false); props.onDonation();}}><MenuIcon name="donate"/><span>{t('nav.donate')}</span></button>
              <a className="masthead-menu-item" href={props.faqHref}><MenuIcon name="faq"/><span className="masthead-label"><span>{t('nav.faqFirst')}</span><wbr/><span>{t('nav.faqSecond')}</span></span></a>
              <button className="masthead-menu-item motion-menu-toggle" id={variant === 'lobby' ? 'lobbyLessMotion' : 'lessMotionToggle'} type="button" aria-pressed={props.lessMotion} title={t(props.lessMotion ? 'nav.motionFullTitle' : 'nav.motionLessTitle')} onClick={props.onToggleMotion}><MenuIcon name="motion"/><span>{t('nav.lessMotion')}</span><i className="site-notice-toggle-state" aria-hidden="true"/></button>
              <button className="masthead-menu-item" id="siteNoticeToggle" type="button" role="switch" aria-checked={props.noticeEnabled} onClick={props.onToggleNotice}><MenuIcon name="notice"/><span>{t('notice.label')}</span><i className="site-notice-toggle-state" aria-hidden="true"/></button>
              <button className="masthead-menu-item" id="runtimeDiagnosticsToggle" type="button" role="switch" aria-checked={props.diagnosticsEnabled} onClick={props.onToggleDiagnostics}><MenuIcon name="diagnostics"/><span>{t('diagnostics.toggle')}</span><i className="site-notice-toggle-state" aria-hidden="true"/></button>
              <div className="ui-language-control masthead-menu-language"><MainSelectPrefix prefix={<MenuIcon name="language"/>}>{props.languageControl}</MainSelectPrefix><template data-select-trigger-prefix="" dangerouslySetInnerHTML={{__html: mastheadIcons.language}}/></div>
              <button className="masthead-menu-item" id="firstUseNoticeOpen" type="button" onClick={() => {onMenuOpenChange(false); props.onFirstUse();}}><MenuIcon name="firstUse"/><span>{t('nav.firstUseNotice')}</span></button>
              <a className="masthead-menu-item" href={props.aboutHref}><MenuIcon name="about"/><span>{t('nav.about')}</span></a>
              {props.onSignOut && <button className="masthead-menu-item" id="signOutMenu" type="button" onClick={() => {onMenuOpenChange(false); props.onSignOut?.();}}><MenuIcon name="signOut"/><span>{t('login.signOut')}</span></button>}
            </div></section>
        </div>
      </div>
    </nav>
  </header>;
}

function MenuIcon({name}: {name: 'settings' | 'migration' | 'donate' | 'faq' | 'signOut' | 'motion' | 'notice' | 'diagnostics' | 'firstUse' | 'about' | 'language'}) {
  // Preserve the original SVG as the direct child, with no layout wrapper.
  const svg = mastheadIcons[name];
  const path = svg.match(/<path d="([^"]*)"/)![1];
  return <svg className="masthead-menu-icon" viewBox="0 0 24 24" aria-hidden="true"><path d={path}/></svg>;
}
