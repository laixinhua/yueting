import { useCallback, useEffect, useMemo, useState } from 'react'
import type { Song } from '../types'
import { LIST_DISPLAY_LIMIT } from '../utils/listLimit'

const KEY = 'yueting-recent-plays'
const STORE_MAX = 100

interface RecentEntry {
  songId: string
  playedAt: number
}

function loadEntries(): RecentEntry[] {
  try {
    const raw = localStorage.getItem(KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw) as RecentEntry[]
    if (!Array.isArray(parsed)) return []
    return parsed.filter((e) => e && typeof e.songId === 'string')
  } catch {
    return []
  }
}

export function useRecentPlays(getSongById: (id: string) => Song | undefined) {
  const [entries, setEntries] = useState<RecentEntry[]>(loadEntries)

  useEffect(() => {
    localStorage.setItem(KEY, JSON.stringify(entries))
  }, [entries])

  const recordPlay = useCallback((songId: string) => {
    setEntries((prev) => {
      const next: RecentEntry[] = [
        { songId, playedAt: Date.now() },
        ...prev.filter((e) => e.songId !== songId),
      ]
      return next.slice(0, STORE_MAX)
    })
  }, [])

  const recentSongs = useMemo(() => {
    const list: Song[] = []
    for (const entry of entries) {
      if (list.length >= LIST_DISPLAY_LIMIT) break
      const song = getSongById(entry.songId)
      if (song) list.push(song)
    }
    return list
  }, [entries, getSongById])

  return { recentSongs, recordPlay }
}
