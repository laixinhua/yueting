import { useEffect, useState } from 'react'
import { EbnrApiError } from '../api/ebnr'
import {
  FEATURED_DAILY_PLAYLIST_COUNT,
  NETEASE_DAILY_PLAYLIST_CANDIDATES,
} from '../data/neteaseCharts'
import type { Playlist } from '../types'
import { readFeaturedPlaylistsCache, writeFeaturedPlaylistsCache } from '../utils/neteaseCache'
import { pickFeaturedItems } from '../utils/neteaseFeatured'
import { buildFeaturedPlaylistCard } from '../utils/neteasePlaylistLoad'

async function loadFeaturedPlaylists(): Promise<Playlist[]> {
  const cached = readFeaturedPlaylistsCache()
  if (cached && cached.length > 0) return cached

  const picked = await pickFeaturedItems(
    NETEASE_DAILY_PLAYLIST_CANDIDATES,
    FEATURED_DAILY_PLAYLIST_COUNT,
    (item) => buildFeaturedPlaylistCard(item),
    3,
  )

  if (picked.length > 0) writeFeaturedPlaylistsCache(picked)
  return picked
}

export function useNeteaseFeaturedPlaylists() {
  const [playlists, setPlaylists] = useState<Playlist[]>(() => readFeaturedPlaylistsCache() ?? [])
  const [loading, setLoading] = useState(() => (readFeaturedPlaylistsCache()?.length ?? 0) === 0)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false

    void (async () => {
      const cached = readFeaturedPlaylistsCache()
      if (cached && cached.length > 0) {
        if (!cancelled) {
          setPlaylists(cached)
          setLoading(false)
        }
        return
      }

      if (!cancelled) setLoading(true)
      setError(null)
      try {
        const list = await loadFeaturedPlaylists()
        if (!cancelled) setPlaylists(list)
      } catch (err: unknown) {
        if (!cancelled) {
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

  return { playlists, loading, error }
}
