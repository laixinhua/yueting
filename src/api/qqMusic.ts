import type { Song } from '../types'
import { CapacitorHttp } from '@capacitor/core'

export class QQMusicApiError extends Error {
  status?: number
  constructor(message: string, status?: number) {
    super(message)
    this.name = 'QQMusicApiError'
    this.status = status
  }
}

interface QQMusicSong {
  songid: number
  songname: string
  singer: Array<{ name: string }>
  albumname: string
  interval: number
  albummid?: string
  songmid?: string
}

const SEARCH_URL = 'https://api.qq.jsososo.com/search'
const SONG_INFO_URL = 'https://api.qq.jsososo.com/song/detail'
const PLAY_URL = 'https://api.qq.jsososo.com/song/url'

/**
 * QQ音乐API集成
 * 提供搜索、歌曲详情、播放地址获取功能
 */

export async function searchQQMusic(keyword: string, limit = 30): Promise<Song[]> {
  let lastErr: unknown = null
  const url = `${SEARCH_URL}?key=${encodeURIComponent(keyword)}&limit=${limit}`

  // 尝试使用 Web fetch 优先
  try {
    const response = await fetch(url, {
      headers: {
        'Accept': 'application/json, text/plain, */*',
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      }
    })

    if (!response.ok) {
      throw new QQMusicApiError(`QQ音乐搜索失败 (${response.status})`, response.status)
    }

    const data = await response.json()

    if (data.code !== 0 || !data.data?.list) {
      return []
    }

    return data.data.list.map((song: QQMusicSong): Song => ({
      id: `qq_${song.songid}`,
      title: song.songname,
      artist: song.singer.map(s => s.name).join(', '),
      album: song.albumname,
      duration: song.interval || 0,
      url: '', // 需要后续获取播放链接
      genre: 'pop',
      gradient: 'from-blue-500 via-indigo-500 to-purple-600',
      source: 'qq'
    }))
  } catch (fetchErr) {
    // 如果 Web fetch 抛出异常且不是 QQMusicApiError 且 status < 500 (网络错误)，尝试 CapacitorHttp
    lastErr = fetchErr
    if (fetchErr instanceof QQMusicApiError && fetchErr.status != null && fetchErr.status < 500) {
      throw fetchErr
    }
  }

  // 尝试使用 Capacitor Http (EBNR 风格)
  try {
    const options = {
      url: url,
      headers: {
        'Accept': 'application/json, text/plain, */*',
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      }
    }
    const response = await CapacitorHttp.get(options)

    if (response.status >= 400) {
      throw new QQMusicApiError(`QQ音乐搜索失败 (${response.status})`, response.status)
    }

    const data = response.data
    if (typeof data === 'string') {
      try {
        JSON.parse(data)
      } catch {
        // 如果是字符串但不是合法 JSON，则转换为字符串对象
        throw new QQMusicApiError('API返回数据格式错误');
      }
    }

    if (data && (data as any).code !== 0 || !(data as any).data?.list) {
      return []
    }

    return (data as any).data.list.map((song: QQMusicSong): Song => ({
      id: `qq_${song.songid}`,
      title: song.songname,
      artist: song.singer.map(s => s.name).join(', '),
      album: song.albumname,
      duration: song.interval || 0,
      url: '', // 需要后续获取播放链接
      genre: 'pop',
      gradient: 'from-blue-500 via-indigo-500 to-purple-600',
      source: 'qq'
    }))
  } catch (capacitorErr) {
    console.warn('Capacitor Http 请求失败:', capacitorErr)
    if (lastErr instanceof QQMusicApiError) throw lastErr
    if (capacitorErr instanceof QQMusicApiError) throw capacitorErr
    throw new QQMusicApiError('QQ音乐搜索失败，请检查网络连接')
  }
}

export async function getQQMusicPlayUrl(songId: number): Promise<string | null> {
  try {
    const url = `${PLAY_URL}?id=${songId}`
    const response = await fetch(url, {
      headers: {
        'Accept': 'application/json'
      }
    })
    
    if (!response.ok) {
      throw new QQMusicApiError(`获取播放地址失败 (${response.status})`, response.status)
    }
    
    const data = await response.json()
    
    if (data.code === 0 && data.data?.[songId]) {
      return data.data[songId]
    }
    
    return null
  } catch (error) {
    console.error('获取QQ音乐播放地址错误:', error)
    return null
  }
}

export async function getQQMusicSongDetail(songId: number): Promise<Song | null> {
  try {
    const url = `${SONG_INFO_URL}?id=${songId}`
    const response = await fetch(url, {
      headers: {
        'Accept': 'application/json'
      }
    })
    
    if (!response.ok) {
      throw new QQMusicApiError(`获取歌曲详情失败 (${response.status})`, response.status)
    }
    
    const data = await response.json()
    
    if (data.code !== 0 || !data.data?.tracklist?.[0]) {
      return null
    }
    
    const song = data.data.tracklist[0]
    return {
      id: `qq_${song.songid}`,
      title: song.songname,
      artist: song.singer.map((s: any) => s.name).join(', '),
      album: song.albumname,
      duration: song.interval || 0,
      url: '', // 需要后续获取播放链接
      genre: 'pop',
      gradient: 'from-blue-500 via-indigo-500 to-purple-600',
      source: 'qq',
      coverUrl: song.albummid ? `https://y.qq.com/music/photo_new/T002R300x300M000${song.albummid}.jpg` : undefined
    }
    
  } catch (error) {
    console.error('获取QQ音乐歌曲详情错误:', error)
    return null
  }
}

/**
 * 获取QQ音乐热门歌曲推荐
 */
export async function getQQMusicHotSongs(limit = 20): Promise<Song[]> {
  let lastErr: unknown = null
  const url = `${SEARCH_URL}?key=热歌榜&limit=${limit}`

  // 尝试使用 Web fetch 优先
  try {
    const response = await fetch(url, {
      headers: {
        'Accept': 'application/json'
      }
    })

    if (!response.ok) {
      throw new QQMusicApiError(`获取热门歌曲失败 (${response.status})`, response.status)
    }

    const data = await response.json()

    if (data.code !== 0 || !data.data?.list) {
      return []
    }

    return data.data.list.slice(0, limit).map((song: QQMusicSong): Song => ({
      id: `qq_${song.songid}`,
      title: song.songname,
      artist: song.singer.map(s => s.name).join(', '),
      album: song.albumname,
      duration: song.interval || 0,
      url: '', // 需要后续获取播放链接
      genre: 'pop',
      gradient: 'from-blue-500 via-indigo-500 to-purple-600',
      source: 'qq',
      coverUrl: song.albummid ? `https://y.qq.com/music/photo_new/T002R300x300M000${song.albummid}.jpg` : undefined
    }))
  } catch (fetchErr) {
    // 如果 Web fetch 抛出异常且不是 QQMusicApiError 且 status < 500 (网络错误)，尝试 CapacitorHttp
    lastErr = fetchErr
    if (fetchErr instanceof QQMusicApiError && fetchErr.status != null && fetchErr.status < 500) {
      return []
    }
  }

  // 尝试使用 Capacitor Http (EBNR 风格)
  try {
    const options = {
      url: url,
      headers: {
        'Accept': 'application/json'
      }
    }
    const response = await CapacitorHttp.get(options)

    if (response.status >= 400) {
      throw new QQMusicApiError(`获取热门歌曲失败 (${response.status})`, response.status)
    }

    const data = response.data
    if (typeof data === 'string') {
      try {
        JSON.parse(data)
      } catch {
        // 如果是字符串但不是合法 JSON，则转换为字符串对象
        throw new QQMusicApiError('API返回数据格式错误');
      }
    }

    if (data && (data as any).code !== 0 || !(data as any).data?.list) {
      return []
    }

    return (data as any).data.list.slice(0, limit).map((song: QQMusicSong): Song => ({
      id: `qq_${song.songid}`,
      title: song.songname,
      artist: song.singer.map(s => s.name).join(', '),
      album: song.albumname,
      duration: song.interval || 0,
      url: '', // 需要后续获取播放链接
      genre: 'pop',
      gradient: 'from-blue-500 via-indigo-500 to-purple-600',
      source: 'qq',
      coverUrl: song.albummid ? `https://y.qq.com/music/photo_new/T002R300x300M000${song.albummid}.jpg` : undefined
    }))
  } catch (capacitorErr) {
    console.warn('Capacitor Http 请求失败:', capacitorErr)
    if (lastErr instanceof QQMusicApiError) throw lastErr
    if (capacitorErr instanceof QQMusicApiError) throw capacitorErr
    return []
  }
}