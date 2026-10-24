import { useLayoutEffect, useState, useSyncExternalStore } from 'react';
import { isMultiplayerProductId } from '../../src/contracts/product-catalog.mts';
import {DEFAULT_GAME_OPTIONS} from '../../src/launcher/game-preferences.mts';
import { RoomView } from '../components/room';
import type { BrowserSession } from './browser-session';
import { useSurfaceNavigation } from '../navigation/surface-navigation';
import {SpectatorPlayback} from '../components/player/SpectatorPlayback';
import {SpectatorMatchScore} from '../components/player/SpectatorMatchScore';
import {DirectoryDockToggle} from '../components/launcher/DirectoryDockToggle';
import {useRoomDockMedia} from '../components/launcher/RoomWorkspaceDock';

/** Room chrome and fullscreen share one permanent Player and room owner. */
export function RoomComposition({
  session,
  settingsClosing,
  workspaceVisible: roomWorkspace,
  onLeave = session.leaveRoom,
}: {
  session: BrowserSession;
  settingsClosing: boolean;
  workspaceVisible: boolean;
  onLeave?(): void | Promise<void>;
}) {
  const navigation = useSurfaceNavigation();
  const transfer = useSyncExternalStore(
    session.transfer.subscribe,
    session.transfer.getSnapshot,
    session.transfer.getSnapshot,
  );
  const state = useSyncExternalStore(session.subscribe, session.getSnapshot, session.getSnapshot);
  const room = useSyncExternalStore(
    session.room.service.subscribe,
    session.room.service.getSnapshot,
    session.room.service.getSnapshot,
  );
  const settings = useSyncExternalStore(
    session.settings.subscribe,
    session.settings.getSnapshot,
    session.settings.getSnapshot,
  );
  const [workspace, setWorkspace] = useState<{host:HTMLElement;stage:HTMLElement} | null>(null);
  const workspaceVisible = roomWorkspace && navigation.surface !== 'touch';
  // The redesign opens room settings as the game's settings card (like global
  // settings); either settings surface locks the room and marks the local seat.
  const settingsActive = navigation.roomSettingsOpen || navigation.workspaceSettingsScope !== null;
  // Full-page rooms on narrow screens keep upstream's drawer, which stays above the room.
  const docked = useRoomDockMedia();
  const playback = state.runtime?.launched && state.runtime.spectator
    ? state.runtime.game !== 'th09' ? <SpectatorPlayback session={session}/>
      : room.room?.spectatorTimeline ? <SpectatorMatchScore
        wins={[room.room.seats?.[0]?.stats?.wins ?? 0,room.room.seats?.[1]?.stats?.wins ?? 0]}
        minutes={Math.max(...(room.room.seats ?? []).map(seat=>seat?.stats?.minutes ?? 0),0)}
        names={[room.room.seats?.[0]?.name ?? '',room.room.seats?.[1]?.name ?? '']}/> : null
    : null;
  useLayoutEffect(()=>{
    const host = document.getElementById('player'), stage = host?.querySelector<HTMLElement>('.player-stage');
    if (host && stage) setWorkspace({host,stage});
  }, []);
  return (
    <RoomView
      visible={workspaceVisible && !!navigation.productId && isMultiplayerProductId(navigation.productId)}
      service={session.room.service}
      quickChat={session.room.quickChat}
      network={session.room.network}
      context={{
        transfer,
        launched: state.runtime?.launched === true,
        previewReady: state.runtime?.roomPreview === true,
        th09NetworkOverlayOpen: state.th09NetworkOverlayOpen,
        launchStage: state.roomLaunchStage === 'runtime' ? 'preparing' : state.roomLaunchStage,
        touchEnabled: settings?.options.touchEnabled === true,
        touchMovementMode: settings?.options.touchMovementMode ?? DEFAULT_GAME_OPTIONS.touchMovementMode,
        editingSettings: settingsActive,
      }}
      assetUrl={(path) => new URL(path, session.baseUrl).href}
      headerAccessory={<DirectoryDockToggle/>}
      onLeave={onLeave}
      onCopyRoomCode={session.copyRoomCode}
      onGuide={() => navigation.openInfoDialog('mpGuideDialog')}
      onOpenSettings={docked ? () => navigation.openWorkspaceSettings('game') : navigation.openRoomSettings}
      settingsOpen={settingsActive}
      settingsClosing={settingsClosing}
      workspaceHost={workspace?.host}
      workspaceStage={workspace?.stage}
      playbackControls={playback}
      onFullscreen={()=>{void session.togglePlayerFullscreen();}}
      reloadPending={state.roomReloadPending}
      onReloadResources={session.reloadRoomResources}
      onRestoreSettings={session.restoreRoomSettings}
      panel={
        navigation.roomPanel
          ? { kind: navigation.roomPanel, peerId: navigation.roomNetworkPeer }
          : null
      }
      onOpenPanel={navigation.openRoomPanel}
      onClosePanel={navigation.closeRoomPanel}
    />
  );
}
