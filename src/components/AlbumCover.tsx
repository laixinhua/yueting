import { useEffect, useState } from 'react'
import { gradientStyle } from '../utils/gradientStyle'
import { CoverImage } from './CoverImage'
import { IconMusic } from './icons'

interface AlbumCoverProps {
  gradient: string
  /** 在线封面（优先于渐变） */
  imageUrl?: string
  size?: 'sm' | 'md' | 'lg' | 'xl' | 'player'
  className?: string
  rounded?: 'md' | 'lg' | 'xl'
  /** 无封面时不显示音符图标（如收藏夹空封面） */
  hidePlaceholderIcon?: boolean
}

const sizeMap = {
  sm: 'w-12 h-12',
  md: 'w-14 h-14',
  lg: 'w-full h-36',
  xl: 'w-[min(100%,280px)] h-[min(100%,280px)] mx-auto',
  player: 'w-[min(72vw,240px)] h-[min(72vw,240px)] mx-auto shrink-0',
}

const roundedMap = {
  md: 'rounded-md',
  lg: 'rounded-lg',
  xl: 'rounded-xl',
}

export function AlbumCover({
  gradient,
  imageUrl,
  size = 'md',
  className = '',
  rounded = 'md',
  hidePlaceholderIcon = false,
}: AlbumCoverProps) {
  const [imgFailed, setImgFailed] = useState(false)
  useEffect(() => {
    setImgFailed(false)
  }, [imageUrl])

  const showImage = Boolean(imageUrl) && !imgFailed

  return (
    <div
      className={`relative overflow-hidden shrink-0 ${sizeMap[size]} ${roundedMap[rounded]} ${className} shadow-lg shadow-black/30`}
      style={gradientStyle(gradient)}
    >
      {showImage ? (
        <CoverImage
          src={imageUrl}
          className="absolute inset-0 w-full h-full object-cover"
          onError={() => setImgFailed(true)}
        />
      ) : null}
      {showImage ? <div className="absolute inset-0 bg-black/10" /> : null}
      {!showImage && !hidePlaceholderIcon ? (
        <IconMusic className="absolute bottom-1 right-1 w-1/3 h-1/3 text-white/30" />
      ) : null}
    </div>
  )
}
