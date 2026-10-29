import {useEffect, useRef, useState, type KeyboardEvent} from 'react';
import {useLocale} from '../../i18n';
import {scoreDifficulties, scoreLoadouts, type ScoreClearKind, type ScoreReport} from '../../../src/launcher/score-dat.mts';
import {scoreText} from './score-copy';

type Report = Pick<ScoreReport, 'clears' | 'clearKinds'>;
export interface RadarGame {key: string; gameId: string; title: string; number: string; report: Report | null}

const WIDTH = 560, HEIGHT = 470, CX = WIDTH / 2, CY = HEIGHT / 2, TAU = Math.PI * 2;
/** Lunatic ring radius; Easy..Lunatic are evenly spaced inside it, Extra is a band outside. */
const RADIUS = 140, EXTRA_INNER = RADIUS + 14, EXTRA_OUTER = RADIUS + 36, LABEL_RADIUS = RADIUS + 56, HIT_RADIUS = LABEL_RADIUS + 26;
const MAIN_LEVELS = 4, EXTRA = 4;
/** How much wider the pointed-at axis grows, and its two neighbours. */
const HOVER_WEIGHT = 3.2, NEAR_WEIGHT = 1.7;
const HOVER_MS = 280, UNFOLD_MS = 760;
/** How far an open game folds back while the pointer rests on the centre
 * button: its loadouts shrink toward its place among the games, which come
 * partly back around it. */
const PREVIEW_T = .22;

const ease = (p: number) => p < .5 ? 4 * p ** 3 : 1 - (-2 * p + 2) ** 3 / 2;
const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
const at = (angle: number, radius: number): [number, number] => [CX + Math.cos(angle) * radius, CY + Math.sin(angle) * radius];
const path = (points: readonly [number, number][]) => points.map(([x, y], index) => `${index ? 'L' : 'M'}${x.toFixed(2)} ${y.toFixed(2)}`).join('') + 'Z';
const kindOf = (report: Report | null, level: number, axis: number): ScoreClearKind =>
  report?.clearKinds?.[level]?.[axis] ?? (report?.clears[level]?.[axis] === true ? 'unknown' : 'none');

/** Each axis's share of the circle: the pointed-at one widest, its neighbours
 * wider, the rest even. Few axes need little help, so the effect eases in. */
export function fisheye(count: number, pointed: number | null) {
  const strength = Math.min(1, Math.max(0, (count - 3) / 5));
  return Array.from({length: count}, (_, index) => {
    if (pointed === null) return 1;
    const apart = Math.min(Math.abs(index - pointed), count - Math.abs(index - pointed));
    return apart === 0 ? 1 + (HOVER_WEIGHT - 1) * strength : apart === 1 ? 1 + (NEAR_WEIGHT - 1) * strength : 1;
  });
}

/** What is drawn at one moment: how far the chosen game has unfolded (0..1)
 * and each axis's weight. */
interface Frame {t: number; games: number[]; loadouts: number[]}
const mix = (from: Frame, to: Frame, p: number): Frame => ({
  t: lerp(from.t, to.t, p),
  games: to.games.map((value, index) => lerp(from.games[index] ?? value, value, p)),
  loadouts: to.loadouts.map((value, index) => lerp(from.loadouts[index] ?? 1, value, p)),
});

/** Moves the drawn frame toward `target`, quickly for hovering and slowly
 * for unfolding; with `animate` off it jumps there. */
function useTween(target: Frame, animate: boolean) {
  const [frame, setFrame] = useState(target), shown = useRef(frame);
  shown.current = frame;
  const key = JSON.stringify(target);
  useEffect(() => {
    const from = shown.current;
    if (!animate || from.games.length !== target.games.length) {setFrame(target); return;}
    const change = Math.abs(from.t - target.t), duration = change > 1e-3 ? lerp(380, UNFOLD_MS, change) : HOVER_MS, start = performance.now();
    let frameId = 0;
    const step = (now: number) => {
      const p = Math.min(1, (now - start) / duration);
      setFrame(mix(from, target, ease(p)));
      if (p < 1) frameId = requestAnimationFrame(step);
    };
    frameId = requestAnimationFrame(step);
    return () => cancelAnimationFrame(frameId);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, animate]);
  return frame;
}

/** One axis as drawn: a game, or (once a game unfolds) one of its loadouts. */
interface Spoke {
  id: string; kind: 'game' | 'loadout'; index: number;
  angle: number; span: number; reach: number; opacity: number;
  name: string; short: string; report: Report | null; axis: number;
}

/** Every spoke's angle and size. Spans start even (weighted by hover); while
 * a game unfolds its span widens to the whole circle and the others' close,
 * the circle turns so its first loadout ends at the top, and its loadouts grow
 * out from the centre inside that span. The game's own spoke fades away. */
function spokes(games: readonly RadarGame[], focus: number | null, frame: Frame, loadouts: readonly string[]) {
  const t = focus === null ? 0 : frame.t, total = frame.games.reduce((sum, weight) => sum + weight, 0) || 1;
  const spans = frame.games.map((weight, index) => lerp(TAU * weight / total, index === focus ? TAU : 0, t));
  const loadoutTotal = frame.loadouts.reduce((sum, weight) => sum + weight, 0) || 1;
  let start = -Math.PI / 2 - spans[0]! / 2;
  if (focus !== null) {
    // Where the game's span would start unturned once fully open, and where it should.
    const open = focus === 0 ? -1.5 * Math.PI : -Math.PI / 2, wanted = -Math.PI / 2 - Math.PI * (frame.loadouts[0] ?? 1) / loadoutTotal;
    const turn = ((wanted - open) % TAU + 3 * Math.PI) % TAU - Math.PI;
    start += turn * t;
  }
  const ring: Spoke[] = [];
  let fading: Spoke | null = null, arc: {from: number; span: number} | null = null;
  games.forEach((game, index) => {
    const span = spans[index]!, angle = start + span / 2;
    const own: Spoke = {id: game.key, kind: 'game', index, angle, span, reach: focus === null ? 1 : 1 - t, opacity: focus === null ? 1 : 1 - t,
      name: game.title, short: game.number, report: null, axis: index};
    if (index !== focus) {if (span > 1e-4) ring.push(own);}
    else {
      if (t < 1) fading = {...own, span: Math.min(span, TAU * frame.games[index]! / total), reach: 1, opacity: (1 - t) ** 2};
      arc = {from: start, span};
      let from = start;
      loadouts.forEach((name, axis) => {
        const width = span * (frame.loadouts[axis] ?? 1) / loadoutTotal;
        if (t > 0) ring.push({id: `${game.key}:${axis}`, kind: 'loadout', index: axis, angle: from + width / 2, span: width, reach: t, opacity: Math.min(1, t * 1.6),
          name, short: name.includes(' · ') ? name.split(' · ')[1]! : name, report: game.report, axis});
        from += width;
      });
    }
    start += span;
  });
  return {ring, fading: fading as Spoke | null, arc: arc as {from: number; span: number} | null};
}

/** The text a label can fit: the full name when there is room (or the axis is
 * pointed at), else its short form. */
const fits = (text: string, size: number, span: number) =>
  [...text].reduce((width, char) => width + (char.charCodeAt(0) > 255 ? 1 : .58), 0) * size <= Math.max(span, .0001) * LABEL_RADIUS * .92;

/** The profile's clear radar: one axis per game, each difficulty ring (and the
 * Extra band) holding the best clear any of its loadouts made. The axis under
 * the pointer widens and the others narrow. Choosing a game unfolds it from
 * the centre into its own radar by loadout; going back folds it away again. */
export function GameClearRadar({games, summary, animate = true, onOpen}: {games: readonly RadarGame[]; summary: Report; animate?: boolean;
  /** Told the key of the game opened into its loadouts, or null once none is. */
  onOpen?(key: string | null): void;
}) {
  const {t, locale} = useLocale();
  const [focusKey, setFocusKey] = useState<string | null>(null), [open, setOpen] = useState(false), [preview, setPreview] = useState(false);
  const [active, setActive] = useState<{id: string; level: number | null} | null>(null);
  const focus = focusKey === null ? -1 : games.findIndex(game => game.key === focusKey), chosen = focus >= 0 ? games[focus]! : null;
  const loadouts = chosen ? scoreLoadouts(chosen.gameId) : [];
  const mode = chosen && open ? 'loadout' : 'game';
  const pointed = active && !active.id.includes(':') === (mode === 'game') ? active.id : null;
  const pointedGame = mode === 'game' && pointed ? games.findIndex(game => game.key === pointed) : -1;
  const pointedLoadout = mode === 'loadout' && pointed ? Number(pointed.split(':')[1]) : -1;
  const motion = animate && !(typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches) && !document.documentElement.classList.contains('less-motion');
  const frame = useTween({t: open && chosen ? preview ? PREVIEW_T : 1 : 0, games: fisheye(games.length, pointedGame >= 0 ? pointedGame : null), loadouts: fisheye(loadouts.length, pointedLoadout >= 0 ? pointedLoadout : null)}, motion);
  // Once folded away, the game is let go; a game filtered out is let go at once.
  useEffect(() => {if (focusKey !== null && (focus < 0 || !open && frame.t <= 1e-3)) {setFocusKey(null); setOpen(false);}}, [focusKey, focus, open, frame.t]);
  const openKey = chosen && open ? chosen.key : null;
  useEffect(() => {onOpen?.(openKey);}, [openKey, onOpen]);
  const {ring, fading, arc} = spokes(games, chosen ? focus : null, frame, loadouts);
  const kindLabel = (kind: ScoreClearKind) => t(kind === 'no-continue' ? 'scores.clearedNoContinue' : kind === 'continued' ? 'scores.clearedContinued' : kind === 'unknown' ? 'scores.cleared' : 'scores.clearNotRecorded');
  const kinds = (spoke: Spoke) => scoreDifficulties.map((_, level) => spoke.kind === 'game' ? kindOf(summary, level, spoke.axis) : kindOf(spoke.report, level, spoke.axis));
  const named = (spoke: Spoke) => spoke.kind === 'loadout' ? scoreText(spoke.name, locale) : spoke.name;
  const describe = (spoke: Spoke, level: number | null) => level === null
    ? `${named(spoke)} · ${kinds(spoke).filter(kind => kind !== 'none').length}/${scoreDifficulties.length}`
    : `${named(spoke)} · ${scoreDifficulties[level]} · ${kindLabel(kinds(spoke)[level]!)}`;
  const choose = (spoke: Spoke) => {if (spoke.kind === 'game') {setFocusKey(spoke.id); setOpen(true); setActive(null);}};
  const back = () => {setOpen(false); setPreview(false); setActive(null);};
  const interactive = (spoke: Spoke) => spoke.kind === mode && (mode === 'game' ? !chosen : frame.t > .98);
  const handlers = (spoke: Spoke, level: number | null) => interactive(spoke) ? {
    onPointerEnter: () => setActive({id: spoke.id, level}), onFocus: () => setActive({id: spoke.id, level}),
    onClick: () => choose(spoke),
    onKeyDown: (event: KeyboardEvent<SVGElement>) => {if (spoke.kind === 'game' && (event.key === 'Enter' || event.key === ' ')) {event.preventDefault(); choose(spoke);}},
  } : {};
  const ringPath = (radius: number) => ring.length >= 3 ? path(ring.map(spoke => at(spoke.angle, radius))) : null;
  const reach = (spoke: Spoke) => {
    const kind = kinds(spoke);
    for (let level = MAIN_LEVELS - 1; level >= 0; level--) if (kind[level] !== 'none') return level + 1;
    return 0;
  };
  const shape = ring.length >= 3 && ring.some(spoke => reach(spoke) > 0) ? path(ring.map(spoke => at(spoke.angle, RADIUS * reach(spoke) / MAIN_LEVELS * spoke.reach))) : null;
  /** The Extra band piece an axis owns, along its span with a small gap each side. */
  const band = (spoke: Spoke) => {
    const gap = Math.min(spoke.span * .08, .025), from = spoke.angle - spoke.span / 2 + gap, to = spoke.angle + spoke.span / 2 - gap;
    if (to <= from) return null;
    const arc = (radius: number) => Array.from({length: 7}, (_, step) => at(lerp(from, to, step / 6), radius * spoke.reach));
    return path([...arc(EXTRA_INNER), ...arc(EXTRA_OUTER).reverse()]);
  };
  const sector = (spoke: Spoke) => {
    const [x1, y1] = at(spoke.angle - spoke.span / 2, HIT_RADIUS), [x2, y2] = at(spoke.angle + spoke.span / 2, HIT_RADIUS);
    return `M${CX} ${CY}L${x1.toFixed(2)} ${y1.toFixed(2)}A${HIT_RADIUS} ${HIT_RADIUS} 0 ${spoke.span > Math.PI ? 1 : 0} 1 ${x2.toFixed(2)} ${y2.toFixed(2)}Z`;
  };
  const activeSpoke = active ? ring.find(spoke => spoke.id === active.id) ?? null : null;
  const drawSpoke = (spoke: Spoke, faded = false) => {
    const kind = kinds(spoke), isActive = activeSpoke?.id === spoke.id || faded && preview, live = !faded && interactive(spoke);
    const full = named(spoke), size = isActive ? 13 : 11;
    const label = isActive || fits(full, size, spoke.span) ? full : spoke.kind === 'game' ? spoke.short : scoreText(spoke.short, locale);
    const [lx, ly] = at(spoke.angle, LABEL_RADIUS * Math.max(spoke.reach, .35)), cos = Math.cos(spoke.angle), sin = Math.sin(spoke.angle);
    const extraKind = kind[EXTRA]!, segment = band(spoke);
    return <g key={`${faded ? 'fading:' : ''}${spoke.id}`} className="game-radar-spoke" data-spoke={spoke.kind} data-folding={faded || undefined}
      style={{opacity: faded && preview ? Math.max(spoke.opacity, 1 - Math.max(0, frame.t - PREVIEW_T) / (1 - PREVIEW_T)) : spoke.opacity}} aria-hidden={live ? undefined : true}>
      {live && <path className="clear-radar-sector" d={sector(spoke)} {...handlers(spoke, null)}/>}
      <line className="clear-radar-axis" data-active={isActive} x1={CX} y1={CY} x2={at(spoke.angle, EXTRA_OUTER * spoke.reach)[0]} y2={at(spoke.angle, EXTRA_OUTER * spoke.reach)[1]}/>
      {segment && <path className="clear-radar-extra-segment" d={segment} data-clear-kind={extraKind} data-axis={isActive}
        data-active={isActive && active?.level === EXTRA} {...(live ? {tabIndex: -1, role: 'img', 'aria-label': describe(spoke, EXTRA)} : {})} {...handlers(spoke, EXTRA)}/>}
      {Array.from({length: MAIN_LEVELS}, (_, level) => {
        const radius = RADIUS * (level + 1) / MAIN_LEVELS * spoke.reach, [x, y] = at(spoke.angle, radius);
        const hit = Math.max(3, Math.min(11, radius * Math.sin(Math.min(spoke.span, Math.PI) / 2) - 1));
        return <g key={level} className="clear-radar-point" data-clear-kind={kind[level]} data-axis={isActive} data-active={isActive && active?.level === level}
          {...(live ? {role: 'img', 'aria-label': describe(spoke, level)} : {})} {...handlers(spoke, level)}>
          {live && <circle className="clear-radar-hit" cx={x} cy={y} r={hit}/>}
          <circle className="clear-radar-halo" cx={x} cy={y} r={9}/>
          <circle className="clear-radar-node" cx={x} cy={y} r={kind[level] === 'none' ? 2.6 : 5}/>
        </g>;
      })}
      <text className="clear-radar-label game-radar-label" x={lx} y={ly + (sin > .3 ? 10 : sin < -.3 ? -2 : 4)} textAnchor={cos > .3 ? 'start' : cos < -.3 ? 'end' : 'middle'}
        data-active={isActive} style={{fontSize: size, opacity: spoke.kind === 'loadout' && spoke.reach < .75 ? Math.max(0, (spoke.reach - .4) / .35) : undefined}} {...(live ? {tabIndex: 0, role: spoke.kind === 'game' ? 'button' : undefined, 'aria-label': describe(spoke, null)} : {})} {...handlers(spoke, null)}>{label}</text>
    </g>;
  };
  // Open, the line below names the game (or says it has no save); on the centre button, what it does.
  const detail = chosen && open && preview ? t('profile.clearsBack')
    : activeSpoke ? describe(activeSpoke, active!.level)
    : chosen && open && frame.t > .98 ? chosen.report ? chosen.title : `${chosen.title} · ${t('profile.clearsNoSave')}` : null;
  const wedge = arc && arc.span < TAU - 1e-3 ? (() => {
    const [x1, y1] = at(arc.from, EXTRA_OUTER + 8), [x2, y2] = at(arc.from + arc.span, EXTRA_OUTER + 8);
    return `M${CX} ${CY}L${x1.toFixed(2)} ${y1.toFixed(2)}A${EXTRA_OUTER + 8} ${EXTRA_OUTER + 8} 0 ${arc.span > Math.PI ? 1 : 0} 1 ${x2.toFixed(2)} ${y2.toFixed(2)}Z`;
  })() : null;
  return <div className="clear-radar-wrap game-clear-radar" data-unfolded={chosen && open ? true : undefined}>
    <svg className="clear-radar" viewBox={`0 0 ${WIDTH} ${HEIGHT}`} role="group" aria-label={chosen && open ? `${chosen.title} · ${t('scores.clearMatrix')}` : t('profile.clearsByGame')}
      data-focused={activeSpoke !== null} data-choosable={mode === 'game' ? true : undefined}
      onPointerLeave={() => setActive(null)}
      onKeyDown={event => {if (event.key === 'Escape' && chosen && open) {event.preventDefault(); event.stopPropagation(); back();}}}
      onBlur={event => {if (!event.currentTarget.contains(event.relatedTarget as Node | null)) setActive(null);}}>
      <g className="clear-radar-grid" aria-hidden="true">
        {Array.from({length: MAIN_LEVELS}, (_, level) => {const d = ringPath(RADIUS * (level + 1) / MAIN_LEVELS); return d && <path key={level} className={level === MAIN_LEVELS - 1 ? 'clear-radar-ring outer' : 'clear-radar-ring'} d={d}/>;})}
      </g>
      {shape && <path className="clear-radar-shape" d={shape} aria-hidden="true"/>}
      <g className="clear-radar-levels" aria-hidden="true">
        {scoreDifficulties.slice(0, MAIN_LEVELS).map((difficulty, level) => <text key={difficulty} x={CX + 10} y={CY - RADIUS * (level + 1) / MAIN_LEVELS - 4}>{difficulty}</text>)}
        <text className="extra" x={CX + 10} y={CY - (EXTRA_INNER + EXTRA_OUTER) / 2 + 3}>{scoreDifficulties[EXTRA]}</text>
      </g>
      {wedge && <path className="game-radar-wedge" d={wedge} data-shown={preview && open || undefined} aria-hidden="true"/>}
      {ring.map(spoke => drawSpoke(spoke))}
      {fading && drawSpoke(fading, true)}
      {/* Open, the centre button folds the game away; resting on it previews that. */}
      {chosen && open && <g className="game-radar-fold" role="button" tabIndex={0} aria-label={t('profile.clearsBack')}
        onPointerEnter={() => {setPreview(true); setActive(null);}} onPointerLeave={() => setPreview(false)}
        onFocus={() => setPreview(true)} onBlur={() => setPreview(false)} onClick={back}
        onKeyDown={event => {if (event.key === 'Enter' || event.key === ' ') {event.preventDefault(); back();}}}>
        <circle cx={CX} cy={CY} r={22}/>
        <path d={`M${CX - 9} ${CY - 3}h6v-6M${CX + 9} ${CY - 3}h-6v-6M${CX - 9} ${CY + 3}h6v6M${CX + 9} ${CY + 3}h-6v6`}/>
      </g>}
    </svg>
    <p className="clear-radar-detail" aria-live="polite">{detail ?? <>
      <span className="clear-radar-key" data-clear-kind="no-continue">{t('scores.clearedNoContinue')}</span>
      <span className="clear-radar-key" data-clear-kind="continued">{t('scores.clearedContinued')}</span>
    </>}</p>
  </div>;
}
