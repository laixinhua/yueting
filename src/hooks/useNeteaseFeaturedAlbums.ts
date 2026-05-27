import { useEffect, useState } from 'react'
import { EbnrApiError } from '../api/ebnr'
import { FEATURED_ALBUM_COUNT, NETEASE_FEATURED_ALBUM_CANDIDATES } from '../data/neteaseAlbums'
import type { Playlist } from '../types'
import { readFeaturedAlbumsCache, writeFeaturedAlbumsCache } from '../utils/neteaseCache'
import { pickFeaturedItems } from '../utils/neteaseFeatured'
import { buildFeaturedAlbumCard } from '../utils/neteasePlaylistLoad'

async function loadFeaturedAlbums(): Promise<Playlist[]> {
  const cached = readFeaturedAlbumsCache()
  if (cached && cached.length > 0) return cached

  const picked = await pickFeaturedItems(
    NETEASE_FEATURED_ALBUM_CANDIDATES,
    FEATURED_ALBUM_COUNT,
    (item) => buildFeaturedAlbumCard(item),
    3,
  )

  if (picked.length > 0) writeFeaturedAlbumsCache(picked)
  return picked
}

export function useNeteaseFeaturedAlbums() {
  const [albums, setAlbums] = useState<Playlist[]>(() => readFeaturedAlbumsCache() ?? [])
  const [loading, setLoading] = useState(() => (readFeaturedAlbumsCache()?.length ?? 0) === 0)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false

    void (async () => {
      const cached = readFeaturedAlbumsCache()
      if (cached && cached.length > 0) {
        if (!cancelled) {
          setAlbums(cached)
          setLoading(false)
        }
        return
      }

      if (!cancelled) setLoading(true)
      setError(null)
      try {
        const list = await loadFeaturedAlbums()
        if (!cancelled) setAlbums(list)
      } catch (err: unknown) {
        if (!cancelled) {
          setAlbums([])
          setError(err instanceof EbnrApiError ? err.message : '专辑加载失败')
        }
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()

    return () => {
      cancelled = true
    }
  }, [])

  return { albums, loading, error }
}
