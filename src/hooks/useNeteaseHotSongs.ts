import { useCallback, useEffect, useRef, useState } from 'react'
import { EbnrApiError } from '../api/ebnr'
import { NETEASE_HOT_SOURCES } from '../data/neteaseCharts'
import type { Song } from '../types'
import { readHotPoolCache, readHotPoolCacheStale, writeHotPoolCache } from '../utils/neteaseCache'
import { LIST_DISPLAY_LIMIT } from '../utils/listLimit'
import { PLAYABLE_POOL_LIMIT, filterPlayableNeteaseSongs } from '../utils/neteasePlayable'
import { fetchNeteasePlaylistSongs, mergeTracksOrdered } from '../utils/neteasePlaylistPool'
import { pickRandomSongs } from '../utils/randomSongs'

function applyHotCache(cache: { display: Song[]; pool: Song[] }) {
  return { pool: cache.pool, display: cache.display }
}

export function useNeteaseHotSongs() {
  const initialStale = readHotPoolCacheStale()
  const poolRef = useRef<Song[]>(initialStale?.pool ?? [])
  const [songs, setSongs] = useState<Song[]>(initialStale?.display ?? [])
  const [loading, setLoading] = useState(!initialStale)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async (force = false) => {
    if (!force) {
      const cached = readHotPoolCache()
      if (cached) {
        const { pool, display } = applyHotCache(cached)
        poolRef.current = pool
        setSongs(display)
        setLoading(false)
        setError(null)
        return
      }
    }

    const stale = !force ? readHotPoolCacheStale() : null
    if (stale) {
      const { pool, display } = applyHotCache(stale)
      poolRef.current = pool
      setSongs(display)
      setLoading(false)
      setError(null)
    } else {
      setLoading(true)
      setError(null)
    }

    try {
      const lists = await fetchNeteasePlaylistSongs(NETEASE_HOT_SOURCES)
      const [hotChart, ...rest] = lists
      const merged = mergeTracksOrdered(hotChart ?? [], ...rest)

      const ranked = await filterPlayableNeteaseSongs(hotChart ?? [], {
        limit: LIST_DISPLAY_LIMIT,
      })
      const display = ranked.length > 0 ? ranked : poolRef.current.slice(0, LIST_DISPLAY_LIMIT)
      if (display.length > 0) {
        poolRef.current = poolRef.current.length > 0 ? poolRef.current : display
        setSongs(display)
        setLoading(false)
      }

      const pool = await filterPlayableNeteaseSongs(merged, { limit: PLAYABLE_POOL_LIMIT })
      const finalDisplay = ranked.length > 0 ? ranked : pool.slice(0, LIST_DISPLAY_LIMIT)
      poolRef.current = pool.length > 0 ? pool : finalDisplay
      setSongs(finalDisplay.length > 0 ? finalDisplay : poolRef.current.slice(0, LIST_DISPLAY_LIMIT))
      if (poolRef.current.length > 0) {
        writeHotPoolCache({ display: finalDisplay, pool: poolRef.current })
      }
    } catch (err: unknown) {
      if (!stale) {
        poolRef.current = []
        setSongs([])
        setError(err instanceof EbnrApiError ? err.message : '热门音乐加载失败')
      }
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  const refresh = useCallback(() => {
    if (poolRef.current.length > 0) {
      setSongs(pickRandomSongs(poolRef.current, LIST_DISPLAY_LIMIT))
      return
    }
    void load()
  }, [load])

  return { songs, loading, error, refresh, reload: () => load(true) }
}
