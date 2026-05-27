import { useCallback, useEffect, useRef, useState } from 'react'
import { EbnrApiError } from '../api/ebnr'
import { NETEASE_HOT_SOURCES } from '../data/neteaseCharts'
import type { Song } from '../types'
import { readHotPoolCache, writeHotPoolCache } from '../utils/neteaseCache'
import { LIST_DISPLAY_LIMIT } from '../utils/listLimit'
import { PLAYABLE_POOL_LIMIT, filterPlayableNeteaseSongs } from '../utils/neteasePlayable'
import { fetchNeteasePlaylistSongs, mergeTracksOrdered } from '../utils/neteasePlaylistPool'
import { pickRandomSongs } from '../utils/randomSongs'

function applyHotCache(cache: { display: Song[]; pool: Song[] }) {
  return { pool: cache.pool, display: cache.display }
}

export function useNeteaseHotSongs() {
  const initialCache = readHotPoolCache()
  const poolRef = useRef<Song[]>(initialCache?.pool ?? [])
  const [songs, setSongs] = useState<Song[]>(initialCache?.display ?? [])
  const [loading, setLoading] = useState(!initialCache)
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

    setLoading(true)
    setError(null)
    try {
      const lists = await fetchNeteasePlaylistSongs(NETEASE_HOT_SOURCES)
      const [hotChart, ...rest] = lists
      const merged = mergeTracksOrdered(hotChart ?? [], ...rest)
      const [ranked, pool] = await Promise.all([
        filterPlayableNeteaseSongs(hotChart ?? [], { limit: LIST_DISPLAY_LIMIT }),
        filterPlayableNeteaseSongs(merged, { limit: PLAYABLE_POOL_LIMIT }),
      ])
      const display = ranked.length > 0 ? ranked : pool.slice(0, LIST_DISPLAY_LIMIT)
      poolRef.current = pool
      setSongs(display)
      writeHotPoolCache({ display, pool })
    } catch (err: unknown) {
      poolRef.current = []
      setSongs([])
      setError(err instanceof EbnrApiError ? err.message : '热门音乐加载失败')
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
