import {useLayoutEffect, useMemo, useRef, useState, type ReactNode} from 'react';
import {useLocale} from '../../i18n';
import type {DirectoryCategory, DirectoryFilter} from './directory-categories';
import {polygonArea, polygonCentroid, voronoiTreemap, type Polygon} from '../../models/voronoi-treemap';

export interface PlaytimeSlice {key: string; title: string; seconds: number; color: string; category: DirectoryCategory; artwork?: string | null}
/** One cell: a game, or the games too small to show alone. */
interface PlaytimeGroup {key: string; title: string; seconds: number; color: string; artwork: string | null; members: readonly PlaytimeSlice[]}

/** The map's height; its width follows the card. */
const HEIGHT = 300, NARROW_HEIGHT = 240;
/** A cell names its game inside it once it is at least this large. */
const LABEL_WIDTH = 92, LABEL_HEIGHT = 46;
/** Games under this share of the total join one "other" cell (when there are
 * several); every cell is drawn at least this large, so none is a sliver. */
const SMALL_SHARE = 0.02;

const bounds = (polygon: Polygon) => {
  const xs = polygon.map(point => point[0]), ys = polygon.map(point => point[1]);
  return {width: Math.max(...xs) - Math.min(...xs), height: Math.max(...ys) - Math.min(...ys)};
};

/** The play time showcase: the total beside its title, and the card filled
 * with one polygon per played game whose area follows its play time (a
 * Voronoi treemap), narrowed to the overview's directory category. Each cell shows its
 * game's cover, dimmed under the text. Games under 2% of the total share one
 * "other" cell, and no cell is drawn smaller than 2%, so the areas are
 * proportional apart from those. Large cells name their game; pointing at any
 * cell shows its name, time and share (and the games in "other"). Without
 * any play time the area is empty with a question mark. `slices` is null
 * while saves are read. */
export function PlaytimeShowcase({slices, filter = 'all', badge}: {slices: readonly PlaytimeSlice[] | null; filter?: DirectoryFilter; badge?: ReactNode}) {
  const {t, locale} = useLocale();
  const [active, setActive] = useState<string | null>(null);
  const area = useRef<HTMLDivElement>(null), [size, setSize] = useState({width: 960, height: HEIGHT});
  useLayoutEffect(() => {
    const node = area.current;
    if (!node) return;
    const measure = () => {
      const width = Math.round(node.clientWidth);
      if (width > 0) setSize(current => {
        const height = width < 560 ? NARROW_HEIGHT : HEIGHT;
        return current.width === width && current.height === height ? current : {width, height};
      });
    };
    measure();
    if (typeof ResizeObserver === 'undefined') return;
    const observer = new ResizeObserver(measure);
    observer.observe(node);
    return () => observer.disconnect();
  }, []);
  const duration = (seconds: number) => {
    const minutes = Math.floor(seconds / 60);
    return `${Math.floor(minutes / 60)}${locale === 'en' ? 'h ' : t('scores.hourUnit')}${minutes % 60}${locale === 'en' ? 'm' : t('scores.minuteUnit')}`;
  };
  const shown = useMemo(() => (slices ?? []).filter(slice => slice.seconds > 0 && (filter === 'all' || slice.category === filter)), [slices, filter]);
  const total = shown.reduce((sum, slice) => sum + slice.seconds, 0);
  const groups = useMemo((): PlaytimeGroup[] => {
    const sum = shown.reduce((total, slice) => total + slice.seconds, 0);
    const sorted = [...shown].sort((a, b) => b.seconds - a.seconds);
    const small = sorted.filter(slice => slice.seconds / sum < SMALL_SHARE);
    const own = (slice: PlaytimeSlice): PlaytimeGroup => ({key: slice.key, title: slice.title, seconds: slice.seconds, color: slice.color, artwork: slice.artwork ?? null, members: [slice]});
    if (small.length < 2) return sorted.map(own);
    return [...sorted.filter(slice => !small.includes(slice)).map(own),
      {key: 'other', title: t('profile.playtimeOther'), seconds: small.reduce((total, slice) => total + slice.seconds, 0), color: '#5d5853', artwork: null, members: small}];
  }, [shown, t]);
  const cells = useMemo(() => {
    const sum = groups.reduce((total, group) => total + group.seconds, 0);
    const polygons = voronoiTreemap(groups.map(group => Math.max(group.seconds / sum, SMALL_SHARE)), size.width, size.height, {seed: 7});
    return groups.map((slice, index) => {
      const polygon = polygons[index] ?? [];
      return {slice, polygon, centroid: polygon.length >= 3 ? polygonCentroid(polygon) : [0, 0] as const, box: polygon.length >= 3 ? bounds(polygon) : {width: 0, height: 0}};
    }).filter(cell => cell.polygon.length >= 3 && polygonArea(cell.polygon) > 0);
  }, [groups, size]);
  const percent = (seconds: number) => `${Math.round(seconds / total * 100)}%`;
  const hovered = cells.find(cell => cell.slice.key === active);
  const pointer = (key: string) => ({
    onPointerEnter: () => setActive(key), onPointerLeave: () => setActive(current => current === key ? null : current),
    onFocus: () => setActive(key), onBlur: () => setActive(current => current === key ? null : current),
  });
  return <section className="profile-showcase profile-playtime" aria-labelledby="profilePlaytimeTitle" aria-busy={slices === null}>
    <h3 id="profilePlaytimeTitle">{t('profile.playtime')}{locale === 'en' ? ': ' : '：'}<strong>{slices === null ? '…' : duration(total)}</strong>{badge}</h3>
    <div className="profile-playtime-map" ref={area} style={{height: size.height}} data-active={hovered ? true : undefined}>
      {slices === null ? <p className="profile-playtime-note" role="status">{t('profile.playtimeLoading')}</p>
        : total > 0 ? <>
          <svg viewBox={`0 0 ${size.width} ${size.height}`} width={size.width} height={size.height} role="group" aria-label={`${t('profile.playtime')} ${duration(total)}`}>
            {cells.map(({slice, polygon}) => {
              const points = polygon.map(point => `${point[0].toFixed(1)},${point[1].toFixed(1)}`).join(' ');
              const xs = polygon.map(point => point[0]), ys = polygon.map(point => point[1]);
              const [left, top] = [Math.min(...xs), Math.min(...ys)], clip = `playtime-cell-${slice.key}`;
              const label = slice.members.length > 1
                ? `${slice.title} ${duration(slice.seconds)}：${slice.members.map(member => `${member.title} ${duration(member.seconds)}`).join('，')}`
                : `${slice.title} ${duration(slice.seconds)} ${percent(slice.seconds)}`;
              return <g key={slice.key} className="profile-playtime-cell" data-active={slice.key === active || undefined}>
                <clipPath id={clip}><polygon points={points}/></clipPath>
                {/* The cover fills the cell; a shade above it keeps the text readable. */}
                {slice.artwork ? <image href={slice.artwork} x={left} y={top} width={Math.max(...xs) - left} height={Math.max(...ys) - top}
                  preserveAspectRatio="xMidYMid slice" clipPath={`url(#${clip})`}/> : <polygon points={points} fill={slice.color}/>}
                <polygon className="profile-playtime-shade" points={points} fill={slice.color} tabIndex={0} role="img" aria-label={label} {...pointer(slice.key)}/>
              </g>;
            })}
          </svg>
          {cells.filter(cell => cell.box.width >= LABEL_WIDTH && cell.box.height >= LABEL_HEIGHT).map(({slice, centroid, box}) =>
            <span key={slice.key} className="profile-playtime-label" aria-hidden="true"
              style={{left: centroid[0], top: centroid[1], maxWidth: Math.min(box.width * 0.85, 220)}}>
              <b>{slice.title}</b><small>{duration(slice.seconds)}</small>
            </span>)}
          {hovered && <span className="profile-playtime-tip" aria-hidden="true"
            data-below={hovered.centroid[1] < 70 || undefined}
            style={{left: Math.min(Math.max(hovered.centroid[0], 90), size.width - 90), top: hovered.centroid[1]}}>
            <b>{hovered.slice.title}</b><small>{duration(hovered.slice.seconds)} · {percent(hovered.slice.seconds)}</small>
            {hovered.slice.members.length > 1 && <ul>{hovered.slice.members.map(member =>
              <li key={member.key}><span>{member.title}</span><small>{duration(member.seconds)} · {percent(member.seconds)}</small></li>)}</ul>}
          </span>}
        </> : <div className="profile-playtime-empty"><span className="profile-playtime-unknown" aria-hidden="true">?</span><p className="profile-playtime-note">{t('profile.playtimeEmpty')}</p></div>}
    </div>
  </section>;
}
