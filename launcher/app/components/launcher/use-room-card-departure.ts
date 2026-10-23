import {useCallback, useEffect, useRef, useSyncExternalStore} from 'react';
import type {MultiplayerRoomService} from '../../services/multiplayer-room';
import {animateWorkspaceCard, workspaceCardSelector, workspaceMotionReduced} from './workspace-motion';

/** The docked room card leaves through the right edge before the room closes. */
function slideDockedRoomOut(player: HTMLElement, lessMotion: boolean) {
  let resolve: (completed: boolean) => void = () => {};
  const finished = new Promise<boolean>(done => {resolve = done;});
  if (workspaceMotionReduced(lessMotion) || typeof player.animate !== 'function') {resolve(true); return {finished, cancel() {}};}
  const left = player.getBoundingClientRect().left;
  const animation = player.animate([{translate: '0 0'}, {translate: `${window.innerWidth - left + 24}px 0`}],
    {duration: 420, easing: 'cubic-bezier(.55,0,.75,.2)', fill: 'forwards'});
  animation.finished.then(() => resolve(true), () => resolve(false));
  return {finished, cancel() {resolve(false); animation.cancel();}};
}

/** Hold only the live room's presentation until its exit ends. Cleanup and
 * membership remain at the existing service, including launch/Runtime guards. */
export function useRoomCardDeparture(service: MultiplayerRoomService, lessMotion: boolean) {
  const state = useSyncExternalStore(service.subscribe,service.getSnapshot,service.getSnapshot);
  const active = useRef<{cancel():void;task:Promise<void>;committing:boolean} | null>(null);
  useEffect(() => () => {active.current?.cancel();active.current=null;}, []);
  useEffect(() => {if(active.current && !active.current.committing) {active.current.cancel();active.current=null;}}, [state.epoch]);
  return useCallback((action:() => void | Promise<void>): Promise<void> => {
    if(active.current) return active.current.task;
    const before = service.getSnapshot();
    const player = document.getElementById('player');
    const docked = !!player && document.body.classList.contains('redesign-room-docked') && player.classList.contains('room-workspace');
    const card = docked ? player : document.querySelector<HTMLElement>(workspaceCardSelector);
    if(!before.room || !card || !docked && !card.classList.contains('room-workspace')) return Promise.resolve(action());
    const motion = docked ? slideDockedRoomOut(card,lessMotion) : animateWorkspaceCard(card,'exit',true,lessMotion);
    // The permanent Player is never removed; its room presentation ends instead.
    const replaced = () => docked ? !card.classList.contains('room-workspace') : !card.isConnected;
    let observer: MutationObserver | null=null, timer: ReturnType<typeof setTimeout> | null=null;
    const cancel = () => {observer?.disconnect();if(timer!==null)clearTimeout(timer);motion.cancel();if(active.current===entry)active.current=null;};
    const entry = {cancel,task:Promise.resolve(),committing:false}; active.current=entry;
    entry.task = motion.finished.then(async completed => {
      if(completed && service.getSnapshot().epoch===before.epoch && service.getSnapshot().room?.code===before.room?.code) {
        entry.committing=true;
        // Service retirement may precede the Router commit. Keep its old node
        // offscreen until it is actually replaced, matching the prototype ACK.
        observer=new MutationObserver(() => {if(replaced())cancel();});
        observer.observe(document.body,{childList:true,subtree:true,attributes:docked,attributeFilter:docked ? ['class'] : undefined});
        timer=setTimeout(cancel,1200);
        await action();
      }
    }).finally(() => {if(!entry.committing || replaced())cancel();});
    return entry.task;
  },[service,lessMotion]);
}
