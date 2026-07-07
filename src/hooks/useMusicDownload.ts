import { useEffect, useState, useCallback, useRef } from 'react'
import type { Song } from '../types'
import { musicDownloader, type DownloadTask } from '../api/musicDownload'

export interface UseMusicDownloadState {
  downloadTasks: DownloadTask[]
  downloadingCount: number
  completedCount: number
  errorCount: number
  pendingCount: number
  downloadSong: (song: Song) => Promise<string>
  pauseDownload: (taskId: string) => void
  resumeDownload: (taskId: string) => void
  cancelDownload: (taskId: string) => void
  clearCompletedTasks: () => void
  retryFailedTask: (taskId: string) => void
}

/**
 * 音乐下载管理Hook
 * 提供下载队列管理、进度监控等功能
 */
export function useMusicDownload(): UseMusicDownloadState {
  const [downloadTasks, setDownloadTasks] = useState<DownloadTask[]>([])
  const updateIntervalRef = useRef<number | null>(null)

  // 更新任务列表的函数
  const updateTasks = useCallback(() => {
    setDownloadTasks(musicDownloader.getAllDownloadTasks())
  }, [])

  // 定期更新任务状态
  useEffect(() => {
    updateTasks()
    
    const interval = window.setInterval(updateTasks, 1000)
    updateIntervalRef.current = interval

    return () => {
      if (updateIntervalRef.current) {
        window.clearInterval(updateIntervalRef.current)
      }
    }
  }, [updateTasks])

  // 计算各种状态的数量
  const downloadingCount = downloadTasks.filter(t => t.status === 'downloading').length
  const completedCount = downloadTasks.filter(t => t.status === 'completed').length
  const errorCount = downloadTasks.filter(t => t.status === 'error').length
  const pendingCount = downloadTasks.filter(t => t.status === 'pending').length

  // 下载歌曲
  const downloadSong = useCallback(async (song: Song): Promise<string> => {
    try {
      const taskId = await musicDownloader.addToDownloadQueue(song)
      updateTasks() // 立即更新
      return taskId
    } catch (error) {
      console.error('添加下载任务失败:', error)
      throw error
    }
  }, [updateTasks])

  // 暂停下载
  const pauseDownload = useCallback((taskId: string) => {
    musicDownloader.pauseDownload(taskId)
    updateTasks()
  }, [updateTasks])

  // 恢复下载
  const resumeDownload = useCallback((taskId: string) => {
    musicDownloader.resumeDownload(taskId)
    updateTasks()
  }, [updateTasks])

  // 取消下载
  const cancelDownload = useCallback((taskId: string) => {
    musicDownloader.cancelDownload(taskId)
    updateTasks()
  }, [updateTasks])

  // 清理已完成任务
  const clearCompletedTasks = useCallback(() => {
    musicDownloader.clearCompletedTasks()
    updateTasks()
  }, [updateTasks])

  // 重试失败任务
  const retryFailedTask = useCallback((taskId: string) => {
    const task = musicDownloader.getDownloadTask(taskId)
    if (task && task.status === 'error') {
      // 重新创建任务
      musicDownloader.cancelDownload(taskId)
      downloadSong(task.song)
    }
  }, [downloadSong])

  return {
    downloadTasks,
    downloadingCount,
    completedCount,
    errorCount,
    pendingCount,
    downloadSong,
    pauseDownload,
    resumeDownload,
    cancelDownload,
    clearCompletedTasks,
    retryFailedTask
  }
}

/**
 * 获取单个下载任务的状态
 */
export function useDownloadTask(taskId: string | null): DownloadTask | null {
  const [task, setTask] = useState<DownloadTask | null>(null)

  useEffect(() => {
    if (!taskId) {
      setTask(null)
      return
    }

    const updateTask = () => {
      const currentTask = musicDownloader.getDownloadTask(taskId)
      setTask(currentTask || null)
    }

    updateTask()
    const interval = window.setInterval(updateTask, 500)

    return () => {
      window.clearInterval(interval)
    }
  }, [taskId])

  return task
}

/**
 * 下载统计信息
 */
export function useDownloadStats() {
  const { downloadTasks } = useMusicDownload()
  
  const stats = {
    totalTasks: downloadTasks.length,
    completedSize: downloadTasks.reduce((total, task) => {
      return total + (task.downloadedSize || 0)
    }, 0),
    totalSize: downloadTasks.reduce((total, task) => {
      return total + (task.fileSize || 0)
    }, 0),
    averageSpeed: 0, // 可以扩展计算平均下载速度
    estimatedTimeRemaining: 0 // 可以扩展计算预计剩余时间
  }

  return stats
}

/**
 * 按状态筛选下载任务
 */
export function useDownloadTasksByStatus(status: DownloadTask['status']) {
  const { downloadTasks } = useMusicDownload()
  
  return downloadTasks.filter(task => task.status === status)
}

/**
 * 获取下载队列中的歌曲
 */
export function useDownloadQueue() {
  const pendingTasks = useDownloadTasksByStatus('pending')
  const downloadingTasks = useDownloadTasksByStatus('downloading')
  
  return {
    pendingSongs: pendingTasks.map(task => task.song),
    downloadingSongs: downloadingTasks.map(task => task.song)
  }
}