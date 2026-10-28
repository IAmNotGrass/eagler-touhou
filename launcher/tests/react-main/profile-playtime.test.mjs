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
  export * from './app/models/voronoi-treemap.ts';
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

const areaOf=points=>{const p=points.trim().split(/\s+/).map(pair=>pair.split(',').map(Number));let a=0;for(let i=0;i<p.length;i++){const [x0,y0]=p[i],[x1,y1]=p[(i+1)%p.length];a+=x0*y1-x1*y0;}return Math.abs(a)/2;};
const cells=()=>[...env.document.querySelectorAll('.profile-playtime-map polygon')];
const total=()=>node('#profilePlaytimeTitle strong').textContent;

test('the treemap divides the area in proportion to the values, covering all of it',()=>{
 for(const values of [[3,1.5,0.5],[64,1,1],[10,9,8,7,6,5,4,3,2,1]]){
  const polygons=api.voronoiTreemap(values,900,300,{seed:7}),sum=values.reduce((a,b)=>a+b,0);
  assert.equal(polygons.length,values.length);
  const areas=polygons.map(api.polygonArea);
  assert.ok(Math.abs(areas.reduce((a,b)=>a+b,0)-900*300)<1,'the cells tile the whole area');
  areas.forEach((area,index)=>assert.ok(Math.abs(area/(900*300)-values[index]/sum)<=0.012,`cell ${index} holds its share`));
 }
 assert.deepEqual(api.voronoiTreemap([5],100,50),[[[0,0],[100,0],[100,50],[0,50]]],'a single value fills the area');
});

test('without play time the area is empty with a question mark and the title reads 0h 0min',async()=>{
 await show([]);
 assert.equal(node('.profile-playtime-unknown').textContent,'?');
 assert.equal(cells().length,0);
 assert.equal(total(),'0时0分');
 assert.equal(node('#profilePlaytimeTitle').textContent,'游戏时长：0时0分','the total sits in the title at the top left');
});

test('each played game takes a polygon whose area follows its play time',async()=>{
 await show(three);
 assert.equal(cells().length,3);assert.equal(node('.profile-playtime-unknown'),null);
 assert.equal(total(),'5时0分');
 const areas=cells().map(cell=>areaOf(cell.getAttribute('points'))),sum=areas.reduce((a,b)=>a+b,0);
 [0.6,0.3,0.1].forEach((share,index)=>assert.ok(Math.abs(areas[index]/sum-share)<0.015,`share ${share}`));
 assert.deepEqual(cells().map(cell=>cell.getAttribute('fill')),['#5fa8e0','#e07b39','#e889b5']);
 assert.ok([...env.document.querySelectorAll('.profile-playtime-label b')].some(label=>label.textContent==='東方錦上京'),'a large cell names its game');
 assert.equal(node('.profile-playtime-tip'),null,'no tip until a cell is pointed at');
});

test('pointing at a cell lights it and shows its name, time and share',async()=>{
 await show(three);
 const second=cells()[1];
 await React.act(async()=>second.focus());
 assert.equal(second.dataset.active,'true');assert.equal(node('.profile-playtime-map').dataset.active,'true','the others dim');
 assert.deepEqual([...node('.profile-playtime-tip').children].map(child=>child.textContent),['東方風神録','1时30分 · 30%']);
 await React.act(async()=>second.blur());
 assert.equal(node('.profile-playtime-tip'),null);
});

test('the category selector narrows the map and the total',async()=>{
 await show([...three,spinoff]);
 assert.equal(total(),'7时0分');
 const pick=label=>React.act(async()=>[...env.document.querySelectorAll('.profile-playtime-filter button')].find(button=>button.textContent===label).click());
 assert.deepEqual([...env.document.querySelectorAll('.profile-playtime-filter button')].map(button=>button.textContent),['全部作品','正作','旧作','小数点作','同人作']);
 await pick('小数点作');
 assert.equal(cells().length,1);assert.equal(total(),'2时0分');
 await pick('旧作');
 assert.ok(node('.profile-playtime-unknown'),'a category nobody played is empty');assert.equal(total(),'0时0分');
});

test('one game fills the area, and the time reads in English as hours and minutes',async()=>{
 await show([{key:'th20',title:'Fossilized Wonders',seconds:64*3600+19*60+30,color:'#5fa8e0',category:'mainline'}],'en');
 assert.equal(cells().length,1);
 const [,,width,height]=node('.profile-playtime-map svg').getAttribute('viewBox').split(' ').map(Number);
 assert.equal(areaOf(cells()[0].getAttribute('points')),width*height,'a lone game is the whole area');
 assert.equal(total(),'64h 19m');assert.equal(node('#profilePlaytimeTitle').textContent,'Play time: 64h 19m');
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
