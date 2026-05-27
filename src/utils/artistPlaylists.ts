import type { Playlist, Song } from '../types'
import { NEUTRAL_PLAY_ACCENT } from './songTheme'

export function isArtistPlaylist(playlist: Playlist) {
  return playlist.id.startsWith('artist-')
}

export function buildArtistPlaylist(artist: string, songs: Song[]): Playlist {
  const artistSongs = songs.filter((s) => s.artist === artist)
  const first = artistSongs[0]!
  return {
    id: `artist-${encodeURIComponent(artist)}`,
    title: artist,
    description: `${artistSongs.length} 首歌曲`,
    gradient: first.gradient,
    playAccent: NEUTRAL_PLAY_ACCENT,
    songs: artistSongs,
  }
}

export function findArtistsByQuery(songs: Song[], query: string): Playlist[] {
  const q = query.trim().toLowerCase()
  if (!q) return []

  const names = new Set<string>()
  for (const song of songs) {
    if (song.artist.toLowerCase().includes(q)) names.add(song.artist)
  }

  return [...names]
    .map((name) => buildArtistPlaylist(name, songs))
    .sort((a, b) => a.title.localeCompare(b.title, 'zh-CN'))
}
