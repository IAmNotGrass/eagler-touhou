#!/usr/bin/env node
/** Packages the launcher's built pages into dist/ for the app (Tauri's
 * beforeBuildCommand). Settings come from the environment, so the same command
 * works in every shell:
 *   EAGLER_APP_SERVICE_ORIGIN  the website whose services the app uses (https://lograss.top)
 *   EAGLER_APP_SITE_MANIFEST   its site manifest, a file or URL (../games/dev-site-manifest.json)
 *   EAGLER_APP_ARTWORK         the card artwork, a folder or URL (the workspace's games/host-artwork) */
import {execFileSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';

const here = new URL('../', import.meta.url), path = relative => fileURLToPath(new URL(relative, here));
const env = process.env;
execFileSync(process.execPath, [
  path('../launcher/scripts/package-app-frontend.mjs'),
  `--output=${path('dist')}`,
  `--service-origin=${env.EAGLER_APP_SERVICE_ORIGIN || 'https://lograss.top'}`,
  `--site-manifest=${env.EAGLER_APP_SITE_MANIFEST || path('../games/dev-site-manifest.json')}`,
  ...(env.EAGLER_APP_ARTWORK ? [`--artwork=${env.EAGLER_APP_ARTWORK}`] : []),
], {stdio: 'inherit'});
