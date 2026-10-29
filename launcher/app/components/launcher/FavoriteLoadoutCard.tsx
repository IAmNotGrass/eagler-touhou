import {useLocale} from '../../i18n';
import type {ScoreReport} from '../../../src/launcher/score-dat.mts';
import {featuredLoadout} from '../../models/score-statistics';
import {CharacterPortraits} from './CharacterPortraits';
import {scoreText} from './score-copy';

export interface FavoriteGame {key: string; title: string; report: ScoreReport | null}
type Featured = NonNullable<ReturnType<typeof featuredLoadout>>;

/** How strongly each kind of evidence names a favourite: plays beat clears,
 * which beat difficulty coverage. */
const BASIS_RANK: Readonly<Record<Featured['basis'], number>> = {plays: 3, clears: 2, difficulties: 1};

/** The loadout to feature across several games: the game card's choice for
 * each, then the one with the strongest evidence and the highest count. */
export function overallFavorite(games: readonly FavoriteGame[]): {game: FavoriteGame; loadout: Featured} | null {
  return games.flatMap(game => {const loadout = game.report ? featuredLoadout(game.report) : null; return loadout ? [{game, loadout}] : [];})
    .reduce<{game: FavoriteGame; loadout: Featured} | null>((best, entry) => !best
      || BASIS_RANK[entry.loadout.basis] > BASIS_RANK[best.loadout.basis]
      || BASIS_RANK[entry.loadout.basis] === BASIS_RANK[best.loadout.basis] && entry.loadout.count > best.loadout.count ? entry : best, null);
}

/** Beside the clear radar: the most-played loadout (or, without play counts,
 * the most-cleared) with its portrait. Across every game shown, or, while a
 * game is open on the radar, that game's own. */
export function FavoriteLoadoutCard({games, focus, assetUrl}: {games: readonly FavoriteGame[]; focus: string | null; assetUrl(path: string): string}) {
  const {t, locale} = useLocale();
  const open = focus ? games.find(game => game.key === focus) ?? null : null;
  const featured = open ? (open.report && featuredLoadout(open.report) ? {game: open, loadout: featuredLoadout(open.report)!} : null) : overallFavorite(games);
  const label = t(featured?.loadout.basis === 'clears' ? 'scores.mostCleared' : featured?.loadout.basis === 'difficulties' ? 'scores.widestCleared' : 'scores.favorite');
  const unit = (loadout: Featured) => t(loadout.basis === 'clears' ? loadout.count === 1 ? 'scores.oneClear' : 'scores.clearTimes'
    : loadout.basis === 'difficulties' ? loadout.count === 1 ? 'scores.oneDifficulty' : 'scores.difficultyCount' : 'scores.times');
  const numbers = new Intl.NumberFormat(locale);
  return <section className="profile-favorite" aria-labelledby="profileFavoriteTitle" data-game={featured?.game.key}>
    <header><h4 id="profileFavoriteTitle">{label}</h4>{open && <span className="profile-favorite-scope">{open.title}</span>}</header>
    {featured ? <>
      {/* Keyed by loadout, so a new choice plays the portrait's entrance again. */}
      <div className="profile-favorite-art">
        <CharacterPortraits key={`${featured.game.key}:${featured.loadout.name}`} characters={featured.loadout.portraits} assetUrl={assetUrl}/>
      </div>
      <div className="profile-favorite-text">
        <strong>{scoreText(featured.loadout.name, locale)}</strong>
        <span>{!open && `${featured.game.title} · `}{numbers.format(featured.loadout.count)} {unit(featured.loadout)}</span>
      </div>
    </> : <p className="profile-favorite-empty">{t(open && !open.report ? 'profile.clearsNoSave' : 'profile.favoriteEmpty')}</p>}
  </section>;
}
