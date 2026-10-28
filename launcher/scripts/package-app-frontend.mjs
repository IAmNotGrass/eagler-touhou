#!/usr/bin/env node
/** Assembles the files the Tauri app bundles: the built frontend, the game
 * card artwork and the site metadata, with the website's services named.
 *
 *   node scripts/package-app-frontend.mjs --output=DIR --site-manifest=FILE --service-origin=https://example.org
 *
 * The site manifest's play relay becomes the service origin's /relay, and
 * every page carries the origin in a `eagler-service-origin` meta element, so
 * accounts and play reach the website while the pages load from the app. */
import {copyFile, mkdir, readFile, rm, writeFile} from 'node:fs/promises';
import {existsSync} from 'node:fs';
import {dirname, resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
import {FRONTEND_PACKAGE_FILES, hostArtworkFiles, resolveFrontendPackageSource} from '../lib/frontend-manifest.mjs';
import {DEVELOPMENT_CONTENT} from '../lib/development-content.mjs';
import {SITE_MANIFEST_FILE, validateSiteManifest} from '../lib/contracts/site-manifest.mjs';
import {RELEASE_CATALOG_FILE, RELEASE_CATALOG_SCHEMA} from '../lib/contracts/release-catalog.mjs';
import {LEGACY_HOST_MANIFEST_FILE, legacyHostManifestResponse} from '../compat/site-manifest.mjs';
import {workspaceRoot} from '../lib/workspace-layout.mjs';

const args = Object.fromEntries(process.argv.slice(2).map(argument => {
  const match = /^--(output|site-manifest|service-origin|artwork)=(.+)$/.exec(argument);
  if (!match) throw new Error(`Unknown argument ${argument}; usage: --output=DIR --site-manifest=FILE --service-origin=URL [--artwork=DIR]`);
  return [match[1], match[2]];
}));
for (const name of ['output', 'site-manifest', 'service-origin']) if (!args[name]) throw new Error(`Missing --${name}`);
const service = new URL(args['service-origin']);
if (service.protocol !== 'https:' || service.pathname !== '/' || service.search || service.hash) throw new Error('--service-origin must be an https origin');
const output = resolve(args.output);
const artwork = resolve(args.artwork ?? resolve(workspaceRoot(), 'games', 'host-artwork'));

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
  const source = resolve(artwork, name);
  if (existsSync(source)) await place(`assets/${name}`, target => copyFile(source, target)); else missingArtwork++;
}

const manifest = validateSiteManifest(JSON.parse(await readFile(resolve(args['site-manifest']), 'utf8')));
manifest.shared.netplayRelay = `wss://${service.host}/relay`;
const json = value => `${JSON.stringify(value, null, 2)}\n`;
await place(SITE_MANIFEST_FILE, target => writeFile(target, json(manifest)));
await place(RELEASE_CATALOG_FILE, target => writeFile(target, json({schema: RELEASE_CATALOG_SCHEMA, games: {}})));
await place(LEGACY_HOST_MANIFEST_FILE, target => writeFile(target, JSON.stringify(legacyHostManifestResponse(manifest)) + '\n'));

console.log(`App frontend: ${FRONTEND_PACKAGE_FILES.length} files, ${missingArtwork ? `${missingArtwork} artwork files missing` : 'all artwork'}, services at ${service.origin} -> ${output}`);
if (fileURLToPath(import.meta.url) === resolve(process.argv[1] ?? '')) process.exitCode = 0;
