import { registerPlugin, type PluginListenerHandle } from '@capacitor/core'

export interface PlaybackPlugin {
  setKeepAlive(options: { active: boolean }): Promise<void>
  scheduleTrackEnd(options: { delayMs: number }): Promise<void>
  cancelTrackEnd(): Promise<void>
  addListener(
    eventName: 'trackEndDue',
    listenerFunc: () => void,
  ): Promise<PluginListenerHandle>
}

export const Playback = registerPlugin<PlaybackPlugin>('Playback')

declare global {
  interface Window {
    __yuetingAdvanceTrack?: () => void
  }
}
