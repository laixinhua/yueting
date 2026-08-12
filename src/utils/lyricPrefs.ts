/**
 * 每首歌的歌词偏好（覆盖）存储。
 *
 * 背景：原逻辑每次播放都会联网按 neteaseId 重新拉歌词并覆盖已保存结果，
 * 导致用户手动「重新匹配」选对后，下次播放仍可能被错误的首条匹配覆盖
 * （尤其当播放队列持有的是未刷新 neteaseId/lrc 的旧 Song 对象时）。
 *
 * 这里把「用户确认过的正确歌词」按 song.id 持久化到 localStorage，
 * 自动加载时优先使用、不再联网覆盖 —— 即「下载歌词保存到对应的歌曲」。
 */
const STORAGE_KEY = 'yueting:lyric-prefs'

export interface LyricPref {
  /** 用户确认/首次匹配到的网易云曲目 ID（用于 reload 时按 ID 重拉） */
  neteaseId?: number
  /** 已解析并确认的 LRC 原文（权威歌词，下次直接展示） */
  lrc?: string
}

const memory = new Map<string, LyricPref>()

function readAll(): Record<string, LyricPref> {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    return raw ? (JSON.parse(raw) as Record<string, LyricPref>) : {}
  } catch {
    return {}
  }
}

function writeAll(all: Record<string, LyricPref>): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(all))
  } catch {
    /* 存储不可用时静默降级，不影响本次会话内的歌词展示 */
  }
}

export function getLyricPref(songId: string): LyricPref | null {
  const mem = memory.get(songId)
  if (mem) return mem
  const all = readAll()
  const pref = all[songId]
  if (pref) memory.set(songId, pref)
  return pref ?? null
}

export function saveLyricPref(songId: string, patch: LyricPref): void {
  const all = readAll()
  const next: LyricPref = { ...(all[songId] ?? {}), ...patch }
  all[songId] = next
  memory.set(songId, next)
  writeAll(all)
}
