const PLACEHOLDER_PATTERN =
  /^(<unknown>|unknown|unknown artist|unknown album|未知歌手|未知专辑)$/i

/** 将 MediaStore / 文件元数据中的占位歌手、专辑名转为空字符串 */
export function sanitizeMusicMeta(value: string | null | undefined): string {
  if (value == null) return ''
  const trimmed = value.trim()
  if (!trimmed || PLACEHOLDER_PATTERN.test(trimmed)) return ''
  return trimmed
}

/** 底部播放条副标题：歌手 · 时长（无歌手时只显示时长） */
export function formatSongSubtitle(artist: string, durationSec: number, formatDuration: (s: number) => string): string {
  const name = sanitizeMusicMeta(artist)
  const dur = formatDuration(durationSec)
  if (name) return `${name} · ${dur}`
  return dur
}

/** 扫描列表副标题：歌手 · 专辑（均为空则返回空） */
export function formatTrackMetaLine(artist: string, album?: string): string {
  const parts = [sanitizeMusicMeta(artist), sanitizeMusicMeta(album)].filter(Boolean)
  return parts.join(' · ')
}
