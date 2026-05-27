import type { EbnrAlbum, EbnrAlbumDetail } from '../types/ebnr'
import type { Playlist } from '../types'
import { normalizeImageUrl } from './imageUrl'
import { neteaseAlbumId } from '../data/neteaseAlbums'
import { ebnrTrackToSong } from './neteaseSong'
import { NEUTRAL_PLAY_ACCENT } from './songTheme'

function formatArtists(album: EbnrAlbum): string {
  const names = album.artists?.map((a) => a.name).filter(Boolean) ?? []
  return names.length ? names.join(' / ') : '未知歌手'
}

export function buildNeteaseAlbumCard(meta: EbnrAlbum, gradient: string): Playlist {
  return {
    id: neteaseAlbumId(meta.id),
    title: meta.name,
    description: formatArtists(meta),
    gradient,
    playAccent: NEUTRAL_PLAY_ACCENT,
    songs: [],
    coverUrl: normalizeImageUrl(meta.cover_url),
  }
}

export function buildNeteaseAlbumPlaylist(detail: EbnrAlbumDetail, gradient: string): Playlist {
  return {
    ...buildNeteaseAlbumCard(detail, gradient),
    songs: (detail.songs ?? []).map(ebnrTrackToSong),
  }
}
