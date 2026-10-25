import {useEffect, useRef, useState, type CSSProperties} from 'react';
import {useLocale} from '../../i18n';
import {multiplayerDisplayInitial} from '../../../src/launcher/multiplayer-identity.mts';
import type {CharacterArtId} from '../../../src/contracts/character-art.mts';
import {avatarCharacterName, avatarExpressions, avatarSource, expressionLabelParts, PROFILE_AVATAR_CHARACTERS, type AvatarExpression, type ProfileAvatarChoice} from '../../models/profile-avatars';
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

const CHARACTERS = PROFILE_AVATAR_CHARACTERS, COUNT = CHARACTERS.length;
/** Slots spread around the dial; the top one is the focused character and the
 * rest enter and leave at the bottom seam. */
const SLOTS = 13, RADIUS = 150, WHEEL_STEP = 50, DRAG_STEP = 44;
const wrap = (value: number, size: number) => ((value % size) + size) % size;
const indexOf = (character: CharacterArtId | undefined) => Math.max(0, character ? CHARACTERS.indexOf(character) : 0);

/** Rotation in character steps, eased toward a whole-step target. */
function useDial(initial: number) {
  const [offset, setOffset] = useState(initial);
  const target = useRef(initial), current = useRef(initial), frame = useRef(0);
  const animate = () => {
    cancelAnimationFrame(frame.current);
    const reduced = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches || document.body.classList.contains('less-motion');
    const step = () => {
      const gap = target.current - current.current;
      current.current = reduced || Math.abs(gap) < 0.002 ? target.current : current.current + gap * 0.22;
      setOffset(current.current);
      if (current.current !== target.current) frame.current = requestAnimationFrame(step);
    };
    frame.current = requestAnimationFrame(step);
  };
  useEffect(() => () => cancelAnimationFrame(frame.current), []);
  return {
    offset,
    focus: () => wrap(Math.round(target.current), COUNT),
    /** Turn by whole steps. */
    turn(steps: number) {target.current = Math.round(target.current) + steps; animate();},
    /** Bring an index to the top the short way round. */
    show(index: number) {
      const delta = wrap(index - target.current + COUNT / 2, COUNT) - COUNT / 2;
      target.current = Math.round(target.current + delta); animate();
    },
    /** Follow a drag directly, then settle on the nearest step. */
    drag(position: number) {cancelAnimationFrame(frame.current); target.current = current.current = position; setOffset(position);},
    settle() {target.current = Math.round(current.current); animate();},
  };
}

/** Profile window: a dial of characters around the chosen avatar with the
 * nickname below it, and the focused character's expressions on the right. */
export function ProfileDialog({name, avatar, assetUrl, onName, onAvatar, ...props}: ProfileDialogProps) {
  const {t, locale} = useLocale();
  const dial = useDial(indexOf(avatar?.character));
  const ring = useRef<HTMLDivElement>(null), dragging = useRef<{x: number; offset: number; moved: boolean} | null>(null), suppressClick = useRef(false);
  const focus = CHARACTERS[wrap(Math.round(dial.offset), COUNT)]!;
  useEffect(() => {if (props.open) dial.show(indexOf(avatar?.character));}, [props.open]);
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
  const pick = (character: CharacterArtId) => {
    dial.show(indexOf(character));
    if (avatar?.character !== character) onAvatar({character, expression: avatarExpressions(character)[0]!.id});
  };
  const expressions = avatarExpressions(focus);
  const expressionButton = (expression: AvatarExpression) => {
    const {emotion, shaded} = expressionLabelParts(expression.id);
    const label = t(`profile.expression.${emotion}`) + (shaded ? t('profile.shaded') : '');
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
        <div ref={ring} className="profile-dial" role="group" aria-label={t('profile.characters')} aria-describedby="profileDialHint"
          onKeyDown={event => {
            const step = event.key === 'ArrowRight' || event.key === 'ArrowDown' ? 1 : event.key === 'ArrowLeft' || event.key === 'ArrowUp' ? -1 : 0;
            if (!step) return;
            event.preventDefault(); dial.turn(step);
            ring.current?.querySelector<HTMLElement>(`[data-index="${dial.focus()}"]`)?.focus({preventScroll: true});
          }}
          onPointerDown={event => {if (event.button === 0) dragging.current = {x: event.clientX, offset: dial.offset, moved: false};}}
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
          <ProfileAvatar name={name} src={avatarSource(avatar)} assetUrl={assetUrl} className="profile-dial-center"/>
          <span className="profile-dial-marker" aria-hidden="true"/>
          {CHARACTERS.map((character, index) => {
            // Signed distance from the top slot, in steps.
            const slot = wrap(index - dial.offset + COUNT / 2, COUNT) - COUNT / 2, distance = Math.abs(slot);
            const visible = distance < SLOTS / 2, angle = -Math.PI / 2 + slot * 2 * Math.PI / SLOTS;
            const style = {'--dial-x': `${(Math.cos(angle) * RADIUS).toFixed(1)}px`, '--dial-y': `${(Math.sin(angle) * RADIUS).toFixed(1)}px`,
              '--dial-fade': Math.max(0, Math.min(1, SLOTS / 2 - distance)).toFixed(3), '--dial-near': Math.max(0, 1 - distance).toFixed(3)} as CSSProperties;
            const label = avatarCharacterName(character, locale);
            return <button key={character} type="button" className="profile-dial-item" style={style} hidden={!visible}
              tabIndex={visible && distance < 0.5 ? 0 : -1} aria-pressed={avatar?.character === character} data-focused={focus === character} data-index={index}
              aria-label={label} title={label}
              onClick={() => {if (suppressClick.current) {suppressClick.current = false; return;} pick(character);}}>
              <img src={assetUrl(avatarExpressions(character)[0]!.src)} alt="" width="256" height="256" decoding="async" draggable={false}/>
            </button>;
          })}
        </div>
        <p className="profile-dial-hint" id="profileDialHint">{t('profile.dialHint')}</p>
        <label className="profile-name-field">
          <span>{t('profile.nickname')}</span>
          <input ref={input} id="profileNameInput" type="text" defaultValue={name} placeholder={t('profile.unnamed')} maxLength={32} autoComplete="nickname"
            onBlur={commitName} onKeyDown={event => {if (event.key === 'Enter') {event.preventDefault(); commitName();}}}/>
        </label>
      </section>
      <section className="profile-expression-panel" aria-labelledby="profileExpressionTitle">
        <h2 id="profileExpressionTitle">{avatarCharacterName(focus, locale)}<span>{t('profile.expressions')}</span></h2>
        <div className="profile-expression-grid">{expressions.map(expressionButton)}</div>
      </section>
    </div>
  </InformationalDialog>;
}

/** The chosen preset, else the nickname's first character, else a person glyph. */
export function ProfileAvatar({name, src = null, assetUrl, className = ''}: {name: string; src?: string | null; assetUrl?: (path: string) => string; className?: string}) {
  const initial = name ? multiplayerDisplayInitial(name, '') : '';
  return <span className={`profile-avatar ${className}`.trim()} aria-hidden="true">
    {src && assetUrl ? <img src={assetUrl(src)} alt="" width="256" height="256" decoding="async" draggable={false}/>
      : initial || <svg viewBox="0 0 24 24"><circle cx="12" cy="8.5" r="3.6"/><path d="M5 19.5c1.2-3.4 3.8-5.2 7-5.2s5.8 1.8 7 5.2"/></svg>}
  </span>;
}
