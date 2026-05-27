import type { Song } from '../types'

/** 无曲目播放时的占位（不写入队列持久化） */
export const EMPTY_CURRENT_SONG: Song = {
  id: '__none__',
  title: '暂无播放',
  artist: '选择一首歌曲开始聆听',
  album: '',
  duration: 0,
  gradient: 'from-zinc-600 to-zinc-800',
  genre: 'pop',
  url: '',
}

export function isEmptyPlaceholder(song: Song): boolean {
  return song.id === '__none__'
}
