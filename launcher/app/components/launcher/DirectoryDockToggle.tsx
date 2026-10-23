import {useLocale} from '../../i18n';
import {directoryDock, useDirectoryDockExpanded} from './directory-dock';

/** Icon-only room-header control for the catalogue beside a docked room (wide screens only). */
export function DirectoryDockToggle() {
  const {t} = useLocale(), expanded = useDirectoryDockExpanded();
  const label = t(expanded ? 'room.collapseDirectory' : 'room.expandDirectory');
  return <button className="mp-room-top-action room-directory-toggle" id="roomDirectoryToggle" type="button" aria-label={label} title={label}
    aria-expanded={expanded} aria-controls="main" onClick={directoryDock.toggle}>
    {/* Phosphor-style sidebar glyph, matching the room's other header icons. */}
    <svg className="room-icon room-directory-icon" viewBox="0 0 256 256" aria-hidden="true"><rect x="32" y="48" width="192" height="160" rx="8"/><line x1="88" y1="48" x2="88" y2="208"/></svg>
  </button>;
}
