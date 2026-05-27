export type SongGenre = 'pop' | 'rock' | 'hiphop' | 'electronic' | 'jazz' | 'classical' | 'indie' | 'sleep'

export type SongSource = 'mock' | 'local' | 'netease'

export interface Song {
  id: string
  title: string
  artist: string
  album: string
  duration: number
  gradient: string
  genre: SongGenre
  /** 音频地址（在线 URL 或本地 blob URL） */
  url: string
  /** 是否为本地导入歌曲 */
  local?: boolean
  /** 曲目来源 */
  source?: SongSource
  /** 网易云曲目 ID（EBNR） */
  neteaseId?: number
  /** 封面图（在线搜索曲目） */
  coverUrl?: string
}

export type RepeatMode = 'off' | 'one' | 'all'

/** 播放模式：循环 → 单曲 → 列表 → 随机 */
export type PlayMode = 'loop' | 'one' | 'list' | 'shuffle'

export const PLAY_MODE_CYCLE: PlayMode[] = ['loop', 'one', 'list', 'shuffle']

export interface Playlist {
  id: string
  title: string
  description?: string
  gradient: string
  /** 悬浮播放按钮背景（与封面同色系、更深） */
  playAccent: string
  songs: Song[]
  /** 是否为用户自建歌单 */
  userCreated?: boolean
  /** 在线歌单封面（网易云） */
  coverUrl?: string
}

export type TabId = 'home' | 'search' | 'library'
