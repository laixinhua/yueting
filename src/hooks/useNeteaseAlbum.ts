import { useEffect, useState } from 'react'
import { EbnrApiError } from '../api/ebnr'
import type { Playlist } from '../types'
import { readAlbumCache } from '../utils/neteaseCache'
import { loadCachedOrFreshAlbum } from '../utils/neteasePlaylistLoad'

export function useNeteaseAlbum(albumId: number | null, gradient: string) {
  const [playlist, setPlaylist] = useState<Playlist | null>(() =>
    albumId != null ? readAlbumCache(albumId) : null,
  )
  const [loading, setLoading] = useState(() => {
    if (albumId == null) return false
    return readAlbumCache(albumId) == null
  })
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (albumId == null) {
      setPlaylist(null)
      setError(null)
      setLoading(false)
      return
    }

    let cancelled = false
    const cached = readAlbumCache(albumId)
    if (cached) {
      setPlaylist(cached)
      setLoading(false)
      setError(null)
      return
    }

    setLoading(true)
    setError(null)
    setPlaylist(null)

    loadCachedOrFreshAlbum(albumId, gradient)
      .then((result) => {
        if (!cancelled) setPlaylist(result)
      })
      .catch((err: unknown) => {
        if (!cancelled) {
          setError(err instanceof EbnrApiError ? err.message : '专辑加载失败')
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [albumId, gradient])

  return { playlist, loading, error }
}
