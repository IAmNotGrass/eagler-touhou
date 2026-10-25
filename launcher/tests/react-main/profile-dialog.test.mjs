/** Profile avatar presets and the mounted profile window. */
import test,{before,after,afterEach} from 'node:test';
import assert from 'node:assert/strict';
import {mkdir,mkdtemp,rm,readFile} from 'node:fs/promises';
import {existsSync} from 'node:fs';
import {resolve} from 'node:path';
import {fileURLToPath,pathToFileURL} from 'node:url';
import {build} from 'esbuild';
import {authoredSourcesPlugin} from './authored-sources.mjs';
import {installMountedDom} from './mounted-dom-environment.mjs';
import {STATIC_FRONTEND_PACKAGE_FILES} from '../../lib/frontend-static-manifest.mjs';
const project=fileURLToPath(new URL('../../',import.meta.url));
let env,React,createRoot,api,work,root;
before(async()=>{
 env=installMountedDom();React=await import('react');({createRoot}=await import('react-dom/client'));
 await mkdir(resolve(project,'.cache'),{recursive:true});work=await mkdtemp(resolve(project,'.cache/profile-dialog-'));const output=resolve(work,'actual.mjs');
 await build({absWorkingDir:project,stdin:{resolveDir:project,loader:'tsx',contents:`
  export * from './app/components/notices/ProfileDialog.tsx';
  export * from './app/models/profile-avatars.ts';
  export * from './app/i18n.tsx';
 `},outfile:output,bundle:true,platform:'node',format:'esm',jsx:'automatic',packages:'external',logLevel:'silent',plugins:[authoredSourcesPlugin(project)]});
 api=await import(pathToFileURL(output).href);
});
afterEach(async()=>{if(root)await React.act(()=>root.unmount());root=null;env.document.body.replaceChildren();assert.deepEqual(env.errors.splice(0),[]);});
after(async()=>{env.close();await rm(work,{recursive:true,force:true});});
const node=selector=>env.document.querySelector(selector);

test('every avatar expression is a published head crop from a recorded package',async()=>{
 const manifest=JSON.parse(await readFile(resolve(project,'public/assets/dairi/manifest.json'),'utf8'));
 const crops=JSON.parse(await readFile(resolve(project,'../docs/dairi-art/avatar-crops.json'),'utf8')).crops;
 assert.deepEqual([...api.PROFILE_AVATAR_CHARACTERS],manifest.characters);assert.deepEqual(Object.keys(crops),manifest.characters);
 const published=STATIC_FRONTEND_PACKAGE_FILES.filter(file=>file.startsWith('assets/dairi/avatars/'));let total=0;
 for(const character of api.PROFILE_AVATAR_CHARACTERS){
  const expressions=api.avatarExpressions(character);assert.ok(expressions.length>=10,`${character} has its package expressions`);
  assert.equal(expressions.filter(entry=>!entry.blush).length>0&&expressions.filter(entry=>entry.blush).length>0,true);
  for(const {src} of expressions){total++;assert.ok(existsSync(resolve(project,'public',src)),src);assert.ok(published.includes(src),`${src} is published`);}
 }
 assert.equal(total,published.length,'no unlisted or stale avatar files');
});
test('stored avatar choices are validated against the presets',()=>{
 assert.deepEqual(api.parseAvatarChoice({character:'cirno',expression:'confident'}),{character:'cirno',expression:'confident'});
 assert.deepEqual(api.parseAvatarChoice({character:'cirno',expression:'blush-cry'}),{character:'cirno',expression:'blush-cry'});
 assert.deepEqual(api.parseAvatarChoice({character:'cirno',expression:'yawning'}),{character:'cirno',expression:'confident'},'an unknown expression falls back to the bundled one');
 assert.equal(api.avatarExpressions('cirno')[0].id,'confident','the bundled portrait\'s expression comes first');
 assert.deepEqual(api.expressionLabelParts('blush-angry-shade'),{emotion:'angry',shaded:true});
 for(const value of [null,'reimu',{character:'flandre',expression:'smile'},{character:'toString'}])assert.equal(api.parseAvatarChoice(value),null);
 assert.equal(api.avatarSource(null),null);assert.equal(api.avatarSource({character:'reimu',expression:'smile'}),'assets/dairi/avatars/reimu/smile.webp');
 assert.equal(api.avatarCharacterName('reimu','zh-CN'),'博丽灵梦');assert.equal(api.avatarCharacterName('reimu','en'),'Reimu Hakurei');
});
async function mount(props={}){
 const calls={names:[],avatars:[]},container=env.document.createElement('main');env.document.body.append(container);root=createRoot(container);
 const element=extra=>React.createElement(api.LocaleProvider,{locale:'zh-CN'},React.createElement(api.ProfileDialog,{open:true,onCloseRequest(){},name:'',avatar:null,assetUrl:path=>'http://profile.local/'+path,
  onName:value=>{calls.names.push(value);return value.trim()||'旧名';},onAvatar:choice=>calls.avatars.push(choice),...props,...extra}));
 await React.act(async()=>root.render(element()));
 return {calls,rerender:extra=>React.act(async()=>root.render(element(extra)))};
}
test('the dial shows a window of characters with the focused one on top and turns with the wheel',async()=>{
 const {calls,rerender}=await mount();
 const items=()=>[...env.document.querySelectorAll('.profile-dial-item')],visible=()=>items().filter(item=>!item.hidden),focused=()=>node('.profile-dial-item[data-focused=true]');
 assert.equal(items().length,30);assert.equal(visible().length,13,'one ring of thirteen slots');
 assert.equal(focused().title,'博丽灵梦');assert.equal(Number(focused().style.getPropertyValue('--dial-x').replace('px','')),0);
 assert.ok(node('.profile-dial-center svg'),'no avatar yet shows the person glyph');
 const wheel=deltaY=>React.act(async()=>{node('.profile-dial').dispatchEvent(new env.window.WheelEvent('wheel',{deltaY,bubbles:true,cancelable:true}));await new Promise(resolve=>setTimeout(resolve,400));});
 await wheel(30);assert.equal(focused().title,'博丽灵梦','small trackpad deltas accumulate');
 await wheel(30);assert.equal(focused().title,'雾雨魔理沙');
 assert.equal(node('#profileExpressionTitle').firstChild.textContent,'雾雨魔理沙','expressions follow the focused character');
 await wheel(-110);assert.equal(focused().title,'渡里ニナ','the dial wraps past the first character');
 await wheel(100);assert.deepEqual(calls.avatars,[],'turning only browses');
 const remilia=items()[6];assert.equal(remilia.hidden,false);
 await React.act(async()=>{remilia.click();await new Promise(resolve=>setTimeout(resolve,400));});
 assert.deepEqual(calls.avatars,[{character:'remilia',expression:'smile'}],'picking stores the bundled expression');assert.equal(focused(),remilia,'a pick turns to the top');
 await rerender({avatar:{character:'remilia',expression:'smile'}});
 assert.equal(remilia.getAttribute('aria-pressed'),'true');
 assert.equal(node('.profile-dial-center img').getAttribute('src'),'http://profile.local/assets/dairi/avatars/remilia/smile.webp');
 const grids=env.document.querySelectorAll('.profile-expression-grid');
 assert.equal(grids.length,1,'normal and blush expressions share one grid');
 const buttons=[...grids[0].querySelectorAll('.profile-expression')];
 assert.equal(buttons.length,api.avatarExpressions('remilia').length);assert.equal(grids[0].querySelector('span'),null,'expressions carry no captions');
 assert.equal(grids[0].querySelector('[aria-pressed=true]').getAttribute('aria-label'),'微笑','the name stays available to assistive technology');
 const blush=buttons.find(button=>button.getAttribute('aria-label')==='大笑'&&buttons.indexOf(button)>buttons.findIndex(other=>other.getAttribute('aria-label')==='大笑'));
 await React.act(async()=>blush.click());
 assert.equal(calls.avatars.at(-1).expression,'blush-laugh','blush variants are their own choices');
});
test('the nickname commits on Enter or blur and shows the name in effect',async()=>{
 const {calls}=await mount({name:'魔法使'});
 const input=node('#profileNameInput');assert.equal(input.value,'魔法使');
 input.value='  琪露诺  ';await React.act(async()=>input.dispatchEvent(new env.window.KeyboardEvent('keydown',{key:'Enter',bubbles:true})));
 assert.deepEqual(calls.names,['  琪露诺  ']);assert.equal(input.value,'琪露诺');
 input.value='';await React.act(async()=>input.dispatchEvent(new env.window.FocusEvent('focusout',{bubbles:true})));
 assert.equal(input.value,'旧名','an empty edit keeps the previous name');
});
test('the header avatar prefers the preset, then the nickname initial',async()=>{
 const container=env.document.createElement('div');env.document.body.append(container);root=createRoot(container);
 await React.act(async()=>root.render(React.createElement(api.ProfileAvatar,{name:'琪露诺',src:'assets/dairi/avatars/cirno.webp',assetUrl:path=>'/'+path})));
 assert.equal(container.querySelector('img').getAttribute('src'),'/assets/dairi/avatars/cirno.webp');
 await React.act(async()=>root.render(React.createElement(api.ProfileAvatar,{name:'琪露诺'})));
 assert.equal(container.textContent,'琪');
});
