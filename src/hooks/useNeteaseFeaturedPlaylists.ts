import { useCallback, useEffect, useState } from 'react'
import { EbnrApiError } from '../api/ebnr'
import {
  FEATURED_DAILY_PLAYLIST_COUNT,
  NETEASE_DAILY_PLAYLIST_CANDIDATES,
} from '../data/neteaseCharts'
import type { Playlist } from '../types'
import {
  readFeaturedPlaylistsCache,
  readFeaturedPlaylistsCacheStale,
  writeFeaturedPlaylistsCache,
} from '../utils/neteaseCache'
import { prefetchCover, warmCovers } from '../utils/coverImageCache'
import { pickFeaturedItems } from '../utils/neteaseFeatured'
import { buildFeaturedPlaylistCard } from '../utils/neteasePlaylistLoad'
import { shuffleCopy } from '../utils/randomSongs'

async function fetchFeaturedPlaylistsFresh(): Promise<Playlist[]> {
  const candidates = shuffleCopy(NETEASE_DAILY_PLAYLIST_CANDIDATES)
  const picked = await pickFeaturedItems(
    candidates,
    FEATURED_DAILY_PLAYLIST_COUNT,
    (item) => buildFeaturedPlaylistCard(item),
    3,
  )

  if (picked.length > 0) writeFeaturedPlaylistsCache(picked)
  return picked
}

export function useNeteaseFeaturedPlaylists() {
  const [playlists, setPlaylists] = useState<Playlist[]>(
    () => readFeaturedPlaylistsCache() ?? readFeaturedPlaylistsCacheStale() ?? [],
  )
  const [loading, setLoading] = useState(() => {
    const fresh = readFeaturedPlaylistsCache()
    const stale = readFeaturedPlaylistsCacheStale()
    return !fresh?.length && !stale?.length
  })
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    const fresh = readFeaturedPlaylistsCache()

    // 24h 内缓存仍有效：直接展示，不再重新随机挑选
    if (fresh?.length) {
      setPlaylists(fresh)
      void warmCovers(fresh.map((p) => p.coverUrl))
      return
    }

    const stale = readFeaturedPlaylistsCacheStale()
    const hadStale = (stale?.length ?? 0) > 0

    if (hadStale) void warmCovers(stale!.map((p) => p.coverUrl))
    else setLoading(true)

    void (async () => {
      try {
        const list = await fetchFeaturedPlaylistsFresh()
        if (!cancelled && list.length > 0) {
          setPlaylists(list)
          for (const p of list) prefetchCover(p.coverUrl)
        }
      } catch (err: unknown) {
        if (!cancelled && !hadStale) {
          setPlaylists([])
          setError(err instanceof EbnrApiError ? err.message : '歌单加载失败')
        }
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()

    return () => {
      cancelled = true
    }
  }, [])

  const refresh = useCallback(async () => {
    try {
      const list = await fetchFeaturedPlaylistsFresh()
      if (list.length > 0) {
        setPlaylists(list)
        for (const p of list) prefetchCover(p.coverUrl)
      }
    } catch {
      /* 换一换失败：保留当前列表 */
    }
  }, [])

  return { playlists, loading, error, refresh }
}
