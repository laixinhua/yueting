import { useCallback, useEffect, useState } from 'react'
import type { Playlist } from '../types'

const KEY = 'yueting-user-playlists'

import { NEUTRAL_PLAY_ACCENT } from '../utils/songTheme'

const PRESET_GRADIENTS: Pick<Playlist, 'gradient' | 'playAccent'>[] = [
  { gradient: 'from-zinc-600 to-zinc-800', playAccent: NEUTRAL_PLAY_ACCENT },
  { gradient: 'from-neutral-600 to-neutral-800', playAccent: NEUTRAL_PLAY_ACCENT },
  { gradient: 'from-stone-600 to-stone-800', playAccent: NEUTRAL_PLAY_ACCENT },
  { gradient: 'from-slate-600 to-slate-800', playAccent: NEUTRAL_PLAY_ACCENT },
]

export interface StoredUserPlaylist {
  id: string
  title: string
  description?: string
  gradient: string
  playAccent: string
  songIds: string[]
}

function loadStored(): StoredUserPlaylist[] {
  try {
    const raw = localStorage.getItem(KEY)
    if (raw) {
      const parsed = JSON.parse(raw) as StoredUserPlaylist[]
      if (Array.isArray(parsed)) return parsed
    }
  } catch {
    /* ignore */
  }
  return []
}

function pickTheme(index: number) {
  return PRESET_GRADIENTS[index % PRESET_GRADIENTS.length]!
}

export function useUserPlaylists() {
  const [stored, setStored] = useState<StoredUserPlaylist[]>(loadStored)

  useEffect(() => {
    localStorage.setItem(KEY, JSON.stringify(stored))
  }, [stored])

  const createPlaylist = useCallback((title: string, songIds: string[] = []) => {
    const theme = pickTheme(stored.length)
    const playlist: StoredUserPlaylist = {
      id: `user-${crypto.randomUUID()}`,
      title: title.trim() || '新建歌单',
      description: '我的歌单',
      ...theme,
      songIds,
    }
    setStored((prev) => [playlist, ...prev])
    return playlist
  }, [stored.length])

  const updatePlaylist = useCallback((id: string, patch: Partial<Pick<StoredUserPlaylist, 'title' | 'description' | 'songIds'>>) => {
    setStored((prev) =>
      prev.map((p) => (p.id === id ? { ...p, ...patch, title: patch.title?.trim() || p.title } : p)),
    )
  }, [])

  const deletePlaylist = useCallback((id: string) => {
    setStored((prev) => prev.filter((p) => p.id !== id))
  }, [])

  return { stored, createPlaylist, updatePlaylist, deletePlaylist }
}
