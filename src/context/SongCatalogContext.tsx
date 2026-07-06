import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react'
import { Capacitor } from '@capacitor/core'
import { songs as mockSongs } from '../data/mockData'
import { useDownloadQueue } from '../hooks/useDownloadQueue'
import { useLocalMusic } from '../hooks/useLocalMusic'
import { useNeteaseSongStore } from '../hooks/useNeteaseSongStore'
import type { Song } from '../types'
import type { DownloadTask } from '../types/downloadTask'
import { AppToast } from '../components/AppToast'

import type { ImportAudioResult } from '../utils/localMusicStore'
import type { LocalImportProgress } from '../hooks/useLocalMusic'

interface SongCatalogContextValue {
  allSongs: Song[]
  mockSongs: Song[]
  localSongs: Song[]
  localLoading: boolean
  importProgress: LocalImportProgress | null
  importFiles: (files: FileList | File[]) => Promise<ImportAudioResult>
  importScanned: (tracks: import('../plugins/musicScanner').ScannedTrack[]) => Promise<ImportAudioResult>
  removeLocalSong: (id: string) => Promise<void>
  clearAllLocalSongs: () => Promise<void>
  enqueueDownload: (song: Song) => 'added' | 'downloaded' | 'duplicate'
  downloadTasks: DownloadTask[]
  activeDownloadCount: number
  clearFinishedDownloads: () => void
  removeDownloadTask: (taskId: string) => void
  isSongDownloaded: (song: Song) => boolean
  getSongById: (id: string) => Song | undefined
  upsertNeteaseSong: (song: Song) => void
  upsertNeteaseSongs: (songs: Song[]) => void
}

const SongCatalogContext = createContext<SongCatalogContextValue | null>(null)

export function SongCatalogProvider({ children }: { children: ReactNode }) {
  const {
    localSongs,
    loading,
    importFiles,
    importScanned,
    importProgress,
    removeSong,
    clearAllSongs,
    downloadSong: downloadSongInner,
    isSongDownloaded,
  } = useLocalMusic()
  const { upsertNeteaseSong, upsertNeteaseSongs, getNeteaseSong } = useNeteaseSongStore()
  const [toast, setToast] = useState<string | null>(null)

  const downloadWithProgress = useCallback(
    async (song: Song, onProgress: (percent: number) => void) => {
      return downloadSongInner(song, onProgress)
    },
    [downloadSongInner],
  )

  const onTaskSettled = useCallback((task: DownloadTask, result: ImportAudioResult | null) => {
    if (result?.imported.length) {
      setToast(
        Capacitor.isNativePlatform() && Capacitor.getPlatform() === 'android'
          ? `「${task.song.title}」已下载到 Music/悦听`
          : `「${task.song.title}」已保存到本地音乐`,
      )
      return
    }
    if (result?.skipped) {
      return
    }
    if (!result) {
      const msg = task.error ?? '下载失败，请检查网络'
      setToast(`「${task.song.title}」${msg}`)
    }
  }, [])

  const {
    downloadTasks,
    enqueueDownload: enqueueDownloadInner,
    clearFinishedDownloads,
    removeDownloadTask,
    activeDownloadCount,
  } = useDownloadQueue({
    download: downloadWithProgress,
    onTaskSettled,
  })

  const enqueueDownload = useCallback(
    (song: Song) => {
      const result = enqueueDownloadInner(song)
      if (result === 'added') setToast('已加入下载列表')
      else if (result === 'duplicate') setToast('该歌曲正在下载中')
      return result
    },
    [enqueueDownloadInner],
  )

  const catalogSongs = useMemo(() => [...mockSongs, ...localSongs], [localSongs])

  const getSongById = useCallback(
    (id: string) => catalogSongs.find((s) => s.id === id) ?? getNeteaseSong(id),
    [catalogSongs, getNeteaseSong],
  )

  const value = useMemo(
    () => ({
      allSongs: catalogSongs,
      mockSongs,
      localSongs,
      localLoading: loading,
      importProgress,
      importFiles,
      importScanned,
      removeLocalSong: removeSong,
      clearAllLocalSongs: clearAllSongs,
      enqueueDownload,
      downloadTasks,
      activeDownloadCount,
      clearFinishedDownloads,
      removeDownloadTask,
      isSongDownloaded,
      getSongById,
      upsertNeteaseSong,
      upsertNeteaseSongs,
    }),
    [
      catalogSongs,
      localSongs,
      loading,
      importProgress,
      importFiles,
      importScanned,
      removeSong,
      clearAllSongs,
      enqueueDownload,
      downloadTasks,
      activeDownloadCount,
      clearFinishedDownloads,
      removeDownloadTask,
      isSongDownloaded,
      getSongById,
      upsertNeteaseSong,
      upsertNeteaseSongs,
    ],
  )

  return (
    <SongCatalogContext.Provider value={value}>
      {children}
      <AppToast message={toast} onDismiss={() => setToast(null)} />
    </SongCatalogContext.Provider>
  )
}

export function useSongCatalog() {
  const ctx = useContext(SongCatalogContext)
  if (!ctx) throw new Error('useSongCatalog must be used within SongCatalogProvider')
  return ctx
}
