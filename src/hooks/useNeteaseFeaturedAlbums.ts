import { useEffect, useState } from 'react'
import { EbnrApiError, getAlbumMeta } from '../api/ebnr'
import { FEATURED_ALBUM_COUNT, NETEASE_FEATURED_ALBUM_CANDIDATES } from '../data/neteaseAlbums'
import type { Playlist } from '../types'
import { buildNeteaseAlbumCard } from '../utils/neteaseAlbum'
import { readFeaturedAlbumsCache, writeFeaturedAlbumsCache } from '../utils/neteaseCache'
import { probeAlbumRecommendable } from '../utils/neteasePlaylistLoad'

async function loadFeaturedAlbums(): Promise<Playlist[]> {
  const cached = readFeaturedAlbumsCache()
  if (cached && cached.length > 0) return cached

  const picked: Playlist[] = []
  for (const item of NETEASE_FEATURED_ALBUM_CANDIDATES) {
    if (picked.length >= FEATURED_ALBUM_COUNT) break
    try {
      const ok = await probeAlbumRecommendable(item.id)
      if (!ok) continue
      const meta = await getAlbumMeta(item.id)
      picked.push(buildNeteaseAlbumCard(meta, item.gradient))
    } catch {
      /* 单个失败跳过 */
    }
  }

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
