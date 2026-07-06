import type { DownloadTask } from '../types/downloadTask'

const KEY = 'yueting-download-tasks'
const MAX_TASKS = 80

function sanitizeSongForStorage(song: DownloadTask['song']): DownloadTask['song'] {
  if (!song.url?.startsWith('blob:')) return song
  return { ...song, url: '' }
}

function normalizeRestoredTask(task: DownloadTask): DownloadTask {
  const song = sanitizeSongForStorage(task.song)
  if (task.status === 'downloading' || task.status === 'queued') {
    return { ...task, song, status: 'queued', progress: 0, error: undefined }
  }
  return { ...task, song }
}

export function loadDownloadTasks(): DownloadTask[] {
  try {
    const raw = localStorage.getItem(KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw) as unknown
    if (!Array.isArray(parsed)) return []
    return parsed
      .filter((t): t is DownloadTask => {
        if (!t || typeof t !== 'object') return false
        const row = t as DownloadTask
        return typeof row.id === 'string' && row.song != null && typeof row.song.id === 'string'
      })
      .map(normalizeRestoredTask)
      .slice(0, MAX_TASKS)
  } catch {
    return []
  }
}

export function saveDownloadTasks(tasks: DownloadTask[]): void {
  try {
    const payload = tasks.slice(0, MAX_TASKS).map((t) => ({
      ...t,
      song: sanitizeSongForStorage(t.song),
    }))
    localStorage.setItem(KEY, JSON.stringify(payload))
  } catch {
    /* ignore quota */
  }
}
