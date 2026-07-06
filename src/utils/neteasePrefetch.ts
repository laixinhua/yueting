import { readAlbumCache, readAlbumCacheStale, readPlaylistCache, readPlaylistCacheStale } from './neteaseCache'
import { loadCachedOrFreshAlbum, loadCachedOrFreshPlaylist } from './neteasePlaylistLoad'

type PrefetchTask = () => Promise<void>

const queue: PrefetchTask[] = []
const inflight = new Set<string>()
let draining = false
let paused = false
let generation = 0

/** 启动后尽快预取，任务间隔缩短 */
const BETWEEN_TASKS_MS = 280

function delay(ms: number) {
  return new Promise<void>((resolve) => window.setTimeout(resolve, ms))
}

function taskKey(kind: 'pl' | 'album', id: number) {
  return `${kind}-${id}`
}

function isCached(kind: 'pl' | 'album', id: number) {
  return kind === 'pl' ? readPlaylistCache(id) != null : readAlbumCache(id) != null
}

function enqueue(task: PrefetchTask, key: string, priority: 'high' | 'normal' = 'normal') {
  if (inflight.has(key) || paused) return
  const wrapped: PrefetchTask = async () => {
    inflight.add(key)
    try {
      await task()
    } catch {
      /* 后台预加载失败静默忽略 */
    } finally {
      inflight.delete(key)
    }
  }
  if (priority === 'high') queue.unshift(wrapped)
  else queue.push(wrapped)
  void drainQueue()
}

async function drainQueue() {
  if (draining || paused) return
  draining = true
  const gen = generation

  while (queue.length > 0 && !paused && gen === generation) {
    const task = queue.shift()
    if (!task) break
    await task()
    if (paused || gen !== generation) break
    await delay(BETWEEN_TASKS_MS)
  }

  draining = false
  if (!paused && queue.length > 0) void drainQueue()
}

export function startNeteasePrefetch() {
  paused = false
}

export function stopNeteasePrefetch() {
  paused = true
  generation += 1
  queue.length = 0
}

export function prefetchPlaylist(
  playlistId: number,
  gradient: string,
  label?: string,
  priority: 'high' | 'normal' = 'normal',
) {
  const key = taskKey('pl', playlistId)
  if (isCached('pl', playlistId)) return

  enqueue(
    async () => {
      await loadCachedOrFreshPlaylist(playlistId, gradient, label)
    },
    key,
    priority,
  )
}

export function prefetchAlbum(albumId: number, gradient: string, priority: 'high' | 'normal' = 'normal') {
  const key = taskKey('album', albumId)
  if (isCached('album', albumId)) return

  enqueue(
    async () => {
      await loadCachedOrFreshAlbum(albumId, gradient)
    },
    key,
    priority,
  )
}

export function prefetchCharts(
  charts: readonly { id: number; gradient: string; title: string }[],
) {
  for (const chart of charts) {
    prefetchPlaylist(chart.id, chart.gradient, chart.title, 'high')
  }
}

export function prefetchHomePlaylists(
  items: readonly { id: number; gradient: string; title: string }[],
) {
  for (const item of items) {
    prefetchPlaylist(item.id, item.gradient, item.title, 'normal')
  }
}

export function prefetchHomeAlbums(items: readonly { id: number; gradient: string }[]) {
  for (const item of items) {
    prefetchAlbum(item.id, item.gradient, 'normal')
  }
}

/** 歌单/专辑详情：有 stale 缓存也继续后台刷新 */
export function isPlaylistDetailCached(playlistId: number) {
  return readPlaylistCacheStale(playlistId) != null
}

export function isAlbumDetailCached(albumId: number) {
  return readAlbumCacheStale(albumId) != null
}
