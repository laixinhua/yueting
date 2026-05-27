import { useCallback, useEffect, useState } from 'react'
import type { Song } from '../types'
import { deleteLocalTrack, importAudioFiles, loadLocalTracks, storedToSong } from '../utils/localMusicStore'

export function useLocalMusic() {
  const [localSongs, setLocalSongs] = useState<Song[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    void (async () => {
      try {
        const tracks = await loadLocalTracks()
        if (!cancelled) {
          const sorted = [...tracks].sort((a, b) => (b.importedAt ?? 0) - (a.importedAt ?? 0))
          setLocalSongs(sorted.map(storedToSong))
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

  const importFiles = useCallback(async (files: FileList | File[]) => {
    const added = await importAudioFiles(files)
    setLocalSongs((prev) => [...added, ...prev])
    return added
  }, [])

  const removeSong = useCallback(async (id: string) => {
    await deleteLocalTrack(id)
    setLocalSongs((prev) => {
      const song = prev.find((s) => s.id === id)
      if (song?.url.startsWith('blob:')) URL.revokeObjectURL(song.url)
      return prev.filter((s) => s.id !== id)
    })
  }, [])

  return { localSongs, loading, importFiles, removeSong }
}
