import type { Playlist, Song } from '../types'
import { NEUTRAL_PLAY_ACCENT } from './songTheme'

function albumKey(artist: string, album: string) {
  return `${artist}::${album}`
}

function toAlbumId(artist: string, album: string) {
  return `album-${encodeURIComponent(albumKey(artist, album))}`
}

export function isAlbumPlaylist(playlist: Playlist) {
  return playlist.id.startsWith('album-') || playlist.id.startsWith('ncm-album-')
}

/** 从曲库按「歌手 + 专辑」聚合为可播放的专辑歌单 */
export function buildAlbumPlaylists(songs: Song[]): Playlist[] {
  const map = new Map<string, Song[]>()

  for (const song of songs) {
    const key = albumKey(song.artist, song.album)
    const list = map.get(key) ?? []
    list.push(song)
    map.set(key, list)
  }

  return [...map.entries()].map(([key, albumSongs]) => {
    const [artist, album] = key.split('::')
    const first = albumSongs[0]!
    return {
      id: toAlbumId(artist, album),
      title: album,
      description: artist,
      gradient: first.gradient,
      playAccent: NEUTRAL_PLAY_ACCENT,
      songs: albumSongs,
    }
  })
}

export function getRecommendedAlbums(songs: Song[], limit = 6): Playlist[] {
  return buildAlbumPlaylists(songs)
    .sort((a, b) => b.songs.length - a.songs.length || a.title.localeCompare(b.title, 'zh-CN'))
    .slice(0, limit)
}
