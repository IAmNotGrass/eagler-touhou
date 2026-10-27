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
  export * from './app/models/profile-avatar-characters.ts';
  export * from './app/i18n.tsx';
 `},outfile:output,bundle:true,platform:'node',format:'esm',jsx:'automatic',packages:'external',logLevel:'silent',plugins:[authoredSourcesPlugin(project)]});
 api=await import(pathToFileURL(output).href);
});
afterEach(async()=>{if(root)await React.act(()=>root.unmount());root=null;env.document.body.replaceChildren();assert.deepEqual(env.errors.splice(0),[]);});
after(async()=>{env.close();await rm(work,{recursive:true,force:true});});
const node=selector=>env.document.querySelector(selector);

test('every character has published face crops of its recorded outfits',async()=>{
 const dairi=JSON.parse(await readFile(resolve(project,'../docs/dairi-art/avatar-sources.json'),'utf8')).characters;
 const tpdp=JSON.parse(await readFile(resolve(project,'../docs/tpdp-art/avatar-sources.json'),'utf8')).characters;
 const sources={...dairi,...Object.fromEntries(Object.entries(tpdp).map(([id,outfits])=>[`tpdp-${id}`,outfits]))};
 assert.deepEqual([...api.PROFILE_AVATAR_CHARACTERS],api.AVATAR_CHARACTERS.map(character=>character.id),'every registered character has presets, in registry order');
 assert.deepEqual(Object.keys(sources).sort(),[...api.PROFILE_AVATAR_CHARACTERS].sort());
 const published=STATIC_FRONTEND_PACKAGE_FILES.filter(file=>/^assets\/(dairi|tpdp)\/avatars\//.test(file));let total=0;
 assert.ok(api.PROFILE_AVATAR_CHARACTERS.indexOf('tpdp-reimu')>api.PROFILE_AVATAR_CHARACTERS.lastIndexOf('tsumibukuro'),'the 人形演舞 set follows the DAIRI one');
 assert.equal(api.avatarArt('tpdp-reimu'),'tpdp');assert.equal(api.avatarArt('reimu'),'dairi');
 assert.ok(api.avatarExpressions('tpdp-reimu')[0].src.startsWith('assets/tpdp/avatars/reimu/'));
 for(const character of api.PROFILE_AVATAR_CHARACTERS){
  const outfits=api.avatarCostumes(character);
  assert.equal(outfits[0].costume,'',`${character} lists its default outfit first`);
  assert.deepEqual(outfits.map(outfit=>outfit.costume),sources[character].map(outfit=>outfit.costume));
  for(const outfit of outfits){
   assert.ok(outfit.expressions.length>0,`${character}/${outfit.costume} has expressions`);
   for(const {src} of outfit.expressions){total++;assert.ok(existsSync(resolve(project,'public',src)),src);assert.ok(published.includes(src),`${src} is published`);}
  }
 }
 assert.equal(total,published.length,'no unlisted or stale avatar files');
});
test('stored avatar choices are validated against the presets',()=>{
 assert.deepEqual(api.parseAvatarChoice({character:'cirno',expression:'confident'}),{character:'cirno',expression:'confident'});
 assert.deepEqual(api.parseAvatarChoice({character:'cirno',expression:'blush-cry'}),{character:'cirno',expression:'blush-cry'});
 assert.deepEqual(api.parseAvatarChoice({character:'cirno',expression:'yawning'}),{character:'cirno',expression:'confident'},'an unknown expression falls back to the default');
 assert.equal(api.avatarExpressions('cirno')[0].id,'confident','the portrait\'s own expression comes first');
 const swimsuit=api.avatarExpressions('remilia').find(entry=>entry.costume==='swimsuit');
 assert.equal(swimsuit.id,`swimsuit/${swimsuit.expression}`);assert.equal(swimsuit.src,`assets/dairi/avatars/remilia/swimsuit/${swimsuit.expression}.webp`);
 assert.deepEqual(api.parseAvatarChoice({character:'remilia',expression:swimsuit.id}),{character:'remilia',expression:swimsuit.id},'outfit expressions are stored with their outfit');
 assert.deepEqual(api.expressionLabelParts('swimsuit/blush-angry-shade'),{emotion:'angry',shaded:true,blush:true,number:null,original:null});
 assert.equal(api.expressionLabelParts('cry-3').number,'3');
 for(const value of [null,'reimu',{character:'nobody',expression:'smile'},{character:'toString'}])assert.equal(api.parseAvatarChoice(value),null);
 assert.equal(api.avatarSource(null),null);assert.equal(api.avatarSource({character:'reimu',expression:'smile'}),'assets/dairi/avatars/reimu/smile.webp');
 assert.equal(api.avatarCharacterName('reimu','zh-CN'),'博丽灵梦');assert.equal(api.avatarCharacterName('reimu','en'),'Reimu Hakurei');
 assert.equal(api.avatarCharacterName('remilia','zh-CN'),'蕾米莉亚·斯卡蕾特','western names read given·family');
 assert.equal(api.avatarCharacterName('nina','zh-CN'),'渡里','a partial Chinese name shows what is known');
});
async function mount(props={}){
 const calls={avatars:[]},container=env.document.createElement('main');env.document.body.append(container);root=createRoot(container);
 const element=extra=>React.createElement(api.LocaleProvider,{locale:'zh-CN'},React.createElement(api.ProfileDialog,{open:true,onCloseRequest(){},name:'',avatar:null,assetUrl:path=>'http://profile.local/'+path,
  onAvatar:choice=>calls.avatars.push(choice),...props,...extra}));
 await React.act(async()=>root.render(element()));
 return {calls,rerender:extra=>React.act(async()=>root.render(element(extra)))};
}
const nameOf=id=>api.avatarCharacterName(id,'zh-CN');
test('the dial shows a window of characters with the focused one on top and turns with the wheel',async()=>{
 const {calls,rerender}=await mount();
 const items=()=>[...env.document.querySelectorAll('.profile-dial-item')],visible=()=>items().filter(item=>!item.hidden),focused=()=>node('.profile-dial-item[data-focused=true]');
 assert.equal(items().length,11,'only the characters on the dial are rendered; its two bottom slots hold the search');
 assert.equal(focused().title,'博丽灵梦');assert.equal(Number(focused().style.getPropertyValue('--dial-x').replace('px','')),0);
 assert.equal(items().filter(item=>item.querySelector('img')).length,11,'only shown characters load their image');
 assert.ok(node('.profile-dial-center svg'),'no avatar yet shows the person glyph');
 const wheel=deltaY=>React.act(async()=>{node('.profile-dial').dispatchEvent(new env.window.WheelEvent('wheel',{deltaY,bubbles:true,cancelable:true}));await new Promise(resolve=>setTimeout(resolve,400));});
 await wheel(30);assert.equal(focused().title,'博丽灵梦','small trackpad deltas accumulate');
 await wheel(30);assert.equal(focused().title,'雾雨魔理沙');
 assert.equal(node('.profile-dial-caption').textContent,'雾雨魔理沙','the caption names the focused character');
 assert.equal(items()[1].style.getPropertyValue('--avatar-color'),'#f2c94c','each character carries its own colour');
 await wheel(-110);assert.equal(focused().title,`${nameOf(api.PROFILE_AVATAR_CHARACTERS.at(-1))} · 人形演舞`,'the dial wraps past the first character to the 人形演舞 set');
 await wheel(100);assert.deepEqual(calls.avatars,[],'turning only browses');
 const target=items().find(item=>api.avatarExpressions(item.dataset.character).length>1),id=target.dataset.character,list=api.avatarExpressions(id);
 await React.act(async()=>{target.click();await new Promise(resolve=>setTimeout(resolve,400));});
 assert.deepEqual(calls.avatars,[],'picking a character opens its expressions without choosing one');
 assert.equal(node('.profile-editor').dataset.dialMode,'expressions');
 assert.equal(node('.profile-dial-item[data-character]'),null,'the characters leave the dial');
 assert.equal(focused().dataset.dialKey,list[0].id,'the first expression comes to the top');
 assert.equal(node('.profile-dial-center img').getAttribute('src'),'http://profile.local/'+list[0].src,'the centre previews the focused expression');
 assert.ok(node('#profileDialBack'),'the search slot turns into a way back');
 await wheel(50);assert.equal(focused().dataset.dialKey,list[1].id,'the expressions turn like the characters');
 await React.act(async()=>{focused().click();await new Promise(resolve=>setTimeout(resolve,400));});
 assert.deepEqual(calls.avatars,[{character:id,expression:list[1].id}],'picking an expression stores it');
 assert.equal(node('.profile-editor').dataset.dialMode,'characters','and the characters come back');
 assert.equal(focused().dataset.character,id,'with the chosen character on top');
 await rerender({avatar:{character:id,expression:list[1].id}});
 assert.equal(focused().getAttribute('aria-pressed'),'true');
 assert.equal(node('.profile-dial-center img').getAttribute('src'),'http://profile.local/'+list[1].src);
 assert.equal(focused().querySelector('img').getAttribute('src'),'http://profile.local/'+list[1].src,'the character on the dial shows the chosen expression');
});
test('the window builds its content when opened and drops it once closed',async()=>{
 const {rerender}=await mount({open:false});
 assert.equal(node('.profile-editor'),null,'nothing is built while the window is closed');
 await rerender({open:true});
 assert.ok(node('.profile-editor'));assert.equal(env.document.querySelectorAll('.profile-dial-item').length,11);
 await rerender({open:false});
 await React.act(async()=>{await new Promise(resolve=>setTimeout(resolve,700));});
 assert.equal(node('.profile-editor'),null,'closing removes the content');assert.ok(node('#profileDialog'),'the empty window stays ready');
});
test('arrow keys anywhere in the window turn the dial, and Escape leaves the expressions without closing',async()=>{
 await mount({avatar:{character:'remilia',expression:'smile'}});await React.act(async()=>{await new Promise(resolve=>setTimeout(resolve,100));});
 const focused=()=>node('.profile-dial-item[data-focused=true]');
 assert.equal(env.document.activeElement,focused(),'opening the window focuses the dial');
 assert.equal(focused().dataset.character,'remilia','the dial opens on the current avatar');
 const press=async(target,key)=>React.act(async()=>{target.dispatchEvent(new env.window.KeyboardEvent('keydown',{key,bubbles:true,cancelable:true}));await new Promise(resolve=>setTimeout(resolve,400));});
 const at=index=>api.PROFILE_AVATAR_CHARACTERS[index],start=api.PROFILE_AVATAR_CHARACTERS.indexOf('remilia');
 await press(node('#profileClose'),'ArrowRight');
 assert.equal(focused().dataset.character,at(start+1),'the window header passes arrows to the dial');
 await press(node('#profileClose'),'ArrowLeft');
 await React.act(async()=>{focused().click();await new Promise(resolve=>setTimeout(resolve,400));});
 const list=api.avatarExpressions('remilia'),current=list.findIndex(entry=>entry.id==='smile');
 assert.equal(focused().dataset.dialKey,'smile','the expressions open on the current one');
 assert.equal(env.document.activeElement,focused());
 await press(env.document.activeElement,'ArrowRight');
 assert.equal(focused().dataset.dialKey,list[current+1].id);assert.equal(env.document.activeElement,focused(),'focus follows the dial');
 const escape=new env.window.KeyboardEvent('keydown',{key:'Escape',bubbles:true,cancelable:true});
 await React.act(async()=>{env.document.activeElement.dispatchEvent(escape);await new Promise(resolve=>setTimeout(resolve,400));});
 assert.equal(escape.defaultPrevented,true,'Escape is kept from closing the window');
 assert.equal(node('.profile-editor').dataset.dialMode,'characters');assert.equal(focused().dataset.character,'remilia');
});
test('outfits join a character\'s expressions on the dial and are stored with them',async()=>{
 const {calls}=await mount({avatar:{character:'remilia',expression:'smile'}});
 await React.act(async()=>{await new Promise(resolve=>setTimeout(resolve,100));node('.profile-dial-item[data-focused=true]').click();await new Promise(resolve=>setTimeout(resolve,400));});
 const all=api.avatarCostumes('remilia').flatMap(outfit=>outfit.expressions);
 assert.equal(all.length,api.avatarExpressions('remilia').length);
 const swimsuit=all.findIndex(entry=>entry.costume==='swimsuit'),current=all.findIndex(entry=>entry.id==='smile');
 const press=async key=>React.act(async()=>{env.document.activeElement.dispatchEvent(new env.window.KeyboardEvent('keydown',{key,bubbles:true,cancelable:true}));await new Promise(resolve=>setTimeout(resolve,300));});
 for(let index=current;index<swimsuit;index++)await press('ArrowRight');
 const top=node('.profile-dial-item[data-focused=true]');
 assert.equal(top.dataset.dialKey,all[swimsuit].id);assert.match(top.title,/^泳装 · /,'an outfit expression names its outfit');
 assert.equal(node('.profile-dial-caption').textContent,`${nameOf('remilia')} · ${top.title}`);
 await React.act(async()=>top.click());
 assert.deepEqual(calls.avatars,[{character:'remilia',expression:all[swimsuit].id}]);
});
test('character search matches Chinese, English, Japanese and pinyin names or name parts',()=>{
 const first=query=>api.searchAvatarCharacters(query)[0];
 for(const [query,character] of [['灵梦','reimu'],['博丽','reimu'],['博丽灵梦','reimu'],['lingmeng','reimu'],['bolilingmeng','reimu'],['bllm','reimu'],['Reimu','reimu'],['hakurei','reimu'],
  ['魔理沙','marisa'],['mls','marisa'],['Kirisame','marisa'],['帕秋莉','patchouli'],['pql','patchouli'],['knowledge','patchouli'],['チルノ','cirno'],['qln','cirno'],['渡里','nina'],['Watari','nina'],['ari ya','ariya'],
  ['古明地恋','koishi'],['koishi','koishi'],['こいし','koishi'],['八云蓝','ran'],['hakureireimu','reimu'],['蓬莱山辉夜','kaguya'],['plshy','kaguya']])
  assert.equal(first(query),character,query);
 assert.deepEqual(api.searchAvatarCharacters('prismriver'),['lunasa','merlin','lyrica','tpdp-lyrica','tpdp-merlin','tpdp-lunasa'],'a shared family name finds every sister, DAIRI art first');
 assert.deepEqual(api.searchAvatarCharacters('古明地'),['satori','koishi','tpdp-satori','tpdp-koishi']);
 assert.deepEqual(api.searchAvatarCharacters('  '),[]);assert.deepEqual(api.searchAvatarCharacters('zzzz'),[]);
});
test('search narrows the dial to the matching characters without changing the avatar, and Enter picks the top one',async()=>{
 const {calls}=await mount();
 assert.equal(node('.profile-search-open').getAttribute('aria-label'),'搜索角色');assert.equal(node('.profile-search-open').textContent,'','the closed control is an icon');
 await React.act(async()=>node('.profile-search-open').click());
 assert.equal(env.document.activeElement,node('.profile-search input'));assert.equal(node('.profile-search').dataset.open,'true');
 const type=async value=>React.act(async()=>{const field=node('.profile-search input'),setter=Object.getOwnPropertyDescriptor(env.window.HTMLInputElement.prototype,'value').set;setter.call(field,value);field.dispatchEvent(new env.window.Event('input',{bubbles:true}));await new Promise(resolve=>setTimeout(resolve,400));});
 const shown=()=>[...env.document.querySelectorAll('.profile-dial-item')].filter(item=>!item.hidden).map(item=>item.dataset.character);
 await type('prismriver');
 assert.deepEqual(shown().sort(),api.searchAvatarCharacters('prismriver').sort(),'only matches stay on the dial');
 assert.equal(node('.profile-dial-item[data-focused=true]').dataset.character,'lunasa','the best match is on top');
 assert.equal(node('.profile-dial-caption').textContent,nameOf('lunasa'));assert.equal(node('.profile-search-results'),null,'no separate result list');
 await React.act(async()=>{node('.profile-search input').dispatchEvent(new env.window.KeyboardEvent('keydown',{key:'ArrowDown',bubbles:true}));await new Promise(resolve=>setTimeout(resolve,400));});
 assert.equal(node('.profile-dial-item[data-focused=true]').dataset.character,'merlin','arrow keys turn through the matches');
 assert.deepEqual(calls.avatars,[]);
 await React.act(async()=>{node('.profile-search input').dispatchEvent(new env.window.KeyboardEvent('keydown',{key:'Enter',bubbles:true}));await new Promise(resolve=>setTimeout(resolve,400));});
 assert.equal(node('.profile-editor').dataset.dialMode,'expressions','Enter opens the top match\'s expressions');assert.deepEqual(calls.avatars,[]);
 await React.act(async()=>{node('#profileDialBack').click();await new Promise(resolve=>setTimeout(resolve,400));});
 assert.equal(node('.profile-search input').value,'prismriver','the search is still there on the way back');
 assert.equal(node('.profile-dial-item[data-focused=true]').dataset.character,'merlin');
 await type('zzzz');
 assert.equal(shown().length,0);assert.equal(node('.profile-dial-empty').textContent,'没有匹配的角色');
 assert.equal(node('.profile-dial-caption').textContent,'','no match leaves the caption empty');
 await React.act(async()=>node('.profile-search input').dispatchEvent(new env.window.KeyboardEvent('keydown',{key:'Escape',bubbles:true,cancelable:true})));
 assert.ok(node('.profile-search-open'),'Escape closes only the search');assert.equal(shown().length,11,'the full dial returns');
 assert.equal(node('.profile-dial-item[data-focused=true]').dataset.character,'merlin','closing keeps the focused character on top');
});
test('the header avatar prefers the preset, then the nickname initial',async()=>{
 const container=env.document.createElement('div');env.document.body.append(container);root=createRoot(container);
 await React.act(async()=>root.render(React.createElement(api.ProfileAvatar,{name:'琪露诺',src:'assets/dairi/avatars/cirno/confident.webp',assetUrl:path=>'/'+path})));
 assert.equal(container.querySelector('img').getAttribute('src'),'/assets/dairi/avatars/cirno/confident.webp');
 await React.act(async()=>root.render(React.createElement(api.ProfileAvatar,{name:'琪露诺'})));
 assert.equal(container.textContent,'琪');
});
