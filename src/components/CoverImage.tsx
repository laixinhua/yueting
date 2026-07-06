import { useCallback, useEffect, useRef, useState } from 'react'
import {
  cacheCoverFromNetwork,
  getMemoryCachedCoverUrl,
  resolveCoverUrl,
} from '../utils/coverImageCache'
import { normalizeImageUrl } from '../utils/imageUrl'

interface CoverImageProps {
  src?: string
  alt?: string
  className?: string
  onError?: () => void
  /** 图片可显示时回调（含缓存命中） */
  onReady?: () => void
}

export function CoverImage({ src, alt = '', className, onError, onReady }: CoverImageProps) {
  const normalized = normalizeImageUrl(src)
  const [resolvedSrc, setResolvedSrc] = useState<string | null>(() =>
    normalized ? getMemoryCachedCoverUrl(normalized) : null,
  )
  const [failed, setFailed] = useState(false)
  const readyRef = useRef(false)

  const notifyReady = useCallback(() => {
    if (readyRef.current) return
    readyRef.current = true
    onReady?.()
  }, [onReady])

  useEffect(() => {
    readyRef.current = false
    setFailed(false)

    if (!normalized) {
      setResolvedSrc(null)
      return
    }

    const mem = getMemoryCachedCoverUrl(normalized)
    if (mem) {
      setResolvedSrc(mem)
      notifyReady()
      return
    }

    let cancelled = false
    void resolveCoverUrl(normalized).then((url) => {
      if (cancelled || !url) return
      setResolvedSrc(url)
      if (url !== normalized) notifyReady()
    })

    return () => {
      cancelled = true
    }
  }, [normalized, notifyReady])

  if (!normalized || failed) return null
  if (!resolvedSrc) return null

  return (
    <img
      src={resolvedSrc}
      alt={alt}
      className={className}
      loading="eager"
      decoding="async"
      referrerPolicy="no-referrer"
      onLoad={() => {
        notifyReady()
        if (normalized && resolvedSrc === normalized) {
          void cacheCoverFromNetwork(normalized)
        }
      }}
      onError={() => {
        setFailed(true)
        onError?.()
      }}
    />
  )
}
