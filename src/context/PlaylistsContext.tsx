import { createContext, useCallback, useContext, useMemo, type ReactNode } from 'react'
import { playlists as mockPlaylists } from '../data/mockData'
import { useUserPlaylists } from '../hooks/useUserPlaylists'
import { useSongCatalog } from './SongCatalogContext'
import type { Playlist, Song } from '../types'
import { isNeteaseSong } from '../utils/neteaseSong'

interface PlaylistsContextValue {
  allPlaylists: Playlist[]
  userPlaylists: Playlist[]
  mockPlaylists: Playlist[]
  createPlaylist: (title: string, songs?: Song[]) => Playlist
  updatePlaylist: (id: string, patch: { title?: string; description?: string; songIds?: string[] }) => void
  deletePlaylist: (id: string) => void
  resolvePlaylist: (songIds: string[]) => import('../types').Song[]
  userPlaylistHasSong: (playlistId: string, songId: string) => boolean
  addSongToUserPlaylist: (playlistId: string, song: Song) => boolean
}

const PlaylistsContext = createContext<PlaylistsContextValue | null>(null)

export function PlaylistsProvider({ children }: { children: ReactNode }) {
  const { getSongById, upsertNeteaseSong } = useSongCatalog()
  const {
    stored,
    createPlaylist: createStored,
    addSongToStored,
    updatePlaylist: updateStored,
    deletePlaylist,
  } = useUserPlaylists()

  const resolvePlaylist = useCallback(
    (songIds: string[]) => {
      // 优先用各歌单自带的歌曲实体，缺失再回退到目录（兼容老数据）
      const selfSongs = new Map<string, Song>()
      for (const p of stored) for (const s of p.songs) selfSongs.set(s.id, s)
      return songIds
        .map((id) => selfSongs.get(id) ?? getSongById(id))
        .filter((s): s is Song => Boolean(s))
    },
    [stored, getSongById],
  )

  const userPlaylists = useMemo<Playlist[]>(
    () =>
      stored.map((p) => {
        const ownSongs = p.songs ?? []
        const ownIds = new Set(ownSongs.map((s) => s.id))
        // 兼容只有 songIds、没有自带 songs 的老歌单：回退到目录解析
        const extra = (p.songIds ?? []).filter((id) => !ownIds.has(id))
        const resolvedExtra = extra
          .map((id) => getSongById(id))
          .filter((s): s is Song => Boolean(s))
        return {
          id: p.id,
          title: p.title,
          description: p.description,
          gradient: p.gradient,
          playAccent: p.playAccent,
          songs: [...ownSongs, ...resolvedExtra],
          userCreated: true,
        }
      }),
    [stored, getSongById],
  )

  const allPlaylists = useMemo(() => [...mockPlaylists, ...userPlaylists], [userPlaylists])

  const createPlaylist = useCallback(
    (title: string, songs: Song[] = []) => {
      const stored = createStored(title, songs)
      return {
        id: stored.id,
        title: stored.title,
        description: stored.description,
        gradient: stored.gradient,
        playAccent: stored.playAccent,
        songs: stored.songs,
        userCreated: true,
      }
    },
    [createStored],
  )

  const updatePlaylist = useCallback(
    (id: string, patch: { title?: string; description?: string; songIds?: string[] }) => {
      updateStored(id, patch)
    },
    [updateStored],
  )

  const userPlaylistHasSong = useCallback(
    (playlistId: string, songId: string) =>
      stored.find((p) => p.id === playlistId)?.songIds.includes(songId) ?? false,
    [stored],
  )

  const addSongToUserPlaylist = useCallback(
    (playlistId: string, song: Song) => {
      const playlist = stored.find((p) => p.id === playlistId)
      if (!playlist || playlist.songIds.includes(song.id)) return false
      if (isNeteaseSong(song)) upsertNeteaseSong(song)
      // 把完整歌曲实体写进歌单，使其自包含、不再依赖外部歌曲 store
      addSongToStored(playlistId, song)
      return true
    },
    [stored, addSongToStored, upsertNeteaseSong],
  )

  const value = useMemo(
    () => ({
      allPlaylists,
      userPlaylists,
      mockPlaylists,
      createPlaylist,
      updatePlaylist,
      deletePlaylist,
      resolvePlaylist,
      userPlaylistHasSong,
      addSongToUserPlaylist,
    }),
    [
      allPlaylists,
      userPlaylists,
      createPlaylist,
      updatePlaylist,
      deletePlaylist,
      resolvePlaylist,
      userPlaylistHasSong,
      addSongToUserPlaylist,
    ],
  )

  return <PlaylistsContext.Provider value={value}>{children}</PlaylistsContext.Provider>
}

export function usePlaylists() {
  const ctx = useContext(PlaylistsContext)
  if (!ctx) throw new Error('usePlaylists must be used within PlaylistsProvider')
  return ctx
}
