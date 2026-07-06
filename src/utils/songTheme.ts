import type { CSSProperties } from 'react'

/** 歌单/专辑卡片悬浮播放钮：毛玻璃 */
export const glassPlayButtonStyle: CSSProperties = {
  backgroundColor: 'rgba(255, 255, 255, 0.22)',
  backdropFilter: 'blur(14px)',
  WebkitBackdropFilter: 'blur(14px)',
  border: '1px solid rgba(255, 255, 255, 0.32)',
  boxShadow: '0 4px 20px rgba(0, 0, 0, 0.28)',
}

export function getPlaylistPlayButtonStyle(): CSSProperties {
  return glassPlayButtonStyle
}

/** TV 等使用 class 的播放钮（中性，不随封面变色） */
export const NEUTRAL_PLAY_ACCENT = 'bg-white/25 shadow-black/40'
