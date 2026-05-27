import type { Playlist, Song } from '../types'
import { NEUTRAL_PLAY_ACCENT } from './songTheme'

export const LIKED_PLAYLIST_ID = 'liked-music'
export const LIKED_EMPTY_GRADIENT = 'from-zinc-700 to-zinc-800'

/** 过滤可展示的收藏（排除演示 mock 曲目） */
export function filterFavoriteSongs(songs: Song[]): Song[] {
  return songs.filter((s) => s.source !== 'mock' && !/^\d+$/.test(s.id))
}

/** 构建「我喜欢的音乐」歌单；封面取最后加入的一首 */
export function buildLikedPlaylist(songs: Song[]): Playlist {
  const list = filterFavoriteSongs(songs)
  const lastAdded = list.length > 0 ? list[list.length - 1] : null

  return {
    id: LIKED_PLAYLIST_ID,
    title: '我喜欢的音乐',
    description: '在播放页点击红心即可添加',
    gradient: LIKED_EMPTY_GRADIENT,
    playAccent: NEUTRAL_PLAY_ACCENT,
    coverUrl: lastAdded?.coverUrl,
    songs: list,
  }
}
