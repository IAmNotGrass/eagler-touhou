/** The profile's play time showcase and the play time read from game saves. */
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
 await mkdir(resolve(project,'.cache'),{recursive:true});work=await mkdtemp(resolve(project,'.cache/profile-playtime-'));const output=resolve(work,'actual.mjs');
 await build({absWorkingDir:project,stdin:{resolveDir:project,loader:'tsx',contents:`
  export * from './app/components/launcher/PlaytimeShowcase.tsx';
  export * from './app/models/playtime.ts';
  export * from './app/i18n.tsx';
 `},outfile:output,bundle:true,platform:'node',format:'esm',jsx:'automatic',packages:'external',logLevel:'silent',plugins:[authoredSourcesPlugin(project)]});
 api=await import(pathToFileURL(output).href);
});
afterEach(async()=>{if(root)await React.act(()=>root.unmount());root=null;env.document.body.replaceChildren();assert.deepEqual(env.errors.splice(0),[]);});
after(async()=>{env.close();await rm(work,{recursive:true,force:true});});
const node=selector=>env.document.querySelector(selector);
const three=[{key:'th20',title:'東方錦上京',seconds:3*3600,color:'#5fa8e0',category:'mainline'},{key:'th10',title:'東方風神録',seconds:3600+30*60,color:'#e07b39',category:'mainline'},
 {key:'th07',title:'東方妖々夢',seconds:30*60,color:'#e889b5',category:'mainline'}];
const spinoff={key:'th075',title:'東方萃夢想',seconds:2*3600,color:'#aaa',category:'decimal'};
async function show(slices,locale='zh-CN'){
 const container=env.document.createElement('main');env.document.body.append(container);root=createRoot(container);
 await React.act(async()=>root.render(React.createElement(api.LocaleProvider,{locale},React.createElement(api.PlaytimeShowcase,{slices}))));
}

test('without play time the pie is an empty ring with a question mark over 0h 0min',async()=>{
 await show([]);
 assert.equal(node('.profile-playtime-unknown').textContent,'?');
 assert.ok(node('.profile-playtime-empty'));assert.equal(env.document.querySelectorAll('.profile-playtime-chart path').length,0);
 assert.equal(node('.profile-playtime-chart figcaption strong').textContent,'0时0分');
 assert.equal(node('.profile-playtime-games'),null,'no games are listed');
});

test('each played game takes its share of the pie and is listed with its time',async()=>{
 await show(three);
 assert.equal(env.document.querySelectorAll('.profile-playtime-chart path').length,3);
 assert.equal(node('.profile-playtime-unknown'),null);
 assert.equal(node('.profile-playtime-chart figcaption strong').textContent,'5时0分','the total sits below the pie');
 assert.deepEqual([...env.document.querySelectorAll('.profile-playtime-games li')].map(li=>[li.querySelector('span').textContent,li.querySelector('time').textContent]),
  [['東方錦上京','3时0分'],['東方風神録','1时30分'],['東方妖々夢','0时30分']]);
 // The largest share, 60% from the top, sweeps past halfway.
 assert.match(env.document.querySelector('.profile-playtime-chart path').getAttribute('d'),/A84 84 0 1 1/);
 assert.equal(node('.profile-playtime-callout'),null,'no callout until a slice is pointed at');
});

test('pointing at a slice lifts it and draws a callout line to its name and time',async()=>{
 await show(three);
 const second=env.document.querySelectorAll('.profile-playtime-chart path')[1];
 await React.act(async()=>second.focus());
 assert.equal(second.dataset.active,'true');assert.match(second.style.transform,/translate\(.+\) scale\(1\.07\)/);
 const texts=[...env.document.querySelectorAll('.profile-playtime-callout text')].map(text=>text.textContent);
 assert.deepEqual(texts,['東方風神録','1时30分 · 30%']);
 assert.equal(env.document.querySelector('.profile-playtime-callout polyline').getAttribute('points').split(' ').length,3,'a line out of the slice, then across');
 assert.equal(node('.profile-playtime-games li[data-active]').textContent.startsWith('東方風神録'),true,'the listed game lights up too');
 await React.act(async()=>second.blur());
 assert.equal(node('.profile-playtime-callout'),null);
});

test('the category selector narrows the pie, the list and the total',async()=>{
 await show([...three,spinoff]);
 assert.equal(node('.profile-playtime-chart figcaption strong').textContent,'7时0分');
 const pick=label=>React.act(async()=>[...env.document.querySelectorAll('.profile-playtime-filter button')].find(button=>button.textContent===label).click());
 assert.deepEqual([...env.document.querySelectorAll('.profile-playtime-filter button')].map(button=>button.textContent),['全部作品','正作','旧作','小数点作','同人作']);
 assert.equal(node('.profile-playtime-filter .selected').textContent,'全部作品');
 await pick('小数点作');
 assert.equal(node('.profile-playtime-filter .selected').textContent,'小数点作');
 assert.deepEqual([...env.document.querySelectorAll('.profile-playtime-games li span')].map(span=>span.textContent),['東方萃夢想']);
 assert.equal(node('.profile-playtime-chart figcaption strong').textContent,'2时0分');
 await pick('旧作');
 assert.ok(node('.profile-playtime-unknown'),'a category nobody played is an empty ring');assert.equal(node('.profile-playtime-chart figcaption strong').textContent,'0时0分');
});

test('one game fills the pie, and the time reads in English as hours and minutes',async()=>{
 await show([{key:'th20',title:'Fossilized Wonders',seconds:64*3600+19*60+30,color:'#5fa8e0',category:'mainline'}],'en');
 assert.equal(env.document.querySelectorAll('.profile-playtime-chart path').length,0);
 assert.ok(node('.profile-playtime-chart circle:not(.profile-playtime-empty)'),'a lone game is a whole circle');
 assert.equal(node('.profile-playtime-chart figcaption strong').textContent,'64h 19m');
});

test('play time comes from the saves of played games only, most played first',async()=>{
 const reads=[];
 const bytesFor={};
 const read=async(product)=>{reads.push(product);if(product==='th08')throw new Error('broken save');return bytesFor[product]??null;};
 // Only titles whose saves the statistics panel decodes are read; a missing or broken save is skipped.
 const entries=await api.readPlaytimes(['th06','th08','th06mp','th12'],read);
 assert.deepEqual(entries,[]);
 assert.deepEqual(reads.sort(),['th06','th08']);
 assert.equal(api.gameColor('th20'),'#5fa8e0');
});
