#!/usr/bin/env node
/** Packages the launcher's built pages into dist/ for the app (Tauri's
 * beforeBuildCommand). Settings come from the environment, so the same command
 * works in every shell:
 *   EAGLER_APP_SERVICE_ORIGIN  the website for accounts and play (https://lograss.top)
 *   EAGLER_APP_SITE_MANIFEST   the game list, a file or URL (the content site's site-manifest.json)
 *   EAGLER_APP_ARTWORK         the card artwork, a folder or URL (the content site's assets/)
 * The content site, which the app also downloads games from, is
 * EAGLER_APP_CONTENT_ORIGIN (https://touhou.vip); the shell reads it at build time too. */
import {execFileSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';

const here = new URL('../', import.meta.url), path = relative => fileURLToPath(new URL(relative, here));
const env = process.env, content = (env.EAGLER_APP_CONTENT_ORIGIN || 'https://touhou.vip').replace(/\/$/, '');
execFileSync(process.execPath, [
  path('../launcher/scripts/package-app-frontend.mjs'),
  `--output=${path('dist')}`,
  `--service-origin=${env.EAGLER_APP_SERVICE_ORIGIN || 'https://lograss.top'}`,
  `--site-manifest=${env.EAGLER_APP_SITE_MANIFEST || `${content}/site-manifest.json`}`,
  `--artwork=${env.EAGLER_APP_ARTWORK || `${content}/assets/`}`,
  // The app's own versions of website files, such as its first-use notice.
  `--overrides=${path('overrides')}`,
], {stdio: 'inherit'});
