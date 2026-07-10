import { useCallback, useEffect, useState } from 'react'
import { loadJSON, saveJSON } from '../utils/storage'

const KEY = 'yueting-favorites'

/** 去掉历史演示用的 mock 歌曲 id（如 "1"、"2"） */
function sanitizeIds(ids: string[]): string[] {
  return ids.filter((id) => typeof id === 'string' && id.length > 0 && !/^\d+$/.test(id))
}

export function useFavorites() {
  const [ids, setIds] = useState<string[]>([])

  useEffect(() => {
    let cancelled = false
    void loadJSON<string[]>(KEY, []).then((data) => {
      if (!cancelled) setIds(Array.isArray(data) ? sanitizeIds(data) : [])
    })
    return () => { cancelled = true }
  }, [])

  useEffect(() => {
    void saveJSON(KEY, ids)
  }, [ids])

  const isFavorite = useCallback((id: string) => ids.includes(id), [ids])

  const toggleFavorite = useCallback((id: string) => {
    setIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
    )
  }, [])

  return { favoriteIds: ids, isFavorite, toggleFavorite }
}
