import { useCallback, useEffect, useState } from 'react'
import type { Song } from '../types'
import {
  clearAllLocalTracks,
  deleteLocalTrack,
  downloadSongToLocal,
  importAudioFiles,
  importNativeScannedTracks,
  loadLocalTracks,
  songDownloadKey,
  storedToSong,
  type ImportAudioResult,
} from '../utils/localMusicStore'
import { warmCovers } from '../utils/coverImageCache'
import type { ScannedTrack } from '../plugins/musicScanner'

export interface LocalImportProgress {
  done: number
  total: number
}

export function useLocalMusic() {
  const [localSongs, setLocalSongs] = useState<Song[]>([])
  const [loading, setLoading] = useState(true)
  const [importProgress, setImportProgress] = useState<LocalImportProgress | null>(null)
  const [downloadKeys, setDownloadKeys] = useState<Set<string>>(new Set())

  useEffect(() => {
    let cancelled = false
    void (async () => {
      try {
        const tracks = await loadLocalTracks()
        if (!cancelled) {
          const sorted = [...tracks].sort((a, b) => (b.importedAt ?? 0) - (a.importedAt ?? 0))
          const songs = sorted.map(storedToSong)
          setLocalSongs(songs)
          void warmCovers(songs.map((s) => s.coverUrl))
          setDownloadKeys(
            new Set(
              tracks
                .map((t) => t.fileKey)
                .filter((k): k is string => k != null && k.startsWith('download:')),
            ),
          )
        }
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()
    return () => {
      cancelled = true
      localSongs.forEach((s) => {
        if (s.local && s.url.startsWith('blob:')) URL.revokeObjectURL(s.url)
      })
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- revoke only on unmount
  }, [])

  const importFiles = useCallback(async (files: FileList | File[]): Promise<ImportAudioResult> => {
    setImportProgress({ done: 0, total: filterCount(files) })
    try {
      const result = await importAudioFiles(files, {
        skipDuplicates: true,
        onProgress: (done, total) => setImportProgress({ done, total }),
      })
      if (result.imported.length > 0) {
        setLocalSongs((prev) => [...result.imported, ...prev])
      }
      return result
    } finally {
      setImportProgress(null)
    }
  }, [])

  const importScanned = useCallback(async (tracks: ScannedTrack[]): Promise<ImportAudioResult> => {
    setImportProgress({ done: 0, total: tracks.length })
    try {
      const result = await importNativeScannedTracks(tracks, {
        skipDuplicates: true,
        onProgress: (done, total) => setImportProgress({ done, total }),
      })
      if (result.imported.length > 0) {
        setLocalSongs((prev) => [...result.imported, ...prev])
      }
      return result
    } finally {
      setImportProgress(null)
    }
  }, [])

  const removeSong = useCallback(async (id: string) => {
    await deleteLocalTrack(id)
    setLocalSongs((prev) => {
      const song = prev.find((s) => s.id === id)
      if (song?.url.startsWith('blob:')) URL.revokeObjectURL(song.url)
      if (song?.fileKey?.startsWith('download:')) {
        setDownloadKeys((keys) => {
          const next = new Set(keys)
          next.delete(song.fileKey!)
          return next
        })
      }
      return prev.filter((s) => s.id !== id)
    })
  }, [])

  const clearAllSongs = useCallback(async () => {
    await clearAllLocalTracks()
    setLocalSongs((prev) => {
      prev.forEach((s) => {
        if (s.url.startsWith('blob:')) URL.revokeObjectURL(s.url)
      })
      return []
    })
    setDownloadKeys(new Set())
  }, [])

  const isSongDownloaded = useCallback(
    (song: Song) => {
      if (song.local) return true
      const key = songDownloadKey(song)
      return key != null && downloadKeys.has(key)
    },
    [downloadKeys],
  )

  const downloadSong = useCallback(
    async (song: Song, onProgress?: (percent: number) => void) => {
      const key = songDownloadKey(song)
      const result = await downloadSongToLocal(song, { onProgress })
      if (result.imported.length > 0) {
        const imported = result.imported[0]!
        setLocalSongs((prev) => {
          const filtered =
            key != null ? prev.filter((s) => songDownloadKey(s) !== key && s.fileKey !== key) : prev
          filtered.forEach((s) => {
            if (s.url.startsWith('blob:')) URL.revokeObjectURL(s.url)
          })
          return [imported, ...filtered]
        })
        if (key) setDownloadKeys((prev) => new Set(prev).add(key))
      }
      return result
    },
    [],
  )

  return {
    localSongs,
    loading,
    importFiles,
    importScanned,
    importProgress,
    removeSong,
    clearAllSongs,
    downloadSong,
    isSongDownloaded,
  }
}

function filterCount(files: FileList | File[]): number {
  return Array.from(files).filter(
    (f) => f.type.startsWith('audio/') || /\.(mp3|flac|wav|m4a|ogg|aac|ape|wma|opus)$/i.test(f.name),
  ).length
}
