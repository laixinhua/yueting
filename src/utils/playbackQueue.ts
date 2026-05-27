import type { Song } from '../types'

export const QUEUE_MAX = 500
const STORAGE_KEY = 'yueting-playback-queue'
const STORAGE_VERSION = 1

export interface StoredPlaybackQueue {
  version: typeof STORAGE_VERSION
  songIds: string[]
  queueIndex: number
}

export function dedupeSongs(songs: Song[]): Song[] {
  const seen = new Set<string>()
  const out: Song[] = []
  for (const song of songs) {
    if (seen.has(song.id)) continue
    seen.add(song.id)
    out.push(song)
  }
  return out
}

export function resolveQueueSongs(
  songs: Song[],
  resolve: (id: string) => Song | undefined,
): Song[] {
  return dedupeSongs(songs)
    .map((song) => resolve(song.id) ?? song)
    .slice(0, QUEUE_MAX)
}

export function loadStoredQueue(): StoredPlaybackQueue | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw) as StoredPlaybackQueue
    if (parsed?.version !== STORAGE_VERSION || !Array.isArray(parsed.songIds)) return null
    const queueIndex = Number.isFinite(parsed.queueIndex) ? parsed.queueIndex : 0
    return {
      version: STORAGE_VERSION,
      songIds: parsed.songIds.filter((id) => typeof id === 'string' && id !== '__none__'),
      queueIndex: Math.max(0, queueIndex),
    }
  } catch {
    return null
  }
}

export function saveStoredQueue(songIds: string[], queueIndex: number): void {
  if (songIds.length === 0) {
    localStorage.removeItem(STORAGE_KEY)
    return
  }
  const payload: StoredPlaybackQueue = {
    version: STORAGE_VERSION,
    songIds,
    queueIndex: Math.max(0, Math.min(queueIndex, songIds.length - 1)),
  }
  localStorage.setItem(STORAGE_KEY, JSON.stringify(payload))
}

export function restoreQueueFromStorage(
  resolve: (id: string) => Song | undefined,
): { queue: Song[]; queueIndex: number } | null {
  const stored = loadStoredQueue()
  if (!stored || stored.songIds.length === 0) return null

  const queue: Song[] = []
  for (const id of stored.songIds) {
    const song = resolve(id)
    if (song) queue.push(song)
  }
  if (queue.length === 0) return null

  return {
    queue,
    queueIndex: Math.min(stored.queueIndex, queue.length - 1),
  }
}
