import type { Playlist } from '../types'
import { AlbumCover } from './AlbumCover'
import { IconChevronLeft } from './icons'

interface SearchResultRowProps {
  item: Playlist
  kind: 'artist' | 'album'
  onClick: () => void
}

export function SearchResultRow({ item, kind, onClick }: SearchResultRowProps) {
  const kindLabel = kind === 'artist' ? '歌手' : '专辑'
  const sub =
    kind === 'artist'
      ? item.description ?? `${item.songs.length} 首歌曲`
      : item.description
        ? `${item.description} · ${item.songs.length} 首`
        : `${item.songs.length} 首歌曲`

  return (
    <button
      type="button"
      onClick={onClick}
      className="w-full flex items-center gap-3 p-3 hover:bg-white/5 active:bg-white/10 transition-colors text-left"
    >
      <AlbumCover gradient={item.gradient} size="md" rounded="md" />
      <div className="flex-1 min-w-0">
        <p className="text-[15px] font-medium text-white truncate">{item.title}</p>
        <p className="text-sm text-white/50 truncate">
          {kindLabel} · {sub}
        </p>
      </div>
      <IconChevronLeft className="w-5 h-5 text-white/30 rotate-180 shrink-0" />
    </button>
  )
}
