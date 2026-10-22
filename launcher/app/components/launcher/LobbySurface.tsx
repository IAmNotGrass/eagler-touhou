import type {ReactNode} from 'react';
import {useInRouterContext} from 'react-router';
import {useLocale} from '../../i18n';
import type {LibraryCardsProps} from './LibraryCards';
import {LibrarySurface} from './LibrarySurface';
import {SiteFooter} from './SiteFooter';
import {AppLink} from './AppLink';

export interface LobbySurfaceProps extends Omit<LibraryCardsProps, 'variant' | 'lobbyLink' | 'inert'> {
  masthead: ReactNode;
  footer?: ReactNode;
  embedded?: boolean;
  launcherHref?: string;
  siteHref?: string;
  onSite?(): void;
  assetUrl?(path: string): string;
  onGuide: (() => void) | null;
  onNetwork: (() => void) | null;
  networkRunning?: boolean;
  connectionWarning?: ReactNode;
  membership?: ReactNode;
  notice?: string;
  roomTools: ReactNode;
  roomList: ReactNode;
  hasRooms: boolean;
  loading: boolean;
  emptyState: {title: string; hint: string; action?: {label: string; onClick: () => void}} | null;
  roomCount: string;
  connectionNote?: string;
  roomUsersArtwork: string;
  children?: ReactNode;
}
/** Only the right card changes; the live host retains directory, masthead and credits. */
export function LobbySurface({masthead, footer, embedded = false, launcherHref = './', siteHref = '?view=lobby', onSite, assetUrl = path => path, onGuide, onNetwork, networkRunning = false, connectionWarning, membership, notice, roomTools, roomList, hasRooms, loading, emptyState, roomCount, connectionNote, roomUsersArtwork, children, ...rail}: LobbySurfaceProps) {
  const {t} = useLocale();
  const testProduct = ['th08mp', 'th09mp', 'th10mp'].includes(rail.selectedProduct ?? '');
  const selectedTitle = rail.products.find(product => product.id === rail.selectedProduct)?.title;
  const inRouter = useInRouterContext();
  const Link = rail.interactive === false || !inRouter ? 'a' : AppLink;
  const workspace = <><section className="workspace-panel lobby-workspace" aria-label={t('lobby.title')} data-all-products={!rail.selectedProduct}>
    <header className="lobby-intro"><h1>{t('lobby.title')}{selectedTitle && <span className="lobby-intro-game">{selectedTitle}</span>}</h1>
      <nav className="lobby-header-actions" aria-label={t('lobby.title')}>
        <button className="lobby-button" id="lobbyGuideOpen" type="button" disabled={!onGuide} onClick={onGuide ?? undefined}>{t('workspace.gameplayGuide')}</button>
        <button className={`lobby-button${networkRunning ? ' running' : ''}`} id="lobbyNetworkCheck" aria-disabled={networkRunning ? 'true' : undefined} type="button" disabled={!onNetwork} onClick={onNetwork ?? undefined}>{t('networkCheck.action')}</button>
        <a className="lobby-button" id="lobbySurvey" href="https://v.wjx.cn/vm/QqmTdwh.aspx#" target="_blank" rel="noopener noreferrer" title={t('lobby.surveyNotice')}>{t('lobby.surveyAction')}</a>
      </nav>
    </header>
    {connectionWarning}
    <p className="lobby-notice" id="notice" role="status" hidden={!notice}>{notice}</p>
    {membership}
    <section className={`lobby-list-surface${rail.selectedProduct === 'th09mp' ? ' th09-room-surface' : ''}`} aria-label={t('lobby.rooms')} tabIndex={0}>
      <p className="lobby-test-notice" id="gameTestNotice" role="status" hidden={!testProduct}>{t('lobby.testStageHint')}</p>
      <div className="lobby-list-head" id="listHead" aria-hidden="true" hidden={!hasRooms || rail.selectedProduct === 'th09mp'}><span>{t('workspace.roomNumber')}</span><span>{t('lobby.difficulty')}</span><span/><span>{t('lobby.capacity')}</span><span>{t('lobby.state')}</span><span/></div>
      <div className="lobby-room-list" id="roomList" role="list" aria-busy={loading}>{roomList}</div>
      <div className="lobby-list-loading" id="listLoading" role="status" hidden={!loading}><i className="lobby-preload-spinner" aria-hidden="true"/><span className="lobby-sr-only">{t('lobby.loadingHint')}</span></div>
      {emptyState && <div className="lobby-empty" id="emptyState"><img src={roomUsersArtwork} alt="" width="36" height="36"/><h2 id="emptyTitle">{emptyState.title}</h2><p id="emptyHint">{emptyState.hint}</p>{emptyState.action && <button className="lobby-button" id="emptyAction" type="button" onClick={emptyState.action.onClick}>{emptyState.action.label}</button>}</div>}
    </section>
    <p className="lobby-notice" id="connectionNote" role="status" hidden={!connectionNote}>{connectionNote}</p>
    <footer className="lobby-room-tools"><Link className="lobby-button lobby-back" id="launcherLink" href={launcherHref} {...(Link === AppLink ? {preventScrollReset: true} : {})}><img src={assetUrl('assets/room-caret-left.svg')} alt="" width="20" height="20"/>{t('lobby.back')}</Link><div className="lobby-actions">{roomTools}</div></footer>
    <p className="lobby-sr-only" id="roomCount" aria-live="polite">{roomCount}</p>
  </section>{children}</>;
  return embedded ? workspace : <LibrarySurface lobby products={rail.products} selectedProduct={rail.selectedProduct} onActivate={rail.onSelect} interactive={rail.interactive} masthead={masthead} footer={footer === undefined ? <SiteFooter onDonation={() => {}}/> : footer} lobbyHref={siteHref} optionsOpen={false} onBack={onSite ?? (() => {})} onSite={onSite} siteHref={siteHref} assetUrl={assetUrl}>{workspace}</LibrarySurface>;
}
