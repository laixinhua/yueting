import type { Playlist, Song } from '../types'
import { NEUTRAL_PLAY_ACCENT } from './songTheme'

export const LOCAL_PLAYLIST_ID = 'local-music'
export const LOCAL_EMPTY_GRADIENT = 'from-zinc-700 to-zinc-800'

/** 构建「本地音乐」歌单 */
export function buildLocalPlaylist(songs: Song[]): Playlist {
  const list = songs.filter((s) => s.local || s.source === 'local' || s.id.startsWith('local-'))

  return {
    id: LOCAL_PLAYLIST_ID,
    title: '本地音乐',
    description: '支持 MP3 格式',
    gradient: LOCAL_EMPTY_GRADIENT,
    playAccent: NEUTRAL_PLAY_ACCENT,
    songs: list,
  }
}

export function isLocalSong(song: Song): boolean {
  return song.source === 'local' || !!song.local || song.id.startsWith('local-')
}
