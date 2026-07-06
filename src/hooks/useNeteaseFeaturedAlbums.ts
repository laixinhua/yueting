import { useEffect, useState } from 'react'
import { EbnrApiError } from '../api/ebnr'
import { FEATURED_ALBUM_COUNT, NETEASE_FEATURED_ALBUM_CANDIDATES } from '../data/neteaseAlbums'
import type { Playlist } from '../types'
import { readFeaturedAlbumsCache, readFeaturedAlbumsCacheStale, writeFeaturedAlbumsCache } from '../utils/neteaseCache'
import { prefetchCover, warmCovers } from '../utils/coverImageCache'
import { pickFeaturedItems } from '../utils/neteaseFeatured'
import { buildFeaturedAlbumCard } from '../utils/neteasePlaylistLoad'
import { shuffleCopy } from '../utils/randomSongs'

async function fetchFeaturedAlbumsFresh(): Promise<Playlist[]> {
  const candidates = shuffleCopy(NETEASE_FEATURED_ALBUM_CANDIDATES)
  const picked = await pickFeaturedItems(
    candidates,
    FEATURED_ALBUM_COUNT,
    (item) => buildFeaturedAlbumCard(item),
    3,
  )

  if (picked.length > 0) writeFeaturedAlbumsCache(picked)
  return picked
}

export function useNeteaseFeaturedAlbums() {
  const [albums, setAlbums] = useState<Playlist[]>(
    () => readFeaturedAlbumsCache() ?? readFeaturedAlbumsCacheStale() ?? [],
  )
  const [loading, setLoading] = useState(() => {
    const fresh = readFeaturedAlbumsCache()
    const stale = readFeaturedAlbumsCacheStale()
    return !fresh?.length && !stale?.length
  })
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    const fresh = readFeaturedAlbumsCache()

    if (fresh?.length) {
      setAlbums(fresh)
      void warmCovers(fresh.map((a) => a.coverUrl))
      return
    }

    const stale = readFeaturedAlbumsCacheStale()
    const hadStale = (stale?.length ?? 0) > 0

    if (hadStale) void warmCovers(stale!.map((a) => a.coverUrl))
    else setLoading(true)

    void (async () => {
      try {
        const list = await fetchFeaturedAlbumsFresh()
        if (!cancelled && list.length > 0) {
          setAlbums(list)
          for (const a of list) prefetchCover(a.coverUrl)
        }
      } catch (err: unknown) {
        if (!cancelled && !hadStale) {
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
