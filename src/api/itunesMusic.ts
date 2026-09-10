/**
 * iTunes Search API 音源（免 Key，https://itunes.apple.com/search）
 * - 检索 Apple Music 曲库元数据，previewUrl 为 30 秒试听直链
 * - 作为聚合搜索的第二源，与 EBNR（网易云全曲）并行、互不阻塞
 * - 播放链路无需改动：非 netease 源带 url 直链，resolveSongPlayUrl 直接返回
 */
import { Capacitor, CapacitorHttp } from '@capacitor/core'
import type { Song } from '../types'
import { normalizeImageUrl } from '../utils/imageUrl'

const SEARCH_BASE = 'https://itunes.apple.com/search'

export interface ItunesTrack {
  id: string
  title: string
  artist: string
  url: string
  coverUrl: string
  durationSec: number
  source: 'itunes'
  /** 30 秒预览，UI 需标注 */
  isPreview: boolean
}

function pickGradient(id: string): string {
  const gradients = [
    'from-indigo-500 via-blue-600 to-cyan-700',
    'from-rose-400 via-pink-500 to-fuchsia-700',
    'from-slate-500 via-slate-600 to-slate-800',
  ]
  let h = 0
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) % gradients.length
  return gradients[h]!
}

interface ItunesSearchItem {
  trackId?: number
  trackName?: string
  artistName?: string
  collectionName?: string
  trackTimeMillis?: number
  previewUrl?: string
  artworkUrl100?: string
}

/** 关键词搜索 iTunes（试听直链，默认 20 条） */
export async function searchItunes(keyword: string, limit = 20): Promise<ItunesTrack[]> {
  const q = new URLSearchParams({
    term: keyword.trim(),
    media: 'music',
    entity: 'song',
    limit: String(Math.min(Math.max(limit, 1), 200)),
  })
  const data = await requestJson<{ results?: ItunesSearchItem[] }>(`${SEARCH_BASE}?${q}`)
  const items = data.results ?? []
  return items
    .filter((d) => d && d.trackId != null && d.previewUrl)
    .map((d): ItunesTrack => ({
      id: `itunes:${d.trackId}`,
      title: d.trackName ?? '未知曲目',
      artist: d.artistName ?? '未知歌手',
      url: d.previewUrl!,
      coverUrl: normalizeImageUrl(d.artworkUrl100 ? d.artworkUrl100.replace('/100x100bb.jpg', '/600x600bb.jpg') : '') ?? '',
      durationSec: d.trackTimeMillis ? Math.round(d.trackTimeMillis / 1000) : 30,
      source: 'itunes',
      isPreview: true,
    }))
}

/** ItunesTrack 转应用内 Song（url 为 30 秒试听直链） */
export function itunesTrackToSong(t: ItunesTrack): Song {
  return {
    id: t.id,
    title: t.title,
    artist: t.artist,
    album: 'iTunes 试听',
    duration: t.durationSec > 0 ? t.durationSec : 30,
    gradient: pickGradient(t.id),
    genre: 'pop',
    url: t.url,
    source: 'itunes',
    coverUrl: t.coverUrl || undefined,
  }
}

async function requestJson<T>(url: string): Promise<T> {
  if (Capacitor.isNativePlatform()) {
    const res = await CapacitorHttp.get({
      url,
      headers: { Accept: 'application/json' },
      connectTimeout: 20_000,
      readTimeout: 20_000,
    })
    if (res.status < 200 || res.status >= 300) {
      throw new Error(`iTunes 请求失败（${res.status}）`)
    }
    const raw = res.data
    if (typeof raw === 'string') {
      try {
        return JSON.parse(raw) as T
      } catch {
        throw new Error('iTunes 响应解析失败')
      }
    }
    return raw as T
  }
  const controller = new AbortController()
  const timer = window.setTimeout(() => controller.abort(), 20_000)
  try {
    const res = await fetch(url, { signal: controller.signal, headers: { Accept: 'application/json' } })
    if (!res.ok) throw new Error(`iTunes 请求失败（${res.status}）`)
    return (await res.json()) as T
  } finally {
    window.clearTimeout(timer)
  }
}
