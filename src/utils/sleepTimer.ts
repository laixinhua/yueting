export const SLEEP_TIMER_MINUTES = [15, 30, 45, 60, 90] as const

export type SleepTimerKind = 'off' | 'minutes' | 'end-of-track'

const STORAGE_KEY = 'yueting-sleep-timer'

interface StoredTimer {
  kind: 'minutes'
  endsAt: number
}

export function loadSleepTimerEndsAt(): number | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw) as StoredTimer
    if (parsed.kind === 'minutes' && parsed.endsAt > Date.now()) return parsed.endsAt
  } catch {
    /* ignore */
  }
  localStorage.removeItem(STORAGE_KEY)
  return null
}

export function persistSleepTimerEndsAt(endsAt: number | null): void {
  try {
    if (endsAt == null) localStorage.removeItem(STORAGE_KEY)
    else localStorage.setItem(STORAGE_KEY, JSON.stringify({ kind: 'minutes', endsAt } satisfies StoredTimer))
  } catch {
    /* ignore */
  }
}

export function formatSleepTimerRemaining(sec: number): string {
  const m = Math.floor(sec / 60)
  const s = sec % 60
  return `${m}:${s.toString().padStart(2, '0')}`
}
