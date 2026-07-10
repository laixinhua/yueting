import { useCallback, useEffect, useState } from 'react'
import type { Playlist, Song } from '../types'
import { loadJSON, saveJSON } from '../utils/storage'

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
  /** 仅用于去重/兼容，真正渲染与播放以 songs 为准 */
  songIds: string[]
  /** 自包含的歌曲实体，避免依赖外部歌曲 store 丢失导致歌单变空 */
  songs: Song[]
}

function normalizeStored(p: Partial<StoredUserPlaylist>): StoredUserPlaylist {
  const songs = Array.isArray(p.songs) ? p.songs : []
  const songIds = Array.isArray(p.songIds) ? p.songIds : songs.map((s) => s.id)
  return {
    id: p.id ?? `user-${crypto.randomUUID()}`,
    title: p.title?.trim() || '新建歌单',
    description: p.description,
    gradient: p.gradient ?? PRESET_GRADIENTS[0]!.gradient,
    playAccent: p.playAccent ?? PRESET_GRADIENTS[0]!.playAccent,
    songIds,
    songs,
  }
}

function pickTheme(index: number) {
  return PRESET_GRADIENTS[index % PRESET_GRADIENTS.length]!
}

export function useUserPlaylists() {
  const [stored, setStored] = useState<StoredUserPlaylist[]>([])

  useEffect(() => {
    let cancelled = false
    void loadJSON<StoredUserPlaylist[]>(KEY, []).then((data) => {
      if (!cancelled) setStored(Array.isArray(data) ? data.map(normalizeStored) : [])
    })
    return () => { cancelled = true }
  }, [])

  useEffect(() => {
    void saveJSON(KEY, stored)
  }, [stored])

  const createPlaylist = useCallback((title: string, songs: Song[] = []) => {
    const theme = pickTheme(stored.length)
    const playlist: StoredUserPlaylist = {
      id: `user-${crypto.randomUUID()}`,
      title: title.trim() || '新建歌单',
      description: '我的歌单',
      ...theme,
      songIds: songs.map((s) => s.id),
      songs,
    }
    setStored((prev) => [playlist, ...prev])
    return playlist
  }, [stored.length])

  const addSongToStored = useCallback((playlistId: string, song: Song) => {
    setStored((prev) =>
      prev.map((p) => {
        if (p.id !== playlistId || p.songIds.includes(song.id)) return p
        return {
          ...p,
          songIds: [...p.songIds, song.id],
          songs: [...p.songs, song],
        }
      }),
    )
  }, [])

  const updatePlaylist = useCallback(
    (
      id: string,
      patch: Partial<Pick<StoredUserPlaylist, 'title' | 'description' | 'songIds' | 'songs'>>,
    ) => {
      setStored((prev) =>
        prev.map((p) => {
          if (p.id !== id) return p
          const title = patch.title?.trim() || p.title
          const description = patch.description ?? p.description
          if (patch.songIds) {
            const songMap = new Map(p.songs.map((s) => [s.id, s]))
            const songs = patch.songIds
              .map((sid) => songMap.get(sid))
              .filter((s): s is Song => Boolean(s))
            return { ...p, title, description, songIds: patch.songIds, songs }
          }
          if (patch.songs) {
            return {
              ...p,
              title,
              description,
              songIds: patch.songs.map((s) => s.id),
              songs: patch.songs,
            }
          }
          return { ...p, title, description }
        }),
      )
    },
    [],
  )

  const deletePlaylist = useCallback((id: string) => {
    setStored((prev) => prev.filter((p) => p.id !== id))
  }, [])

  return { stored, createPlaylist, addSongToStored, updatePlaylist, deletePlaylist }
}
