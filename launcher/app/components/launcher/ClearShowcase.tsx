import {useMemo, useState, type ReactNode} from 'react';
import {useLocale} from '../../i18n';
import {scoreDifficulties, scoreLoadouts, type ScoreClearKind, type ScoreReport} from '../../../src/launcher/score-dat.mts';
import {GameClearRadar} from './GameClearRadar';
import {FavoriteLoadoutCard} from './FavoriteLoadoutCard';
import type {DirectoryCategory, DirectoryFilter} from './directory-categories';

/** One game on the clear showcase; `report` is null when it has no save yet. */
export interface ClearGame {key: string; gameId: string; title: string; number: string; category: DirectoryCategory; report: ScoreReport | null}

/** How good a clear is, so a game shows its best loadout's clear. */
const KIND_RANK: Readonly<Record<ScoreClearKind, number>> = {none: 0, unknown: 1, continued: 2, 'no-continue': 3};

/** A radar with one axis per game: each difficulty ring (and the Extra band)
 * holds the best clear any of its loadouts made there. */
export function gameClearSummary(games: readonly ClearGame[]): Pick<ScoreReport, 'clears' | 'clearKinds'> {
  const clearKinds = scoreDifficulties.map((_, level) => games.map(({report}) => {
    const kinds = report?.clears[level]?.map((cleared, axis) => report.clearKinds?.[level]?.[axis] ?? (cleared ? 'unknown' : 'none')) ?? [];
    return kinds.reduce<ScoreClearKind>((best, kind) => KIND_RANK[kind] > KIND_RANK[best] ? kind : best, 'none');
  }));
  return {clearKinds, clears: clearKinds.map(row => row.map(kind => kind !== 'none'))};
}

/** The clear showcase: a radar of every game in the overview's directory
 * category, which unfolds a chosen game into its clears by loadout, beside a
 * card with the favourite loadout (of every game, or of the open one). `games`
 * is null while saves are read. */
export function ClearShowcase({games, filter = 'all', badge, animate, assetUrl = path => path}: {
  games: readonly ClearGame[] | null; filter?: DirectoryFilter; badge?: ReactNode; animate?: boolean; assetUrl?(path: string): string;
}) {
  const {t} = useLocale(), [open, setOpen] = useState<string | null>(null);
  const shown = useMemo(() => (games ?? []).filter(game => scoreLoadouts(game.gameId).length > 0 && (filter === 'all' || game.category === filter)), [games, filter]);
  const summary = useMemo(() => gameClearSummary(shown), [shown]);
  return <section className="profile-showcase profile-clears" aria-labelledby="profileClearsTitle" aria-busy={games === null}>
    <h3 id="profileClearsTitle">{t('profile.clears')}{badge}</h3>
    {games === null ? <p className="profile-playtime-note" role="status">{t('profile.playtimeLoading')}</p>
      : !shown.length ? <p className="profile-clears-hint">{t('profile.clearsNoGames')}</p>
      : <div className="profile-clears-row">
        <div className="profile-clears-body"><GameClearRadar games={shown} summary={summary} animate={animate} onOpen={setOpen}/></div>
        <FavoriteLoadoutCard games={shown} focus={open} assetUrl={assetUrl}/>
      </div>}
  </section>;
}
