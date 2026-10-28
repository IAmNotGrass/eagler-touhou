/** The profile's clear showcase: a radar of every game that opens one game's radar. */
import test,{before,after,afterEach} from 'node:test';
import assert from 'node:assert/strict';
import {mkdir,mkdtemp,rm} from 'node:fs/promises';
import {resolve} from 'node:path';
import {fileURLToPath,pathToFileURL} from 'node:url';
import {build} from 'esbuild';
import {authoredSourcesPlugin} from './authored-sources.mjs';
import {installMountedDom} from './mounted-dom-environment.mjs';
const project=fileURLToPath(new URL('../../',import.meta.url));
let env,React,createRoot,api,work,root;
before(async()=>{
 env=installMountedDom();React=await import('react');({createRoot}=await import('react-dom/client'));
 await mkdir(resolve(project,'.cache'),{recursive:true});work=await mkdtemp(resolve(project,'.cache/profile-clears-'));const output=resolve(work,'actual.mjs');
 await build({absWorkingDir:project,stdin:{resolveDir:project,loader:'tsx',contents:`
  export * from './app/components/launcher/ClearShowcase.tsx';
  export * from './app/i18n.tsx';
 `},outfile:output,bundle:true,platform:'node',format:'esm',jsx:'automatic',packages:'external',logLevel:'silent',plugins:[authoredSourcesPlugin(project)]});
 api=await import(pathToFileURL(output).href);
});
afterEach(async()=>{if(root)await React.act(()=>root.unmount());root=null;env.document.body.replaceChildren();assert.deepEqual(env.errors.splice(0),[]);});
after(async()=>{env.close();await rm(work,{recursive:true,force:true});});
const node=selector=>env.document.querySelector(selector);

/** A report over `loadouts` axes where `kinds[level]` lists each loadout's clear. */
const report=kinds=>({clearKinds:kinds,clears:kinds.map(row=>row.map(kind=>kind!=='none'))});
const none=n=>Array.from({length:n},()=>'none');
// TH06 has four loadouts: Easy by two, Normal without continues by one, nothing harder, Extra continued.
const th06=report([['continued','no-continue','none','none'],['none','none','no-continue','none'],none(4),none(4),['none','continued','none','none']]);
const games=[{key:'th06',gameId:'th06',title:'東方紅魔郷',category:'mainline',report:th06},{key:'th07',gameId:'th07',title:'東方妖々夢',category:'mainline',report:null},{key:'th08',gameId:'th08',title:'東方永夜抄',category:'mainline',report:null}];
async function show(list,filter){
 const container=env.document.createElement('main');env.document.body.append(container);root=createRoot(container);
 await React.act(async()=>root.render(React.createElement(api.LocaleProvider,{locale:'zh-CN'},React.createElement(api.ClearShowcase,{games:list,filter}))));
}

test('each game axis holds the best clear any of its loadouts made at each difficulty',()=>{
 const summary=api.gameClearSummary(games);
 assert.deepEqual(summary.clearKinds.map(row=>row[0]),['no-continue','no-continue','none','none','continued']);
 assert.deepEqual(summary.clearKinds.map(row=>row[1]),['none','none','none','none','none']);
 assert.deepEqual(summary.clears[1],[true,false,false]);
});

test('the radar has one axis per game, and choosing one opens that game by loadout until chosen again',async()=>{
 await show(games);
 const labels=()=>[...env.document.querySelectorAll('.profile-clears-overview .clear-radar-label')];
 assert.deepEqual(labels().map(label=>label.textContent),['東方紅魔郷','東方妖々夢','東方永夜抄']);
 assert.equal(node('.profile-clears-game'),null);
 assert.ok(node('.profile-clears-hint'));
 await React.act(async()=>labels()[0].dispatchEvent(new env.window.MouseEvent('click',{bubbles:true})));
 assert.equal(node('#profileClearsGame').textContent,'東方紅魔郷');
 assert.equal(env.document.querySelectorAll('.profile-clears-game .clear-radar-label').length,4);
 assert.equal(labels()[0].getAttribute('aria-pressed'),'true');
 // A game without a save says so instead of drawing an empty radar.
 await React.act(async()=>labels()[1].dispatchEvent(new env.window.MouseEvent('click',{bubbles:true})));
 assert.equal(node('#profileClearsGame').textContent,'東方妖々夢');
 assert.equal(node('.profile-clears-game .clear-radar'),null);
 await React.act(async()=>labels()[1].dispatchEvent(new env.window.MouseEvent('click',{bubbles:true})));
 assert.equal(node('.profile-clears-game'),null);
});

test('the category filter narrows the axes, and a category without any says so',async()=>{
 await show([...games,{key:'th09',gameId:'th09',title:'東方花映塚',category:'decimal',report:null}],'mainline');
 assert.equal(env.document.querySelectorAll('.profile-clears-overview .clear-radar-label').length,3);
 await React.act(async()=>root.render(React.createElement(api.LocaleProvider,{locale:'zh-CN'},React.createElement(api.ClearShowcase,{games,filter:'classic'}))));
 assert.equal(node('.profile-clears-overview'),null);
 assert.equal(node('.profile-clears-hint').textContent,'这个分类里还没有能读取通关记录的作品。');
});

test('saves still being read show a loading note',async()=>{
 await show(null);
 assert.equal(node('.profile-clears').getAttribute('aria-busy'),'true');
 assert.equal(node('.profile-clears-overview'),null);
});
