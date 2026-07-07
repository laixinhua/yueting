import type { Song } from '../types'

export class YaohudMusicApiError extends Error {
  status?: number
  constructor(message: string, status?: number) {
    super(message)
    this.name = 'YaohudMusicApiError'
    this.status = status
  }
}

interface YaohudMusicSongItem {
  n: number // 序号
  name: string // 歌曲名
  singer: string // 歌手
  album?: string // 专辑
  mid: string // 歌曲 ID
}

const BASE_URL = 'https://api.yaohud.cn/api/music/qq'
const API_KEY = 'b341ce7bce37b74d27621a8b29a8d6f1' // 【你申请的密钥】
const REQUEST_TIMEOUT_MS = 30_000 // 30s 超时

/**
 * 通过 Yaohu API 搜索 QQ 音乐歌曲
 */
export async function searchYaohudMusic(
  keyword: string,
  limit = 30
): Promise<Song[]> {
  const url = `${BASE_URL}?key=${API_KEY}&msg=${encodeURIComponent(keyword)}&g=${limit}`

  const controller = new AbortController()
  const timer = window.setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS)

  try {
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      },
      signal: controller.signal
    })

    window.clearTimeout(timer)

    if (!response.ok) {
      throw new YaohudMusicApiError(
        `Yaohu API 搜索失败 (${response.status}): ${response.statusText}`,
        response.status
      )
    }

    const data = await response.json()

    if (data.code !== 200 || !data.data?.songs) {
      if (data.code === 401) {
        // API Key 错误
        throw new YaohudMusicApiError(`API密钥无效或已过期: ${data.msg || '请检查密钥'}`)
      }
      if (data.code === 429) {
        // 请求过于频繁
        throw new YaohudMusicApiError(`请求过于频繁，请稍后重试: ${data.msg}`)
      }
      console.warn('Yaohu API 搜索结果异常:', data)
      return []
    }

    return data.data.songs.map((song: YaohudMusicSongItem): Song => ({
      id: `yaohud_${song.mid}`,
      title: song.name,
      artist: song.singer,
      album: song.album || '未知专辑',
      duration: 0, // Yaohu API 不直接提供时长
      url: '', // 播放地址需单独获取
      genre: 'pop',
      gradient: 'from-pink-500 via-rose-500 to-red-600', // 粉色主题
      source: 'yaohud'
    }))
  } catch (error) {
    window.clearTimeout(timer)
    console.error('Yaohu音乐搜索错误:', error)
    if (error instanceof YaohudMusicApiError) {
      throw error
    }
    throw new YaohudMusicApiError('Yaohu API 搜索失败，请检查网络连接或联系管理员')
  }
}

/**
 * 获取 Yaohu API 歌曲的播放地址
 */
export async function getYaohudMusicPlayUrl(
  mid: string,
  size: '128' | '320' | 'flac' = '128'
): Promise<string | null> {
  const url = `${BASE_URL}?key=${API_KEY}&n=1&mid=${mid}&size=${size}`

  const controller = new AbortController()
  const timer = window.setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS)

  try {
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      },
      signal: controller.signal
    })

    window.clearTimeout(timer)

    if (!response.ok) {
      throw new YaohudMusicApiError(
        `获取Yaohu播放地址失败 (${response.status}): ${response.statusText}`,
        response.status
      )
    }

    const data = await response.json()

    if (data.code !== 200 || !data.data?.musicurl) {
      console.warn('Yaohu API 播放地址获取失败:', data)
      return null
    }

    return data.data.musicurl
  } catch (error) {
    window.clearTimeout(timer)
    console.error('获取Yaohu音乐播放地址错误:', error)
    return null
  }
}

/**
 * 获取热门歌曲 (通过 Yaohu API 搜索热歌)
 */
export async function getYaohudMusicHotSongs(limit = 20): Promise<Song[]> {
  try {
    return await searchYaohudMusic('热门歌曲', limit)
  } catch (error) {
    console.error('获取Yaohu热门歌曲错误:', error)
    return []
  }
}