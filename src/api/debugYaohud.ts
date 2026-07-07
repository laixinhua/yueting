import type { Song } from '../types'
import { Http } from '@capacitor-community/http'

const BASE_URL = 'https://api.yaohud.cn'
const API_KEY = 'Wa6hF53iMZtN743FZcw'

export async function debugSearchYaohudQQ(keyword: string, limit = 10): Promise<Song[]> {
  const url = `${BASE_URL}/api/music/qq?key=${API_KEY}&msg=${encodeURIComponent(keyword)}&g=${limit}`

  try {
    console.log(`Debug: Making request to: ${url}`)
    const response = await Http.request({
      method: 'GET',
      url: url,
      headers: {
        'Accept': 'application/json'
      }
    })

    console.log(`Debug: Response status: ${response.status}`)
    console.log(`Debug: Response data:`, response.data)

    if (response.status !== 200) {
      console.warn('Debug: HTTP status not 200')
      return []
    }

    const data = response.data
    
    if (!data) {
      console.warn('Debug: No data in response')
      return []
    }

    console.log('Debug: Data keys:', Object.keys(data))

    // 尝试不同的数据结构
    if (data.data?.songs) {
      console.log('Debug: Using data.data.songs format')
      return data.data.songs.map((song: any): Song => ({
        id: `yaohud_qq_${song.mid}`,
        title: song.name,
        artist: song.singer,
        album: song.album || '未知专辑',
        duration: 0,
        url: '',
        genre: 'pop',
        gradient: 'from-blue-500 via-indigo-500 to-purple-600',
        source: 'yaohud'
      }))
    } else if (data.songs) {
      console.log('Debug: Using data.songs format')
      return data.songs.map((song: any): Song => ({
        id: `yaohud_qq_${song.mid}`,
        title: song.name,
        artist: song.singer,
        album: song.album || '未知专辑',
        duration: 0,
        url: '',
        genre: 'pop',
        gradient: 'from-blue-500 via-indigo-500 to-purple-600',
        source: 'yaohud'
      }))
    } else if (Array.isArray(data)) {
      console.log('Debug: Using direct array format')
      return data.map((song: any): Song => ({
        id: `yaohud_qq_${song.mid}`,
        title: song.name,
        artist: song.singer,
        album: song.album || '未知专辑',
        duration: 0,
        url: '',
        genre: 'pop',
        gradient: 'from-blue-500 via-indigo-500 to-purple-600',
        source: 'yaohud'
      }))
    } else {
      console.warn('Debug: Unknown data format')
      return []
    }
  } catch (error) {
    console.error('Debug: Yaohu QQ 音乐搜索失败:', error)
    return []
  }
}