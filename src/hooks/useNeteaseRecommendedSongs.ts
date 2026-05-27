import { useCallback, useEffect, useRef, useState } from 'react'
import { EbnrApiError } from '../api/ebnr'
import { NETEASE_RECOMMEND_SOURCES } from '../data/neteaseCharts'
import type { Song } from '../types'
import { readRecommendPoolCache, writeRecommendPoolCache } from '../utils/neteaseCache'
import { LIST_DISPLAY_LIMIT } from '../utils/listLimit'
import { PLAYABLE_POOL_LIMIT, filterPlayableNeteaseSongs } from '../utils/neteasePlayable'
import { fetchNeteasePlaylistSongs, mergeTracks } from '../utils/neteasePlaylistPool'
import { pickRandomSongs } from '../utils/randomSongs'

async function fetchRecommendPool(force: boolean): Promise<Song[]> {
  if (!force) {
    const cached = readRecommendPoolCache()
    if (cached && cached.length > 0) return cached
  }
  const results = await fetchNeteasePlaylistSongs(NETEASE_RECOMMEND_SOURCES)
  const merged = mergeTracks(results)
  const pool = await filterPlayableNeteaseSongs(merged, { limit: PLAYABLE_POOL_LIMIT })
  if (pool.length > 0) writeRecommendPoolCache(pool)
  return pool
}

export function useNeteaseRecommendedSongs() {
  const initialPool = readRecommendPoolCache() ?? []
  const poolRef = useRef<Song[]>(initialPool)
  const [songs, setSongs] = useState<Song[]>(() =>
    initialPool.length > 0 ? pickRandomSongs(initialPool, LIST_DISPLAY_LIMIT) : [],
  )
  const [loading, setLoading] = useState(initialPool.length === 0)
  const [error, setError] = useState<string | null>(null)

  const pickDisplay = useCallback((pool: Song[]) => {
    setSongs(pickRandomSongs(pool, LIST_DISPLAY_LIMIT))
  }, [])

  const loadPool = useCallback(async (force = false) => {
    if (!force) {
      const cached = readRecommendPoolCache()
      if (cached && cached.length > 0) {
        poolRef.current = cached
        pickDisplay(cached)
        setLoading(false)
        setError(null)
        return
      }
    }

    setLoading(true)
    setError(null)
    try {
      const pool = await fetchRecommendPool(force)
      poolRef.current = pool
      pickDisplay(pool)
    } catch (err: unknown) {
      poolRef.current = []
      setSongs([])
      setError(err instanceof EbnrApiError ? err.message : '推荐音乐加载失败')
    } finally {
      setLoading(false)
    }
  }, [pickDisplay])

  useEffect(() => {
    void loadPool()
  }, [loadPool])

  const refresh = useCallback(() => {
    if (poolRef.current.length > 0) {
      pickDisplay(poolRef.current)
      return
    }
    void loadPool()
  }, [loadPool, pickDisplay])

  return { songs, loading, error, refresh, reload: () => loadPool(true) }
}
