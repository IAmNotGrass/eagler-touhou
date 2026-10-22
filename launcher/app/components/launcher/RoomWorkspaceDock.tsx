import {useLayoutEffect, useRef} from 'react';
import './room-dock.css';

/** Wide landscape screens dock the shared room Player into the redesign card. */
export const ROOM_DOCK_QUERY = '(min-width: 1100px) and (orientation: landscape)';
const DOCKED_CLASS = 'redesign-room-docked';
const DOCK_PROPERTIES = ['--room-dock-top', '--room-dock-left', '--room-dock-width', '--room-dock-height'] as const;

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
      root.style.setProperty('--room-dock-top', `${box.top}px`);
      root.style.setProperty('--room-dock-left', `${box.left}px`);
      root.style.setProperty('--room-dock-width', `${box.width}px`);
      root.style.setProperty('--room-dock-height', `${box.height}px`);
    };
    const schedule = () => {if (!frame) frame = requestAnimationFrame(fit);};
    const resize = new ResizeObserver(schedule);
    resize.observe(node);
    // The catalogue collapse animates the grid column, so follow every frame.
    const layout = node.closest('.directory-layout');
    layout?.addEventListener('transitionrun', follow);
    layout?.addEventListener('transitionend', schedule);
    let following = 0;
    function follow() {
      cancelAnimationFrame(following);
      const until = performance.now() + 700;
      const step = () => {fit(); if (performance.now() < until) following = requestAnimationFrame(step);};
      following = requestAnimationFrame(step);
    }
    window.addEventListener('resize', schedule);
    window.addEventListener('scroll', schedule, {passive: true});
    media.addEventListener('change', schedule);
    fit();
    return () => {
      cancelAnimationFrame(frame); cancelAnimationFrame(following); resize.disconnect();
      layout?.removeEventListener('transitionrun', follow);
      layout?.removeEventListener('transitionend', schedule);
      window.removeEventListener('resize', schedule);
      window.removeEventListener('scroll', schedule);
      media.removeEventListener('change', schedule);
      document.body.classList.remove(DOCKED_CLASS);
      for (const property of DOCK_PROPERTIES) root.style.removeProperty(property);
    };
  }, []);
  return <section ref={slot} className="workspace-panel room-workspace-slot" aria-hidden="true"/>;
}
