import {useMemo, useState, type ReactNode} from 'react';
import {useLocale} from '../../i18n';
import {scoreDifficulties, scoreLoadouts, type ScoreClearKind, type ScoreReport} from '../../../src/launcher/score-dat.mts';
import {ClearRadar} from './ClearRadar';
import type {DirectoryCategory, DirectoryFilter} from './directory-categories';

/** One game on the clear showcase; `report` is null when it has no save yet. */
export interface ClearGame {key: string; gameId: string; title: string; category: DirectoryCategory; report: Pick<ScoreReport, 'clears' | 'clearKinds'> | null}

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
 * category on the left; choosing a game's axis opens that game's own radar,
 * by loadout, beside it. Choosing it again closes it. `games` is null while
 * saves are read. */
export function ClearShowcase({games, filter = 'all', badge}: {games: readonly ClearGame[] | null; filter?: DirectoryFilter; badge?: ReactNode}) {
  const {t} = useLocale(), [chosen, setChosen] = useState<string | null>(null);
  const shown = useMemo(() => (games ?? []).filter(game => scoreLoadouts(game.gameId).length > 0 && (filter === 'all' || game.category === filter)), [games, filter]);
  const summary = useMemo(() => gameClearSummary(shown), [shown]);
  const index = shown.findIndex(game => game.key === chosen), game = index >= 0 ? shown[index]! : null;
  return <section className="profile-showcase profile-clears" aria-labelledby="profileClearsTitle" aria-busy={games === null}>
    <h3 id="profileClearsTitle">{t('profile.clears')}{badge}</h3>
    {games === null ? <p className="profile-playtime-note" role="status">{t('profile.playtimeLoading')}</p>
      : !shown.length ? <p className="profile-clears-hint">{t('profile.clearsNoGames')}</p>
      : <div className="profile-clears-body" data-open={game ? true : undefined}>
        <div className="profile-clears-overview">
          <ClearRadar loadouts={shown.map(entry => entry.title)} report={summary} label={t('profile.clearsByGame')}
            selected={game ? index : null} onAxis={axis => setChosen(current => current === shown[axis]?.key ? null : shown[axis]?.key ?? null)}/>
        </div>
        {game ? <div className="profile-clears-game" key={game.key} aria-labelledby="profileClearsGame">
          <header><h4 id="profileClearsGame">{game.title}</h4>
            <button type="button" className="profile-clears-close" aria-label={t('profile.clearsClose')} title={t('profile.clearsClose')} onClick={() => setChosen(null)}>×</button></header>
          {game.report ? <ClearRadar loadouts={scoreLoadouts(game.gameId)} report={game.report}/>
            : <p className="profile-playtime-note">{t('profile.clearsNoSave')}</p>}
        </div> : <p className="profile-clears-hint">{t('profile.clearsHint')}</p>}
      </div>}
  </section>;
}
