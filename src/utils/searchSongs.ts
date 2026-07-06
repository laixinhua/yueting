import type { Song, SongGenre } from '../types'

export function filterSongs(list: Song[], query: string, genre?: SongGenre | null): Song[] {
  const q = query.trim().toLowerCase()
  return list.filter((song) => {
    if (genre && song.genre !== genre) return false
    if (!q) return true
    return (
      song.title.toLowerCase().includes(q) ||
      song.artist.toLowerCase().includes(q) ||
      song.album.toLowerCase().includes(q)
    )
  })
}
