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

/** Profile window. Its content exists only while the window is open (or
 * closing) and is dropped once it has closed. */
export function ProfileDialog({name, avatar, assetUrl, onAvatar, onClosed, ...props}: ProfileDialogProps) {
  const {t} = useLocale();
  const [present, setPresent] = useState(props.open);
  if (props.open && !present) setPresent(true);
  return <InformationalDialog {...props} onClosed={() => {setPresent(false); onClosed?.();}} id="profileDialog" titleId="profileTitle" closeId="profileClose"
    title={t('profile.title')} closeLabel={t('profile.close')} launcherDocument presentation={informationalDialogPresentation.standard}>
    {present && <ProfileEditor name={name} avatar={avatar} assetUrl={assetUrl} onAvatar={onAvatar}/>}
  </InformationalDialog>;
}

/** One entry on the dial: a character, or one of a character's expressions. */
interface DialEntry {key: string; src: string; label: string; pressed: boolean; color: string | null}

/** A dial around the chosen avatar. It lists the characters; picking one turns
 * its expressions onto the dial, and picking an expression sets the avatar and
 * brings the characters back. Searching narrows the characters on the dial. */
function ProfileEditor({name, avatar, assetUrl, onAvatar}: Pick<ProfileDialogProps, 'name' | 'avatar' | 'assetUrl' | 'onAvatar'>) {
  const {t, locale} = useLocale();
  const text = (key: string, fallback: string) => isUiMessageKey(key) ? t(key) : fallback;
  const [searching, setSearching] = useState(false), [query, setQuery] = useState('');
  // The character whose expressions are on the dial, or null for the characters.
  const [opened, setOpened] = useState<AvatarCharacterId | null>(null);
  const characters = query.trim() ? searchAvatarCharacters(query) : CHARACTERS;
  const expressions = opened ? avatarCostumes(opened).flatMap(entry => entry.expressions.map(expression => ({expression, costume: entry.costume}))) : [];
  const count = opened ? expressions.length : characters.length;
  const dial = useDial(indexIn(CHARACTERS, avatar?.character), count);
  const ring = useRef<HTMLDivElement>(null), search = useRef<HTMLInputElement>(null);
  const dragging = useRef<{x: number; offset: number; moved: boolean} | null>(null), suppressClick = useRef(false);
  // With no match the dial keeps the last character it showed.
  const lastFocus = useRef<AvatarCharacterId>(avatar?.character ?? CHARACTERS[0]!);
  const focusCharacter = opened ?? (characters.length ? characters[dial.focus]! : lastFocus.current);
  useEffect(() => {lastFocus.current = focusCharacter;}, [focusCharacter]);
  const focusExpression = opened ? expressions[dial.focus] : undefined;
  const expressionLabel = ({expression, costume}: {expression: AvatarExpression; costume: string}) => {
    const {emotion, shaded, number, original} = expressionLabelParts(expression.id);
    const label = (original ?? text(`profile.expression.${emotion}`, emotion)) + (number ? ` ${number}` : '') + (shaded ? t('profile.shaded') : '');
    return costume ? `${text(`profile.costume.${costume}`, costume)} · ${label}` : label;
  };
  const characterLabel = (character: AvatarCharacterId) => avatarCharacterName(character, locale) + (avatarArt(character) === 'tpdp' ? ` · ${t('profile.artTpdp')}` : '');
  const entries: DialEntry[] = opened
    ? expressions.map(entry => ({key: entry.expression.id, src: entry.expression.src, label: expressionLabel(entry),
      pressed: avatar?.character === opened && avatar.expression === entry.expression.id, color: avatarColor(opened)}))
    // The current avatar's character shows the chosen expression; the others their first.
    : CHARACTERS.map(character => ({key: character, src: (avatar?.character === character && avatarSource(avatar)) || avatarExpressions(character)[0]!.src, label: characterLabel(character),
      pressed: avatar?.character === character, color: avatarColor(character)}));
  // Characters stay keyed in catalogue order; only those matching the search take a place on the dial.
  const position = (key: string) => opened ? entries.findIndex(entry => entry.key === key) : characters.indexOf(key as AvatarCharacterId);
  const focusTop = (key: string | undefined) => requestAnimationFrame(() =>
    ring.current?.querySelector<HTMLElement>(`[data-dial-key="${key}"]`)?.focus({preventScroll: true}));
  const filter = (value: string) => {setQuery(value); dial.jump(0);};
  const closeSearch = () => {setSearching(false); setQuery(''); dial.jump(indexIn(CHARACTERS, focusCharacter));};
  useEffect(() => {if (searching && !opened) search.current?.focus();}, [searching, opened]);
  /** Turns a character's expressions onto the dial, spinning in to the current one. */
  const open = (character: AvatarCharacterId) => {
    const list = avatarCostumes(character).flatMap(entry => entry.expressions);
    if (list.length === 1) {onAvatar({character, expression: list[0]!.id}); return;}
    const current = Math.max(0, avatar?.character === character ? list.findIndex(entry => entry.id === avatar.expression) : 0);
    setOpened(character);
    dial.jump(current - 3); dial.turn(3);
    focusTop(list[current]!.id);
  };
  /** Brings the characters back with `character` on top. */
  const close = (character: AvatarCharacterId) => {
    setOpened(null);
    const index = characters.indexOf(character);
    dial.jump(index < 0 ? 0 : index);
    focusTop(index < 0 ? characters[0] : character);
  };
  const pick = (key: string) => {
    if (!opened) {open(key as AvatarCharacterId); return;}
    onAvatar({character: opened, expression: key});
    close(opened);
  };
  // Arrow keys anywhere in the window, its header included, turn the dial;
  // Escape on the expressions returns to the characters instead of closing.
  const keys = useRef<(event: KeyboardEvent) => void>(() => {});
  keys.current = event => {
    if (event.key === 'Escape' && opened && event.target !== search.current) {event.preventDefault(); event.stopPropagation(); close(opened); return;}
    const step = event.key === 'ArrowRight' || event.key === 'ArrowDown' ? 1 : event.key === 'ArrowLeft' || event.key === 'ArrowUp' ? -1 : 0;
    if (!step || !count || event.altKey || event.ctrlKey || event.metaKey) return;
    event.preventDefault(); dial.turn(step);
    if (event.target === search.current) return;
    const next = wrap(dial.focus + step, count);
    focusTop(opened ? entries[next]?.key : characters[next]);
  };
  useEffect(() => {
    const dialog = ring.current?.closest('dialog');
    if (!dialog) return;
    const keydown = (event: KeyboardEvent) => keys.current(event);
    dialog.addEventListener('keydown', keydown, true);
    return () => dialog.removeEventListener('keydown', keydown, true);
  }, []);
  // Opening the window starts keyboard focus on the dial, unless something in it already took focus.
  useEffect(() => {
    const frame = requestAnimationFrame(() => {
      const current = document.activeElement;
      if (current && current.id !== 'profileClose' && ring.current?.closest('.profile-editor')?.contains(current)) return;
      ring.current?.querySelector<HTMLElement>(`[data-dial-key="${avatar?.character ?? CHARACTERS[0]}"]`)?.focus({preventScroll: true});
    });
    return () => cancelAnimationFrame(frame);
  }, []);
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
  const center = opened && focusExpression ? focusExpression.expression.src : avatarSource(avatar);
  const caption = opened ? `${characterLabel(opened)}${focusExpression ? ` · ${expressionLabel(focusExpression)}` : ''}` : count ? characterLabel(focusCharacter) : '';
  return <div className="profile-editor" data-dial-mode={opened ? 'expressions' : 'characters'}>
    <section className="profile-identity-panel" aria-label={t(opened ? 'profile.expressions' : 'profile.characters')}>
      <div ref={ring} className="profile-dial" role="group" aria-label={opened ? `${avatarCharacterName(opened, locale)} · ${t('profile.expressions')}` : t('profile.characters')}
        aria-describedby="profileDialHint" data-filtered={!opened && !!query.trim()}
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
        <ProfileAvatar name={name} src={center} assetUrl={assetUrl} className="profile-dial-center" color={avatarColor(opened ?? avatar?.character)}/>
        {count ? <span className="profile-dial-marker" aria-hidden="true" style={{'--avatar-color': avatarColor(focusCharacter)} as CSSProperties}/>
          : <p className="profile-dial-empty" role="status">{t('profile.searchEmpty')}</p>}
        {entries.map(entry => {
          const index = position(entry.key);
          // Signed distance from the top slot, in steps.
          const slot = index < 0 ? SLOTS : wrap(index - dial.offset + count / 2, count) - count / 2, distance = Math.abs(slot);
          // Only the entries on the dial are rendered; the rest join as it turns.
          if (distance >= SHOWN) return null;
          const angle = -Math.PI / 2 + slot * 2 * Math.PI / SLOTS;
          const style = {'--dial-x': `${(Math.cos(angle) * RADIUS).toFixed(1)}px`, '--dial-y': `${(Math.sin(angle) * RADIUS).toFixed(1)}px`,
            '--dial-fade': Math.max(0, Math.min(1, (SHOWN - distance) * 2)).toFixed(3), '--dial-near': Math.max(0, 1 - distance).toFixed(3),
            '--avatar-color': entry.color} as CSSProperties;
          return <button key={`${opened ?? ''}:${entry.key}`} type="button" className="profile-dial-item" style={style}
            tabIndex={distance < 0.5 ? 0 : -1} aria-pressed={entry.pressed} data-focused={count > 0 && index === dial.focus}
            data-dial-key={entry.key} {...(opened ? {} : {'data-character': entry.key})} aria-label={entry.label} title={entry.label}
            onClick={() => {if (suppressClick.current) {suppressClick.current = false; return;} if (index !== dial.focus) dial.show(index); pick(entry.key);}}>
            <img src={assetUrl(entry.src)} alt="" width="256" height="256" decoding="async" draggable={false}/>
          </button>;
        })}
        {opened ? <div className="profile-search">
          <button type="button" className="profile-search-open profile-dial-back" id="profileDialBack" aria-label={t('profile.backToCharacters')} title={t('profile.backToCharacters')} onClick={() => close(opened)}>
            <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M10 6 4 12l6 6M4.5 12H20"/></svg>
          </button>
        </div> : <div className="profile-search" data-open={searching}>
          {searching ? <>
            <svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="10.5" cy="10.5" r="6"/><path d="m15 15 5 5"/></svg>
            <input ref={search} type="search" value={query} placeholder={t('profile.searchPlaceholder')} aria-label={t('profile.search')}
              onChange={event => filter(event.target.value)}
              onKeyDown={event => {
                if (event.key === 'Escape') {event.preventDefault(); event.stopPropagation(); closeSearch();}
                if (event.key === 'Enter' && count) {event.preventDefault(); pick(focusCharacter);}
              }}
              onBlur={event => {if (!query && !event.currentTarget.parentElement?.contains(event.relatedTarget as Node | null)) closeSearch();}}/>
            {query && <button type="button" className="profile-search-close" aria-label={t('profile.searchClose')} onClick={closeSearch}>×</button>}
          </> : <button type="button" className="profile-search-open" aria-label={t('profile.search')} title={t('profile.search')} onClick={() => setSearching(true)}>
            <svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="10.5" cy="10.5" r="6"/><path d="m15 15 5 5"/></svg>
          </button>}
        </div>}
      </div>
      <p className="profile-dial-caption" aria-live="polite">{caption}</p>
      <p className="profile-dial-hint" id="profileDialHint">{t(opened ? 'profile.expressionHint' : 'profile.dialHint')}</p>
      <p className="profile-art-credit">{t(avatarArt(focusCharacter) === 'tpdp' ? 'profile.creditTpdp' : 'profile.creditDairi')}</p>
    </section>
  </div>;
}

/** The chosen preset, else the nickname's first character, else a person glyph. */
export function ProfileAvatar({name, src = null, assetUrl, className = '', color = null}: {name: string; src?: string | null; assetUrl?: (path: string) => string; className?: string; color?: string | null}) {
  const initial = name ? multiplayerDisplayInitial(name, '') : '';
  return <span className={`profile-avatar ${className}`.trim()} aria-hidden="true" style={color ? {'--avatar-color': color} as CSSProperties : undefined}>
    {src && assetUrl ? <img src={assetUrl(src)} alt="" width="256" height="256" decoding="async" draggable={false}/>
      : initial || <svg viewBox="0 0 24 24"><circle cx="12" cy="8.5" r="3.6"/><path d="M5 19.5c1.2-3.4 3.8-5.2 7-5.2s5.8 1.8 7 5.2"/></svg>}
  </span>;
}
