import { createContext, useCallback, useContext, useMemo, type ReactNode } from 'react'
import { songs as mockSongs } from '../data/mockData'
import { useLocalMusic } from '../hooks/useLocalMusic'
import { useNeteaseSongStore } from '../hooks/useNeteaseSongStore'
import type { Song } from '../types'

interface SongCatalogContextValue {
  allSongs: Song[]
  mockSongs: Song[]
  localSongs: Song[]
  localLoading: boolean
  importFiles: (files: FileList | File[]) => Promise<Song[]>
  removeLocalSong: (id: string) => Promise<void>
  getSongById: (id: string) => Song | undefined
  upsertNeteaseSong: (song: Song) => void
  upsertNeteaseSongs: (songs: Song[]) => void
}

const SongCatalogContext = createContext<SongCatalogContextValue | null>(null)

export function SongCatalogProvider({ children }: { children: ReactNode }) {
  const { localSongs, loading, importFiles, removeSong } = useLocalMusic()
  const { upsertNeteaseSong, upsertNeteaseSongs, getNeteaseSong } = useNeteaseSongStore()

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
      importFiles,
      removeLocalSong: removeSong,
      getSongById,
      upsertNeteaseSong,
      upsertNeteaseSongs,
    }),
    [
      catalogSongs,
      localSongs,
      loading,
      importFiles,
      removeSong,
      getSongById,
      upsertNeteaseSong,
      upsertNeteaseSongs,
    ],
  )

  return <SongCatalogContext.Provider value={value}>{children}</SongCatalogContext.Provider>
}

export function useSongCatalog() {
  const ctx = useContext(SongCatalogContext)
  if (!ctx) throw new Error('useSongCatalog must be used within SongCatalogProvider')
  return ctx
}
