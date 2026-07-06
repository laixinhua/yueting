import { useCallback, useEffect, useMemo, useState } from 'react'
import type { Song } from '../types'
import { isNeteaseSong } from '../utils/neteaseSong'

const KEY = 'yueting-netease-songs'

function loadMap(): Record<string, Song> {
  try {
    const raw = localStorage.getItem(KEY)
    if (!raw) return {}
    const parsed = JSON.parse(raw) as Record<string, Song>
    return parsed && typeof parsed === 'object' ? parsed : {}
  } catch {
    return {}
  }
}

export function useNeteaseSongStore() {
  const [map, setMap] = useState<Record<string, Song>>(loadMap)

  useEffect(() => {
    localStorage.setItem(KEY, JSON.stringify(map))
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
