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
  createPlaylist: (title: string, songIds?: string[]) => Playlist
  updatePlaylist: (id: string, patch: { title?: string; description?: string; songIds?: string[] }) => void
  deletePlaylist: (id: string) => void
  resolvePlaylist: (songIds: string[]) => import('../types').Song[]
  userPlaylistHasSong: (playlistId: string, songId: string) => boolean
  addSongToUserPlaylist: (playlistId: string, song: Song) => boolean
}

const PlaylistsContext = createContext<PlaylistsContextValue | null>(null)

function resolveSongs(songIds: string[], getSongById: (id: string) => import('../types').Song | undefined) {
  return songIds.map((id) => getSongById(id)).filter((s): s is NonNullable<typeof s> => Boolean(s))
}

export function PlaylistsProvider({ children }: { children: ReactNode }) {
  const { getSongById, upsertNeteaseSong } = useSongCatalog()
  const { stored, createPlaylist: createStored, updatePlaylist: updateStored, deletePlaylist } = useUserPlaylists()

  const resolvePlaylist = useCallback(
    (songIds: string[]) => resolveSongs(songIds, getSongById),
    [getSongById],
  )

  const userPlaylists = useMemo<Playlist[]>(
    () =>
      stored.map((p) => ({
        id: p.id,
        title: p.title,
        description: p.description,
        gradient: p.gradient,
        playAccent: p.playAccent,
        songs: resolveSongs(p.songIds, getSongById),
        userCreated: true,
      })),
    [stored, getSongById],
  )

  const allPlaylists = useMemo(() => [...mockPlaylists, ...userPlaylists], [userPlaylists])

  const createPlaylist = useCallback(
    (title: string, songIds: string[] = []) => {
      const stored = createStored(title, songIds)
      return {
        id: stored.id,
        title: stored.title,
        description: stored.description,
        gradient: stored.gradient,
        playAccent: stored.playAccent,
        songs: resolveSongs(stored.songIds, getSongById),
        userCreated: true,
      }
    },
    [createStored, getSongById],
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
      updateStored(playlistId, { songIds: [...playlist.songIds, song.id] })
      return true
    },
    [stored, updateStored, upsertNeteaseSong],
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
