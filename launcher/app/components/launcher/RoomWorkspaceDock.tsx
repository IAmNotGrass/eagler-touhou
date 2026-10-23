import {useLayoutEffect, useRef, useSyncExternalStore} from 'react';
import './room-dock.css';

/** Wide landscape screens dock the shared room Player into the redesign card. */
export const ROOM_DOCK_QUERY = '(min-width: 1100px) and (orientation: landscape)';
const DOCKED_CLASS = 'redesign-room-docked';
/** Whether rooms dock beside the catalogue at the current viewport. */
export function useRoomDockMedia() {
  return useSyncExternalStore(listener => {
    const media = window.matchMedia(ROOM_DOCK_QUERY); media.addEventListener('change', listener);
    return () => media.removeEventListener('change', listener);
  }, () => window.matchMedia(ROOM_DOCK_QUERY).matches, () => false);
}
const DOCK_PROPERTIES = ['--room-dock-top', '--room-dock-left', '--room-dock-width', '--room-dock-height', '--room-dock-roster'] as const;
/** Must match the docked stage/column gap in room-dock.css. */
const ROOM_DOCK_GAP = 12;

/** Reserves the workspace card and pins the fixed #player.room-workspace over
 * it. The Player and iframe are never reparented; only their frame follows. */
export function RoomWorkspaceDock() {
  const slot = useRef<HTMLElement>(null);
  useLayoutEffect(() => {
    const node = slot.current;
    if (!node || typeof ResizeObserver === 'undefined') return;
    const root = document.documentElement, media = window.matchMedia(ROOM_DOCK_QUERY);
    let frame = 0;
    const fit = () => {
      frame = 0;
      const docked = media.matches;
      document.body.classList.toggle(DOCKED_CLASS, docked);
      if (!docked) return;
      const box = node.getBoundingClientRect();
      // Another workspace (e.g. settings) hides the card: hide the Player too.
      document.body.classList.toggle('room-dock-suspended', box.width === 0);
      root.style.setProperty('--room-dock-top', `${box.top}px`);
      root.style.setProperty('--room-dock-left', `${box.left}px`);
      root.style.setProperty('--room-dock-width', `${box.width}px`);
      root.style.setProperty('--room-dock-height', `${box.height}px`);
      // Seats span the same rows as spectators + Ready, so both columns share edges.
      const sidebar = document.querySelector('#player .room-workspace-sidebar'), actions = document.querySelector('#player .room-workspace-actions:not([hidden])');
      if (sidebar && actions) {
        const roster = `${Math.max(112, Math.round(actions.getBoundingClientRect().bottom - sidebar.getBoundingClientRect().bottom - ROOM_DOCK_GAP))}px`;
        if (root.style.getPropertyValue('--room-dock-roster') !== roster) root.style.setProperty('--room-dock-roster', roster);
      }
      // While spectating the Ready row is hidden but keeps its height; the last measured span still holds.
    };
    const schedule = () => {if (!frame) frame = requestAnimationFrame(fit);};
    const resize = new ResizeObserver(schedule);
    resize.observe(node);
    const player = document.getElementById('player');
    if (player) resize.observe(player);
    // The catalogue collapse animates the grid column, so follow every frame.
    const layout = node.closest('.directory-layout');
    layout?.addEventListener('transitionrun', follow);
    layout?.addEventListener('transitionend', schedule);
    let following = 0;
    function follow() {
      cancelAnimationFrame(following);
      const until = performance.now() + 1200;
      const step = () => {fit(); if (performance.now() < until) following = requestAnimationFrame(step);};
      following = requestAnimationFrame(step);
    }
    // Workspace motion moves the card with transforms (no resize): track it from
    // the frame it starts, so the Player never shows at the card's final spot.
    const motion = new MutationObserver(() => {fit(); follow();});
    motion.observe(node, {attributes: true, attributeFilter: ['data-workspace-motion']});
    window.addEventListener('resize', schedule);
    window.addEventListener('scroll', schedule, {passive: true});
    media.addEventListener('change', schedule);
    fit();
    return () => {
      cancelAnimationFrame(frame); cancelAnimationFrame(following); resize.disconnect(); motion.disconnect();
      layout?.removeEventListener('transitionrun', follow);
      layout?.removeEventListener('transitionend', schedule);
      window.removeEventListener('resize', schedule);
      window.removeEventListener('scroll', schedule);
      media.removeEventListener('change', schedule);
      document.body.classList.remove(DOCKED_CLASS, 'room-dock-suspended');
      for (const property of DOCK_PROPERTIES) root.style.removeProperty(property);
    };
  }, []);
  return <section ref={slot} className="workspace-panel room-workspace-slot" aria-hidden="true"/>;
}
