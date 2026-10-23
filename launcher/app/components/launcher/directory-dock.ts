import {useSyncExternalStore} from 'react';

/** Whether the game catalogue is shown beside a docked room. Rooms open with
 * it collapsed; the room card's toggle expands it on request. */
let expanded = false;
const listeners = new Set<() => void>();
const publish = (value: boolean) => {
  if (expanded === value) return;
  expanded = value;
  for (const listener of listeners) listener();
};
export const directoryDock = Object.freeze({
  subscribe(listener: () => void) {listeners.add(listener); return () => {listeners.delete(listener);};},
  getSnapshot: () => expanded,
  collapse: () => publish(false),
  toggle: () => publish(!expanded),
});
export function useDirectoryDockExpanded() {
  return useSyncExternalStore(directoryDock.subscribe, directoryDock.getSnapshot, directoryDock.getSnapshot);
}
