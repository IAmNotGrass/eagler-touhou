import {AVATAR_CATALOG, AVATAR_EXPRESSION_NAMES} from './profile-avatar-catalog';
import {AVATAR_CHARACTER_BY_ID, AVATAR_CHARACTERS} from './profile-avatar-characters';

/** Avatar presets are face crops of the DAIRI packages
 * (docs/dairi-art/avatar-sources.json), one dial entry per character. */
export const PROFILE_AVATAR_CHARACTERS: readonly string[] = Object.freeze(AVATAR_CHARACTERS.map(character => character.id).filter(id => id in AVATAR_CATALOG));
export type AvatarCharacterId = string;
export type AvatarExpressionId = string;
export interface ProfileAvatarChoice {character: AvatarCharacterId; expression: AvatarExpressionId}
/** One preset. Expressions of an alternate outfit are `costume/expression`;
 * the default outfit's are bare, so older stored choices stay valid. */
export interface AvatarExpression {id: AvatarExpressionId; costume: string; expression: string; src: string}

type Catalog = Record<string, readonly (readonly [costume: string, expressions: readonly string[]])[]>;
const catalog = AVATAR_CATALOG as Catalog;

export function avatarCharacterName(character: AvatarCharacterId, locale: string) {
  const entry = AVATAR_CHARACTER_BY_ID.get(character);
  if (!entry) return character;
  if (locale === 'en') return entry.en.filter(Boolean).join(' ');
  const [family, given] = entry.zh;
  if (!family || !given) return family || given || entry.ja;
  return entry.western ? `${given}·${family}` : family + given;
}
/** Which artwork a character's presets come from. */
export function avatarArt(character: AvatarCharacterId | null | undefined): 'dairi' | 'tpdp' {
  return character && AVATAR_CHARACTER_BY_ID.get(character)?.art === 'tpdp' ? 'tpdp' : 'dairi';
}
export function avatarColor(character: AvatarCharacterId | null | undefined) {
  return character ? AVATAR_CHARACTER_BY_ID.get(character)?.color ?? null : null;
}
/** 幻想人形演舞 presets live beside the DAIRI ones, keyed with a "tpdp-" prefix. */
const avatarRoot = (character: AvatarCharacterId) => character.startsWith('tpdp-') ? `assets/tpdp/avatars/${character.slice(5)}` : `assets/dairi/avatars/${character}`;
/** A character's outfits with their expressions, the default outfit first. */
export function avatarCostumes(character: AvatarCharacterId): readonly {costume: string; expressions: readonly AvatarExpression[]}[] {
  return (catalog[character] ?? []).map(([costume, expressions]) => ({costume, expressions: expressions.map(expression => ({
    id: costume ? `${costume}/${expression}` : expression, costume, expression,
    src: `${avatarRoot(character)}/${costume ? `${costume}/` : ''}${expression}.webp`,
  }))}));
}
/** Every expression of a character across outfits; the first is its default avatar. */
export function avatarExpressions(character: AvatarCharacterId): readonly AvatarExpression[] {
  return avatarCostumes(character).flatMap(entry => entry.expressions);
}
/** How an expression is named: a translated emotion, shading and blush, or the package's own name. */
export function expressionLabelParts(id: AvatarExpressionId) {
  const expression = id.slice(id.lastIndexOf('/') + 1), base = expression.replace(/^blush-/, '');
  const number = /-(\d+)$/.exec(base)?.[1] ?? null, emotion = base.replace(/-\d+$/, '').replace(/-shade$/, '');
  return {emotion, shaded: base.includes('-shade'), blush: expression.startsWith('blush-'), number, original: AVATAR_EXPRESSION_NAMES[emotion] ?? null};
}
export function avatarSource(choice: ProfileAvatarChoice | null) {
  if (!choice) return null;
  const expressions = avatarExpressions(choice.character);
  return (expressions.find(expression => expression.id === choice.expression) ?? expressions[0])?.src ?? null;
}
/** Stored choices are validated against the presets that still exist. */
export function parseAvatarChoice(value: unknown): ProfileAvatarChoice | null {
  if (!value || typeof value !== 'object') return null;
  const {character, expression} = value as Record<string, unknown>;
  if (typeof character !== 'string' || !Object.hasOwn(catalog, character)) return null;
  const known = avatarExpressions(character);
  const chosen = known.find(entry => entry.id === expression) ?? known[0];
  return chosen ? {character, expression: chosen.id} : null;
}

const fold = (value: string) => value.toLowerCase().normalize('NFKC').replace(/[\s·・.\-_'’～~]/g, '');
const initials = (syllables: readonly string[]) => syllables.map(syllable => syllable[0]).join('');
/** Every spelling a character answers to, folded for comparison. */
const SEARCH_KEYS = new Map(AVATAR_CHARACTERS.map(character => {
  const [family, given] = character.pinyin, keys: string[] = [character.id, character.ja, ...character.ja.split(/[・＆]/)];
  keys.push(...character.zh, character.zh.join(''), [...character.zh].reverse().join(''), ...character.en.flatMap(name => name ? [name, ...name.split(' ')] : []), character.en.join(''), [...character.en].reverse().join(''));
  for (const parts of [family, given, [...family, ...given], [...given, ...family]]) if (parts.length) keys.push(parts.join(''), initials(parts));
  return [character.id, [...new Set(keys.map(fold).filter(Boolean))]] as const;
}));
/** Characters matching a Chinese, English, Japanese or pinyin (full or initial)
 * name or name part: whole matches first, then prefixes, then substrings. */
export function searchAvatarCharacters(query: string): AvatarCharacterId[] {
  const wanted = fold(query);
  if (!wanted) return [];
  const rank = (character: AvatarCharacterId) => {
    const keys = SEARCH_KEYS.get(character) ?? [];
    return keys.includes(wanted) ? 0 : keys.some(key => key.startsWith(wanted)) ? 1 : keys.some(key => key.includes(wanted)) ? 2 : 3;
  };
  return PROFILE_AVATAR_CHARACTERS.map(character => [character, rank(character)] as const)
    .filter(([, score]) => score < 3).sort((a, b) => a[1] - b[1]).map(([character]) => character);
}
