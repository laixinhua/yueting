import { useState } from 'react'
import { normalizeImageUrl } from '../utils/imageUrl'

interface CoverImageProps {
  src?: string
  alt?: string
  className?: string
  onError?: () => void
}

export function CoverImage({ src, alt = '', className, onError }: CoverImageProps) {
  const [failed, setFailed] = useState(false)
  const normalized = normalizeImageUrl(src)

  if (!normalized || failed) return null

  return (
    <img
      src={normalized}
      alt={alt}
      className={className}
      loading="lazy"
      decoding="async"
      referrerPolicy="no-referrer"
      onError={() => {
        setFailed(true)
        onError?.()
      }}
    />
  )
}
