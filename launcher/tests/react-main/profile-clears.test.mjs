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
  export * from './app/components/launcher/GameClearRadar.tsx';
  export * from './app/components/launcher/FavoriteLoadoutCard.tsx';
  export * from './app/i18n.tsx';
 `},outfile:output,bundle:true,platform:'node',format:'esm',jsx:'automatic',packages:'external',logLevel:'silent',plugins:[authoredSourcesPlugin(project)]});
 api=await import(pathToFileURL(output).href);
});
afterEach(async()=>{if(root)await React.act(()=>root.unmount());root=null;env.document.body.replaceChildren();assert.deepEqual(env.errors.splice(0),[]);});
after(async()=>{env.close();await rm(work,{recursive:true,force:true});});
const node=selector=>env.document.querySelector(selector);

/** A report over `loadouts` axes where `kinds[level]` lists each loadout's clear. */
const report=(kinds,game='th06',plays=null)=>({game,sections:plays?[{title:'各机体开局次数',rows:plays.map(([name,count])=>[name,'合计',String(count)])}]:[],clearKinds:kinds,clears:kinds.map(row=>row.map(kind=>kind!=='none'))});
const none=n=>Array.from({length:n},()=>'none');
// TH06 has four loadouts: Easy by two, Normal without continues by one, nothing harder, Extra continued.
const th06=report([['continued','no-continue','none','none'],['none','none','no-continue','none'],none(4),none(4),['none','continued','none','none']]);
const games=[{key:'th06',gameId:'th06',title:'東方紅魔郷',number:'06',category:'mainline',report:th06},{key:'th07',gameId:'th07',title:'東方妖々夢',number:'07',category:'mainline',report:null},{key:'th08',gameId:'th08',title:'東方永夜抄',number:'08',category:'mainline',report:null}];
const render=(list,filter)=>React.createElement(api.LocaleProvider,{locale:'zh-CN'},React.createElement(api.ClearShowcase,{games:list,filter,animate:false}));
async function show(list,filter){
 const container=env.document.createElement('main');env.document.body.append(container);root=createRoot(container);
 await React.act(async()=>root.render(render(list,filter)));
}
const spokes=kind=>[...env.document.querySelectorAll(`.game-radar-spoke[data-spoke="${kind}"]`)];
const labels=kind=>spokes(kind).map(spoke=>spoke.querySelector('.game-radar-label'));
const click=element=>React.act(async()=>element.dispatchEvent(new env.window.MouseEvent('click',{bubbles:true})));

test('each game axis holds the best clear any of its loadouts made at each difficulty',()=>{
 const summary=api.gameClearSummary(games);
 assert.deepEqual(summary.clearKinds.map(row=>row[0]),['no-continue','no-continue','none','none','continued']);
 assert.deepEqual(summary.clearKinds.map(row=>row[1]),['none','none','none','none','none']);
 assert.deepEqual(summary.clears[1],[true,false,false]);
});

test('the axis under the pointer takes a wider share of the circle, its neighbours a little more, the rest less',()=>{
 assert.deepEqual(api.fisheye(9,null),Array(9).fill(1));
 const weights=api.fisheye(9,4);
 assert.ok(weights[4]>weights[3]&&weights[3]>weights[2]);
 assert.equal(weights[3],weights[5]);assert.equal(weights[0],1);
 // The first and last axes are neighbours around the circle.
 assert.ok(api.fisheye(9,0)[8]>1);
 // A few axes already have room, so they barely change.
 assert.deepEqual(api.fisheye(3,1),[1,1,1]);
});

test('the radar has one axis per game; choosing one unfolds it into its loadouts, and the centre button folds it away',async()=>{
 await show(games);
 assert.deepEqual(labels('game').map(label=>label.textContent),['東方紅魔郷','東方妖々夢','東方永夜抄']);
 assert.equal(node('.game-radar-fold'),null,'nothing to fold until a game is open');
 await click(labels('game')[0]);
 assert.equal(node('.clear-radar-detail').textContent,'東方紅魔郷','the line below names the open game');
 assert.equal(spokes('game').length,0,'the other games close up once it is open');
 assert.deepEqual(labels('loadout').map(label=>label.textContent),['灵梦 A','灵梦 B','魔理沙 A','魔理沙 B']);
 // The first loadout ends at the top.
 const first=labels('loadout')[0];assert.equal(Math.round(Number(first.getAttribute('x'))),280);assert.ok(Number(first.getAttribute('y'))<235);
 assert.equal(node('.game-clear-radar svg').getAttribute('aria-label'),'東方紅魔郷 · 机体与难度通关记录');
 await click(node('.game-radar-fold'));
 assert.equal(spokes('loadout').length,0);
 assert.equal(spokes('game').length,3);
 assert.equal(node('.game-radar-fold'),null);
});

test('resting on the centre button folds the game partway back toward its axis, with the other games around it',async()=>{
 await show(games);
 await click(labels('game')[2]);
 assert.equal(node('.game-radar-wedge'),null,'fully open, the game fills the circle');
 await React.act(async()=>node('.game-radar-fold').dispatchEvent(new env.window.FocusEvent('focusin',{bubbles:true})));
 assert.equal(node('.clear-radar-detail').textContent,'返回全部作品');
 assert.equal(spokes('game').length,3,'the other two games come back, beside its own highlighted axis');
 assert.equal(spokes('loadout').length,12,'its loadouts stay, shrunk toward the centre');
 const folding=node('.game-radar-spoke[data-folding]');
 assert.equal(folding.querySelector('.game-radar-label').textContent,'東方永夜抄');
 assert.equal(folding.querySelector('.game-radar-label').getAttribute('data-active'),'true','its own axis is highlighted');
 assert.equal(node('.game-radar-wedge').hasAttribute('data-shown'),true);
 await React.act(async()=>node('.game-radar-fold').dispatchEvent(new env.window.FocusEvent('focusout',{bubbles:true})));
 assert.equal(spokes('game').length,0,'leaving the button opens the game again');
 assert.equal(node('.clear-radar-detail').textContent,'東方永夜抄 · 还没有这部作品的存档。');
});

test('a game without a save says so once unfolded, and Escape folds it back',async()=>{
 await show(games);
 await click(labels('game')[1]);
 assert.equal(spokes('loadout').length,6);
 assert.equal(node('.clear-radar-detail').textContent,'東方妖々夢 · 还没有这部作品的存档。');
 await React.act(async()=>node('.game-clear-radar svg').dispatchEvent(new env.window.KeyboardEvent('keydown',{key:'Escape',bubbles:true})));
 assert.equal(spokes('game').length,3);
});

test('the category filter narrows the axes, and a category without any says so',async()=>{
 await show([...games,{key:'th09',gameId:'th09',title:'東方花映塚',number:'09',category:'decimal',report:null}],'mainline');
 assert.equal(spokes('game').length,3);
 await React.act(async()=>root.render(render(games,'classic')));
 assert.equal(node('.game-clear-radar'),null);
 assert.equal(node('.profile-clears-hint').textContent,'这个分类里还没有能读取通关记录的作品。');
});

test('saves still being read show a loading note',async()=>{
 await show(null);
 assert.equal(node('.profile-clears').getAttribute('aria-busy'),'true');
 assert.equal(node('.game-clear-radar'),null);
});

test('the favourite card features the most-played loadout of all games, and the open game\'s own once one is open',async()=>{
 const th07=report(Array.from({length:5},()=>none(6)),'th07',[['咲夜 A',40],['灵梦 A',12]]);
 const th08=report(Array.from({length:5},()=>none(12)),'th08',[['妖梦',9]]);
 const list=[{...games[0]},{...games[1],report:th07},{...games[2],report:th08}];
 assert.equal(api.overallFavorite(list).loadout.name,'咲夜 A','plays outrank clears, and more plays win');
 await show(list);
 assert.equal(node('#profileFavoriteTitle').textContent,'最常用机体');
 assert.equal(node('.profile-favorite-text strong').textContent,'咲夜 A');
 assert.equal(node('.profile-favorite-text span').textContent,'東方妖々夢 · 40 次');
 assert.deepEqual([...env.document.querySelectorAll('.profile-favorite .character-portrait')].map(p=>p.dataset.character),['sakuya']);
 await click(labels('game')[2]);
 assert.equal(node('.profile-favorite-scope').textContent,'東方永夜抄');
 assert.equal(node('.profile-favorite-text strong').textContent,'妖梦');
 assert.deepEqual([...env.document.querySelectorAll('.profile-favorite .character-portrait')].map(p=>p.dataset.character),['youmu']);
 await click(node('.game-radar-fold'));
 assert.equal(node('.profile-favorite-text strong').textContent,'咲夜 A','folding the game away returns to every game');
});

test('without enough play the favourite card says so',async()=>{
 await show([{...games[1]}]);
 assert.equal(node('.profile-favorite-empty').textContent,'还没有足够的游玩记录来选出常用机体。');
 await click(labels('game')[0]);
 assert.equal(node('.profile-favorite-empty').textContent,'还没有这部作品的存档。');
});
