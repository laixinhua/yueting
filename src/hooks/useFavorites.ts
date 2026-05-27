import { useCallback, useEffect, useState } from 'react'

const KEY = 'yueting-favorites'

/** 去掉历史演示用的 mock 歌曲 id（如 "1"、"2"） */
function sanitizeIds(ids: string[]): string[] {
  return ids.filter((id) => typeof id === 'string' && id.length > 0 && !/^\d+$/.test(id))
}

function loadIds(): string[] {
  try {
    const raw = localStorage.getItem(KEY)
    if (raw) {
      const parsed = JSON.parse(raw) as string[]
      if (Array.isArray(parsed)) return sanitizeIds(parsed)
    }
  } catch {
    /* ignore */
  }
  return []
}

export function useFavorites() {
  const [ids, setIds] = useState<string[]>(loadIds)

  useEffect(() => {
    localStorage.setItem(KEY, JSON.stringify(ids))
  }, [ids])

  const isFavorite = useCallback((id: string) => ids.includes(id), [ids])

  const toggleFavorite = useCallback((id: string) => {
    setIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
    )
  }, [])

  return { favoriteIds: ids, isFavorite, toggleFavorite }
}
