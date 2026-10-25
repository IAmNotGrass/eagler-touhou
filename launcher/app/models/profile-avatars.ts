import {CHARACTER_ART, type CharacterArtId} from '../../src/contracts/character-art.mts';
import {AVATAR_CATALOG} from './profile-avatar-catalog';

/** Avatar presets are head crops of the bundled DAIRI portraits
 * (docs/dairi-art/avatar-crops.json), in the portrait manifest's order. */
export const PROFILE_AVATAR_CHARACTERS: readonly CharacterArtId[] = Object.freeze([
  'reimu', 'marisa', 'sakuya', 'youmu', 'yukari', 'alice', 'remilia', 'yuyuko', 'reisen', 'cirno', 'lyrica', 'merlin',
  'lunasa', 'mystia', 'tewi', 'aya', 'medicine', 'yuuka', 'komachi', 'eiki', 'sanae', 'nitori', 'patchouli', 'suika',
  'ubame', 'chimi', 'naruko', 'yuiman', 'ariya', 'nina',
]);
export type AvatarExpressionId = string;
export interface ProfileAvatarChoice {character: CharacterArtId; expression: AvatarExpressionId}
export interface AvatarExpression {id: AvatarExpressionId; blush: boolean; src: string}

const ENGLISH_NAMES: Partial<Record<CharacterArtId, string>> = {
  reimu: 'Reimu Hakurei', marisa: 'Marisa Kirisame', sakuya: 'Sakuya Izayoi', youmu: 'Youmu Konpaku', yukari: 'Yukari Yakumo',
  alice: 'Alice Margatroid', remilia: 'Remilia Scarlet', yuyuko: 'Yuyuko Saigyouji', reisen: 'Reisen Udongein Inaba', cirno: 'Cirno',
  lyrica: 'Lyrica Prismriver', merlin: 'Merlin Prismriver', lunasa: 'Lunasa Prismriver', mystia: 'Mystia Lorelei', tewi: 'Tewi Inaba',
  aya: 'Aya Shameimaru', medicine: 'Medicine Melancholy', yuuka: 'Yuuka Kazami', komachi: 'Komachi Onozuka', eiki: 'Eiki Shiki',
  sanae: 'Sanae Kochiya', nitori: 'Nitori Kawashiro', patchouli: 'Patchouli Knowledge', suika: 'Suika Ibuki',
  ubame: 'Ubame Chirizuka', chimi: 'Chimi Houjuu', naruko: 'Naruko Michigami', yuiman: 'Yuiman Asama', ariya: 'Ariya Iwanaga', nina: 'Nina Watari',
};

export function avatarCharacterName(character: CharacterArtId, locale: string) {
  return locale === 'en' ? ENGLISH_NAMES[character] ?? CHARACTER_ART[character].name : CHARACTER_ART[character].name;
}
/** A character's expressions, the bundled portrait's first; blush variants follow. */
export function avatarExpressions(character: CharacterArtId): readonly AvatarExpression[] {
  return (AVATAR_CATALOG[character as keyof typeof AVATAR_CATALOG] ?? []).map(id => ({id, blush: id.startsWith('blush-'), src: `assets/dairi/avatars/${character}/${id}.webp`}));
}
/** Label parts for an expression id: its emotion and whether it is the shaded variant. */
export function expressionLabelParts(id: AvatarExpressionId) {
  const base = id.replace(/^blush-/, '');
  return {emotion: base.replace(/-shade$/, ''), shaded: base.endsWith('-shade')};
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
  if (!PROFILE_AVATAR_CHARACTERS.includes(character as CharacterArtId)) return null;
  const known = avatarExpressions(character as CharacterArtId);
  const chosen = known.find(entry => entry.id === expression) ?? known[0]!;
  return {character: character as CharacterArtId, expression: chosen.id};
}
