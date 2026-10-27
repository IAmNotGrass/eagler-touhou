import {useState, type CSSProperties} from 'react';
import {useLocale} from '../../i18n';
import {directoryCategories, directoryCategoryKey, type DirectoryCategory, type DirectoryFilter} from './directory-categories';

export interface PlaytimeSlice {key: string; title: string; seconds: number; color: string; category: DirectoryCategory}

/** The chart is wider than the pie so a callout fits on either side. */
const WIDTH = 440, HEIGHT = 230, CX = WIDTH / 2, CY = HEIGHT / 2, RADIUS = 84;
/** A hovered slice grows by this factor and moves this far out of the pie. */
const GROW = 1.07, LIFT = 6;
const direction = (turn: number) => [Math.sin(turn * 2 * Math.PI), -Math.cos(turn * 2 * Math.PI)] as const;
/** Where a slice's callout leaves it: its middle, or the upper right of a whole pie. */
const calloutTurn = (from: number, to: number) => to - from >= 0.9999 ? 0.125 : (from + to) / 2;

/** One wedge from `from` to `to`, in turns clockwise from the top. */
function wedge(from: number, to: number) {
  const [x0, y0] = direction(from), [x1, y1] = direction(to);
  return `M${CX} ${CY}L${(CX + RADIUS * x0).toFixed(2)} ${(CY + RADIUS * y0).toFixed(2)}A${RADIUS} ${RADIUS} 0 ${to - from > 0.5 ? 1 : 0} 1 ${(CX + RADIUS * x1).toFixed(2)} ${(CY + RADIUS * y1).toFixed(2)}Z`;
}

/** The play time showcase: a pie of each played game's share with the total
 * below it, and the games listed beside it, narrowed to one directory
 * category. Pointing at a slice (or a listed game) lifts the slice out and
 * draws a callout line to its name and time. Without any play time the pie
 * is an empty ring with a question mark. `slices` is null while saves are read. */
export function PlaytimeShowcase({slices}: {slices: readonly PlaytimeSlice[] | null}) {
  const {t, locale} = useLocale();
  const [filter, setFilter] = useState<DirectoryFilter>('all'), [active, setActive] = useState<string | null>(null);
  const duration = (seconds: number) => {
    const minutes = Math.floor(seconds / 60);
    return `${Math.floor(minutes / 60)}${locale === 'en' ? 'h ' : t('scores.hourUnit')}${minutes % 60}${locale === 'en' ? 'm' : t('scores.minuteUnit')}`;
  };
  const shown = (slices ?? []).filter(slice => filter === 'all' || slice.category === filter);
  const total = shown.reduce((sum, slice) => sum + slice.seconds, 0);
  let start = 0;
  const arcs = shown.map(slice => {const from = start; start += slice.seconds / total; return {slice, from, to: start};});
  const hovered = arcs.find(arc => arc.slice.key === active);
  const percent = (seconds: number) => `${Math.round(seconds / total * 100)}%`;
  const callout = hovered && (() => {
    const [dx, dy] = direction(calloutTurn(hovered.from, hovered.to)), side = dx >= 0 ? 1 : -1, edge = RADIUS * GROW + LIFT;
    // The bend stays inside the chart, clear of the total below it.
    const [x1, y1] = [CX + dx * edge, CY + dy * edge], x2 = CX + dx * (edge + 18), y2 = Math.min(HEIGHT - 22, Math.max(18, CY + dy * (edge + 18))), x3 = x2 + side * 26;
    return <g className="profile-playtime-callout" aria-hidden="true">
      <circle cx={x1} cy={y1} r={2.5}/>
      <polyline points={`${x1},${y1} ${x2},${y2} ${x3},${y2}`}/>
      <text x={x3 + side * 5} y={y2 - 5} textAnchor={side > 0 ? 'start' : 'end'} className="profile-playtime-callout-name">{hovered.slice.title}</text>
      <text x={x3 + side * 5} y={y2 + 12} textAnchor={side > 0 ? 'start' : 'end'} className="profile-playtime-callout-time">{duration(hovered.slice.seconds)} · {percent(hovered.slice.seconds)}</text>
    </g>;
  })();
  const sliceProps = (key: string, label: string, from: number, to: number) => {
    // A slice moves out of the pie as it grows; a whole pie only grows.
    const whole = to - from >= 0.9999, [dx, dy] = whole ? [0, 0] : direction((from + to) / 2), lifted = key === active;
    return {tabIndex: 0, role: 'img', 'aria-label': label, 'data-active': lifted || undefined,
      style: {transform: lifted ? `translate(${(dx * LIFT).toFixed(2)}px,${(dy * LIFT).toFixed(2)}px) scale(${GROW})` : undefined, transformOrigin: `${CX}px ${CY}px`} as CSSProperties,
      onPointerEnter: () => setActive(key), onPointerLeave: () => setActive(current => current === key ? null : current),
      onFocus: () => setActive(key), onBlur: () => setActive(current => current === key ? null : current)};
  };
  return <section className="profile-showcase profile-playtime" aria-labelledby="profilePlaytimeTitle" aria-busy={slices === null}>
    <header className="profile-playtime-header">
      <h2 id="profilePlaytimeTitle">{t('profile.playtime')}</h2>
      <div className="profile-playtime-filter" role="group" aria-label={t('profile.playtimeCategory')}>
        {(['all', ...directoryCategories] as DirectoryFilter[]).map(value => <button key={value} type="button" aria-pressed={filter === value}
          className={filter === value ? 'selected' : undefined} onClick={() => {setFilter(value); setActive(null);}}>
          {t(value === 'all' ? 'directory.category.allNarrow' : directoryCategoryKey(value))}</button>)}
      </div>
    </header>
    <div className="profile-playtime-body">
      <figure className="profile-playtime-chart">
        <svg viewBox={`0 0 ${WIDTH} ${HEIGHT}`} role="group" aria-label={`${t('profile.playtimeTotal')} ${duration(total)}`}>
          {total > 0 ? <>
            {arcs.map(({slice, from, to}) => {
              const label = `${slice.title} ${duration(slice.seconds)} ${percent(slice.seconds)}`;
              return to - from >= 0.9999
                ? <circle key={slice.key} cx={CX} cy={CY} r={RADIUS} fill={slice.color} {...sliceProps(slice.key, label, from, to)}/>
                : <path key={slice.key} d={wedge(from, to)} fill={slice.color} {...sliceProps(slice.key, label, from, to)}/>;
            })}
            {callout}
          </> : <>
            <circle className="profile-playtime-empty" cx={CX} cy={CY} r={RADIUS}/>
            <text x={CX} y={CY} className="profile-playtime-unknown" textAnchor="middle" dominantBaseline="central">?</text>
          </>}
        </svg>
        <figcaption><span>{t('profile.playtimeTotal')}</span><strong>{slices === null ? '…' : duration(total)}</strong></figcaption>
      </figure>
      {slices === null ? <p className="profile-playtime-note" role="status">{t('profile.playtimeLoading')}</p>
        : total > 0 ? <ol className="profile-playtime-games">
          {shown.map(slice => <li key={slice.key} data-active={slice.key === active || undefined}
            onPointerEnter={() => setActive(slice.key)} onPointerLeave={() => setActive(current => current === slice.key ? null : current)}>
            <i style={{background: slice.color}} aria-hidden="true"/><span title={slice.title}>{slice.title}</span>
            <time dateTime={`PT${Math.floor(slice.seconds)}S`}>{duration(slice.seconds)}</time>
          </li>)}
        </ol> : <p className="profile-playtime-note">{t('profile.playtimeEmpty')}</p>}
    </div>
  </section>;
}
