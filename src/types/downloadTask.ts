import type { Song } from './index'

export type DownloadTaskStatus = 'queued' | 'downloading' | 'completed' | 'failed' | 'skipped'

export interface DownloadTask {
  id: string
  song: Song
  status: DownloadTaskStatus
  progress: number
  error?: string
  addedAt: number
  completedAt?: number
}
