import { Capacitor, CapacitorHttp } from '@capacitor/core'
import type { EbnrAlbum, EbnrAlbumDetail, EbnrAudio, EbnrPlaylist, EbnrTrack } from '../types/ebnr'

const DEFAULT_BASE = '/api/ebnr'
const REQUEST_TIMEOUT_MS = 35_000
const MAX_ATTEMPTS = 3
const USER_AGENT =
  'Mozilla/5.0 (Linux; Android 13; Mobile) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Mobile Safari/537.36'

function readBaseCandidates(): string[] {
  const primary = (import.meta.env.VITE_EBNR_BASE as string | undefined)?.replace(/\/$/, '')
  const fallback = (import.meta.env.VITE_EBNR_BASE_FALLBACK as string | undefined)?.replace(/\/$/, '')
  const list = [primary, fallback].filter(Boolean) as string[]
  if (list.length === 0) list.push(DEFAULT_BASE)
  return [...new Set(list)]
}

const BASE_CANDIDATES = readBaseCandidates()

export class EbnrApiError extends Error {
  status?: number

  constructor(message: string, status?: number) {
    super(message)
    this.name = 'EbnrApiError'
    this.status = status
  }
}

function sleep(ms: number) {
  return new Promise<void>((resolve) => window.setTimeout(resolve, ms))
}

function webHeaders(init?: RequestInit): Record<string, string> {
  const headers: Record<string, string> = { Accept: 'application/json' }
  if (init?.headers) {
    const h = init.headers
    if (h instanceof Headers) {
      h.forEach((v, k) => {
        headers[k] = v
      })
    } else if (Array.isArray(h)) {
      for (const [k, v] of h) headers[k] = v
    } else {
      Object.assign(headers, h)
    }
  }
  return headers
}

function nativeHeaders(init?: RequestInit): Record<string, string> {
  return { ...webHeaders(init), 'User-Agent': USER_AGENT }
}

async function fetchViaCapacitorHttp(
  url: string,
  init?: RequestInit,
): Promise<{ status: number; data: unknown }> {
  const method = (init?.method ?? 'GET').toUpperCase()
  const headers = nativeHeaders(init)

  const options = {
    url,
    headers,
    connectTimeout: REQUEST_TIMEOUT_MS,
    readTimeout: REQUEST_TIMEOUT_MS,
    ...(init?.body != null
      ? {
          data:
            typeof init.body === 'string'
              ? (JSON.parse(init.body) as Record<string, unknown>)
              : init.body,
        }
      : {}),
  }

  if (method === 'POST') {
    return CapacitorHttp.post(options)
  }
  return CapacitorHttp.get(options)
}

async function fetchViaWeb(url: string, init?: RequestInit): Promise<Response> {
  const controller = new AbortController()
  const timer = window.setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS)
  try {
    return await fetch(url, {
      ...init,
      headers: webHeaders(init),
      signal: controller.signal,
    })
  } finally {
    window.clearTimeout(timer)
  }
}

function parseResponseBody(data: unknown): unknown {
  if (typeof data === 'string') {
    const trimmed = data.trim()
    if (!trimmed) return null
    try {
      return JSON.parse(trimmed) as unknown
    } catch {
      return data
    }
  }
  return data
}

function isRetryableError(err: unknown): boolean {
  if (err instanceof EbnrApiError) {
    return err.status == null || err.status >= 500
  }
  return true
}

async function requestOnce<T>(base: string, path: string, init?: RequestInit): Promise<T> {
  const url = `${base}${path}`

  if (Capacitor.isNativePlatform()) {
    let lastErr: unknown = null

    try {
      const res = await fetchViaWeb(url, init)
      if (!res.ok) {
        throw new EbnrApiError(`音乐服务错误（${res.status}）`, res.status)
      }
      return res.json() as Promise<T>
    } catch (err) {
      lastErr = err
      if (err instanceof EbnrApiError && err.status != null && err.status < 500) {
        throw err
      }
    }

    try {
      const res = await fetchViaCapacitorHttp(url, init)
      if (res.status >= 400) {
        throw new EbnrApiError(`音乐服务错误（${res.status}）`, res.status)
      }
      return parseResponseBody(res.data) as T
    } catch (err) {
      if (err instanceof EbnrApiError) throw err
      if (lastErr instanceof EbnrApiError) throw lastErr
      throw err
    }
  }

  const res = await fetchViaWeb(url, init)
  if (!res.ok) {
    throw new EbnrApiError(`音乐服务错误（${res.status}）`, res.status)
  }
  return res.json() as Promise<T>
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  let lastErr: unknown = null

  for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
    for (const base of BASE_CANDIDATES) {
      try {
        return await requestOnce<T>(base, path, init)
      } catch (err) {
        lastErr = err
        if (!isRetryableError(err)) {
          throw err
        }
      }
    }
    if (attempt + 1 < MAX_ATTEMPTS) {
      await sleep(800 * (attempt + 1))
    }
  }

  if (lastErr instanceof EbnrApiError) throw lastErr
  throw new EbnrApiError('无法连接音乐服务，请检查网络')
}

/** 搜索网易云歌曲 */
export function searchTracks(keyword: string, limit = 30): Promise<EbnrTrack[]> {
  const q = new URLSearchParams({ keyword: keyword.trim(), limit: String(limit) })
  return request<EbnrTrack[]>(`/search?${q}`)
}

/** 获取可播放音频直链 */
export function getAudioUrl(trackId: number): Promise<EbnrAudio> {
  return request<EbnrAudio>(`/audio?id=${trackId}`)
}

/** 歌曲详情 */
export function getTrackInfo(trackId: number): Promise<EbnrTrack> {
  return request<EbnrTrack>(`/info?id=${trackId}`)
}

export function getPlaylist(playlistId: number): Promise<EbnrPlaylist> {
  return request<EbnrPlaylist>(`/playlist?id=${playlistId}`)
}

export function getPlaylistTracks(playlistId: number): Promise<EbnrTrack[]> {
  return request<EbnrTrack[]>(`/tracks?id=${playlistId}`)
}

/** 专辑元数据（封面、名称） */
export function getAlbumMeta(albumId: number): Promise<EbnrAlbum> {
  return request<EbnrAlbum>(`/album?id=${albumId}`)
}

/** 专辑详情含曲目列表 */
export function getAlbumDetail(albumId: number): Promise<EbnrAlbumDetail> {
  return request<EbnrAlbumDetail>('/album', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ id: albumId }),
  })
}
