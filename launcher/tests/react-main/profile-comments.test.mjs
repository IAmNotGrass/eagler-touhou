/** The profile's comment board and the comments kept for it. */
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
 await mkdir(resolve(project,'.cache'),{recursive:true});work=await mkdtemp(resolve(project,'.cache/profile-comments-'));const output=resolve(work,'actual.mjs');
 await build({absWorkingDir:project,stdin:{resolveDir:project,loader:'tsx',contents:`
  export * from './app/components/launcher/ProfileComments.tsx';
  export * from './app/models/profile-comments.ts';
  export * from './app/i18n.tsx';
 `},outfile:output,bundle:true,platform:'node',format:'esm',jsx:'automatic',packages:'external',logLevel:'silent',plugins:[authoredSourcesPlugin(project)]});
 api=await import(pathToFileURL(output).href);
});
afterEach(async()=>{if(root)await React.act(()=>root.unmount());root=null;env.document.body.replaceChildren();assert.deepEqual(env.errors.splice(0),[]);});
after(async()=>{env.close();await rm(work,{recursive:true,force:true});});
const node=selector=>env.document.querySelector(selector);
const NOW=Date.parse('2026-10-29T12:00:00Z');

/** Renders the board over a list the callbacks change, as the profile store does. */
async function board(initial,{handle='grass',add=true,signedIn=true,owner=true}={}){
 let comments=initial;const added=[];let signIns=0;
 const container=env.document.createElement('main');env.document.body.append(container);root=createRoot(container);
 // The callbacks run inside the click's act, so they render without another.
 const element=()=>React.createElement(api.LocaleProvider,{locale:'zh-CN'},React.createElement(api.ProfileComments,{
  comments,name:'草',handle,signedIn,owner,now:NOW,assetUrl:path=>path,onSignIn:()=>{signIns++;},
  onAdd:body=>{added.push(body);if(!add)return false;comments=[api.newComment(body,handle,new Date(NOW),`c${added.length}`),...comments];root.render(element());return true;},
  onRemove:id=>{comments=comments.filter(comment=>comment.id!==id);root.render(element());},
 }));
 const render=()=>React.act(async()=>root.render(element()));
 await render();
 return {added,get comments(){return comments;},get signIns(){return signIns;}};
}
const type=async value=>{
 const input=node('#profileCommentInput');
 const setter=Object.getOwnPropertyDescriptor(env.window.HTMLTextAreaElement.prototype,'value').set;
 await React.act(async()=>{setter.call(input,value);input.dispatchEvent(new env.window.Event('input',{bubbles:true}));});
};
const click=selector=>React.act(async()=>node(selector).click());

test('stored comments are kept only when whole, and a new one is trimmed',()=>{
 assert.deepEqual(api.parseComments('nope'),[]);
 assert.deepEqual(api.parseComments([{id:'a',body:'hi',at:'2026-10-29T10:00:00Z'},{id:'b',body:'  ',at:'2026-10-29T10:00:00Z'},{id:'c',body:'x',at:'later'},null]),
  [{id:'a',body:'hi',at:'2026-10-29T10:00:00Z',author:null}]);
 assert.equal(api.parseComments(Array.from({length:250},(_,i)=>({id:`${i}`,body:'x',at:'2026-10-29T10:00:00Z'}))).length,api.COMMENT_LIMITS.count);
 assert.equal(api.newComment('   '),null);
 assert.deepEqual(api.newComment('  你好  ','grass',new Date(NOW),'id'),{id:'id',body:'你好',at:'2026-10-29T12:00:00.000Z',author:'grass'});
});

test('an empty board says so, and posting puts the comment on top with its author and time',async()=>{
 const state=await board([{id:'old',body:'第一条',at:'2026-10-29T09:00:00Z',author:null}]);
 assert.equal(node('#profileCommentsTitle').textContent,'留言');
 assert.equal(node('.profile-comments-count').textContent,'1');
 assert.equal(node('#profileCommentPost').disabled,true,'nothing to post yet');
 await type('  第二条  ');
 await click('#profileCommentPost');
 assert.deepEqual(state.added,['  第二条  ']);
 assert.equal(node('#profileCommentInput').value,'','the box empties once posted');
 const items=[...env.document.querySelectorAll('.profile-comment')];
 assert.deepEqual(items.map(item=>item.querySelector('.profile-comment-body').textContent),['第二条','第一条']);
 assert.equal(items[0].querySelector('.profile-comment-meta b').textContent,'草');
 assert.equal(items[0].querySelector('.profile-comment-handle').textContent,'@grass');
 assert.equal(items[0].querySelector('time').textContent,'刚刚');
 assert.equal(items[1].querySelector('time').textContent,'3小时前');
 await React.act(async()=>items[1].querySelector('.profile-comment-remove').click());
 assert.equal(env.document.querySelectorAll('.profile-comment').length,1);
});

test('the box and the post button share one row, and signed out the button leads to sign-in',async()=>{
 await board([]);
 assert.ok(node('.profile-comment-compose-row > #profileCommentInput + #profileCommentPost'));
 assert.equal(node('#profileCommentInput').rows,1,'the box is one line tall');
 assert.equal(node('#profileCommentPost').textContent,'发表留言');
 assert.doesNotMatch(node('.profile-comment-compose').textContent,/Ctrl/);
 await React.act(()=>root.unmount());root=null;env.document.body.replaceChildren();
 const state=await board([],{signedIn:false,handle:null});
 assert.equal(node('#profileCommentInput').disabled,true);
 assert.equal(node('#profileCommentPost').textContent,'登录后留言');
 assert.equal(node('#profileCommentPost').disabled,false);
 await click('#profileCommentPost');
 assert.equal(state.signIns,1);
 assert.deepEqual(state.added,[]);
});

test('only the profile owner and a comment\'s author see its delete button',async()=>{
 const list=[{id:'mine',body:'我的',at:'2026-10-29T09:00:00Z',author:'Grass'},{id:'theirs',body:'别人的',at:'2026-10-29T08:00:00Z',author:'other'}];
 const removable=()=>[...env.document.querySelectorAll('.profile-comment')].map(item=>Boolean(item.querySelector('.profile-comment-remove svg')));
 await board(list,{owner:true});
 assert.deepEqual(removable(),[true,true]);
 assert.equal(node('.profile-comment-handle').textContent,'@Grass','each comment names the username it was posted under');
 await React.act(()=>root.unmount());root=null;env.document.body.replaceChildren();
 await board(list,{owner:false,handle:'grass'});
 assert.deepEqual(removable(),[true,false]);
 await React.act(()=>root.unmount());root=null;env.document.body.replaceChildren();
 await board(list,{owner:false,signedIn:false,handle:null});
 assert.deepEqual(removable(),[false,false]);
});

test('a comment the browser cannot keep stays in the box with a note',async()=>{
 await board([],{add:false,handle:null});
 assert.equal(node('.profile-comments-empty').textContent,'还没有留言。');
 await type('留不下');
 await click('#profileCommentPost');
 assert.equal(node('#profileCommentInput').value,'留不下');
 assert.equal(node('.profile-comment-error').textContent,'浏览器空间不足，留言没有保存。');
});

test('long boards show ten comments at a time',async()=>{
 await board(Array.from({length:23},(_,i)=>({id:`${i}`,body:`第${i}条`,at:'2026-10-01T09:00:00Z',author:null})));
 assert.equal(env.document.querySelectorAll('.profile-comment').length,10);
 assert.equal(node('.profile-comments-more').textContent,'显示更多留言（还有 13 条）');
 await click('.profile-comments-more');await click('.profile-comments-more');
 assert.equal(env.document.querySelectorAll('.profile-comment').length,23);
 assert.equal(node('.profile-comments-more'),null);
});
