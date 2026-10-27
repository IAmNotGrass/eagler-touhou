/** Profile page colour schemes. Each paints the backdrop behind the profile
 * card; `default` keeps the launcher's own background. */
export interface ProfileTheme {
  id: string;
  /** The page backdrop; null keeps the launcher background. */
  backdrop: string | null;
  /** The colour shown on the scheme's swatch. */
  swatch: string;
}

export const PROFILE_THEMES: readonly ProfileTheme[] = Object.freeze([
  {id: 'default', backdrop: null, swatch: 'linear-gradient(135deg,#3a3532,#151412)'},
  {id: 'midnight', backdrop: 'radial-gradient(120% 70% at 50% 0%,#1d3566 0%,#0c1630 45%,#05070f 100%)', swatch: 'linear-gradient(135deg,#2c4f94,#0a1226)'},
  {id: 'summer', backdrop: 'radial-gradient(120% 70% at 50% 0%,#a2481c 0%,#4a1c0b 45%,#120604 100%)', swatch: 'linear-gradient(135deg,#d8702c,#4a1c0b)'},
  {id: 'steel', backdrop: 'radial-gradient(120% 70% at 50% 0%,#4b5866 0%,#232a32 45%,#0c0e11 100%)', swatch: 'linear-gradient(135deg,#7d8b99,#1f252c)'},
  {id: 'cosmic', backdrop: 'radial-gradient(120% 70% at 30% 0%,#5b2a86 0%,#2a1145 40%,#0b0614 100%)', swatch: 'linear-gradient(135deg,#9a4fd1,#25103d)'},
  {id: 'forest', backdrop: 'radial-gradient(120% 70% at 50% 0%,#2d5a36 0%,#12281a 45%,#050c07 100%)', swatch: 'linear-gradient(135deg,#4f9a5c,#10241a)'},
  {id: 'sakura', backdrop: 'radial-gradient(120% 70% at 50% 0%,#8a3a5c 0%,#3d1628 45%,#100609 100%)', swatch: 'linear-gradient(135deg,#e07aa3,#3d1628)'},
]);

export function profileTheme(id: string | null | undefined): ProfileTheme {
  return PROFILE_THEMES.find(theme => theme.id === id) ?? PROFILE_THEMES[0];
}
