import { Preferences } from '@capacitor/preferences'

async function rawGet(key: string): Promise<string | null> {
  try {
    const { value } = await Preferences.get({ key })
    return value ?? null
  } catch {
    return null
  }
}

async function rawSet(key: string, value: string): Promise<void> {
  try {
    await Preferences.set({ key, value })
  } catch {
    /* ignore */
  }
}

async function rawRemove(key: string): Promise<void> {
  try {
    await Preferences.remove({ key })
  } catch {
    /* ignore */
  }
}

/**
 * 读取并 JSON.parse。若 Preferences 当前为空，则回退到旧的 localStorage
 * 做一次迁移写回（兼容从老版本升级、且 WebView 的 localStorage 里还有旧数据的设备）。
 * 在 Android 原生环境下 Preferences 使用 SharedPreferences，进程被杀也不丢失，
 * 从而根治“划掉 APP 后 localStorage 被系统清理导致播放列表/歌单清空”的问题。
 */
export async function loadJSON<T>(key: string, fallback: T): Promise<T> {
  let raw = await rawGet(key)
  if (raw == null) {
    try {
      const old = localStorage.getItem(key)
      if (old != null) {
        await rawSet(key, old)
        raw = old
      }
    } catch {
      /* ignore */
    }
  }
  if (raw == null) return fallback
  try {
    return JSON.parse(raw) as T
  } catch {
    return fallback
  }
}

export async function saveJSON(key: string, value: unknown): Promise<void> {
  await rawSet(key, JSON.stringify(value))
}

export async function removeKey(key: string): Promise<void> {
  await rawRemove(key)
}
