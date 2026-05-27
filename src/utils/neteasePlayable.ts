import type { EbnrTrack } from '../types/ebnr'
import type { Song } from '../types'
import { ebnrTrackToSong, isNeteaseSongPlayable, parseNeteaseId } from './neteaseSong'

export const PLAYABLE_CHECK_CONCURRENCY = 3
/** 热歌/推荐池最多预检条数（够换一换即可） */
export const PLAYABLE_POOL_LIMIT = 60
/** 首页推荐歌单/专辑至少需要的可播放曲目数 */
export const FEATURED_MIN_PLAYABLE = 3

/** 按顺序预检，只保留能拿到播放地址的网易云歌曲 */
export async function filterPlayableNeteaseSongs(
  songs: Song[],
  options?: { limit?: number; concurrency?: number },
): Promise<Song[]> {
  const limit = options?.limit ?? songs.length
  const concurrency = options?.concurrency ?? PLAYABLE_CHECK_CONCURRENCY
  const playable: Song[] = []

  for (let i = 0; i < songs.length && playable.length < limit; i += concurrency) {
    const chunk = songs.slice(i, i + concurrency)
    const checked = await Promise.all(
      chunk.map(async (song) => {
        const ncmId = song.neteaseId ?? parseNeteaseId(song.id)
        if (ncmId == null) return song.url ? song : null
        return (await isNeteaseSongPlayable(ncmId)) ? song : null
      }),
    )
    for (const song of checked) {
      if (song && playable.length < limit) playable.push(song)
    }
  }

  return playable
}

export async function ebnrTracksToPlayableSongs(
  tracks: EbnrTrack[],
  limit?: number,
): Promise<Song[]> {
  const songs = tracks.map(ebnrTrackToSong)
  return filterPlayableNeteaseSongs(songs, limit !== undefined ? { limit } : undefined)
}
