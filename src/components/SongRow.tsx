import { useState } from 'react'
import { formatDuration } from '../data/mockData'
import type { Song } from '../types'
import { AlbumCover } from './AlbumCover'
import { IconMore } from './icons'
import { SongActionSheet } from './SongActionSheet'

interface SongRowProps {
  song: Song
  index?: number
  onClick?: () => void
  showAlbum?: boolean
}

export function SongRow({ song, index, onClick, showAlbum = true }: SongRowProps) {
  const [menuOpen, setMenuOpen] = useState(false)

  return (
    <>
      <div className="w-full flex items-center gap-1 px-4 py-2.5 hover:bg-white/5 active:bg-white/10 transition-colors group">
        <button type="button" onClick={onClick} className="flex flex-1 items-center gap-3 min-w-0 text-left">
          {index !== undefined ? (
            <span className="w-6 text-center text-sm text-white/40 tabular-nums shrink-0">{index + 1}</span>
          ) : null}
          {showAlbum ? (
            <AlbumCover gradient={song.gradient} imageUrl={song.coverUrl} size="sm" rounded="md" />
          ) : null}
          <div className="flex-1 min-w-0">
            <p className="text-[15px] font-medium text-white truncate">{song.title}</p>
            <p className="text-sm text-white/50 truncate">{song.artist}</p>
          </div>
          <span className="text-xs text-white/40 tabular-nums shrink-0">{formatDuration(song.duration)}</span>
        </button>
        <button
          type="button"
          onClick={() => setMenuOpen(true)}
          className="w-9 h-9 shrink-0 flex items-center justify-center rounded-full hover:bg-white/10 active:bg-white/15 transition-colors"
          aria-label={`${song.title} 更多操作`}
        >
          <IconMore className="w-5 h-5 text-white/40" />
        </button>
      </div>
      {menuOpen ? <SongActionSheet song={song} onClose={() => setMenuOpen(false)} /> : null}
    </>
  )
}
