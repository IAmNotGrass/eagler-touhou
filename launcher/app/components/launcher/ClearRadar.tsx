import {useState} from 'react';
import {scoreDifficulties, type ScoreReport} from '../../../src/launcher/score-dat.mts';
import {useLocale} from '../../i18n';
import {scoreText} from './score-copy';

type ClearKind = 'none' | 'unknown' | 'continued' | 'no-continue';
type Active = {axis: number; level: number | null} | null;

const WIDTH = 520, HEIGHT = 440, CX = WIDTH / 2, CY = HEIGHT / 2;
/** Lunatic ring radius; Easy..Lunatic are evenly spaced inside it. */
const RADIUS = 132;
const EXTRA_INNER = RADIUS + 14, EXTRA_OUTER = RADIUS + 36, LABEL_RADIUS = RADIUS + 56;
const MAIN_LEVELS = 4; // Easy, Normal, Hard, Lunatic; index 4 is Extra.
const EXTRA = 4;

/** Paired loadouts (TH11 partners, TH20 stones) split into two equal
 * character groups; their axes then name only the second part. */
function pairedGroups(loadouts: readonly string[]) {
  const pairs = loadouts.map(name => name.split(' · '));
  if (!pairs.length || pairs.some(parts => parts.length !== 2) || loadouts.length % 2) return null;
  const half = loadouts.length / 2, first = pairs[0]![0]!, second = pairs[half]![0]!;
  if (first === second || pairs.some((parts, axis) => parts[0] !== (axis < half ? first : second))) return null;
  return {names: [first, second] as const, labels: pairs.map(parts => parts[1]!)};
}
/** Axis count, and the fraction of a step the first axis turns clockwise from the top. */
type Spokes = {count: number; turn: number};
const angle = (axis: number, {count, turn}: Spokes) => -Math.PI / 2 + (axis + turn) * 2 * Math.PI / count;
const point = (axis: number, spokes: Spokes, radius: number): [number, number] => {
  const a = angle(axis, spokes);
  return [CX + Math.cos(a) * radius, CY + Math.sin(a) * radius];
};
const path = (points: readonly [number, number][]) => points.map(([x, y], index) => `${index ? 'L' : 'M'}${x.toFixed(2)} ${y.toFixed(2)}`).join('') + 'Z';
const ring = (spokes: Spokes, radius: number) => path(Array.from({length: spokes.count}, (_, axis) => point(axis, spokes, radius)));
const mix = ([ax, ay]: [number, number], [bx, by]: [number, number], t: number): [number, number] => [ax + (bx - ax) * t, ay + (by - ay) * t];

/** One Extra band segment owned by an axis, between the midpoints of its edges. */
function extraSegment(axis: number, spokes: Spokes) {
  const wrap = (i: number) => (i + spokes.count) % spokes.count;
  const inner = (i: number) => point(wrap(i), spokes, EXTRA_INNER);
  const outer = (i: number) => point(wrap(i), spokes, EXTRA_OUTER);
  // A small inset keeps neighbouring segments visibly separate.
  const half = (from: [number, number], to: [number, number]) => mix(from, to, 0.47);
  return path([half(inner(axis), inner(axis - 1)), inner(axis), half(inner(axis), inner(axis + 1)),
    half(outer(axis), outer(axis + 1)), outer(axis), half(outer(axis), outer(axis - 1))]);
}

/** Clear records as a radar: one axis per loadout, Easy at the centre ring out
 * to Lunatic, and a hollow outer band for Extra. */
export function ClearRadar({loadouts, report}: {loadouts: readonly string[]; report: ScoreReport | null}) {
  const {t, locale} = useLocale(), [active, setActive] = useState<Active>(null);
  const count = loadouts.length, groups = pairedGroups(loadouts);
  // Grouped charts turn half a step so the two characters split left/right.
  const spokes: Spokes = {count, turn: groups ? 0.5 : 0};
  const kindAt = (level: number, axis: number): ClearKind => {
    const cleared = report?.clears[level]?.[axis] === true;
    return report?.clearKinds?.[level]?.[axis] ?? (cleared ? 'unknown' : 'none');
  };
  const kindLabel = (kind: ClearKind) => t(kind === 'no-continue' ? 'scores.clearedNoContinue' : kind === 'continued' ? 'scores.clearedContinued' : kind === 'unknown' ? 'scores.cleared' : 'scores.clearNotRecorded');
  const describe = (axis: number, level: number) => `${scoreText(loadouts[axis]!, locale)} · ${scoreDifficulties[level]} · ${kindLabel(kindAt(level, axis))}`;
  const axisSummary = (axis: number) => {
    const cleared = scoreDifficulties.filter((_, level) => kindAt(level, axis) !== 'none').length;
    return `${scoreText(loadouts[axis]!, locale)} · ${cleared}/${scoreDifficulties.length}`;
  };
  // The JoJo-style shape: each axis reaches its highest cleared main difficulty.
  const reach = loadouts.map((_, axis) => {
    for (let level = MAIN_LEVELS - 1; level >= 0; level--) if (kindAt(level, axis) !== 'none') return level + 1;
    return 0;
  });
  const shape = reach.some(Boolean) ? path(reach.map((value, axis) => point(axis, spokes, RADIUS * value / MAIN_LEVELS))) : null;
  // Pointer, touch and keyboard all drive one highlight. A point or Extra
  // segment selects one difficulty; anywhere else in an axis' sector selects
  // the whole axis. Leaving the chart clears it.
  const pick = (next: Active) => ({
    onPointerEnter: () => setActive(next),
    onPointerDown: () => setActive(next),
    onFocus: () => setActive(next),
  });
  const same = (a: Active, b: Active) => a?.axis === b?.axis && a?.level === b?.level;
  const detail = active ? active.level === null ? axisSummary(active.axis) : describe(active.axis, active.level) : null;
  const short = (axis: number) => {
    const name = groups ? groups.labels[axis]! : loadouts[axis]!;
    return locale === 'en' ? scoreText(name, locale) : name;
  };
  /** Long English names wrap at their first space. */
  const lines = (text: string) => {
    const space = text.indexOf(' ');
    return text.length > 10 && space > 0 ? [text.slice(0, space), text.slice(space + 1)] : [text];
  };
  const half = Math.PI / count;
  /** Hit circles never overlap their ring neighbours, even near the centre. */
  const hitRadius = (level: number) => Math.max(4, Math.min(11, RADIUS * (level + 1) / MAIN_LEVELS * Math.sin(half) - 1));
  /** The axis' hit wedge, reaching past its label so the whole slice responds. */
  const sector = (axis: number) => {
    const a = angle(axis, spokes), r = LABEL_RADIUS + 26;
    const edge = (offset: number): [number, number] => [CX + Math.cos(a + offset) * r, CY + Math.sin(a + offset) * r];
    const [x1, y1] = edge(-half), [x2, y2] = edge(half);
    return `M${CX} ${CY}L${x1.toFixed(2)} ${y1.toFixed(2)}A${r} ${r} 0 0 1 ${x2.toFixed(2)} ${y2.toFixed(2)}Z`;
  };
  return <div className="clear-radar-wrap">
    <svg className="clear-radar" viewBox={`0 0 ${WIDTH} ${HEIGHT}`} role="group" aria-label={t('scores.clearMatrix')}
      data-focused={active !== null}
      onPointerLeave={() => setActive(null)} onBlur={event => {if (!event.currentTarget.contains(event.relatedTarget as Node | null)) setActive(null);}}>
      <g className="clear-radar-sectors" aria-hidden="true">
        {loadouts.map((name, axis) => <path key={name} className="clear-radar-sector" d={sector(axis)} {...pick({axis, level: null})}/>)}
      </g>
      <g className="clear-radar-grid" aria-hidden="true">
        {Array.from({length: MAIN_LEVELS}, (_, level) => <path key={level} className={level === MAIN_LEVELS - 1 ? 'clear-radar-ring outer' : 'clear-radar-ring'} d={ring(spokes, RADIUS * (level + 1) / MAIN_LEVELS)}/>)}
        {loadouts.map((name, axis) => {const [x, y] = point(axis, spokes, EXTRA_OUTER); return <line key={name} className="clear-radar-axis" data-active={active?.axis === axis} x1={CX} y1={CY} x2={x} y2={y}/>;})}
      </g>
      <g className="clear-radar-extra">
        {loadouts.map((name, axis) => {
          const kind = kindAt(EXTRA, axis), self = {axis, level: EXTRA};
          return <path key={name} className="clear-radar-extra-segment" d={extraSegment(axis, spokes)} data-clear-kind={kind}
            data-axis={active?.axis === axis} data-active={same(active, self)}
            tabIndex={0} role="img" aria-label={describe(axis, EXTRA)} {...pick(self)}><title>{describe(axis, EXTRA)}</title></path>;
        })}
      </g>
      {shape && <path className="clear-radar-shape" d={shape} aria-hidden="true"/>}
      <g className="clear-radar-levels" aria-hidden="true">
        {scoreDifficulties.slice(0, MAIN_LEVELS).map((difficulty, level) => <text key={difficulty} x={CX + 10} y={CY - RADIUS * (level + 1) / MAIN_LEVELS - 4}>{difficulty}</text>)}
        <text className="extra" x={CX + 10} y={CY - (EXTRA_INNER + EXTRA_OUTER) / 2 + 3}>{scoreDifficulties[EXTRA]}</text>
      </g>
      <g className="clear-radar-nodes">
        {loadouts.map((name, axis) => Array.from({length: MAIN_LEVELS}, (_, level) => {
          const kind = kindAt(level, axis), [x, y] = point(axis, spokes, RADIUS * (level + 1) / MAIN_LEVELS), self = {axis, level};
          return <g key={`${name}:${level}`} className="clear-radar-point" data-clear-kind={kind} data-axis={active?.axis === axis} data-active={same(active, self)}
            tabIndex={0} role="img" aria-label={describe(axis, level)} {...pick(self)}>
            <title>{describe(axis, level)}</title>
            <circle className="clear-radar-hit" cx={x} cy={y} r={hitRadius(level)}/>
            <circle className="clear-radar-halo" cx={x} cy={y} r={9}/>
            <circle className="clear-radar-node" cx={x} cy={y} r={kind === 'none' ? 2.6 : 5}/>
          </g>;
        }))}
      </g>
      <g className="clear-radar-labels">
        {loadouts.map((name, axis) => {
          const a = angle(axis, spokes), [x, y] = point(axis, spokes, LABEL_RADIUS), cos = Math.cos(a), sin = Math.sin(a);
          const anchor = cos > 0.3 ? 'start' : cos < -0.3 ? 'end' : 'middle', text = lines(short(axis));
          const top = y + (sin > 0.3 ? 8 : sin < -0.3 ? -2 : 4) - (text.length - 1) * (sin > 0.3 ? 0 : sin < -0.3 ? 12 : 6);
          return <text key={name} className="clear-radar-label" x={x} y={top} textAnchor={anchor} data-active={active?.axis === axis}
            tabIndex={0} aria-label={axisSummary(axis)} {...pick({axis, level: null})}>
            {text.length > 1 ? text.map((line, index) => <tspan key={index} x={x} dy={index ? 12 : 0}>{line}</tspan>) : text[0]}
          </text>;
        })}
      </g>
      {groups && <g className="clear-radar-groups" aria-hidden="true">
        <text x={WIDTH - 6} y={20} textAnchor="end">{scoreText(groups.names[0], locale)}</text>
        <text x={6} y={20} textAnchor="start">{scoreText(groups.names[1], locale)}</text>
      </g>}
    </svg>
    <p className="clear-radar-detail" aria-live="polite">{detail ?? <>
      <span className="clear-radar-key" data-clear-kind="no-continue">{t('scores.clearedNoContinue')}</span>
      <span className="clear-radar-key" data-clear-kind="continued">{t('scores.clearedContinued')}</span>
    </>}</p>
  </div>;
}
