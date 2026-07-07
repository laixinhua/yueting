import { useCallback, useEffect, useRef, useState } from 'react'
import type { Song } from '../types'
import { useHotSongs } from './useMusicSearch'
import { useNeteaseHotSongs } from './useNeteaseHotSongs'

/**
 * 多源热门歌曲Hook
 * 整合网易云、QQ音乐、酷狗音乐的热门歌曲
 */
export function useMultiSourceHotSongs() {
  const [songs, setSongs] = useState<Song[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [sources, setSources] = useState<string[]>([])
  
  const neteaseHotSongs = useNeteaseHotSongs()
  const multiSourceHotSongs = useHotSongs(40)
  
  const mergedRef = useRef<Song[]>([])
  const lastRefreshTime = useRef<number>(0)

  useEffect(() => {
    // 等待两个源都有数据（或超时）
    const hasValidNeteaseData = !neteaseHotSongs.loading && neteaseHotSongs.songs.length > 0
    const hasValidMultiSourceData = !multiSourceHotSongs.loading && multiSourceHotSongs.songs.length > 0
    
    if (neteaseHotSongs.loading || multiSourceHotSongs.loading) {
      setLoading(true)
      return
    }
    
    setLoading(false)
    
    // 合并两个源的数据
    const allSongs = []
    const sourceNames = new Set<string>()
    
    // 添加网易云音乐数据
    if (hasValidNeteaseData) {
      allSongs.push(...neteaseHotSongs.songs)
      sourceNames.add('网易云音乐')
      
      if (neteaseHotSongs.error) {
        setError(neteaseHotSongs.error)
        return
      }
    }
    
    // 添加多源数据
    if (hasValidMultiSourceData) {
      allSongs.push(...multiSourceHotSongs.songs)
      if (multiSourceHotSongs.error) {
        setError(multiSourceHotSongs.error)
        return
      }
    }
    
    if (allSongs.length === 0) {
      const neteaseError = neteaseHotSongs.error
      const multiSourceError = multiSourceHotSongs.error
      const errorMessage = neteaseError || multiSourceError || '暂无热门歌曲数据'
      setError(errorMessage)
      setSongs([])
      setSources([])
      return
    }
    
    // 去重和混合
    const uniqueSongs = mergeAndDeduplicateSongs(allSongs)
    
    // 按质量排序：同时存在于多个源的歌曲优先
    const sortedSongs = sortByMultiSource(uniqueSongs)
    
    mergedRef.current = sortedSongs
    setSongs(sortedSongs.slice(0, 30)) // 显示前30首
    setSources(Array.from(sourceNames))
    setError(null)
    
  }, [
    neteaseHotSongs.songs,
    neteaseHotSongs.loading,
    neteaseHotSongs.error,
    multiSourceHotSongs.songs,
    multiSourceHotSongs.loading,
    multiSourceHotSongs.error
  ])

  const refresh = useCallback(() => {
    const now = Date.now()
    
    // 防抖：15秒内不重复刷新
    if (now - lastRefreshTime.current < 15000) {
      return
    }
    lastRefreshTime.current = now
    
    // 先尝试重新洗牌现有的
    if (mergedRef.current.length > 0) {
      const shuffled = shuffleArray([...mergedRef.current])
      setSongs(shuffled.slice(0, 30))
      return
    }
    
    // 否则重新加载
    neteaseHotSongs.refresh()
  }, [neteaseHotSongs])

  const reload = useCallback(() => {
    lastRefreshTime.current = 0
    neteaseHotSongs.reload()
  }, [neteaseHotSongs, multiSourceHotSongs])

  return {
    songs,
    loading,
    error,
    refresh,
    reload,
    sources
  }
}

/**
 * 合并并去重歌曲列表
 */
function mergeAndDeduplicateSongs(allSongs: Song[]): Song[] {
  const songMap = new Map<string, { song: Song; sourceCount: number; sources: Set<string> }>()
  
  for (const song of allSongs) {
    const key = generateSongKey(song)
    
    if (!songMap.has(key)) {
      songMap.set(key, { 
        song, 
        sourceCount: 1, 
        sources: new Set([song.source || 'netease']) 
      })
    } else {
      const existing = songMap.get(key)!
      existing.sourceCount++
      existing.sources.add(song.source || 'netease')
      
      // 如果新歌有更多信息，更新歌曲数据
      if (song.coverUrl && !existing.song.coverUrl) {
        existing.song = { ...existing.song, coverUrl: song.coverUrl }
      }
      if (song.duration > existing.song.duration) {
        existing.song = { ...existing.song, duration: song.duration }
      }
    }
  }
  
  return Array.from(songMap.values()).map(item => {
    // 标记多源歌曲
    if (item.sourceCount > 1) {
      return {
        ...item.song,
        multiSource: true,
      } as any
    }
    return item.song
  })
}

/**
 * 按多源存在情况排序
 */
function sortByMultiSource(songs: Song[]): Song[] {
  return songs.sort((a, b) => {
    const aMultiSource = (a as any).multiSource ? 1 : 0
    const bMultiSource = (b as any).multiSource ? 1 : 0
    
    // 多源歌曲优先
    if (aMultiSource !== bMultiSource) {
      return bMultiSource - aMultiSource
    }
    
    // 然后按时长排序（时长较长的优先，说明信息更完整）
    return b.duration - a.duration
  })
}

/**
 * 生成歌曲唯一键
 */
function generateSongKey(song: Song): string {
  const title = song.title.toLowerCase().replace(/[\s\-_—–]+/g, '').replace(/[（）\(\)]/g, '')
  const artist = song.artist.toLowerCase().replace(/[\s\-_—–&]+/g, '').split(',')[0] || ''
  return `${title}_${artist}`
}

/**
 * 数组洗牌
 */
function shuffleArray<T>(array: T[]): T[] {
  const shuffled = [...array]
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]]
  }
  return shuffled
}