import {useEffect, useSyncExternalStore, type ReactNode} from 'react';
import {useLocale} from '../../i18n';
import {bestClearedLoadout, featuredLoadout, type ScoreStatistics} from '../../models/score-statistics';
import type {LibraryProduct} from './products';
import {CharacterPortraits} from './CharacterPortraits';
import {scoreText} from './score-copy';
import {scoreLoadouts} from '../../../src/launcher/score-dat.mts';
import {ClearRadar} from './ClearRadar';

export function ScorePanel({model, product, language, assetUrl, notice}: {model: ScoreStatistics; product: LibraryProduct; language: string; assetUrl(path: string): string; notice?: ReactNode}) {
  const state = useSyncExternalStore(model.subscribe, model.getSnapshot, model.getSnapshot);
  const {locale, t} = useLocale();
  useEffect(() => {model.select(product.id, language); return () => model.clear(product.id);}, [model, product.id, language]);
  // The new product label must never accompany the prior product's report.
  const current = state.product === product.id, report = current ? state.report : null;
  const favorite = report ? featuredLoadout(report) : null;
  // The portrait shows the best-cleared loadout; with no clears it falls back to the favourite.
  const best = report ? bestClearedLoadout(report) : null;
  const portrait = best?.portraits.length ? {key: best.name, portraits: best.portraits, label: `${t('scores.bestCleared')} · ${scoreText(best.name, locale)} · ${best.difficulty}`}
    : favorite?.portraits.length ? {key: favorite.name, portraits: favorite.portraits, label: undefined as string | undefined} : null;
  const phase = current ? state.phase : 'loading';
  const numbers = new Intl.NumberFormat(locale);
  const favoriteLabel = t(favorite?.basis === 'clears' ? 'scores.mostCleared' : favorite?.basis === 'difficulties' ? 'scores.widestCleared' : 'scores.favorite');
  const favoriteUnit = t(favorite?.basis === 'clears' ? favorite.count === 1 ? 'scores.oneClear' : 'scores.clearTimes' : favorite?.basis === 'difficulties' ? favorite.count === 1 ? 'scores.oneDifficulty' : 'scores.difficultyCount' : 'scores.times');
  const loadouts=scoreLoadouts(product.gameId);
  const playMinutes = report?.playSeconds == null ? null : Math.floor(report.playSeconds / 60);
  const status = phase === 'loading' ? t('scores.loading') : phase === 'empty' ? t('scores.empty') : phase === 'unavailable' ? t('scores.unavailable') : phase === 'unreadable' ? t('scores.unreadable') : phase === 'unsupported' ? t(state.multiplayer ? 'scores.multiplayerUnsupported' : 'scores.unsupported') : '';
  return <section className={`score-panel${report ? ' has-records' : ' without-records'}`} id="scorePanel" aria-label={t('scores.title')} aria-busy={phase === 'loading'}>
    <span id="gameId" className="visually-hidden" data-game={product.gameId}>{product.gameId.toUpperCase()}</span>
    <div className="score-metrics"><div className="score-game-identity"><h2 id="gameTitle" className="score-game-title">{product.title}</h2>{product.subtitle && <p className="score-game-subtitle">{product.subtitle}</p>}</div><div className="score-highest"><span>{t('scores.highest')}</span><strong>{report?.highest == null ? '—' : numbers.format(report.highest)}</strong></div><div className="score-featured" data-basis={favorite?.basis}><span>{favoriteLabel}</span><strong>{favorite ? `${scoreText(favorite.name, locale)} · ${numbers.format(favorite.count)} ${favoriteUnit}` : '—'}</strong></div></div>
    <div className="score-content"><div className="score-stage">
      {loadouts.length && !product.multiplayer ? <div className="score-clear-area">
        <div className="score-matrix-region">
          <ClearRadar key={product.id} loadouts={loadouts} report={report}/>
          <p className={`score-status${phase==='empty'||phase==='loading'?' visually-hidden':''}`} role="status">{status}</p>
        </div>
      </div> : <p className={report ? 'score-status' : 'score-empty'} role="status">{status}</p>}
    </div>
    {playMinutes != null && <p className="score-playtime"><span className="score-playtime-label">{t('scores.playTime')}{locale === 'en' ? ': ' : '：'}</span><time dateTime={`PT${report!.playSeconds}S`}>
      <span className="score-time-number">{Math.floor(playMinutes / 60)}</span><span className="score-time-unit">{t('scores.hourUnit')}</span><span className="score-time-number">{playMinutes % 60}</span><span className="score-time-unit">{t('scores.minuteUnit')}</span>
    </time></p>}
      {notice}
      {phase !== 'loading' && !product.multiplayer && portrait && <CharacterPortraits key={`${product.id}:${portrait.key}`} characters={portrait.portraits} label={portrait.label ?? (favorite?.basis === 'plays' ? undefined : favoriteLabel)} assetUrl={assetUrl}/>}
    </div>
  </section>;
}
