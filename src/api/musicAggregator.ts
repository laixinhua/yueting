import type { Song } from '../types'

export interface SearchSource {
  name: string
  priority: number
  search: (keyword: string, limit: number) => Promise<Song[]>
}

export interface AggregatedSearchResult {
  songs: Song[]
  sources: string[]
  totalCount: number
  hasMore: boolean
}

/**
 * 音乐API聚合器
 * 同时搜索多个音乐源，合并并去重结果
 */

export class MusicAggregator {
  private sources: SearchSource[] = [
    {
      name: '网易云音乐',
      priority: 1,
      search: async (keyword: string, limit: number) => {
        const { searchTracks } = await import('./ebnr')
        const tracks = await searchTracks(keyword, limit)
        const { ebnrTrackToSong } = await import('../utils/neteaseSong')
        return tracks.map(ebnrTrackToSong)
      }
    },
    {
      // iTunes 免 Key 官方搜索 API；结果为 30 秒试听直链（previewUrl），固定 20 条、不随 limit 放大
      name: 'iTunes',
      priority: 2,
      search: async (keyword: string) => {
        const { searchItunes, itunesTrackToSong } = await import('./itunesMusic')
        const tracks = await searchItunes(keyword, 20)
        return tracks.map(itunesTrackToSong)
      }
    }
  ]

  /**
   * 从所有源搜索歌曲
   */
  async searchAll(keyword: string, limit = 30): Promise<AggregatedSearchResult> {
    const resultSongs: Song[] = []
    const usedSources = new Set<string>()

    // 按优先级对来源排序
    const sortedSources = [...this.sources].sort((a, b) => a.priority - b.priority)

    // 并发搜索所有源（当前仅网易云音乐）
    const searchPromises = sortedSources.map(async (source) => {
      try {
        const songs = await source.search(keyword, limit)
        const normalizedSongs = this.normalizeSongs(songs)
        // 不去重：各音源同名歌视为不同版本（不同音质/来源），全部保留并展示
        resultSongs.push(...normalizedSongs)
        usedSources.add(source.name)
        return { success: true, source: source.name, count: songs.length }
      } catch (error) {
        console.warn(`【音乐聚合器】${source.name}搜索失败:`, { source: source.name, error })
        return { success: false, source: source.name, error }
      }
    })

    await Promise.all(searchPromises)
    const sortedSongs = this.sortSongsByRelevance(resultSongs, keyword)

    return {
      songs: sortedSongs,
      sources: Array.from(usedSources),
      totalCount: sortedSongs.length,
      hasMore: false
    }
  }
  
  /**
   * 获取热门歌曲（来自多个源）
   */
  async getHotSongsFromAll(limit = 50): Promise<Song[]> {
    const uniqueSongs = new Map<string, Song>()
    
    try {
      // 目前仅使用网易云音乐
      const { searchTracks } = await import('./ebnr')
      const { ebnrTrackToSong } = await import('../utils/neteaseSong')
      const tracks = await searchTracks('热门', limit)
      const songs = tracks.map(ebnrTrackToSong)
      
      const normalizedSongs = this.normalizeSongs(songs)
      
      // 去重
      for (const song of normalizedSongs) {
        const key = this.getSongKey(song)
        if (!uniqueSongs.has(key)) {
          uniqueSongs.set(key, song)
        }
      }
      
      return Array.from(uniqueSongs.values()).slice(0, limit)
      
    } catch (error) {
      console.error('获取热门歌曲错误:', error)
      return []
    }
  }
  
  /**
   * 获取歌曲播放地址（多源支持）
   */
  async getPlayUrl(song: Song): Promise<string | null> {
    // 网易云音乐使用EBNR（搜歌时已带 url，直接走 song.url 分支）
    if (song.url) return song.url
    return null
  }
  
  private normalizeSongs(songs: Song[]): Song[] {
    return songs.map(song => ({
      ...song,
      title: this.cleanTitle(song.title),
      artist: this.cleanArtist(song.artist),
      // 各源（ebnr/itunes）映射时已带 source/gradient，这里仅为缺失时兜底
      source: song.source ?? 'netease',
      gradient: song.gradient || 'from-red-500 via-pink-500 to-purple-600'
    }))
  }

  private getSongKey(song: Song): string {
    // 基于歌名和歌手去重
    const cleanTitle = this.cleanTitle(song.title).toLowerCase().replace(/\s+/g, '')
    const cleanArtist = this.cleanArtist(song.artist).toLowerCase().replace(/\s+/g, '')
    return `${cleanTitle}_${cleanArtist}`
  }

  private cleanTitle(title: string): string {
    return title
      .replace(/\(.*?\)/g, '')  // 移除括号内容
      .replace(/\[.*?\]/g, '')  // 移除方括号内容
      .replace(/（.*?）/g, '')  // 移除中文括号内容
      .replace(/\s+/g, ' ')    // 多个空格合并
      .trim()
  }

  private cleanArtist(artist: string): string {
    return artist
      .replace(/&/g, ',')
      .replace(/\s+/g, ' ')
      .split(',')[0]  // 只取第一个歌手
      .trim()
  }
  
  private sortSongsByRelevance(songs: Song[], query: string): Song[] {
    const queryLower = query.toLowerCase().trim()
    
    return songs.sort((a, b) => {
      const aTitleScore = a.title.toLowerCase().includes(queryLower) ? 1 : 0
      const bTitleScore = b.title.toLowerCase().includes(queryLower) ? 1 : 0
      
      if (aTitleScore !== bTitleScore) {
        return bTitleScore - aTitleScore
      }
      
      const aArtistScore = a.artist.toLowerCase().includes(queryLower) ? 1 : 0
      const bArtistScore = b.artist.toLowerCase().includes(queryLower) ? 1 : 0
      
      if (aArtistScore !== bArtistScore) {
        return bArtistScore - aArtistScore
      }
      
      // 按来源优先级排序
      const sourcePriority: Record<string, number> = { netease: 3 }
      const aPriority = sourcePriority[a.source || 'netease'] || 0
      const bPriority = sourcePriority[b.source || 'netease'] || 0
      
      return bPriority - aPriority
    })
  }
}

// 导出单例实例
export const musicAggregator = new MusicAggregator()

// 便捷函数
export async function searchAllMusic(keyword: string, limit = 30): Promise<AggregatedSearchResult> {
  return musicAggregator.searchAll(keyword, limit)
}

export async function getHotSongsFromAll(limit = 50): Promise<Song[]> {
  return musicAggregator.getHotSongsFromAll(limit)
}

export async function getPlayUrlForSong(song: Song): Promise<string | null> {
  return musicAggregator.getPlayUrl(song)
}