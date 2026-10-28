#!/usr/bin/env node
/** Assembles the files the Tauri app bundles: the built frontend, the game
 * card artwork and the site metadata, with the website's services named.
 *
 *   node scripts/package-app-frontend.mjs --output=DIR --site-manifest=FILE|URL --service-origin=https://example.org [--artwork=DIR|URL]
 *
 * The site manifest and the card artwork (a folder, by default the workspace's
 * games/host-artwork) may instead come from a published site, such as the
 * service origin's /site-manifest.json and /assets/, for builds without them.
 *
 * The site manifest's play relay becomes the service origin's /relay, and
 * every page carries the origin in a `eagler-service-origin` meta element, so
 * accounts and play reach the website while the pages load from the app. */
import {copyFile, mkdir, readFile, rm, writeFile} from 'node:fs/promises';
import {existsSync} from 'node:fs';
import {dirname, resolve} from 'node:path';
import {setDefaultAutoSelectFamilyAttemptTimeout} from 'node:net';
import {FRONTEND_PACKAGE_FILES, hostArtworkFiles, resolveFrontendPackageSource} from '../lib/frontend-manifest.mjs';
import {DEVELOPMENT_CONTENT} from '../lib/development-content.mjs';
import {SITE_MANIFEST_FILE, validateSiteManifest} from '../lib/contracts/site-manifest.mjs';
import {RELEASE_CATALOG_FILE, RELEASE_CATALOG_SCHEMA} from '../lib/contracts/release-catalog.mjs';
import {LEGACY_HOST_MANIFEST_FILE, legacyHostManifestResponse} from '../compat/site-manifest.mjs';
import {workspaceRoot} from '../lib/workspace-layout.mjs';

const args = Object.fromEntries(process.argv.slice(2).map(argument => {
  const match = /^--(output|site-manifest|service-origin|artwork)=(.+)$/.exec(argument);
  if (!match) throw new Error(`Unknown argument ${argument}; usage: --output=DIR --site-manifest=FILE|URL --service-origin=URL [--artwork=DIR|URL]`);
  return [match[1], match[2]];
}));
for (const name of ['output', 'site-manifest', 'service-origin']) if (!args[name]) throw new Error(`Missing --${name}`);
const service = new URL(args['service-origin']);
if (service.protocol !== 'https:' || service.pathname !== '/' || service.search || service.hash) throw new Error('--service-origin must be an https origin');
const output = resolve(args.output);
const remote = value => /^https:\/\//.test(value ?? '');
const artwork = remote(args.artwork) ? new URL(args.artwork.endsWith('/') ? args.artwork : `${args.artwork}/`) : resolve(args.artwork ?? resolve(workspaceRoot(), 'games', 'host-artwork'));
// Distant hosts can take longer than Node's 250 ms per-address connect attempt.
setDefaultAutoSelectFamilyAttemptTimeout(2500);
async function download(url, attempts = 3) {
  for (let attempt = 1; ; attempt++) {
    try {
      const response = await fetch(url, {signal: AbortSignal.timeout(30000)});
      if (response.status === 404) return null;
      if (!response.ok) throw new Error(`${url}: HTTP ${response.status}`);
      return Buffer.from(await response.arrayBuffer());
    } catch (error) {if (attempt >= attempts) throw error;}
  }
}

await rm(output, {recursive: true, force: true});
const place = async (path, write) => {const target = resolve(output, path); await mkdir(dirname(target), {recursive: true}); await write(target);};

// The page names the service origin before anything else reads its head.
const serviceMeta = `<meta name="eagler-service-origin" content="${service.origin}"/>`;
for (const path of FRONTEND_PACKAGE_FILES) {
  const source = resolveFrontendPackageSource(path);
  if (path.endsWith('.html')) {
    const html = await readFile(source, 'utf8'), charset = '<meta charSet="utf-8"/>';
    await place(path, target => writeFile(target, html.includes(charset) ? html.replace(charset, charset + serviceMeta) : html));
  } else await place(path, target => copyFile(source, target));
}

let missingArtwork = 0;
for (const name of hostArtworkFiles(Object.keys(DEVELOPMENT_CONTENT.games))) {
  if (artwork instanceof URL) {
    const bytes = await download(new URL(name, artwork));
    if (bytes) await place(`assets/${name}`, target => writeFile(target, bytes)); else missingArtwork++;
    continue;
  }
  const source = resolve(artwork, name);
  if (existsSync(source)) await place(`assets/${name}`, target => copyFile(source, target)); else missingArtwork++;
}

const manifestText = remote(args['site-manifest']) ? (await download(args['site-manifest']))?.toString('utf8') : await readFile(resolve(args['site-manifest']), 'utf8');
if (!manifestText) throw new Error(`No site manifest at ${args['site-manifest']}`);
const manifest = validateSiteManifest(JSON.parse(manifestText));
manifest.shared.netplayRelay = `wss://${service.host}/relay`;
const json = value => `${JSON.stringify(value, null, 2)}\n`;
await place(SITE_MANIFEST_FILE, target => writeFile(target, json(manifest)));
await place(RELEASE_CATALOG_FILE, target => writeFile(target, json({schema: RELEASE_CATALOG_SCHEMA, games: {}})));
await place(LEGACY_HOST_MANIFEST_FILE, target => writeFile(target, JSON.stringify(legacyHostManifestResponse(manifest)) + '\n'));

console.log(`App frontend: ${FRONTEND_PACKAGE_FILES.length} files, ${missingArtwork ? `${missingArtwork} artwork files missing` : 'all artwork'}, services at ${service.origin} -> ${output}`);
