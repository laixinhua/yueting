/** 单字时间轴（卡拉 OK） */
export interface LyricChar {
  t: string
  start: number
  end: number
}

/** 一行歌词 */
export interface LyricLine {
  text: string
  start: number
  end: number
  chars: LyricChar[]
}

export interface LyricTrack {
  lines: LyricLine[]
  /** lrc：真实时间戳；estimated：按歌曲时长均匀分配 */
  timeline: 'lrc' | 'estimated'
  /** LRC [offset:±ms] 换算成秒，正值表示歌词整体延后 */
  offsetSec?: number
}
