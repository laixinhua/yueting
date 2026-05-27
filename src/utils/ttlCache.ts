interface TtlPayload<T> {
  expiresAt: number
  data: T
}

export function readTtlCache<T>(key: string): T | null {
  try {
    const raw = localStorage.getItem(key)
    if (!raw) return null
    const parsed = JSON.parse(raw) as TtlPayload<T>
    if (!parsed || typeof parsed.expiresAt !== 'number') return null
    if (parsed.expiresAt <= Date.now()) {
      localStorage.removeItem(key)
      return null
    }
    return parsed.data
  } catch {
    return null
  }
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
