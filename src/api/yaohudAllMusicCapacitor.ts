import { Capacitor, CapacitorHttp } from '@capacitor/core'
import type { Song } from '../types'

export class YaohudMusicApiError extends Error {
  status?: number
  constructor(message: string, status?: number) {
    super(message)
    this.name = 'YaohudMusicApiError'
    this.status = status
  }
}

/*
 * 妖狐数据开放 API (api.yaohud.cn)
 *
 * 真实返回结构（以 /api/music/qq?key=...&msg=关键词 为例，注意：不要传 n / type 参数，
 * 否则接口会切换成"点歌单首"模式，只返回单个对象而无 songs 列表）：
 * {
 *   "code": 200,
 *   "msg": "请求成功",
 *   "data": {
 *     "name": "晴天",
 *     "text": "1: 晴天 — 周杰伦[收费]\n2: ...",
 *     "songs": [
 *       { "n": 1, "name": "晴天", "singer": "周杰伦", "album": "叶惠美", "pay": "[收费]", "mid": "0039MnYb0qxYhV" },
 *       ...
 *     ]
 *   }
 * }
 *
 * ⚠️ 重要限制（2026.7 实测）：
 * 1. 仅 QQ 音源（mid 字段）支持播放：用 /api/qqmusic/v2?type=url&mid= 对非收费歌曲
 *    返回 302 重定向到 QQ 音乐 CDN 直链（.m4a），可直接播放；收费歌曲（pay 含"[收费]"）
 *    返回 code=400 "需开通QQ音乐VIP才能播放"，需回退其它音源。
 * 2. kg / kuwo / apple 三源免费密钥下只能拿到元数据，无统一可播放直链端点，播放时回退。
 * 3. ximalaya / netease（以及豆包所说的 kugou 路径）在妖狐 API 中并不存在（返回"页面不存在"），
 *    酷狗正确路径是 /api/music/kg（不是 /api/music/kugou）。
 *
 * ⚠️ CORS（2026.7 关键坑）：
 * 手机 WebView 用原生 fetch 访问 api.yaohud.cn 时（除 kuwo 外）被
 * "blocked by CORS policy: No 'Access-Control-Allow-Origin'" 拦截。
 * 因此所有请求统一走 CapacitorHttp 插件（原生 HTTP，绕过浏览器 CORS），
 * 与项目内 qqMusic.ts / ebnr.ts / kugouMusic.ts 一致。
 */

const BASE_URL = 'https://api.yaohud.cn'
const API_KEY = 'Wa6hF53iMZtN743FZcw'

const REQUEST_TIMEOUT_MS = 30_000

const REQUEST_HEADERS: Record<string, string> = {
  Accept: 'application/json, text/plain, */*',
  'User-Agent':
    'Mozilla/5.0 (Linux; Android 13; Mobile) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Mobile Safari/537.36',
}

// 妖狐 songs 数组元素的真实字段（各音源略有差异）
interface YaohudSongItem {
  n: number
  name: string
  singer: string
  album?: string
  mid?: string // qq
  rid?: string // kuwo
  pay?: string // apple / qq 的收费标记
  qualities?: unknown // kg
}

/** 把 CapacitorHttp 返回的 data（可能是对象/字符串）归一为对象，便于读取 */
function normalizeCapacitorData(data: unknown): any {
  if (data && typeof data === 'object') return data as any
  if (typeof data === 'string') {
    const trimmed = data.trim()
    if (!trimmed) return null
    try {
      return JSON.parse(trimmed) as any
    } catch {
      return null
    }
  }
  return null
}

/** 不区分大小写读取响应头 */
function getHeader(
  headers: Record<string, string> | undefined,
  name: string,
): string | undefined {
  if (!headers) return undefined
  const lower = name.toLowerCase()
  if (Object.prototype.hasOwnProperty.call(headers, name)) return headers[name]
  for (const k of Object.keys(headers)) {
    if (k.toLowerCase() === lower) return headers[k]
  }
  return undefined
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

/**
 * 统一请求 JSON（搜索/热门列表）。
 * 原生平台走 CapacitorHttp（绕过 CORS）；web 端回退原生 fetch。
 * 妖狐免费密钥对并发/瞬时请求敏感，常返回 503，因此遇到 5xx/429 自动退避重试。
 */
async function requestJson(url: string, retries = 3): Promise<any | null> {
  let lastErr: unknown = null
  for (let attempt = 0; attempt < retries; attempt++) {
    if (Capacitor.isNativePlatform()) {
      try {
        const res = await CapacitorHttp.get({
          url,
          headers: REQUEST_HEADERS,
          connectTimeout: REQUEST_TIMEOUT_MS,
          readTimeout: REQUEST_TIMEOUT_MS,
        })
        // 限流/过载：退避后重试（qq 是唯一能播放的音源，必须拿到）
        if (res.status === 503 || res.status === 429 || res.status === 500 || res.status === 502) {
          lastErr = new Error(`HTTP ${res.status}`)
          await delay(800 * (attempt + 1))
          continue
        }
        if (res.status < 200 || res.status >= 300) {
          console.warn(`Yaohud 请求非 2xx (${res.status}):`, url)
          return null
        }
        return normalizeCapacitorData(res.data)
      } catch (err) {
        lastErr = err
        await delay(800 * (attempt + 1))
        continue
      }
    }

    // web 端：原生 fetch
    try {
      const controller = new AbortController()
      const timer = window.setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS)
      const response = await fetch(url, {
        method: 'GET',
        headers: REQUEST_HEADERS,
        signal: controller.signal,
      })
      window.clearTimeout(timer)
      if (response.status === 503 || response.status === 429 || response.status === 500 || response.status === 502) {
        lastErr = new Error(`HTTP ${response.status}`)
        await delay(800 * (attempt + 1))
        continue
      }
      if (response.status !== 200) {
        console.warn(`Yaohud web fetch 非 200 (${response.status}):`, url)
        return null
      }
      return await response.json().catch(() => null)
    } catch (err) {
      lastErr = err
      await delay(800 * (attempt + 1))
      continue
    }
  }
  console.warn('Yaohud 请求重试后仍失败:', url, lastErr)
  return null
}

function gradientFor(source: string): string {
  switch (source) {
    case 'qq': return 'from-blue-500 via-indigo-500 to-purple-600'
    case 'kg': return 'from-green-500 via-teal-500 to-blue-600'
    case 'apple': return 'from-gray-500 via-slate-500 to-zinc-600'
    case 'kuwo': return 'from-pink-500 via-rose-500 to-red-600'
    default: return 'from-yellow-500 via-orange-500 to-red-600'
  }
}

/**
 * 统一解析妖狐返回的 songs 列表
 * @param json     整个响应 JSON
 * @param idPrefix 歌曲 id 前缀，如 yaohud_qq
 * @param pickId   从单首元素中提取用于播放的标识（mid / rid / n）
 */
function parseYaohudSongs(
  json: any,
  idPrefix: string,
  pickId: (s: YaohudSongItem) => string
): Song[] {
  if (!json || json.code !== 200) return []
  const data = json.data
  if (!data || !Array.isArray(data.songs)) return []
  return data.songs.map((s: YaohudSongItem): Song => ({
    id: `${idPrefix}_${pickId(s)}`,
    title: s.name || '未知歌曲',
    artist: s.singer || '未知歌手',
    album: s.album || '未知专辑',
    duration: 0,
    url: '', // 播放地址在播放时按需获取（qq 源非收费歌可拿直链）
    genre: 'pop',
    gradient: gradientFor(idPrefix.replace('yaohud_', '')),
    source: 'yaohud',
  }))
}

/** 搜索：狐妖QQ音乐 */
export async function searchYaohudQQ(keyword: string, limit = 10): Promise<Song[]> {
  const json = await requestJson(
    `${BASE_URL}/api/music/qq?key=${API_KEY}&msg=${encodeURIComponent(keyword)}`,
  )
  const songs = parseYaohudSongs(json, 'yaohud_qq', (s) => s.mid || String(s.n))
  return songs.slice(0, limit)
}

/** 搜索：狐妖酷狗音乐 */
export async function searchYaohudKugou(keyword: string, limit = 10): Promise<Song[]> {
  const json = await requestJson(
    `${BASE_URL}/api/music/kg?key=${API_KEY}&msg=${encodeURIComponent(keyword)}`,
  )
  const songs = parseYaohudSongs(json, 'yaohud_kg', (s) => String(s.n))
  return songs.slice(0, limit)
}

/** 搜索：狐妖Apple音乐 */
export async function searchYaohudApple(keyword: string, limit = 10): Promise<Song[]> {
  const json = await requestJson(
    `${BASE_URL}/api/music/apple?key=${API_KEY}&msg=${encodeURIComponent(keyword)}`,
  )
  const songs = parseYaohudSongs(json, 'yaohud_apple', (s) => String(s.n))
  return songs.slice(0, limit)
}

/** 搜索：狐妖酷我音乐 */
export async function searchYaohudKuwo(keyword: string, limit = 10): Promise<Song[]> {
  const json = await requestJson(
    `${BASE_URL}/api/music/kuwo?key=${API_KEY}&msg=${encodeURIComponent(keyword)}`,
  )
  const songs = parseYaohudSongs(json, 'yaohud_kuwo', (s) => s.rid || String(s.n))
  return songs.slice(0, limit)
}

/**
 * 聚合全部狐妖 API 的热门歌曲（仅保留妖狐实际存在的 4 个音源）
 */
export async function getAllYaohudHotSongs(limit = 50): Promise<Song[]> {
  try {
    const perSource = Math.max(1, Math.floor(limit / 4))
    const [qq, kg, apple, kuwo] = await Promise.allSettled([
      searchYaohudQQ('热门', perSource),
      searchYaohudKugou('热门', perSource),
      searchYaohudApple('热门', perSource),
      searchYaohudKuwo('热门', perSource),
    ])

    const allSongs: Song[] = []
    if (qq.status === 'fulfilled') allSongs.push(...qq.value)
    if (kg.status === 'fulfilled') allSongs.push(...kg.value)
    if (apple.status === 'fulfilled') allSongs.push(...apple.value)
    if (kuwo.status === 'fulfilled') allSongs.push(...kuwo.value)

    const uniqueSongs = new Map<string, Song>()
    for (const song of allSongs) {
      const key = `${song.title}_${song.artist}`.toLowerCase().replace(/\s+/g, '')
      if (!uniqueSongs.has(key)) uniqueSongs.set(key, song)
    }
    return Array.from(uniqueSongs.values()).slice(0, limit)
  } catch (error) {
    console.error('获取全部狐妖热门歌曲错误:', error)
    return []
  }
}

/**
 * 聚合全部狐妖 API 的搜索（仅保留妖狐实际存在的 4 个音源）
 */
export async function searchAllYaohud(keyword: string, limit = 30): Promise<Song[]> {
  try {
    console.log('【Yaohud API Debug】searchAllYaohud called with keyword:', keyword, 'limit:', limit)

    // 每源多取一些（用户要求“搜索到多少返回多少”）
    const perSource = Math.max(10, Math.floor(limit / 4))

    // ⚠️ 串行请求：妖狐免费密钥对并发请求限流（并发打 4 源会集体 503），
    // 而 qq 是唯一能播放的音源，必须保证拿到。串行 + requestJson 内置重试可稳定获取。
    const tasks: Array<[string, () => Promise<Song[]>]> = [
      ['qq', () => searchYaohudQQ(keyword, perSource)],
      ['kg', () => searchYaohudKugou(keyword, perSource)],
      ['apple', () => searchYaohudApple(keyword, perSource)],
      ['kuwo', () => searchYaohudKuwo(keyword, perSource)],
    ]

    const allSongs: Song[] = []
    for (const [name, fn] of tasks) {
      try {
        const songs = await fn()
        console.log(`【狐妖API】${name} 成功返回 ${songs.length} 首歌曲`)
        allSongs.push(...songs)
      } catch (e) {
        console.warn(`【狐妖API】${name} 失败:`, e)
      }
    }

    // 不去重：各音源同名歌是不同版本（不同音质/来源），用户要求全部返回显示
    console.log(`【狐妖API】聚合总歌曲数: ${allSongs.length}（不去重，各音源同名歌均保留）`)
    return allSongs
  } catch (error) {
    console.error('搜索全部狐妖API错误:', error)
    return []
  }
}

/**
 * 获取狐妖音乐播放链接
 * - 仅 QQ 音源（mid）支持播放：/api/qqmusic/v2?type=url&mid= 对非收费歌曲返回 302，
 *   重定向到 QQ 音乐 CDN 直链（.m4a），可直接播放。
 * - 收费歌曲（pay 含"[收费]"）返回 HTTP 400（VIP 墙 / 已下架）→ 回退其它音源。
 * - kg / kuwo / apple 音源免费密钥下无可用播放端点，直接返回 null 回退。
 *
 * 同样走 CapacitorHttp 绕过 CORS；对于 302 重定向，禁用自动跟随以读取 Location 直链。
 */
export async function getYaohudMusicPlayUrl(
  songId: string,
  _size: '128' | '320' | 'flac' = '128',
): Promise<string | null> {
  let mid = ''
  if (songId.startsWith('yaohud_qq_')) {
    mid = songId.replace('yaohud_qq_', '')
  } else {
    // 仅 QQ 源有可用的 mid 播放端点；其余音源免费密钥下无法获取直链，回退其它源
    return null
  }

  const url = `${BASE_URL}/api/qqmusic/v2?key=${API_KEY}&type=url&mid=${encodeURIComponent(mid)}`
  const headers = {
    Accept: '*/*',
    'User-Agent': REQUEST_HEADERS['User-Agent'],
  }

  if (Capacitor.isNativePlatform()) {
    try {
      const res = await CapacitorHttp.get({
        url,
        headers,
        connectTimeout: REQUEST_TIMEOUT_MS,
        readTimeout: REQUEST_TIMEOUT_MS,
      })

      // VIP 墙：HTTP 400
      if (res.status === 400) {
        const data = normalizeCapacitorData(res.data)
        console.warn('狐妖播放链接需 VIP 或已下架，回退:', data?.msg)
        return null
      }

      // 3xx 重定向到 CDN 直链
      if (res.status >= 300 && res.status < 400) {
        const loc = getHeader(res.headers, 'location')
        if (loc && loc.includes('qq.com')) return loc
        return null
      }

      // 某些情况下自动跟随后返回 200 且 url 为直链
      if (res.status === 200) {
        if (res.url && res.url.includes('qq.com')) return res.url
        const data = normalizeCapacitorData(res.data)
        if (data?.data?.url) return data.data.url
        if (typeof res.data === 'string' && res.data.includes('qq.com')) return res.data.trim()
      }

      return null
    } catch (err) {
      console.warn('获取狐妖音乐播放链接(CapacitorHttp)错误:', err)
      return null
    }
  }

  // web 端原生 fetch（跟随重定向）
  try {
    const controller = new AbortController()
    const timer = window.setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS)
    const response = await fetch(url, {
      method: 'GET',
      headers,
      redirect: 'follow',
      signal: controller.signal,
    })
    window.clearTimeout(timer)

    const ct = response.headers.get('content-type') || ''
    if (ct.includes('application/json')) {
      const data = await response.json().catch(() => null)
      if (!data || data.code === 400) {
        console.warn('狐妖播放链接需 VIP 或已下架，回退:', data?.msg)
        return null
      }
      if (data?.data?.url) return data.data.url
      return null
    }

    if (response.url && response.url.includes('qq.com')) {
      return response.url
    }
    return null
  } catch (err) {
    console.warn('获取狐妖音乐播放链接(web)错误:', err)
    return null
  }
}
