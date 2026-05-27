import { useEffect, useState } from 'react'
import { CoverImage } from './CoverImage'
import type { Playlist } from '../types'
import { gradientStyle } from '../utils/gradientStyle'
import { getPlaylistPlayButtonStyle } from '../utils/songTheme'
import { IconPlay } from './icons'

interface PlaylistCardProps {
  playlist: Playlist
  onClick?: () => void
  variant?: 'square' | 'wide'
  /** 横向滚动列表内使用 div 而非 button，避免触摸滑动被拦截 */
  scrollable?: boolean
}

function HoverPlayButton({ size = 'lg' }: { size?: 'lg' | 'sm' }) {
  const sizeClass = size === 'lg' ? 'w-12 h-12' : 'w-9 h-9'
  const iconClass = size === 'lg' ? 'w-6 h-6' : 'w-4 h-4'

  return (
    <div
      style={getPlaylistPlayButtonStyle()}
      className={`${sizeClass} rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 translate-y-2 group-hover:translate-y-0 transition-all`}
    >
      <IconPlay className={`${iconClass} text-white block shrink-0`} />
    </div>
  )
}

export function PlaylistCard({ playlist, onClick, variant = 'square', scrollable = false }: PlaylistCardProps) {
  const [imgFailed, setImgFailed] = useState(false)
  useEffect(() => {
    setImgFailed(false)
  }, [playlist.coverUrl, playlist.id])

  const showCover = Boolean(playlist.coverUrl) && !imgFailed

  if (variant === 'wide') {
    return (
      <button
        type="button"
        onClick={onClick}
        className="group w-full flex items-center gap-4 p-3 rounded-lg bg-surface-highlight/60 hover:bg-surface-highlight active:scale-[0.98] transition-all text-left"
      >
        <div
          className="relative w-14 h-14 rounded-md shrink-0 shadow-md overflow-hidden"
          style={gradientStyle(playlist.gradient)}
        >
          {showCover ? (
            <CoverImage
              src={playlist.coverUrl}
              className="absolute inset-0 w-full h-full object-cover"
              onError={() => setImgFailed(true)}
            />
          ) : null}
          {showCover ? (
            <div className="absolute inset-0 flex items-center justify-center bg-black/0 group-hover:bg-black/25 transition-colors">
              <HoverPlayButton size="sm" />
            </div>
          ) : null}
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-white truncate">{playlist.title}</p>
          {playlist.description ? (
            <p className="text-sm text-white/50 truncate mt-0.5">{playlist.description}</p>
          ) : null}
        </div>
      </button>
    )
  }

  const squareContent = (
    <>
      <div
        className="relative w-full h-36 rounded-lg shadow-lg shadow-black/40 mb-3 overflow-hidden"
        style={gradientStyle(playlist.gradient)}
      >
        {showCover ? (
          <CoverImage
            src={playlist.coverUrl}
            className="absolute inset-0 w-full h-full object-cover"
            onError={() => setImgFailed(true)}
          />
        ) : null}
        {showCover ? (
          <div className="absolute inset-0 flex items-center justify-center bg-black/0 group-hover:bg-black/20 transition-colors">
            <HoverPlayButton size="lg" />
          </div>
        ) : (
          <div className="absolute inset-0 flex items-center justify-center px-2">
            <span
              className="text-center font-bold text-sm text-white leading-snug line-clamp-3"
              style={{ textShadow: '0 1px 6px rgba(0,0,0,0.35)' }}
            >
              {playlist.title}
            </span>
          </div>
        )}
      </div>
      <p className="font-semibold text-sm text-white truncate">{playlist.title}</p>
      {playlist.description ? (
        <p className="text-xs text-white/50 truncate mt-1">{playlist.description}</p>
      ) : null}
    </>
  )

  if (scrollable) {
    return (
      <div
        role="button"
        tabIndex={0}
        onClick={onClick}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault()
            onClick?.()
          }
        }}
        className="w-36 shrink-0 group text-left select-none cursor-pointer"
      >
        {squareContent}
      </div>
    )
  }

  return (
    <button
      type="button"
      onClick={onClick}
      className="w-36 shrink-0 group text-left active:scale-[0.97] transition-transform"
    >
      {squareContent}
    </button>
  )
}
