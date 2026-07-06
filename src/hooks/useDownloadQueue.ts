import { useCallback, useEffect, useRef, useState } from 'react'
import type { Song } from '../types'
import type { DownloadTask, DownloadTaskStatus } from '../types/downloadTask'
import type { ImportAudioResult } from '../utils/localMusicStore'
import { songDownloadKey } from '../utils/localMusicStore'
import { loadDownloadTasks, saveDownloadTasks } from '../utils/downloadTaskStore'
import { resolveNeteaseTrackId, kickStartNeteaseWarmInGesture, warmNeteaseAudioUrl, getCachedNeteasePlayUrl } from '../utils/neteaseSong'

type DownloadFn = (song: Song, onProgress: (percent: number) => void) => Promise<ImportAudioResult>

interface UseDownloadQueueOptions {
  download: DownloadFn
  onTaskSettled?: (task: DownloadTask, result: ImportAudioResult | null) => void
}

function isActiveStatus(status: DownloadTaskStatus): boolean {
  return status === 'queued' || status === 'downloading'
}

export function useDownloadQueue({ download, onTaskSettled }: UseDownloadQueueOptions) {
  const [tasks, setTasks] = useState<DownloadTask[]>(() => loadDownloadTasks())
  const tasksRef = useRef(tasks)
  const workerBusyRef = useRef(false)
  const resumedRef = useRef(false)
  const preparePromisesRef = useRef(new Map<string, Promise<void>>())

  const patchTasks = useCallback((updater: (prev: DownloadTask[]) => DownloadTask[]) => {
    setTasks((prev) => {
      const next = updater(prev)
      tasksRef.current = next
      saveDownloadTasks(next)
      return next
    })
  }, [])

  const updateTask = useCallback(
    (id: string, patch: Partial<DownloadTask>) => {
      patchTasks((prev) => prev.map((t) => (t.id === id ? { ...t, ...patch } : t)))
    },
    [patchTasks],
  )

  const pumpQueue = useCallback(async () => {
    if (workerBusyRef.current) return
    const next = tasksRef.current.find((t) => t.status === 'queued')
    if (!next) return

    workerBusyRef.current = true
    const taskId = next.id
    updateTask(taskId, { status: 'downloading', progress: 0, error: undefined })

    const prepKey = songDownloadKey(next.song) ?? taskId
    const prep = preparePromisesRef.current.get(prepKey)
    if (prep) {
      await prep.catch(() => {})
      preparePromisesRef.current.delete(prepKey)
    }

    let settledTask: DownloadTask | null = null
    let result: ImportAudioResult | null = null

    try {
      result = await download(next.song, (progress) => {
        updateTask(taskId, { progress: Math.min(100, Math.max(0, Math.round(progress))) })
      })

      const status: DownloadTaskStatus =
        result.imported.length > 0 ? 'completed' : result.skipped > 0 ? 'skipped' : 'failed'
      const error = status === 'failed' ? '下载失败' : undefined
      patchTasks((prev) => {
        const updated = prev.map((t) =>
          t.id === taskId
            ? {
                ...t,
                status,
                progress: 100,
                error,
                completedAt: Date.now(),
              }
            : t,
        )
        settledTask = updated.find((t) => t.id === taskId) ?? null
        return updated
      })
    } catch (err) {
      const message = err instanceof Error ? err.message : '下载失败'
      patchTasks((prev) => {
        const updated = prev.map((t) =>
          t.id === taskId
            ? {
                ...t,
                status: 'failed' as const,
                progress: 100,
                error: message,
                completedAt: Date.now(),
              }
            : t,
        )
        settledTask = updated.find((t) => t.id === taskId) ?? null
        return updated
      })
      result = null
    } finally {
      workerBusyRef.current = false
      if (settledTask) onTaskSettled?.(settledTask, result)
      void pumpQueue()
    }
  }, [download, onTaskSettled, patchTasks, updateTask])

  useEffect(() => {
    if (resumedRef.current) return
    resumedRef.current = true
    if (tasksRef.current.some((t) => t.status === 'queued')) {
      queueMicrotask(() => void pumpQueue())
    }
  }, [pumpQueue])

  const enqueueDownload = useCallback(
    (song: Song): 'added' | 'downloaded' | 'duplicate' => {
      if (song.local) return 'downloaded'
      const key = songDownloadKey(song)
      if (
        key &&
        tasksRef.current.some(
          (t) => songDownloadKey(t.song) === key && isActiveStatus(t.status),
        )
      ) {
        return 'duplicate'
      }

      const task: DownloadTask = {
        id: crypto.randomUUID(),
        song,
        status: 'queued',
        progress: 0,
        addedAt: Date.now(),
      }
      patchTasks((prev) => {
        const withoutSame =
          key != null ? prev.filter((t) => songDownloadKey(t.song) !== key) : prev
        return [task, ...withoutSame]
      })
      kickStartNeteaseWarmInGesture(song)
      const prepKey = key ?? task.id
      const prepare = (async () => {
        const ncmId = resolveNeteaseTrackId(song)
        const cached = ncmId != null ? getCachedNeteasePlayUrl(ncmId) : null
        if (cached) {
          await warmNeteaseAudioUrl(cached)
        }
      })()
      preparePromisesRef.current.set(prepKey, prepare)
      void prepare.finally(() => {
        if (preparePromisesRef.current.get(prepKey) === prepare) {
          preparePromisesRef.current.delete(prepKey)
        }
      })
      queueMicrotask(() => void pumpQueue())
      return 'added'
    },
    [patchTasks, pumpQueue],
  )

  const removeDownloadTask = useCallback(
    (taskId: string) => {
      patchTasks((prev) => prev.filter((t) => t.id !== taskId))
    },
    [patchTasks],
  )

  const clearFinished = useCallback(() => {
    patchTasks((prev) => prev.filter((t) => isActiveStatus(t.status)))
  }, [patchTasks])

  const activeCount = tasks.filter((t) => isActiveStatus(t.status)).length

  return {
    downloadTasks: tasks,
    enqueueDownload,
    removeDownloadTask,
    clearFinishedDownloads: clearFinished,
    activeDownloadCount: activeCount,
  }
}
