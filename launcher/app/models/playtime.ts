import {gameIdForProduct, type ProductId} from '../../src/contracts/product-catalog.mts';
import {parseScoreDat, type ScoreReport} from '../../src/launcher/score-dat.mts';
import {readStoredScore, supportsScoreStatistics} from '../services/score-storage';

export interface GamePlaytime {product: ProductId; seconds: number}

/** A colour per game for its slice of the playtime chart. */
const GAME_COLORS: Readonly<Record<string, string>> = {
  th06: '#d9443a', th07: '#e889b5', th08: '#7474dc', th09: '#e0b84a', th10: '#e07b39',
  th11: '#4fb39a', th15: '#9b6ad6', th20: '#5fa8e0',
};
export const gameColor = (product: ProductId) => GAME_COLORS[gameIdForProduct(product)] ?? '#a8a29a';

/** Each game's save, parsed. Games never played, or whose save cannot be
 * read, are left out. */
export interface GameSave {product: ProductId; report: ScoreReport}
export async function readSaves(products: readonly ProductId[], read = readStoredScore): Promise<GameSave[]> {
  const results = await Promise.all(products.filter(supportsScoreStatistics).map(async product => {
    try {
      const stored = await read(product, 'ja');
      return stored ? {product, report: parseScoreDat(gameIdForProduct(product), stored.bytes)} : null;
    } catch {return null;}
  }));
  return results.filter((entry): entry is GameSave => entry !== null);
}

/** Play time each save records, most played first; saves without any are left out. */
export function playtimesOf(saves: readonly GameSave[]): GamePlaytime[] {
  return saves.flatMap(({product, report}) => (report.playSeconds ?? 0) > 0 ? [{product, seconds: report.playSeconds!}] : [])
    .sort((a, b) => b.seconds - a.seconds);
}

/** Play time each game's save records, most played first. Games without a
 * record of play time, never played, or whose save cannot be read are left out. */
export async function readPlaytimes(products: readonly ProductId[], read = readStoredScore): Promise<GamePlaytime[]> {
  return playtimesOf(await readSaves(products, read));
}
