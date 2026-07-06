import { useMemo, useRef, useState, type ReactNode } from 'react'
import { useSongCatalog } from '../context/SongCatalogContext'
import type { DownloadTask } from '../types/downloadTask'
import { AlbumCover } from './AlbumCover'
import { Overlay } from './Overlay'

interface DownloadListScreenProps {
  onClose: () => void
}

const DELETE_WIDTH = 72

function statusLabel(task: DownloadTask): string {
  switch (task.status) {
    case 'queued':
      return '等待中'
    case 'downloading':
      return `${task.progress}%`
    case 'completed':
      return '已完成'
    case 'skipped':
      return '已在本地'
    case 'failed':
      return task.error ?? '失败'
  }
}

interface SwipeToDeleteRowProps {
  canDelete: boolean
  onDelete: () => void
  children: ReactNode
}

function SwipeToDeleteRow({ canDelete, onDelete, children }: SwipeToDeleteRowProps) {
  const [offset, setOffset] = useState(0)
  const startX = useRef(0)
  const startOffset = useRef(0)
  const dragging = useRef(false)

  const snap = (value: number) => (value < -DELETE_WIDTH / 2 ? -DELETE_WIDTH : 0)

  const onPointerDown = (e: React.PointerEvent) => {
    if (!canDelete) return
    dragging.current = true
    startX.current = e.clientX
    startOffset.current = offset
    e.currentTarget.setPointerCapture(e.pointerId)
  }

  const onPointerMove = (e: React.PointerEvent) => {
    if (!dragging.current || !canDelete) return
    const dx = e.clientX - startX.current
    const next = Math.max(-DELETE_WIDTH, Math.min(0, startOffset.current + dx))
    setOffset(next)
  }

  const onPointerUp = (e: React.PointerEvent) => {
    if (!dragging.current) return
    dragging.current = false
    try {
      e.currentTarget.releasePointerCapture(e.pointerId)
    } catch {
      /* already released */
    }
    setOffset((prev) => snap(prev))
  }

  const close = () => setOffset(0)

  if (!canDelete) {
    return <div className="relative overflow-hidden">{children}</div>
  }

  return (
    <div className="relative overflow-hidden">
      <div
        className="absolute inset-y-0 right-0 flex items-stretch"
        style={{ width: DELETE_WIDTH }}
        aria-hidden={offset === 0}
      >
        <button
          type="button"
          onClick={() => {
            close()
            onDelete()
          }}
          className="w-full bg-red-600/90 text-white text-sm font-medium active:bg-red-700"
        >
          删除
        </button>
      </div>
      <div
        className="relative bg-[#0a0a0a] transition-transform duration-200 ease-out touch-pan-y"
        style={{ transform: `translateX(${offset}px)` }}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
      >
        {children}
      </div>
    </div>
  )
}

function DownloadRow({
  task,
  onDelete,
}: {
  task: DownloadTask
  onDelete: () => void
}) {
  const active = task.status === 'queued' || task.status === 'downloading'
  const failed = task.status === 'failed'
  const canDelete = task.status !== 'downloading'

  return (
    <SwipeToDeleteRow canDelete={canDelete} onDelete={onDelete}>
      <div className="px-4 py-3 border-b border-white/5 last:border-b-0">
        <div className="flex items-center gap-3">
          <AlbumCover gradient={task.song.gradient} imageUrl={task.song.coverUrl} size="sm" rounded="md" />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-white truncate">{task.song.title}</p>
            <p className="text-xs text-white/50 truncate">{task.song.artist}</p>
          </div>
          <span
            className={`text-xs shrink-0 tabular-nums ${
              failed ? 'text-red-400/90' : active ? 'text-white/70' : 'text-white/40'
            }`}
          >
            {statusLabel(task)}
          </span>
        </div>
        {active ? (
          <div className="mt-2.5 h-1 rounded-full bg-white/10 overflow-hidden">
            <div
              className="h-full rounded-full bg-white/80 transition-[width] duration-200"
              style={{ width: `${task.status === 'queued' ? 0 : task.progress}%` }}
            />
          </div>
        ) : null}
      </div>
    </SwipeToDeleteRow>
  )
}

export function DownloadListScreen({ onClose }: DownloadListScreenProps) {
  const { downloadTasks, clearFinishedDownloads, removeDownloadTask, activeDownloadCount } =
    useSongCatalog()

  const hasFinished = useMemo(
    () => downloadTasks.some((t) => t.status === 'completed' || t.status === 'failed' || t.status === 'skipped'),
    [downloadTasks],
  )

  return (
    <Overlay
      title="下载列表"
      onClose={onClose}
      headerRight={
        hasFinished ? (
          <button
            type="button"
            onClick={clearFinishedDownloads}
            className="text-sm text-white/45 hover:text-white/80 px-2 py-1 transition-colors"
          >
            清空已结束
          </button>
        ) : null
      }
    >
      {downloadTasks.length === 0 ? (
        <p className="text-center text-white/40 text-sm py-20">暂无下载任务</p>
      ) : (
        <>
          {activeDownloadCount > 0 ? (
            <p className="px-4 pt-3 pb-1 text-xs text-white/40">{activeDownloadCount} 项进行中</p>
          ) : null}
          <p className="px-4 pb-1 text-xs text-white/30">左滑可删除记录</p>
          <div className="pb-4">
            {downloadTasks.map((task) => (
              <DownloadRow key={task.id} task={task} onDelete={() => removeDownloadTask(task.id)} />
            ))}
          </div>
        </>
      )}
    </Overlay>
  )
}
