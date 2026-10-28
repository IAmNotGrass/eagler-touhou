/** Profile settings: links to the owner's other pages, and what the overview shows to others. */
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
 await mkdir(resolve(project,'.cache'),{recursive:true});work=await mkdtemp(resolve(project,'.cache/profile-settings-'));const output=resolve(work,'actual.mjs');
 await build({absWorkingDir:project,stdin:{resolveDir:project,loader:'tsx',contents:`
  export * from './app/components/launcher/ProfileOverview.tsx';
  export * from './app/models/profile-settings.ts';
  export * from './app/i18n.tsx';
 `},outfile:output,bundle:true,platform:'node',format:'esm',jsx:'automatic',packages:'external',logLevel:'silent',plugins:[authoredSourcesPlugin(project)]});
 api=await import(pathToFileURL(output).href);
});
afterEach(async()=>{if(root)await React.act(()=>root.unmount());root=null;env.document.body.replaceChildren();assert.deepEqual(env.errors.splice(0),[]);});
after(async()=>{env.close();await rm(work,{recursive:true,force:true});});
const node=selector=>env.document.querySelector(selector);

test('links become pages on the platform\'s own site, from an address or a bare id',()=>{
 assert.equal(api.normalizeLink('bilibili','  '),'');
 assert.equal(api.normalizeLink('bilibili','12345'),'https://space.bilibili.com/12345');
 assert.equal(api.normalizeLink('bilibili','space.bilibili.com/12345'),'https://space.bilibili.com/12345');
 assert.equal(api.normalizeLink('bilibili','http://space.bilibili.com/12345?spm=1'),'https://space.bilibili.com/12345?spm=1');
 assert.equal(api.normalizeLink('bilibili','https://evil.example/space.bilibili.com'),null);
 assert.equal(api.normalizeLink('bilibili','javascript:alert(1)'),null);
 assert.equal(api.normalizeLink('discord','123456789012345678'),'https://discord.com/users/123456789012345678');
 assert.equal(api.normalizeLink('discord','discord.gg/abc'),'https://discord.gg/abc');
 assert.equal(api.normalizeLink('discord','https://user:pw@discord.com/x'),null);
 assert.deepEqual(api.parseLinks({bilibili:'12345',discord:'nope',other:'x'}),{bilibili:'https://space.bilibili.com/12345'});
 assert.deepEqual(api.parseLinks(null),{});
});

test('every overview section is public until hidden, and stored settings keep only known sections',()=>{
 assert.deepEqual(api.parsePrivacy(null),{playtime:true,clears:true});
 assert.deepEqual(api.parsePrivacy({playtime:false,clears:'no',extra:false}),{playtime:false,clears:true});
 assert.deepEqual([...api.OVERVIEW_SECTIONS],['playtime','clears']);
});

async function overview(privacy,owner){
 const container=env.document.createElement('main');env.document.body.append(container);root=createRoot(container);
 await React.act(async()=>root.render(React.createElement(api.LocaleProvider,{locale:'zh-CN'},React.createElement(api.ProfileOverview,{playtime:[],clears:[],privacy,owner}))));
}
const sections=()=>[...env.document.querySelectorAll('.profile-overview h3')].map(heading=>heading.id);

test('a hidden section stays on the owner\'s overview, marked, and is left out for others',async()=>{
 await overview({playtime:false,clears:true},true);
 assert.deepEqual(sections(),['profilePlaytimeTitle','profileClearsTitle']);
 assert.equal(node('#profilePlaytimeTitle .profile-private-badge').textContent,'仅自己可见');
 assert.equal(node('#profileClearsTitle .profile-private-badge'),null);
 await React.act(()=>root.unmount());root=null;env.document.body.replaceChildren();
 await overview({playtime:false,clears:true},false);
 assert.deepEqual(sections(),['profileClearsTitle']);
 assert.equal(node('.profile-private-badge'),null);
 await React.act(()=>root.unmount());root=null;env.document.body.replaceChildren();
 await overview({playtime:false,clears:false},false);
 assert.equal(node('.profile-overview'),null,'with everything hidden, others see no overview at all');
});
