import { useState } from 'react'
import { usePlaylists } from '../context/PlaylistsContext'
import type { Playlist } from '../types'
import { ConfirmDialog } from './ConfirmDialog'
import { Overlay } from './Overlay'

interface PlaylistEditorPanelProps {
  playlist: Playlist | null
  onClose: () => void
}

export function PlaylistEditorPanel({ playlist, onClose }: PlaylistEditorPanelProps) {
  const { createPlaylist, updatePlaylist, deletePlaylist } = usePlaylists()
  const isNew = !playlist

  const [title, setTitle] = useState(playlist?.title ?? '')
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false)

  const handleSave = () => {
    const name = title.trim() || '新建歌单'
    if (isNew) {
      createPlaylist(name, [])
    } else {
      updatePlaylist(playlist.id, { title: name })
    }
    onClose()
  }

  const confirmDelete = () => {
    if (!playlist?.userCreated) return
    deletePlaylist(playlist.id)
    setDeleteConfirmOpen(false)
    onClose()
  }

  return (
    <>
    <Overlay title={isNew ? '新建歌单' : '编辑歌单'} onClose={onClose}>
      <div className="px-4 py-4 space-y-4">
        <label className="block">
          <span className="text-xs text-white/40 uppercase tracking-wider">歌单名称</span>
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="输入歌单名称"
            className="mt-2 w-full h-11 px-3 rounded-xl bg-surface-highlight text-white outline-none focus:ring-2 focus:ring-white/25"
            autoFocus
          />
        </label>

        <button
          type="button"
          onClick={handleSave}
          className="w-full py-3 rounded-xl bg-white text-black font-semibold hover:bg-white/90 active:scale-[0.98] transition-all"
        >
          保存
        </button>

        {!isNew && playlist?.userCreated ? (
          <button
            type="button"
            onClick={() => setDeleteConfirmOpen(true)}
            className="w-full py-3 rounded-xl border border-red-500/40 text-red-400 text-sm font-medium hover:bg-red-500/10 transition-colors"
          >
            删除歌单
          </button>
        ) : null}
      </div>
    </Overlay>

    <ConfirmDialog
      open={deleteConfirmOpen && Boolean(playlist?.userCreated)}
      title="删除歌单"
      message="确定删除歌单？删除后无法恢复。"
      confirmLabel="删除"
      cancelLabel="取消"
      destructive
      onConfirm={confirmDelete}
      onCancel={() => setDeleteConfirmOpen(false)}
    />
    </>
  )
}
