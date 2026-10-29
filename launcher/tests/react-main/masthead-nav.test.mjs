/** The header's play and community menus. */
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
 await mkdir(resolve(project,'.cache'),{recursive:true});work=await mkdtemp(resolve(project,'.cache/masthead-nav-'));const output=resolve(work,'actual.mjs');
 await build({absWorkingDir:project,stdin:{resolveDir:project,loader:'tsx',contents:`
  export * from './app/components/launcher/MastheadNavMenu.tsx';
  export * from './app/i18n.tsx';
 `},outfile:output,bundle:true,platform:'node',format:'esm',jsx:'automatic',packages:'external',logLevel:'silent',plugins:[authoredSourcesPlugin(project)]});
 api=await import(pathToFileURL(output).href);
});
afterEach(async()=>{if(root)await React.act(()=>root.unmount());root=null;env.document.body.replaceChildren();assert.deepEqual(env.errors.splice(0),[]);});
after(async()=>{env.close();await rm(work,{recursive:true,force:true});});
const node=selector=>env.document.querySelector(selector);
const click=selector=>React.act(async()=>node(selector).click());
const expanded=id=>node(`#${id}Toggle`).getAttribute('aria-expanded');

async function menus(){
 const chosen=[],opened=[];
 const container=env.document.createElement('main');env.document.body.append(container);root=createRoot(container);
 await React.act(async()=>root.render(React.createElement(api.LocaleProvider,{locale:'zh-CN'},
  React.createElement(api.MastheadNavMenu,{id:'play',label:'开始游戏',onOpen:()=>opened.push('play'),items:[
   {id:'single',label:'单人游戏',icon:'M0 0',onSelect:()=>chosen.push('single')},{id:'multi',label:'多人游戏',icon:'M0 0',onSelect:()=>chosen.push('multi')}]}),
  React.createElement(api.MastheadNavMenu,{id:'community',label:'社区',items:[{id:'forum',label:'论坛',icon:'M0 0'},{id:'guides',label:'指南',icon:'M0 0'}]}))));
 return {chosen,opened};
}

test('a menu opens on click where there is no hover, and choosing an item closes it',async()=>{
 const state=await menus();
 assert.equal(expanded('play'),'false');
 assert.equal(node('#playPanel').getAttribute('aria-hidden'),'true');
 await click('#playToggle');
 assert.equal(expanded('play'),'true');
 assert.deepEqual(state.opened,['play'],'opening tells the header, which closes its other menu');
 await click('#multi');
 assert.deepEqual(state.chosen,['multi']);
 assert.equal(expanded('play'),'false');
});

test('opening one menu closes the other',async()=>{
 await menus();
 await click('#playToggle');
 await click('#communityToggle');
 assert.equal(expanded('play'),'false');
 assert.equal(expanded('community'),'true');
});

test('items without a page yet are shown as coming soon and cannot be chosen',async()=>{
 await menus();
 await click('#communityToggle');
 assert.equal(node('#forum').disabled,true);
 assert.equal(node('#forum .masthead-nav-soon').textContent,'即将开放');
 assert.equal(node('#single').disabled,false);
 assert.equal(node('#single .masthead-nav-soon'),null);
});

test('Escape closes an open menu',async()=>{
 await menus();
 await click('#playToggle');
 await React.act(async()=>node('#single').dispatchEvent(new env.window.KeyboardEvent('keydown',{key:'Escape',bubbles:true})));
 assert.equal(expanded('play'),'false');
});
