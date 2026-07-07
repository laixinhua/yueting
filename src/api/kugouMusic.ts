import type { Song } from '../types'
import { CapacitorHttp } from '@capacitor/core'

export class KugouMusicApiError extends Error {
  status?: number
  constructor(message: string, status?: number) {
    super(message)
    this.name = 'KugouMusicApiError'
    this.status = status
  }
}

interface KugouSong {
  hash: string
  filename: string
  singername: string
  album_name: string
  duration: number
  filesize?: number
  lyrics?: string
  img?: string
}

const SEARCH_URL = 'https://wwwapi.kugou.com/yy/index.php'
const PLAY_URL_BASE = 'https://wwwapi.kugou.com/yy/index.php'
const API_BASE = 'https://mobiles.kugou.com/api/v5/search'

/**
 * 酷狗音乐API集成
 * 提供搜索、播放地址获取功能
 */

export async function searchKugouMusic(keyword: string, limit = 30): Promise<Song[]> {
  let lastErr: unknown = null
  const params = new URLSearchParams({
    cmd: 'search',
    keyword: keyword.trim(),
    page: '1',
    pagesize: String(limit),
    showtype: '1'
  })
  const url = `${SEARCH_URL}?${params.toString()}`

  // 尝试使用 Web fetch 优先
  try {
    const response = await fetch(url, {
      headers: {
        'Accept': 'application/json, text/javascript, */*',
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Referer': 'https://www.kugou.com/'
      }
    })

    if (!response.ok) {
      throw new KugouMusicApiError(`酷狗音乐搜索失败 (${response.status})`, response.status)
    }

    const data = await response.json()

    if (data.status !== 1 || !data.data?.info) {
      return []
    }

    return data.data.info.map((song: KugouSong): Song => {
      // 解析文件名获取歌曲名和歌手
      const filename = song.filename || ''
      const parts = filename.split(' - ')
      const title = parts[1] || song.filename || '未知歌曲'
      const artist = parts[0] || song.singername || '未知歌手'
      
      return {
        id: `kugou_${song.hash}`,
        title: title,
        artist: artist,
        album: song.album_name || '未知专辑',
        duration: Math.floor(song.duration / 1000) || 0, // 转换为秒
        url: '', // 需要后续获取播放链接
        genre: 'pop',
        gradient: 'from-green-500 via-teal-500 to-blue-600',
        source: 'kugou',
        coverUrl: song.img || undefined
      }
    })
  } catch (fetchErr) {
    // 如果 Web fetch 抛出异常且不是 KugouMusicApiError 且 status < 500 (网络错误)，尝试 CapacitorHttp
    lastErr = fetchErr
    if (fetchErr instanceof KugouMusicApiError && fetchErr.status != null && fetchErr.status < 500) {
      throw fetchErr
    }
  }

  // 尝试使用 Capacitor Http (EBNR 风格)
  try {
    const options = {
      url: url,
      headers: {
        'Accept': 'application/json, text/javascript, */*',
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Referer': 'https://www.kugou.com/'
      }
    }
    const response = await CapacitorHttp.get(options)

    if (response.status >= 400) {
      throw new KugouMusicApiError(`酷狗音乐搜索失败 (${response.status})`, response.status)
    }

    const data = response.data
    if (typeof data === 'string') {
      try {
        JSON.parse(data)
      } catch {
        // 如果是字符串但不是合法 JSON，则转换为字符串对象
        throw new KugouMusicApiError('API返回数据格式错误');
      }
    }

    if (data && (data as any).status !== 1 || !(data as any).data?.info) {
      return []
    }

    return (data as any).data.info.map((song: KugouSong): Song => {
      const filename = song.filename || ''
      const parts = filename.split(' - ')
      const title = parts[1] || song.filename || '未知歌曲'
      const artist = parts[0] || song.singername || '未知歌手'

      return {
        id: `kugou_${song.hash}`,
        title: title,
        artist: artist,
        album: song.album_name || '未知专辑',
        duration: Math.floor(song.duration / 1000) || 0,
        url: '', // 需要后续获取播放链接
        genre: 'pop',
        gradient: 'from-green-500 via-teal-500 to-blue-600',
        source: 'kugou',
        coverUrl: song.img || undefined
      }
    })
  } catch (capacitorErr) {
    console.warn('Capacitor Http 请求失败:', capacitorErr)
    if (lastErr instanceof KugouMusicApiError) throw lastErr
    if (capacitorErr instanceof KugouMusicApiError) throw capacitorErr
    throw new KugouMusicApiError('酷狗音乐搜索失败，请检查网络连接')
  }
}

export async function getKugouMusicPlayUrl(hash: string, bitrate: '128' | '320' = '128'): Promise<string | null> {
  try {
    const params = new URLSearchParams({
      cmd: 'playinfo',
      hash: hash,
      album_audio_id: '0'
    })
    
    const url = `${PLAY_URL_BASE}?${params.toString()}`
    const response = await fetch(url, {
      headers: {
        'Accept': 'application/json',
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Referer': 'https://www.kugou.com/'
      }
    })
    
    if (!response.ok) {
      throw new KugouMusicApiError(`获取酷狗播放地址失败 (${response.status})`, response.status)
    }
    
    const data = await response.json()
    
    if (data.status === 1) {
      // 返回对应音质的URL
      if (bitrate === '320' && data.url320) {
        return data.url320
      } else if (data.url128) {
        return data.url128
      } else if (data.url) {
        return data.url
      }
      
      // 备用URL
      const allUrls = [
        data.url,
        data.url128,
        data.url320,
        ...(data.backup_url || []),
        ...(data.backup_url_128 || []),
        ...(data.backup_url_320 || [])
      ].filter(Boolean)
      
      return allUrls[0] || null
    }
    
    return null
  } catch (error) {
    console.error('获取酷狗音乐播放地址错误:', error)
    return null
  }
}

/**
 * 获取酷狗音乐热门歌曲
 */
export async function getKugouMusicHotSongs(limit = 20): Promise<Song[]> {
  const url = `${API_BASE}/hot_songs.php?pagesize=${limit}&type=0&plat=0`

  // 尝试使用 Web fetch 优先
  try {
    const response = await fetch(url, {
      headers: {
        'Accept': 'application/json',
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      }
    })

    if (!response.ok) {
      throw new KugouMusicApiError(`获取酷狗热门歌曲失败 (${response.status})`, response.status)
    }

    const data = await response.json()

    if (data.status !== 1 || !data.data?.info) {
      return []
    }

    return data.data.info.slice(0, limit).map((song: KugouSong): Song => {
      const filename = song.filename || ''
      const parts = filename.split(' - ')
      const title = parts[1] || song.filename || '未知歌曲'
      const artist = parts[0] || '未知歌手'
      
      return {
        id: `kugou_${song.hash}`,
        title: title,
        artist: artist,
        album: song.album_name || '未知专辑',
        duration: Math.floor(song.duration / 1000) || 0,
        url: '', // 需要后续获取播放链接
        genre: 'pop',
        gradient: 'from-green-500 via-teal-500 to-blue-600',
        source: 'kugou'
      }
    })
  } catch (fetchErr) {
    // 如果 Web fetch 抛出异常且不是 KugouMusicApiError 且 status < 500 (网络错误)，尝试 CapacitorHttp
    if (fetchErr instanceof KugouMusicApiError && fetchErr.status != null && fetchErr.status < 500) {
      // 如果热门歌曲 API 本身报错，降级到搜索热歌
      try {
        return await searchKugouMusic('热门歌曲', limit)
      } catch {
        return []
      }
    }
  }

  // 尝试使用 Capacitor Http (EBNR 风格)
  try {
    const options = {
      url: url,
      headers: {
        'Accept': 'application/json',
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      }
    }
    const response = await CapacitorHttp.get(options)

    if (response.status >= 400) {
      throw new KugouMusicApiError(`获取酷狗热门歌曲失败 (${response.status})`, response.status)
    }

    const data = response.data
    if (typeof data === 'string') {
      try {
        JSON.parse(data)
      } catch {
        // 如果是字符串但不是合法 JSON，则转换为字符串对象
        throw new KugouMusicApiError('API返回数据格式错误');
      }
    }

    if (data && (data as any).status !== 1 || !(data as any).data?.info) {
      return []
    }

    return (data as any).data.info.slice(0, limit).map((song: KugouSong): Song => {
      const filename = song.filename || ''
      const parts = filename.split(' - ')
      const title = parts[1] || song.filename || '未知歌曲'
      const artist = parts[0] || '未知歌手'

      return {
        id: `kugou_${song.hash}`,
        title: title,
        artist: artist,
        album: song.album_name || '未知专辑',
        duration: Math.floor(song.duration / 1000) || 0,
        url: '', // 需要后续获取播放链接
        genre: 'pop',
        gradient: 'from-green-500 via-teal-500 to-blue-600',
        source: 'kugou'
      }
    })
  } catch (capacitorErr) {
    console.warn('Capacitor Http 请求失败:', capacitorErr)
    // 降级到搜索热歌
    try {
      return await searchKugouMusic('热门歌曲', limit)
    } catch {
      return []
    }
  }
}

/**
 * 获取酷狗音乐榜单歌曲
 */
export async function getKugouMusicChart(chartType: string = '飙升榜', limit = 20): Promise<Song[]> {
  try {
    return await searchKugouMusic(chartType, limit)
  } catch (error) {
    console.error('获取酷狗音乐榜单错误:', error)
    return []
  }
}