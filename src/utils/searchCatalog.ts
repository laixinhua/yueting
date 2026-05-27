import { findArtistsByQuery } from './artistPlaylists'
import { buildAlbumPlaylists } from './albumPlaylists'
import { filterSongs } from './searchSongs'
import type { Playlist, Song } from '../types'

export type SearchResultType = 'song' | 'artist' | 'album'

export interface SearchCatalogResult {
  type: SearchResultType
  songs: Song[]
  artists: Playlist[]
  albums: Playlist[]
}

function getResultType(query: string, songs: Song[]): SearchResultType {
  const q = query.trim().toLowerCase()
  if (!q) return 'song'

  const hasTitle = songs.some((s) => s.title.toLowerCase().includes(q))
  if (hasTitle) return 'song'

  const hasArtist = songs.some((s) => s.artist.toLowerCase().includes(q))
  if (hasArtist) return 'artist'

  const hasAlbum = songs.some((s) => s.album.toLowerCase().includes(q))
  if (hasAlbum) return 'album'

  return 'song'
}

export function getSearchCatalog(query: string, allSongs: Song[]): SearchCatalogResult {
  const q = query.trim().toLowerCase()
  const matched = filterSongs(allSongs, query, null)
  const type = getResultType(q, matched)

  if (type === 'artist') {
    return {
      type,
      songs: [],
      artists: findArtistsByQuery(allSongs, query),
      albums: [],
    }
  }

  if (type === 'album') {
    const albums = buildAlbumPlaylists(
      allSongs.filter((s) => s.album.toLowerCase().includes(q)),
    ).sort((a, b) => a.title.localeCompare(b.title, 'zh-CN'))
    return {
      type,
      songs: [],
      artists: [],
      albums,
    }
  }

  const songs =
    matched.filter((s) => s.title.toLowerCase().includes(q)).length > 0
      ? matched.filter((s) => s.title.toLowerCase().includes(q))
      : matched

  return {
    type: 'song',
    songs,
    artists: [],
    albums: [],
  }
}

export const searchTypeLabels: Record<SearchResultType, string> = {
  song: '歌曲',
  artist: '歌手',
  album: '专辑',
}
