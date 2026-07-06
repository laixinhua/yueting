import { Capacitor, registerPlugin } from '@capacitor/core'

export interface ScannedTrack {
  mediaId: string
  uri: string
  title: string
  artist: string
  album: string
  duration: number
  size: number
  fileName: string
  fileKey: string
}

export interface ImportedNativeTrack extends ScannedTrack {
  path: string
}

export interface SavedDownloadTrack {
  mediaId: string
  uri: string
  fileName: string
  fileKey: string
}

interface MusicScannerPlugin {
  scan(): Promise<{ tracks: ScannedTrack[] }>
  importTrack(options: { uri: string }): Promise<ImportedNativeTrack>
  downloadAudio(options: { url: string }): Promise<{ path: string; size: number }>
  saveDownload(options: {
    url: string
    fileName: string
    title?: string
    artist?: string
    album?: string
  }): Promise<SavedDownloadTrack>
}

export const MusicScanner = registerPlugin<MusicScannerPlugin>('MusicScanner')

export function isNativeMusicScannerAvailable(): boolean {
  return Capacitor.isNativePlatform() && Capacitor.getPlatform() === 'android'
}
