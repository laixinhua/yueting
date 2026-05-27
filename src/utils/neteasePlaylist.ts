import type { EbnrPlaylist, EbnrTrack } from '../types/ebnr'
import type { Playlist } from '../types'
import { neteasePlaylistId } from '../data/neteaseCharts'
import { ebnrTrackToSong } from './neteaseSong'
import { NEUTRAL_PLAY_ACCENT } from './songTheme'

export function buildNeteasePlaylistCard(
  meta: EbnrPlaylist,
  gradient: string,
  label?: string,
): Playlist {
  return {
    id: neteasePlaylistId(meta.id),
    title: label ?? meta.name,
    description: meta.description?.trim() || meta.name,
    gradient,
    playAccent: NEUTRAL_PLAY_ACCENT,
    songs: [],
    coverUrl: meta.cover_url ?? undefined,
  }
}

export function buildNeteasePlaylist(
  meta: EbnrPlaylist,
  tracks: EbnrTrack[],
  gradient: string,
  label?: string,
): Playlist {
  return {
    ...buildNeteasePlaylistCard(meta, gradient, label),
    songs: tracks.map(ebnrTrackToSong),
  }
}
