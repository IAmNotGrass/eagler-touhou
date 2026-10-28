/** A Voronoi treemap: a rectangle divided into one convex polygon per value,
 * each with an area proportional to its value. The polygons are the cells of a
 * power diagram (a Voronoi diagram with a weight per site); the sites move to
 * their cells' centroids and the weights grow or shrink until every cell holds
 * its share (after Nocaj & Brandes, "Computing Voronoi Treemaps", 2012). */

export type Point = readonly [number, number];
export type Polygon = Point[];

/** The part of `polygon` where a·p ≤ b (one Sutherland–Hodgman pass). */
function clip(polygon: Polygon, ax: number, ay: number, b: number): Polygon {
  const out: Polygon = [];
  for (let index = 0; index < polygon.length; index++) {
    const current = polygon[index]!, next = polygon[(index + 1) % polygon.length]!;
    const inside = ax * current[0] + ay * current[1] - b, nextInside = ax * next[0] + ay * next[1] - b;
    if (inside <= 0) out.push(current);
    if ((inside < 0 && nextInside > 0) || (inside > 0 && nextInside < 0)) {
      const t = inside / (inside - nextInside);
      out.push([current[0] + t * (next[0] - current[0]), current[1] + t * (next[1] - current[1])]);
    }
  }
  return out;
}

export function polygonArea(polygon: Polygon): number {
  let twice = 0;
  for (let index = 0; index < polygon.length; index++) {
    const [x0, y0] = polygon[index]!, [x1, y1] = polygon[(index + 1) % polygon.length]!;
    twice += x0 * y1 - x1 * y0;
  }
  return Math.abs(twice) / 2;
}

export function polygonCentroid(polygon: Polygon): Point {
  let twice = 0, cx = 0, cy = 0;
  for (let index = 0; index < polygon.length; index++) {
    const [x0, y0] = polygon[index]!, [x1, y1] = polygon[(index + 1) % polygon.length]!;
    const cross = x0 * y1 - x1 * y0;
    twice += cross; cx += (x0 + x1) * cross; cy += (y0 + y1) * cross;
  }
  if (Math.abs(twice) < 1e-9) {
    const sum = polygon.reduce((total, [x, y]) => [total[0] + x, total[1] + y] as const, [0, 0] as const);
    return [sum[0] / polygon.length, sum[1] / polygon.length];
  }
  return [cx / (3 * twice), cy / (3 * twice)];
}

/** Each site's power cell within the rectangle: the points nearer to it, by
 * squared distance less weight, than to any other site. */
function powerCells(sites: readonly Point[], weights: readonly number[], width: number, height: number): Polygon[] {
  const frame: Polygon = [[0, 0], [width, 0], [width, height], [0, height]];
  return sites.map((site, i) => {
    let cell = frame;
    for (let j = 0; j < sites.length && cell.length; j++) {
      if (j === i) continue;
      const other = sites[j]!;
      // |p - s_i|² - w_i ≤ |p - s_j|² - w_j  ⇔  2p·(s_j - s_i) ≤ |s_j|² - |s_i|² - w_j + w_i
      cell = clip(cell, 2 * (other[0] - site[0]), 2 * (other[1] - site[1]),
        other[0] ** 2 + other[1] ** 2 - site[0] ** 2 - site[1] ** 2 - weights[j]! + weights[i]!);
    }
    return cell;
  });
}

/** A repeatable sequence in [0, 1), so the same values always give the same map. */
function sequence(seed: number) {
  let state = seed >>> 0 || 1;
  return () => {state = (Math.imul(state, 1664525) + 1013904223) >>> 0; return state / 2 ** 32;};
}

/** Divides a width × height rectangle into polygons with areas proportional to
 * `values` (all positive), in the same order. */
export function voronoiTreemap(values: readonly number[], width: number, height: number, {iterations = 200, tolerance = 0.01, seed = 1} = {}): Polygon[] {
  const count = values.length;
  if (!count) return [];
  const frame: Polygon = [[0, 0], [width, 0], [width, height], [0, height]];
  if (count === 1) return [frame];
  const total = values.reduce((sum, value) => sum + value, 0), area = width * height;
  const targets = values.map(value => area * value / total);
  const random = sequence(seed);
  let sites: Point[] = values.map(() => [width * (0.1 + 0.8 * random()), height * (0.1 + 0.8 * random())]);
  // Weights act as squared radii; start each in proportion to its share.
  let weights = targets.map(target => target / Math.PI * 0.2);
  let cells = powerCells(sites, weights, width, height);
  for (let round = 0; round < iterations; round++) {
    const areas = cells.map(polygonArea);
    if (areas.every((current, index) => Math.abs(current - targets[index]!) <= tolerance * area)) break;
    // Sites move to their cells' centroids, which evens out the shapes.
    sites = sites.map((site, index) => cells[index]!.length >= 3 ? polygonCentroid(cells[index]!) : site);
    // Too large a weight would swallow a neighbour's site; keep each within reach.
    const nearest = sites.map((site, i) => Math.min(...sites.map((other, j) => j === i ? Infinity : (other[0] - site[0]) ** 2 + (other[1] - site[1]) ** 2)));
    weights = weights.map((weight, index) => {
      const current = areas[index]!, ratio = current > 0 ? targets[index]! / current : 2;
      const adapted = Math.max(weight, 1e-6) * Math.min(Math.max(ratio, 0.6), 1.6);
      return Math.max(1e-6, Math.min(adapted, nearest[index]!));
    });
    cells = powerCells(sites, weights, width, height);
  }
  return cells;
}
