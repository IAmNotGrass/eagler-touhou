import {useEffect, useRef, useState} from 'react';
import {useLocale} from '../../i18n';

/** Pointer leaving the menu closes it after this long, so moving across the
 * gap between the button and its panel keeps it open. */
const CLOSE_DELAY = 160;
/** Sent when a header menu opens, so the others close. */
const OPEN_EVENT = 'masthead-nav-open';

export interface MastheadNavItem {
  id: string; label: string; icon: string;
  /** Without an action the item is shown as not available yet. */
  onSelect?: () => void;
}

/** A header menu that opens while the pointer rests on it, and on click or
 * the keyboard where there is no hover. Choosing an item, leaving the menu
 * or opening another one closes it. */
export function MastheadNavMenu({id, label, items, interactive = true, onOpen}: {id: string; label: string; items: readonly MastheadNavItem[]; interactive?: boolean; onOpen?: () => void}) {
  const {t} = useLocale();
  const [open, setOpen] = useState(false), root = useRef<HTMLDivElement>(null), toggle = useRef<HTMLButtonElement>(null), timer = useRef<number | null>(null);
  const cancelClose = () => {if (timer.current !== null) {window.clearTimeout(timer.current); timer.current = null;}};
  const show = () => {cancelClose(); setOpen(true); document.dispatchEvent(new CustomEvent(OPEN_EVENT, {detail: id})); onOpen?.();};
  const hide = (delay = 0) => {
    cancelClose();
    if (delay) timer.current = window.setTimeout(() => {timer.current = null; setOpen(false);}, delay); else setOpen(false);
  };
  useEffect(() => cancelClose, []);
  useEffect(() => {
    const other = (event: Event) => {if ((event as CustomEvent<string>).detail !== id) {cancelClose(); setOpen(false);}};
    document.addEventListener(OPEN_EVENT, other);
    return () => document.removeEventListener(OPEN_EVENT, other);
  }, [id]);
  useEffect(() => {
    if (!open) return;
    const outside = (event: Event) => {if (event.target instanceof Node && !root.current?.contains(event.target)) hide();};
    document.addEventListener('pointerdown', outside);
    return () => document.removeEventListener('pointerdown', outside);
  }, [open]);
  const panelId = `${id}Panel`;
  const first = () => root.current?.querySelector<HTMLElement>('.masthead-menu-item:not(:disabled)')?.focus();
  return <div ref={root} className="masthead-menu masthead-nav-menu" id={id}
    onPointerEnter={event => {if (interactive && event.pointerType === 'mouse') show();}}
    onPointerLeave={event => {if (event.pointerType === 'mouse') hide(CLOSE_DELAY);}}
    onBlur={event => {if (!event.currentTarget.contains(event.relatedTarget as Node | null)) hide();}}
    onKeyDown={event => {if (event.key === 'Escape' && open) {event.preventDefault(); event.stopPropagation(); hide(); toggle.current?.focus();}}}>
    <button ref={toggle} type="button" className="masthead-link masthead-nav-toggle" id={`${id}Toggle`} aria-expanded={open} aria-controls={panelId} disabled={!interactive}
      onClick={event => {
        // A mouse has already opened it by hovering; a click there keeps it open.
        if (event.detail > 0 && open && timer.current === null && root.current?.matches(':hover')) return;
        if (open) hide(); else show();
      }}
      onKeyDown={event => {if (event.key === 'ArrowDown') {event.preventDefault(); show(); requestAnimationFrame(first);}}}>
      <span>{label}</span>
      <svg className="masthead-nav-chevron" viewBox="0 0 24 24" aria-hidden="true"><path d="m7 10 5 5 5-5"/></svg>
    </button>
    <div className="masthead-menu-panel masthead-nav-panel" id={panelId} aria-hidden={!open} inert={!open}>
      {items.map(item => <button key={item.id} type="button" className="masthead-menu-item" id={item.id} disabled={!item.onSelect}
        onClick={() => {hide(); item.onSelect?.();}}>
        <svg className="masthead-menu-icon" viewBox="0 0 24 24" aria-hidden="true"><path d={item.icon}/></svg>
        <span>{item.label}</span>
        {!item.onSelect && <small className="masthead-nav-soon">{t('nav.comingSoon')}</small>}
      </button>)}
    </div>
  </div>;
}
