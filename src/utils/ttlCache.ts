interface TtlPayload<T> {
  expiresAt: number
  data: T
}

function parsePayload<T>(raw: string): TtlPayload<T> | null {
  try {
    const parsed = JSON.parse(raw) as TtlPayload<T>
    if (!parsed || typeof parsed.expiresAt !== 'number') return null
    return parsed
  } catch {
    return null
  }
}

/** 读取缓存（含已过期），用于打开时秒显旧内容 */
export function readStaleTtlCache<T>(key: string): T | null {
  try {
    const raw = localStorage.getItem(key)
    if (!raw) return null
    return parsePayload<T>(raw)?.data ?? null
  } catch {
    return null
  }
}

export function isTtlCacheFresh(key: string): boolean {
  try {
    const raw = localStorage.getItem(key)
    if (!raw) return false
    const parsed = parsePayload(raw)
    return parsed != null && parsed.expiresAt > Date.now()
  } catch {
    return false
  }
}

export function readTtlCache<T>(key: string): T | null {
  if (!isTtlCacheFresh(key)) return null
  return readStaleTtlCache<T>(key)
}

export function writeTtlCache<T>(key: string, data: T, ttlMs: number): void {
  try {
    const payload: TtlPayload<T> = {
      expiresAt: Date.now() + ttlMs,
      data,
    }
    localStorage.setItem(key, JSON.stringify(payload))
  } catch {
    /* 存储满时忽略 */
  }
}

export function removeTtlCache(key: string): void {
  try {
    localStorage.removeItem(key)
  } catch {
    /* ignore */
  }
}
