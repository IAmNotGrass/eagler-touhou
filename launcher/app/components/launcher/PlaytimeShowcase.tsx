import {useLayoutEffect, useMemo, useRef, useState} from 'react';
import {useLocale} from '../../i18n';
import {directoryCategories, directoryCategoryKey, type DirectoryCategory, type DirectoryFilter} from './directory-categories';
import {polygonArea, polygonCentroid, voronoiTreemap, type Polygon} from '../../models/voronoi-treemap';

export interface PlaytimeSlice {key: string; title: string; seconds: number; color: string; category: DirectoryCategory}

/** The map's height; its width follows the card. */
const HEIGHT = 300, NARROW_HEIGHT = 240;
/** A cell names its game inside it once it is at least this large. */
const LABEL_WIDTH = 92, LABEL_HEIGHT = 46;

const bounds = (polygon: Polygon) => {
  const xs = polygon.map(point => point[0]), ys = polygon.map(point => point[1]);
  return {width: Math.max(...xs) - Math.min(...xs), height: Math.max(...ys) - Math.min(...ys)};
};

/** The play time showcase: the total beside its title, and the card filled
 * with one polygon per played game whose area is proportional to its play
 * time (a Voronoi treemap), narrowed to one directory category. Large cells
 * name their game; pointing at any cell shows its name, time and share.
 * Without any play time the area is empty with a question mark. `slices` is
 * null while saves are read. */
export function PlaytimeShowcase({slices}: {slices: readonly PlaytimeSlice[] | null}) {
  const {t, locale} = useLocale();
  const [filter, setFilter] = useState<DirectoryFilter>('all'), [active, setActive] = useState<string | null>(null);
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
  const cells = useMemo(() => {
    const polygons = voronoiTreemap(shown.map(slice => slice.seconds), size.width, size.height, {seed: 7});
    return shown.map((slice, index) => {
      const polygon = polygons[index] ?? [];
      return {slice, polygon, centroid: polygon.length >= 3 ? polygonCentroid(polygon) : [0, 0] as const, box: polygon.length >= 3 ? bounds(polygon) : {width: 0, height: 0}};
    }).filter(cell => cell.polygon.length >= 3 && polygonArea(cell.polygon) > 0);
  }, [shown, size]);
  const percent = (seconds: number) => `${Math.round(seconds / total * 100)}%`;
  const hovered = cells.find(cell => cell.slice.key === active);
  const pointer = (key: string) => ({
    onPointerEnter: () => setActive(key), onPointerLeave: () => setActive(current => current === key ? null : current),
    onFocus: () => setActive(key), onBlur: () => setActive(current => current === key ? null : current),
  });
  return <section className="profile-showcase profile-playtime" aria-labelledby="profilePlaytimeTitle" aria-busy={slices === null}>
    <header className="profile-playtime-header">
      <h2 id="profilePlaytimeTitle">{t('profile.playtime')}{locale === 'en' ? ': ' : '：'}<strong>{slices === null ? '…' : duration(total)}</strong></h2>
      <div className="profile-playtime-filter" role="group" aria-label={t('profile.playtimeCategory')}>
        {(['all', ...directoryCategories] as DirectoryFilter[]).map(value => <button key={value} type="button" aria-pressed={filter === value}
          className={filter === value ? 'selected' : undefined} onClick={() => {setFilter(value); setActive(null);}}>
          {t(value === 'all' ? 'directory.category.allNarrow' : directoryCategoryKey(value))}</button>)}
      </div>
    </header>
    <div className="profile-playtime-map" ref={area} style={{height: size.height}} data-active={hovered ? true : undefined}>
      {slices === null ? <p className="profile-playtime-note" role="status">{t('profile.playtimeLoading')}</p>
        : total > 0 ? <>
          <svg viewBox={`0 0 ${size.width} ${size.height}`} width={size.width} height={size.height} role="group" aria-label={`${t('profile.playtime')} ${duration(total)}`}>
            {cells.map(({slice, polygon}) => <polygon key={slice.key} points={polygon.map(point => `${point[0].toFixed(1)},${point[1].toFixed(1)}`).join(' ')}
              fill={slice.color} tabIndex={0} role="img" aria-label={`${slice.title} ${duration(slice.seconds)} ${percent(slice.seconds)}`}
              data-active={slice.key === active || undefined} {...pointer(slice.key)}/>)}
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
          </span>}
        </> : <div className="profile-playtime-empty"><span className="profile-playtime-unknown" aria-hidden="true">?</span><p className="profile-playtime-note">{t('profile.playtimeEmpty')}</p></div>}
    </div>
  </section>;
}
