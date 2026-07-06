import { createContext, useCallback, useContext, useMemo, type ReactNode } from 'react'
import { useFavorites } from '../hooks/useFavorites'
import { useSongCatalog } from './SongCatalogContext'
import type { Song } from '../types'
import { filterFavoriteSongs } from '../utils/likedPlaylist'
import { isNeteaseSong } from '../utils/neteaseSong'

interface FavoritesContextValue {
  isFavorite: (id: string) => boolean
  toggleFavorite: (song: Song) => void
  favoriteSongs: Song[]
}

const FavoritesContext = createContext<FavoritesContextValue | null>(null)

export function FavoritesProvider({ children }: { children: ReactNode }) {
  const { isFavorite, toggleFavorite: toggleId, favoriteIds } = useFavorites()
  const { getSongById, upsertNeteaseSong } = useSongCatalog()

  const toggleFavorite = useCallback(
    (song: Song) => {
      if (isNeteaseSong(song)) upsertNeteaseSong(song)
      toggleId(song.id)
    },
    [toggleId, upsertNeteaseSong],
  )

  const favoriteSongs = useMemo(() => {
    const resolved = favoriteIds
      .map((id) => getSongById(id))
      .filter((s): s is Song => Boolean(s))
    return filterFavoriteSongs(resolved)
  }, [favoriteIds, getSongById])

  return (
    <FavoritesContext.Provider value={{ isFavorite, toggleFavorite, favoriteSongs }}>
      {children}
    </FavoritesContext.Provider>
  )
}

export function useFavoritesContext() {
  const ctx = useContext(FavoritesContext)
  if (!ctx) throw new Error('useFavoritesContext must be used within FavoritesProvider')
  return ctx
}
