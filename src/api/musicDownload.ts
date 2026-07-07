import type { Song } from '../types'
import { musicAggregator } from './musicAggregator'

export interface DownloadTask {
  id: string
  song: Song
  progress: number
  status: 'pending' | 'downloading' | 'completed' | 'error' | 'paused'
  downloadUrl: string | null
  error?: string
  startTime?: number
  completedTime?: number
  fileSize?: number
  downloadedSize?: number
}

export interface DownloadOptions {
  onProgress?: (task: DownloadTask) => void
  onComplete?: (task: DownloadTask) => void
  onError?: (task: DownloadTask) => void
}

export class MusicDownloader {
  private tasks = new Map<string, DownloadTask>()
  private activeDownloads = new Set<string>()
  private maxConcurrentDownloads = 3

  /**
   * 添加歌曲到下载队列
   */
  async addToDownloadQueue(song: Song): Promise<string> {
    const taskId = this.generateTaskId(song)
    
    // 检查是否已存在
    if (this.tasks.has(taskId)) {
      const existingTask = this.tasks.get(taskId)!
      if (existingTask.status === 'completed') {
        return taskId
      }
      if (existingTask.status === 'downloading') {
        return taskId
      }
    }

    // 获取下载URL
    const downloadUrl = await musicAggregator.getPlayUrl(song)
    if (!downloadUrl) {
      throw new Error('无法获取下载链接')
    }

    const task: DownloadTask = {
      id: taskId,
      song,
      progress: 0,
      status: 'pending',
      downloadUrl,
      startTime: Date.now()
    }

    this.tasks.set(taskId, task)
    this.notifyProgress(task)
    
    // 立即开始下载（如果有空位）
    this.processDownloadQueue()

    return taskId
  }

  /**
   * 处理下载队列
   */
  private async processDownloadQueue() {
    if (this.activeDownloads.size >= this.maxConcurrentDownloads) {
      return
    }

    const pendingTasks = Array.from(this.tasks.values())
      .filter(task => task.status === 'pending')

    for (const task of pendingTasks) {
      if (this.activeDownloads.size >= this.maxConcurrentDownloads) {
        break
      }

      this.startDownload(task)
    }
  }

  /**
   * 开始下载单个任务
   */
  private async startDownload(task: DownloadTask) {
    if (!task.downloadUrl) {
      task.status = 'error'
      task.error = '无下载链接'
      this.notifyError(task)
      return
    }

    this.activeDownloads.add(task.id)
    task.status = 'downloading'
    task.startTime = Date.now()
    this.notifyProgress(task)

    try {
      const response = await fetch(task.downloadUrl, {
        headers: {
          'Accept': 'audio/*,*/*',
          'Range': 'bytes=0-'
        }
      })

      if (!response.ok) {
        throw new Error(`下载失败: ${response.status}`)
      }

      const contentLength = response.headers.get('content-length')
      if (contentLength) {
        task.fileSize = parseInt(contentLength)
      }

      const blob = await response.blob()
      
      // 保存文件
      await this.saveFile(task, blob)
      
      task.status = 'completed'
      task.progress = 100
      task.completedTime = Date.now()
      task.downloadedSize = blob.size
      
      this.notifyComplete(task)
      
    } catch (error) {
      task.status = 'error'
      task.error = error instanceof Error ? error.message : '下载失败'
      this.notifyError(task)
    } finally {
      this.activeDownloads.delete(task.id)
      this.processDownloadQueue() // 处理下一个
    }
  }

  /**
   * 保存文件到本地存储
   */
  private async saveFile(task: DownloadTask, blob: Blob) {
    // 生成文件名
    const extension = this.getAudioExtension(blob.type)
    const fileName = `${task.song.title} - ${task.song.artist}${extension}`
      .replace(/[<>:"/\\|?*]/g, '_') // 移除非法字符

    // 使用IndexedDB存储
    if ('indexedDB' in window) {
      await this.saveToIndexedDB(task.song.id, fileName, blob)
    }

    // 同时提供下载链接（如果支持）
    if ('showSaveFilePicker' in window) {
      try {
        const fileHandle = await (window as any).showSaveFilePicker({
          suggestedName: fileName,
          types: [{
            description: 'Audio files',
            accept: {
              'audio/*': [extension]
            }
          }]
        })
        const writable = await fileHandle.createWritable()
        await writable.write(blob)
        await writable.close()
      } catch (error) {
        console.log('用户取消保存文件', error)
      }
    } else {
      // 回退方法：创建下载链接
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = fileName
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)
    }
  }

  /**
   * 保存到IndexedDB
   */
  private async saveToIndexedDB(songId: string, fileName: string, blob: Blob) {
    return new Promise<void>((resolve, reject) => {
      const request = indexedDB.open('music-downloads', 1)
      
      request.onerror = () => reject(request.error)
      
      request.onupgradeneeded = (event) => {
        const db = (event.target as any).result
        if (!db.objectStoreNames.contains('downloads')) {
          db.createObjectStore('downloads', { keyPath: 'songId' })
        }
      }
      
      request.onsuccess = () => {
        const db = request.result
        const transaction = db.transaction(['downloads'], 'readwrite')
        const store = transaction.objectStore('downloads')
        
        store.put({
          songId,
          fileName,
          blob,
          downloadedAt: Date.now(),
          size: blob.size
        })
        
        transaction.oncomplete = () => resolve()
        transaction.onerror = () => reject(transaction.error)
      }
    })
  }

  /**
   * 获取音频文件扩展名
   */
  private getAudioExtension(mimeType: string): string {
    const mimeToExt: Record<string, string> = {
      'audio/mpeg': '.mp3',
      'audio/mp3': '.mp3',
      'audio/x-mpeg-3': '.mp3',
      'audio/mp4': '.mp4',
      'audio/x-m4a': '.m4a',
      'audio/m4a': '.m4a',
      'audio/flac': '.flac',
      'audio/x-flac': '.flac',
      'audio/ogg': '.ogg',
      'audio/vorbis': '.ogg',
      'audio/wav': '.wav',
      'audio/x-wav': '.wav'
    }
    
    return mimeToExt[mimeType] || '.mp3'
  }

  /**
   * 暂停下载
   */
  pauseDownload(taskId: string) {
    const task = this.tasks.get(taskId)
    if (task && task.status === 'downloading') {
      task.status = 'paused'
      this.activeDownloads.delete(taskId)
      this.notifyProgress(task)
      
      // 处理队列中的下一个
      this.processDownloadQueue()
    }
  }

  /**
   * 恢复下载
   */
  resumeDownload(taskId: string) {
    const task = this.tasks.get(taskId)
    if (task && task.status === 'paused') {
      task.status = 'pending'
      this.notifyProgress(task)
      this.processDownloadQueue()
    }
  }

  /**
   * 取消下载
   */
  cancelDownload(taskId: string) {
    const task = this.tasks.get(taskId)
    if (task) {
      if (task.status === 'downloading') {
        this.activeDownloads.delete(taskId)
      }
      this.tasks.delete(taskId)
      this.processDownloadQueue()
    }
  }

  /**
   * 获取下载任务
   */
  getDownloadTask(taskId: string): DownloadTask | undefined {
    return this.tasks.get(taskId)
  }

  /**
   * 获取所有下载任务
   */
  getAllDownloadTasks(): DownloadTask[] {
    return Array.from(this.tasks.values())
  }

  /**
   * 清理已完成的任务
   */
  clearCompletedTasks() {
    for (const [taskId, task] of this.tasks) {
      if (task.status === 'completed' || task.status === 'error') {
        this.tasks.delete(taskId)
      }
    }
  }

  private generateTaskId(song: Song): string {
    return `download_${song.id}_${Date.now()}`
  }

  private notifyProgress(task: DownloadTask) {
    // 这里可以触发事件或更新状态管理
    console.log(`下载进度: ${task.song.title} - ${task.progress}%`)
  }

  private notifyComplete(task: DownloadTask) {
    console.log(`下载完成: ${task.song.title}`)
  }

  private notifyError(task: DownloadTask) {
    console.error(`下载错误: ${task.song.title} - ${task.error}`)
  }
}

// 导出单例
export const musicDownloader = new MusicDownloader()

// 便捷函数
export async function downloadSong(song: Song): Promise<string> {
  return musicDownloader.addToDownloadQueue(song)
}

export function getDownloadTasks(): DownloadTask[] {
  return musicDownloader.getAllDownloadTasks()
}

export function getDownloadTask(id: string): DownloadTask | undefined {
  return musicDownloader.getDownloadTask(id)
}