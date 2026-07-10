import { useCallback, useEffect, useMemo, useState } from 'react'
import type { Song } from '../types'
import { isNeteaseSong } from '../utils/neteaseSong'
import { loadJSON, saveJSON } from '../utils/storage'

const KEY = 'yueting-netease-songs'

export function useNeteaseSongStore() {
  const [map, setMap] = useState<Record<string, Song>>({})

  useEffect(() => {
    let cancelled = false
    void loadJSON<Record<string, Song>>(KEY, {}).then((data) => {
      if (!cancelled) setMap(data && typeof data === 'object' ? data : {})
    })
    return () => { cancelled = true }
  }, [])

  useEffect(() => {
    void saveJSON(KEY, map)
  }, [map])

  const upsertNeteaseSong = useCallback((song: Song) => {
    if (!isNeteaseSong(song)) return
    setMap((prev) => {
      const existing = prev[song.id]
      if (!existing) return { ...prev, [song.id]: song }
      return {
        ...prev,
        [song.id]: {
          ...existing,
          ...song,
          coverUrl: song.coverUrl ?? existing.coverUrl,
        },
      }
    })
  }, [])

  const upsertNeteaseSongs = useCallback((songs: Song[]) => {
    setMap((prev) => {
      let next = prev
      for (const song of songs) {
        if (!isNeteaseSong(song)) continue
        const existing = next[song.id]
        if (!existing) {
          next = { ...next, [song.id]: song }
          continue
        }
        next = {
          ...next,
          [song.id]: {
            ...existing,
            ...song,
            coverUrl: song.coverUrl ?? existing.coverUrl,
          },
        }
      }
      return next
    })
  }, [])

  const getNeteaseSong = useCallback((id: string) => map[id], [map])
  const neteaseSongs = useMemo(() => Object.values(map), [map])

  return { neteaseSongs, upsertNeteaseSong, upsertNeteaseSongs, getNeteaseSong }
}
