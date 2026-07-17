import type { Song, SongSource } from '../types'

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
        console.log('搜索网易云音乐: "' + keyword + '"')
        const { searchTracks } = await import('./ebnr')
        const tracks = await searchTracks(keyword, limit)
        const { ebnrTrackToSong } = await import('../utils/neteaseSong')
        return tracks.map(ebnrTrackToSong)
      }
    }
  ]

  /**
   * 从所有源搜索歌曲
   */
  async searchAll(keyword: string, limit = 30): Promise<AggregatedSearchResult> {
    const resultSongs: Song[] = []
    const usedSources = new Set<string>()
    
    console.log(`【音乐聚合器】开始搜索关键词: "${keyword}"，限制: ${limit}`)
    
    // 按优先级对来源排序
    const sortedSources = [...this.sources].sort((a, b) => a.priority - b.priority)
    
    // 并发搜索所有源（当前仅网易云音乐）
    const searchPromises = sortedSources.map(async (source) => {
      try {
        console.log(`【音乐聚合器】正在搜索源: ${source.name}`)
        const songs = await source.search(keyword, limit)
        console.log(`【音乐聚合器】${source.name} 搜索完成，获取到 ${songs.length} 首歌曲`)
        
        const normalizedSongs = this.normalizeSongs(songs, source.name)
        // 不去重：各音源同名歌视为不同版本（不同音质/来源），全部保留并展示
        resultSongs.push(...normalizedSongs)
        
        usedSources.add(source.name)
        return { success: true, source: source.name, count: songs.length }
       } catch (error) {
         console.warn(`【音乐聚合器】${source.name}搜索失败:`, { source: source.name, error })
         return { success: false, source: source.name, error }
       }
    })
    
    const results = await Promise.all(searchPromises)
    const sortedSongs = this.sortSongsByRelevance(resultSongs, keyword)
    
    console.log(`【音乐聚合器】搜索完成，共获取 ${sortedSongs.length} 首歌曲（不去重，按来源全量返回）`)
    console.log(`【音乐聚合器】使用的数据源: ${Array.from(usedSources).join(', ')}`)
    console.log(`【音乐聚合器】各源详细结果:`, results)
    
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
      
      const normalizedSongs = this.normalizeSongs(songs, '网易云音乐')
      
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
  
  private normalizeSongs(songs: Song[], source: string): Song[] {
    return songs.map(song => ({
      ...song,
      title: this.cleanTitle(song.title),
      artist: this.cleanArtist(song.artist),
      source: song.source || this.getSourceFromName(source),
      gradient: song.gradient || this.getGradientBySource(source)
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
  
  private getSourceFromName(_sourceName: string): SongSource {
    return 'netease'
  }
  
  private getGradientBySource(_sourceName: string): string {
    return 'from-red-500 via-pink-500 to-purple-600'  // 网易云
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