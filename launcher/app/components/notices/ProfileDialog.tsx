import {useEffect, useRef, useState, type CSSProperties} from 'react';
import {useLocale} from '../../i18n';
import {multiplayerDisplayInitial} from '../../../src/launcher/multiplayer-identity.mts';
import {isUiMessageKey} from '../../../src/launcher/i18n.mts';
import {avatarArt, avatarCharacterName, avatarColor, avatarCostumes, avatarExpressions, avatarSource, expressionLabelParts, PROFILE_AVATAR_CHARACTERS, searchAvatarCharacters, type AvatarCharacterId, type AvatarExpression, type ProfileAvatarChoice} from '../../models/profile-avatars';
import type {MainDialogProps} from './use-main-dialog';
import {InformationalDialog, informationalDialogPresentation} from './InformationalDialog';

export interface ProfileDialogProps extends MainDialogProps {
  /** The stored nickname; empty until one is chosen. */
  name: string;
  avatar: ProfileAvatarChoice | null;
  assetUrl(path: string): string;
  /** Stores a nickname and returns the one now in effect. */
  onName(value: string): string;
  onAvatar(choice: ProfileAvatarChoice): void;
}

const CHARACTERS = PROFILE_AVATAR_CHARACTERS;
/** Slots spread around the dial; the top one is the focused character. The two
 * bottom slots hold the search control, where characters enter and leave. */
const SLOTS = 13, SHOWN = 5.5, RADIUS = 150, WHEEL_STEP = 50, DRAG_STEP = 44;
const wrap = (value: number, size: number) => size ? ((value % size) + size) % size : 0;
const indexIn = (list: readonly AvatarCharacterId[], character: AvatarCharacterId | undefined) => Math.max(0, character ? list.indexOf(character) : 0);

/** Rotation in steps over a list of `size` characters, eased toward a
 * whole-step target. The target is published separately so the focus jumps
 * straight to the destination. */
function useDial(initial: number, size: number) {
  const [offset, setOffset] = useState(initial), [destination, setDestination] = useState(initial);
  const target = useRef(initial), current = useRef(initial), frame = useRef(0), count = useRef(size);
  count.current = size;
  const animate = () => {
    cancelAnimationFrame(frame.current);
    const reduced = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches || document.body.classList.contains('less-motion');
    const step = () => {
      const gap = target.current - current.current;
      current.current = reduced || Math.abs(gap) < 0.002 ? target.current : current.current + gap * 0.22;
      setOffset(current.current);
      if (current.current !== target.current) frame.current = requestAnimationFrame(step);
    };
    setDestination(target.current);
    frame.current = requestAnimationFrame(step);
  };
  useEffect(() => () => cancelAnimationFrame(frame.current), []);
  return {
    offset,
    /** Index of the character the dial is settling on. */
    focus: wrap(Math.round(destination), size),
    /** Turn by whole steps. */
    turn(steps: number) {target.current = Math.round(target.current) + steps; animate();},
    /** Bring an index to the top the short way round. */
    show(index: number) {
      const delta = wrap(index - target.current + count.current / 2, count.current) - count.current / 2;
      target.current = Math.round(target.current + delta); animate();
    },
    /** Place an index on top at once, for a new list. */
    jump(index: number) {cancelAnimationFrame(frame.current); target.current = current.current = index; setOffset(index); setDestination(index);},
    /** Follow a drag directly, then settle on the nearest step. */
    drag(position: number) {cancelAnimationFrame(frame.current); target.current = current.current = position; setOffset(position);},
    settle() {target.current = Math.round(current.current); animate();},
  };
}

/** Profile window: a dial of characters around the chosen avatar with the
 * nickname below it, and the focused character's expressions on the right.
 * Searching narrows the dial itself to the matching characters. */
export function ProfileDialog({name, avatar, assetUrl, onName, onAvatar, ...props}: ProfileDialogProps) {
  const {t, locale} = useLocale();
  const [searching, setSearching] = useState(false), [query, setQuery] = useState('');
  const list = query.trim() ? searchAvatarCharacters(query) : CHARACTERS, count = list.length;
  const dial = useDial(indexIn(CHARACTERS, avatar?.character), count);
  const ring = useRef<HTMLDivElement>(null), search = useRef<HTMLInputElement>(null);
  const dragging = useRef<{x: number; offset: number; moved: boolean} | null>(null), suppressClick = useRef(false);
  // With no match the panel keeps the last character it showed.
  const lastFocus = useRef<AvatarCharacterId>(avatar?.character ?? CHARACTERS[0]!);
  const focus = count ? list[dial.focus]! : lastFocus.current;
  useEffect(() => {lastFocus.current = focus;}, [focus]);
  // The panel shows one outfit at a time: the chosen one for the current avatar, else the default.
  const costumes = avatarCostumes(focus);
  const [costume, setCostume] = useState(() => avatar?.character === focus ? avatarExpressions(focus).find(entry => entry.id === avatar.expression)?.costume ?? '' : '');
  useEffect(() => {setCostume(avatar?.character === focus ? avatarExpressions(focus).find(entry => entry.id === avatar.expression)?.costume ?? '' : '');}, [focus]);
  const text = (key: string, fallback: string) => isUiMessageKey(key) ? t(key) : fallback;
  const filter = (value: string) => {setQuery(value); dial.jump(0);};
  const closeSearch = () => {setSearching(false); setQuery(''); dial.jump(indexIn(CHARACTERS, focus));};
  useEffect(() => {
    if (!props.open) {setSearching(false); setQuery(''); return;}
    dial.jump(indexIn(CHARACTERS, avatar?.character));
  }, [props.open]);
  useEffect(() => {if (searching) search.current?.focus();}, [searching]);
  const focusTop = (character: AvatarCharacterId | undefined) => requestAnimationFrame(() =>
    ring.current?.querySelector<HTMLElement>(`[data-character="${character}"]`)?.focus({preventScroll: true}));
  // Arrow keys anywhere in the window, its header included, turn the dial,
  // except while editing the nickname.
  const arrows = useRef<(event: KeyboardEvent) => void>(() => {});
  arrows.current = event => {
    const step = event.key === 'ArrowRight' || event.key === 'ArrowDown' ? 1 : event.key === 'ArrowLeft' || event.key === 'ArrowUp' ? -1 : 0;
    if (!step || !count || event.altKey || event.ctrlKey || event.metaKey || event.target === input.current) return;
    event.preventDefault(); dial.turn(step);
    if (event.target === search.current) return;
    focusTop(list[wrap(dial.focus + step, count)]);
  };
  useEffect(() => {
    const dialog = ring.current?.closest('dialog');
    if (!dialog) return;
    const keydown = (event: KeyboardEvent) => arrows.current(event);
    dialog.addEventListener('keydown', keydown);
    return () => dialog.removeEventListener('keydown', keydown);
  }, []);
  // Opening the window starts keyboard focus on the dial, unless something in it already took focus.
  useEffect(() => {
    if (!props.open) return;
    const frame = requestAnimationFrame(() => {
      const current = document.activeElement;
      if (current && current.id !== 'profileClose' && ring.current?.closest('.profile-editor')?.contains(current)) return;
      ring.current?.querySelector<HTMLElement>(`[data-character="${avatar?.character ?? CHARACTERS[0]}"]`)?.focus({preventScroll: true});
    });
    return () => cancelAnimationFrame(frame);
  }, [props.open]);
  // Wheel turns the dial a step per notch; trackpads accumulate smaller deltas.
  useEffect(() => {
    const node = ring.current;
    if (!node) return;
    let accumulated = 0;
    const wheel = (event: WheelEvent) => {
      event.preventDefault();
      accumulated += event.deltaY * (event.deltaMode === 1 ? 16 : event.deltaMode === 2 ? 400 : 1) + event.deltaX;
      const steps = Math.trunc(accumulated / WHEEL_STEP);
      if (!steps) return;
      accumulated -= steps * WHEEL_STEP;
      dial.turn(Math.max(-3, Math.min(3, steps)));
    };
    node.addEventListener('wheel', wheel, {passive: false});
    return () => node.removeEventListener('wheel', wheel);
  }, []);
  const input = useRef<HTMLInputElement>(null);
  useEffect(() => {if (input.current && document.activeElement !== input.current) input.current.value = name;}, [name, props.open]);
  const commitName = () => {if (input.current) input.current.value = onName(input.current.value);};
  const pick = (character: AvatarCharacterId) => {
    dial.show(indexIn(list, character));
    if (avatar?.character !== character) onAvatar({character, expression: avatarExpressions(character)[0]!.id});
  };
  const expressions = (costumes.find(entry => entry.costume === costume) ?? costumes[0])?.expressions ?? [];
  const expressionButton = (expression: AvatarExpression) => {
    const {emotion, shaded, number, original} = expressionLabelParts(expression.id);
    const label = (original ?? text(`profile.expression.${emotion}`, emotion)) + (number ? ` ${number}` : '') + (shaded ? t('profile.shaded') : '');
    return <button key={expression.id} type="button" className="profile-expression" title={label} aria-label={label}
      aria-pressed={avatar?.character === focus && avatar.expression === expression.id}
      onClick={() => onAvatar({character: focus, expression: expression.id})}>
      <img src={assetUrl(expression.src)} alt="" width="256" height="256" loading="lazy" decoding="async" draggable={false}/>
    </button>;
  };
  return <InformationalDialog {...props} id="profileDialog" titleId="profileTitle" closeId="profileClose"
    title={t('profile.title')} closeLabel={t('profile.close')} launcherDocument presentation={informationalDialogPresentation.standard}>
    <div className="profile-editor">
      <section className="profile-identity-panel" aria-label={t('profile.characters')}>
        <div ref={ring} className="profile-dial" role="group" aria-label={t('profile.characters')} aria-describedby="profileDialHint" data-filtered={!!query.trim()}
          onPointerDown={event => {if (event.button === 0 && !(event.target as Element).closest('.profile-search')) dragging.current = {x: event.clientX, offset: dial.offset, moved: false};}}
          onPointerMove={event => {
            const drag = dragging.current;
            if (!drag) return;
            const dx = event.clientX - drag.x;
            if (!drag.moved && Math.abs(dx) < 6) return;
            if (!drag.moved) {drag.moved = true; event.currentTarget.setPointerCapture(event.pointerId);}
            dial.drag(drag.offset - dx / DRAG_STEP);
          }}
          onPointerUp={event => {
            const drag = dragging.current; dragging.current = null;
            if (!drag?.moved) return;
            suppressClick.current = true; event.currentTarget.releasePointerCapture(event.pointerId); dial.settle();
          }}
          onPointerCancel={() => {if (dragging.current?.moved) dial.settle(); dragging.current = null;}}>
          <ProfileAvatar name={name} src={avatarSource(avatar)} assetUrl={assetUrl} className="profile-dial-center" color={avatarColor(avatar?.character)}/>
          {count ? <span className="profile-dial-marker" aria-hidden="true" style={{'--avatar-color': avatarColor(focus)} as CSSProperties}/>
            : <p className="profile-dial-empty" role="status">{t('profile.searchEmpty')}</p>}
          {CHARACTERS.map(character => {
            const index = list.indexOf(character);
            // Signed distance from the top slot, in steps.
            const slot = index < 0 ? SLOTS : wrap(index - dial.offset + count / 2, count) - count / 2, distance = Math.abs(slot);
            const visible = distance < SHOWN, angle = -Math.PI / 2 + slot * 2 * Math.PI / SLOTS;
            const style = {'--dial-x': `${(Math.cos(angle) * RADIUS).toFixed(1)}px`, '--dial-y': `${(Math.sin(angle) * RADIUS).toFixed(1)}px`,
              '--dial-fade': Math.max(0, Math.min(1, (SHOWN - distance) * 2)).toFixed(3), '--dial-near': Math.max(0, 1 - distance).toFixed(3),
              '--avatar-color': avatarColor(character)} as CSSProperties;
            const label = avatarCharacterName(character, locale) + (avatarArt(character) === 'tpdp' ? ` · ${t('profile.artTpdp')}` : '');
            return <button key={character} type="button" className="profile-dial-item" style={style} hidden={!visible}
              tabIndex={visible && distance < 0.5 ? 0 : -1} aria-pressed={avatar?.character === character} data-focused={count > 0 && focus === character}
              data-character={character} aria-label={label} title={label}
              onClick={() => {if (suppressClick.current) {suppressClick.current = false; return;} pick(character);}}>
              {visible && <img src={assetUrl(avatarExpressions(character)[0]!.src)} alt="" width="256" height="256" loading="lazy" decoding="async" draggable={false}/>}
            </button>;
          })}
          <div className="profile-search" data-open={searching}>
            {searching ? <>
              <svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="10.5" cy="10.5" r="6"/><path d="m15 15 5 5"/></svg>
              <input ref={search} type="search" value={query} placeholder={t('profile.searchPlaceholder')} aria-label={t('profile.search')}
                onChange={event => filter(event.target.value)}
                onKeyDown={event => {
                  if (event.key === 'Escape') {event.preventDefault(); event.stopPropagation(); closeSearch();}
                  if (event.key === 'Enter' && count) {event.preventDefault(); pick(focus);}
                }}
                onBlur={event => {if (!query && !event.currentTarget.parentElement?.contains(event.relatedTarget as Node | null)) closeSearch();}}/>
              {query && <button type="button" className="profile-search-close" aria-label={t('profile.searchClose')} onClick={closeSearch}>×</button>}
            </> : <button type="button" className="profile-search-open" aria-label={t('profile.search')} title={t('profile.search')} onClick={() => setSearching(true)}>
              <svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="10.5" cy="10.5" r="6"/><path d="m15 15 5 5"/></svg>
            </button>}
          </div>
        </div>
        <p className="profile-dial-hint" id="profileDialHint">{t('profile.dialHint')}</p>
        <label className="profile-name-field">
          <span>{t('profile.nickname')}</span>
          <input ref={input} id="profileNameInput" type="text" defaultValue={name} placeholder={t('profile.unnamed')} maxLength={32} autoComplete="nickname"
            onBlur={commitName} onKeyDown={event => {if (event.key === 'Enter') {event.preventDefault(); commitName();}}}/>
        </label>
      </section>
      <section className="profile-expression-panel" aria-labelledby="profileExpressionTitle" style={{'--avatar-color': avatarColor(focus)} as CSSProperties}>
        <h2 id="profileExpressionTitle">{avatarCharacterName(focus, locale)}<span>{avatarArt(focus) === 'tpdp' ? `${t('profile.artTpdp')} · ` : ''}{t('profile.expressions')}</span></h2>
        {costumes.length > 1 && <div className="profile-costumes" role="group" aria-label={t('profile.costumes')}>
          {costumes.map(entry => <button key={entry.costume} type="button" aria-pressed={entry.costume === (costumes.some(other => other.costume === costume) ? costume : '')}
            onClick={() => setCostume(entry.costume)}>{entry.costume ? text(`profile.costume.${entry.costume}`, entry.costume) : t('profile.costumeDefault')}</button>)}
        </div>}
        <div className="profile-expression-grid">{expressions.map(expressionButton)}</div>
        <p className="profile-art-credit">{t(avatarArt(focus) === 'tpdp' ? 'profile.creditTpdp' : 'profile.creditDairi')}</p>
      </section>
    </div>
  </InformationalDialog>;
}

/** The chosen preset, else the nickname's first character, else a person glyph. */
export function ProfileAvatar({name, src = null, assetUrl, className = '', color = null}: {name: string; src?: string | null; assetUrl?: (path: string) => string; className?: string; color?: string | null}) {
  const initial = name ? multiplayerDisplayInitial(name, '') : '';
  return <span className={`profile-avatar ${className}`.trim()} aria-hidden="true" style={color ? {'--avatar-color': color} as CSSProperties : undefined}>
    {src && assetUrl ? <img src={assetUrl(src)} alt="" width="256" height="256" decoding="async" draggable={false}/>
      : initial || <svg viewBox="0 0 24 24"><circle cx="12" cy="8.5" r="3.6"/><path d="M5 19.5c1.2-3.4 3.8-5.2 7-5.2s5.8 1.8 7 5.2"/></svg>}
  </span>;
}
