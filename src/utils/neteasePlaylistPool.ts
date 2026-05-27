import { getPlaylistTracks } from '../api/ebnr'
import type { Song } from '../types'
import { ebnrTrackToSong } from './neteaseSong'

export interface NeteasePlaylistSource {
  readonly id: number
  readonly name: string
}

export async function fetchNeteasePlaylistSongs(
  sources: readonly NeteasePlaylistSource[],
): Promise<Song[][]> {
  return Promise.all(
    sources.map((src) =>
      getPlaylistTracks(src.id).then((tracks) => tracks.map(ebnrTrackToSong)),
    ),
  )
}

/** 合并去重，保留各列表首次出现顺序（以第一个列表为主序） */
export function mergeTracksOrdered(...lists: Song[][]): Song[] {
  const map = new Map<string, Song>()
  for (const list of lists) {
    for (const song of list) {
      if (!map.has(song.id)) map.set(song.id, song)
    }
  }
  return [...map.values()]
}

export function mergeTracks(lists: Song[][]): Song[] {
  return mergeTracksOrdered(...lists)
}
