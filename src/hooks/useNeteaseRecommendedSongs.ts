import { useCallback, useEffect, useRef, useState } from 'react'
import { EbnrApiError } from '../api/ebnr'
import { NETEASE_RECOMMEND_SOURCES } from '../data/neteaseCharts'
import type { Song } from '../types'
import { readRecommendPoolCacheStale, writeRecommendPoolCache } from '../utils/neteaseCache'
import { LIST_DISPLAY_LIMIT } from '../utils/listLimit'
import { PLAYABLE_POOL_LIMIT, filterPlayableNeteaseSongs } from '../utils/neteasePlayable'
import { fetchNeteasePlaylistSongs, mergeTracks } from '../utils/neteasePlaylistPool'
import { pickRandomSongs } from '../utils/randomSongs'

async function fetchRecommendPoolFresh(
  onQuickPool?: (pool: Song[]) => void,
): Promise<Song[]> {
  const results = await fetchNeteasePlaylistSongs(NETEASE_RECOMMEND_SOURCES)
  const merged = mergeTracks(results)

  const quick = await filterPlayableNeteaseSongs(merged, { limit: LIST_DISPLAY_LIMIT })
  if (quick.length > 0) {
    writeRecommendPoolCache(quick)
    onQuickPool?.(quick)
  }

  const pool = await filterPlayableNeteaseSongs(merged, { limit: PLAYABLE_POOL_LIMIT })
  if (pool.length > 0) {
    writeRecommendPoolCache(pool)
    return pool
  }
  return quick
}

export function useNeteaseRecommendedSongs() {
  const initialStale = readRecommendPoolCacheStale() ?? []
  const poolRef = useRef<Song[]>(initialStale)
  const [songs, setSongs] = useState<Song[]>(() =>
    initialStale.length > 0 ? pickRandomSongs(initialStale, LIST_DISPLAY_LIMIT) : [],
  )
  const [loading, setLoading] = useState(initialStale.length === 0)
  const [error, setError] = useState<string | null>(null)

  const pickDisplay = useCallback((pool: Song[]) => {
    setSongs(pickRandomSongs(pool, LIST_DISPLAY_LIMIT))
  }, [])

  const refreshFromNetwork = useCallback(async () => {
    const hadStale = poolRef.current.length > 0
    if (!hadStale) setLoading(true)
    setError(null)

    try {
      const pool = await fetchRecommendPoolFresh((quick) => {
        poolRef.current = quick
        pickDisplay(quick)
        setLoading(false)
      })
      poolRef.current = pool
      pickDisplay(pool)
    } catch (err: unknown) {
      if (!hadStale) {
        poolRef.current = []
        setSongs([])
        setError(err instanceof EbnrApiError ? err.message : '推荐音乐加载失败')
      }
    } finally {
      setLoading(false)
    }
  }, [pickDisplay])

  useEffect(() => {
    void refreshFromNetwork()
  }, [refreshFromNetwork])

  const refresh = useCallback(() => {
    if (poolRef.current.length > 0) {
      pickDisplay(poolRef.current)
      return
    }
    void refreshFromNetwork()
  }, [refreshFromNetwork, pickDisplay])

  return { songs, loading, error, refresh, reload: refreshFromNetwork }
}
