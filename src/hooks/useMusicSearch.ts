import { useCallback, useEffect, useRef, useState } from 'react'
import type { Song } from '../types'
import { searchAllMusic, getHotSongsFromAll, getPlayUrlForSong } from '../api/musicAggregator'
import { isNeteaseSongPlayable, parseNeteaseId } from '../utils/neteaseSong'

/**
 * 并发探测每首歌是否可取播放链接，仅保留可播放的。
 * 背景：EBNR 搜索结果不带播放地址，部分歌曲（会员/失效）在 /audio 取不到 url，
 * 若不过滤会出现“搜得到、点开报错”。这里复用了第6轮前移除的 playable 过滤，
 * 但用并发池避免一次性打几十个请求把上游打挂；保持原搜索排序。
 */
const PROBE_CONCURRENCY = 6

async function filterPlayableSongs(songs: Song[]): Promise<Song[]> {
  const keep = new Array<boolean>(songs.length).fill(false)
  let cursor = 0

  async function worker() {
    while (cursor < songs.length) {
      const i = cursor++
      const s = songs[i]!
      let playable = true
      if (s.source === 'netease') {
        const ncmId = s.neteaseId ?? parseNeteaseId(s.id)
        if (ncmId != null) {
          try {
            playable = await isNeteaseSongPlayable(ncmId)
          } catch {
            playable = true // 探测异常时保守保留，避免误删可播放歌曲
          }
        }
      }
      keep[i] = playable
    }
  }

  const n = Math.min(PROBE_CONCURRENCY, songs.length)
  await Promise.all(Array.from({ length: n }, () => worker()))
  return songs.filter((_, i) => keep[i])
}

export interface MusicSearchState {
  songs: Song[]
  loading: boolean
  loadingMore: boolean
  error: string | null
  sources: string[]
  totalCount: number
  hasMore: boolean
  loadMore: () => void
}

export interface HotSongsState {
  songs: Song[]
  loading: boolean
  error: string | null
}

/**
 * 多源音乐搜索Hook
 * 搜索网易云音乐
 */
export function useMusicSearch(keyword: string, enabled = true): MusicSearchState {
  const [songs, setSongs] = useState<Song[]>([])
  const [loading, setLoading] = useState(false)
  const [loadingMore, setLoadingMore] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [sources, setSources] = useState<string[]>([])
  const [totalCount, setTotalCount] = useState(0)
  const [hasMore, setHasMore] = useState(false)

  // 累计请求量（加载更多时 50→100→150…）；用 ref 让 loadMore 闭包拿到最新值
  const requestedLimitRef = useRef(50)
  const loadingMoreRef = useRef(false)
  const keywordRef = useRef(keyword)
  keywordRef.current = keyword

  // 最新显示的歌曲列表与显示数量，供 loadMore 同步计算“是否还有下一页”
  const songsRef = useRef<Song[]>([])
  const displayedCountRef = useRef(0)
  songsRef.current = songs

  useEffect(() => {
    const q = keyword.trim()
    if (!enabled || !q) {
      setSongs([])
      setLoading(false)
      setError(null)
      setSources([])
      setTotalCount(0)
      setHasMore(false)
      setLoadingMore(false)
      loadingMoreRef.current = false
      requestedLimitRef.current = 50
      return
    }

    let cancelled = false
    setLoading(true)
    setError(null)
    setLoadingMore(false)
    loadingMoreRef.current = false
    requestedLimitRef.current = 50

    searchAllMusic(q, 50) // 向网易云请求的结果数量（limit）；聚合器已按来源全量返回，不去重不切片
      .then(async (result) => {
        if (cancelled) return

        // 仅保留可播放的：部分搜索结果在 /audio 取不到链接（会员/失效），
        // 不过滤会导致“搜到却放不了”。保持原搜索排序，不去重、不交错。
        const playable = await filterPlayableSongs(result.songs)
        songsRef.current = playable
        displayedCountRef.current = playable.length
        setSongs(playable)
        setSources(result.sources)
        setTotalCount(playable.length)
        // 按“屏幕实际显示数量”判断是否有下一页：仅当显示 > 50 才显示“加载更多”，
        // 不足 50 说明一页就显示完了（原始可能返回满 50，但被可播放过滤去掉约 30%）
        setHasMore(playable.length > 50)
      })
      .catch((err: unknown) => {
        if (cancelled) return
        setSongs([])
        setError(err instanceof Error ? err.message : '搜索失败，请稍后重试')
        setSources([])
        setTotalCount(0)
        setHasMore(false)
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [keyword, enabled])

  /** 加载更多：把请求量 +50 重新搜索并追加可播放的新结果（按 id 去重） */
  const loadMore = useCallback(async () => {
    const q = keywordRef.current.trim()
    if (!enabled || !q || loadingMoreRef.current) return

    loadingMoreRef.current = true
    setLoadingMore(true)
    const nextLimit = requestedLimitRef.current + 50

    try {
      const result = await searchAllMusic(q, nextLimit)
      const playable = await filterPlayableSongs(result.songs)

      // 基于最新已显示列表做去重追加（loadingMoreRef 已阻止并发，songsRef 即当前最新）
      const prev = songsRef.current
      const seen = new Set(prev.map((s) => s.id))
      const fresh = playable.filter((s) => {
        if (seen.has(s.id)) return false
        seen.add(s.id)
        return true
      })
      const appended = fresh.length

      requestedLimitRef.current = nextLimit
      if (appended === 0) {
        // 本次没有任何新增（全部重复/被过滤），说明已到底，隐藏“加载更多”
        setHasMore(false)
      } else {
        const next = [...prev, ...fresh]
        songsRef.current = next
        displayedCountRef.current = next.length
        setSongs(next)
        // 仍按“屏幕显示数量 > 50”决定是否继续提供“加载更多”
        setHasMore(next.length > 50)
      }
    } catch {
      /* 加载更多失败不影响已显示的列表 */
    } finally {
      loadingMoreRef.current = false
      setLoadingMore(false)
    }
  }, [enabled])

  return { songs, loading, loadingMore, error, sources, totalCount, hasMore, loadMore }
}

/**
 * 获取多源热门歌曲
 */
export function useHotSongs(limit = 50): HotSongsState {
  const [songs, setSongs] = useState<Song[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (limit <= 0) {
      setSongs([])
      setLoading(false)
      setError(null)
      return
    }

    let cancelled = false
    setLoading(true)
    setError(null)

    getHotSongsFromAll(limit)
      .then(async (result) => {
        if (cancelled) return
        setSongs(result)
      })
      .catch((err: unknown) => {
        if (cancelled) return
        setSongs([])
        setError(err instanceof Error ? err.message : '获取热门歌曲失败')
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [limit])

  return { songs, loading, error }
}

/**
 * 获取歌曲的播放URL（支持多源）
 */
export async function getSongPlayUrl(song: Song): Promise<string | null> {
  // 对于网易云歌曲，使用现有的EBNR方法
  if (!song.source || song.source === 'netease') {
    return null // 让现有的neteaseSong.ts处理
  }
  
  // 对于其他源，使用对应的方法
  return getPlayUrlForSong(song)
}

/**
 * 获取歌曲来源的友好显示名称
 */
export function getSourceDisplayName(song: Song): string {
  switch (song.source) {
    case 'netease': return '网易云音乐'
    default: return '未知来源'
  }
}

/**
 * 获取来源的图标类名
 */
export function getSourceIconClass(song: Song): string {
  switch (song.source) {
    case 'netease': return 'from-red-500 to-pink-600'
    default: return 'from-gray-500 to-gray-600'
  }
}