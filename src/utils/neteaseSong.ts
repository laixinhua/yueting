import { getAudioUrl } from '../api/ebnr'
import type { EbnrTrack } from '../types/ebnr'
import type { Song, SongGenre } from '../types'
import { normalizeImageUrl } from './imageUrl'
import {
  readPlayableProbeCache,
  readPlayableUrlCache,
  removePlayableUrlCache,
  writePlayableProbeCache,
  writePlayableUrlCache,
} from './neteaseCache'

const GRADIENTS = [
  'from-violet-600 via-purple-700 to-indigo-900',
  'from-sky-400 via-blue-500 to-indigo-600',
  'from-amber-400 via-orange-500 to-rose-600',
  'from-teal-400 via-cyan-500 to-blue-700',
  'from-emerald-500 via-teal-600 to-cyan-800',
  'from-fuchsia-500 via-purple-600 to-violet-900',
] as const

/** 内存播放 URL 缓存（与 localStorage 同步，减少重复读盘） */
const URL_MEMORY_TTL_MS = 45 * 60 * 1000

type UrlMemoryEntry = { url: string; fetchedAt: number }

const urlMemory = new Map<number, UrlMemoryEntry>()

/** 播放地址获取超时（毫秒）。EBNR 在部分网络环境下会挂起无响应，
 *  必须加前端超时兜底，避免“点击歌曲后一直加载中”无法退出。 */
const AUDIO_URL_TIMEOUT_MS = 9000

function withTimeout<T>(promise: Promise<T>, ms: number, message: string): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timer = window.setTimeout(() => reject(new Error(message)), ms)
    promise.then(
      (value) => {
        window.clearTimeout(timer)
        resolve(value)
      },
      (err) => {
        window.clearTimeout(timer)
        reject(err)
      },
    )
  })
}

async function fetchAudioUrlFromApi(neteaseId: number): Promise<string | null> {
  const audio = await withTimeout(getAudioUrl(neteaseId), AUDIO_URL_TIMEOUT_MS, '获取播放地址超时')
  const url = audio?.url?.trim()
  return url || null
}

function readMemoryUrl(neteaseId: number): string | null {
  const entry = urlMemory.get(neteaseId)
  if (!entry) return null
  if (Date.now() - entry.fetchedAt > URL_MEMORY_TTL_MS) {
    urlMemory.delete(neteaseId)
    return null
  }
  return entry.url
}

function writeMemoryUrl(neteaseId: number, url: string) {
  urlMemory.set(neteaseId, { url, fetchedAt: Date.now() })
}

function rememberPlayableUrl(neteaseId: number, url: string) {
  writeMemoryUrl(neteaseId, url)
  writePlayableUrlCache(neteaseId, url)
  writePlayableProbeCache(neteaseId, true)
}

function readCachedPlayUrl(neteaseId: number): string | null {
  const mem = readMemoryUrl(neteaseId)
  if (mem) return mem
  const persisted = readPlayableUrlCache(neteaseId)
  if (persisted) {
    writeMemoryUrl(neteaseId, persisted)
    return persisted
  }
  return null
}

/** 清除某首歌的播放地址缓存（播放失败时重试用） */
export function invalidateNeteaseAudioCache(neteaseId: number): void {
  urlMemory.delete(neteaseId)
  removePlayableUrlCache(neteaseId)
}

/** 探测网易云歌曲是否可播放（命中 URL 缓存则不再请求 EBNR） */
export async function isNeteaseSongPlayable(neteaseId: number): Promise<boolean> {
  if (readCachedPlayUrl(neteaseId)) return true

  const probed = readPlayableProbeCache(neteaseId)
  if (probed !== null) return probed

  try {
    const url = await fetchAudioUrlFromApi(neteaseId)
    if (url) {
      rememberPlayableUrl(neteaseId, url)
      return true
    }
    writePlayableProbeCache(neteaseId, false)
    return false
  } catch {
    /* 网络/服务异常时不写入负缓存，避免误伤 */
    return false
  }
}

function pickGradient(seed: string): string {
  let hash = 0
  for (let i = 0; i < seed.length; i++) hash = (hash + seed.charCodeAt(i) * (i + 1)) % GRADIENTS.length
  return GRADIENTS[hash]!
}

export function neteaseSongId(ncmId: number): string {
  return `ncm-${ncmId}`
}

export function parseNeteaseId(songId: string): number | null {
  const m = /^ncm-(\d+)$/.exec(songId)
  return m ? Number(m[1]) : null
}

/** 从歌曲或本地下载 fileKey 解析网易云曲目 ID */
export function resolveNeteaseTrackId(song: { id: string; neteaseId?: number; fileKey?: string }): number | null {
  if (song.neteaseId != null) return song.neteaseId
  const fromId = parseNeteaseId(song.id)
  if (fromId != null) return fromId
  const m = /^download:ncm:(\d+)$/.exec(song.fileKey ?? '')
  return m ? Number(m[1]) : null
}

export function isNeteaseSong(song: Song): boolean {
  return song.source === 'netease' || parseNeteaseId(song.id) !== null
}

function formatArtists(track: EbnrTrack): string {
  const names = track.artists?.map((a) => a.name).filter(Boolean) ?? []
  return names.length ? names.join(' / ') : '未知歌手'
}

function estimateDurationSec(track: EbnrTrack): number {
  const q =
    track.qualities?.standard ??
    track.qualities?.exhigh ??
    track.qualities?.higher ??
    track.qualities?.lossless
  if (q?.size && q?.bitrate) {
    return Math.max(1, Math.round((q.size * 8) / q.bitrate))
  }
  return 0
}

/** 将 EBNR 曲目转为应用内 Song（播放链需在播放前解析） */
export function ebnrTrackToSong(track: EbnrTrack): Song {
  const duration = estimateDurationSec(track)
  return {
    id: neteaseSongId(track.id),
    title: track.name,
    artist: formatArtists(track),
    album: track.album?.name ?? '未知专辑',
    duration: duration > 0 ? duration : 240,
    gradient: pickGradient(String(track.id)),
    genre: 'pop' as SongGenre,
    url: '',
    source: 'netease',
    neteaseId: track.id,
    coverUrl: normalizeImageUrl(track.album?.cover_url),
  }
}

/** 解析网易云歌曲的可播放地址（优先读本地/内存缓存） */
export async function resolveNeteasePlayUrl(
  neteaseId: number,
  options?: { forceRefresh?: boolean },
): Promise<string> {
  if (!options?.forceRefresh) {
    const cached = readCachedPlayUrl(neteaseId)
    if (cached) return toPlayableSrc(cached)
  } else {
    invalidateNeteaseAudioCache(neteaseId)
  }

  const url = await fetchAudioUrlFromApi(neteaseId)
  if (!url) {
    console.warn('[resolveNeteasePlayUrl] EBNR 未返回播放地址', neteaseId)
    throw new Error('音乐服务未返回播放地址，请稍后重试')
  }
  console.log('[resolveNeteasePlayUrl] 已获取播放地址', neteaseId, 'len', url.length)
  rememberPlayableUrl(neteaseId, url)
  return toPlayableSrc(url)
}

export function getCachedNeteasePlayUrl(neteaseId: number): string | null {
  return readCachedPlayUrl(neteaseId)
}

/** 可选音频中继：配置后，CDN 直链会被编码交给该中继（中继在服务端拉取 CDN 再回传），
 *  从而绕开设备侧对 *.music.126.net 的网络屏蔽。形如 https://relay.example.com/proxy?u= */
const AUDIO_RELAY_BASE = (import.meta.env.VITE_AUDIO_RELAY as string | undefined)?.trim()

/**
 * 将网易云 CDN 直链转换为可播放地址。
 *
 * 实测用户的设备网络屏蔽了 *.music.126.net（连不上 / Connection reset），
 * 因此直连与“下载到本地”都拿不到音频字节——这是网络层屏蔽，非 App bug。
 * 歌词走的是另一条主机（apis.netstart.cn），所以歌词能显示而音频放不了。
 *
 * 若部署了可达的音频中继，配置 VITE_AUDIO_RELAY 即可让本函数把直链交给中继，
 * 否则原样返回（依赖设备网络能直连 CDN）。
 */
export async function toPlayableSrc(rawUrl: string): Promise<string> {
  const trimmed = rawUrl.trim()
  if (!trimmed || !/^https?:\/\//i.test(trimmed)) return trimmed
  if (AUDIO_RELAY_BASE) {
    return `${AUDIO_RELAY_BASE}${encodeURIComponent(trimmed)}`
  }
  return trimmed
}

/** 为任意歌曲解析最终播放 URL */
export async function resolveSongPlayUrl(
  song: Song,
  options?: { forceRefresh?: boolean },
): Promise<string> {
  if (song.url && song.source !== 'netease') return song.url

  const ncmId = song.neteaseId ?? parseNeteaseId(song.id)
  if (ncmId == null) {
    if (song.url) return song.url
    throw new Error('无法播放该歌曲')
  }

  return resolveNeteasePlayUrl(ncmId, options)
}

const warmedUrlAt = new Map<string, number>()
const WARM_TTL_MS = 5 * 60 * 1000

/** 主播放器占用音频时，下载预热不得再 play 第二个 Audio（会抢焦点导致切歌/下载互斥失败） */
let mainPlaybackActive = false
let mainPlaybackUrl = ''

export function setMainPlaybackState(active: boolean, url = ''): void {
  mainPlaybackActive = active
  mainPlaybackUrl = url.trim()
}

export function isMainPlaybackActive(): boolean {
  return mainPlaybackActive
}

let audioPlaybackUnlocked = false

/** 首次用户交互后解锁 WebView 音频播放，使后台预热/下载可用 */
export function installNeteaseAudioUnlock(): void {
  if (typeof document === 'undefined') return

  const unlock = () => {
    if (audioPlaybackUnlocked) return
    audioPlaybackUnlocked = true
    if (mainPlaybackActive) return
    const audio = new Audio()
    audio.muted = true
    void audio
      .play()
      .then(() => {
        audio.pause()
        audio.removeAttribute('src')
        audio.load()
      })
      .catch(() => {})
  }

  document.addEventListener('touchstart', unlock, { once: true, passive: true })
  document.addEventListener('click', unlock, { once: true })
}

export function markNeteaseAudioUrlWarmed(url: string): void {
  const trimmed = url.trim()
  if (trimmed) warmedUrlAt.set(trimmed, Date.now())
}

/** 在用户点击下载的同一调用栈内同步发起预热（保留手势）；播放中不抢音频焦点 */
export function kickStartNeteaseWarmInGesture(song: { id: string; neteaseId?: number; fileKey?: string }): void {
  if (mainPlaybackActive) return
  const ncmId = resolveNeteaseTrackId(song)
  if (ncmId == null) return
  const url = getCachedNeteasePlayUrl(ncmId)
  if (!url) return

  const trimmed = url.trim()
  const warmedAt = warmedUrlAt.get(trimmed)
  if (warmedAt != null && Date.now() - warmedAt < WARM_TTL_MS) return

  const audio = new Audio()
  audio.muted = true
  audio.onplaying = () => {
    markNeteaseAudioUrlWarmed(trimmed)
  }
  audio.src = trimmed
  audio.load()
  void audio.play().catch(() => {})
}

async function warmViaFetchRange(url: string): Promise<boolean> {
  try {
    const res = await fetch(url, {
      headers: {
        Referer: 'https://music.163.com/',
        Range: 'bytes=0-65535',
      },
    })
    if (res.ok || res.status === 206) {
      await res.arrayBuffer()
      markNeteaseAudioUrlWarmed(url)
      return true
    }
  } catch {
    /* ignore */
  }
  return false
}

/** 通过 WebView Audio 或 fetch 预热 CDN。播放进行中时不 play 第二个 Audio。 */
export async function warmNeteaseAudioUrl(
  url: string,
  options?: { force?: boolean },
): Promise<boolean> {
  const trimmed = url.trim()
  if (!trimmed) return false

  if (!options?.force) {
    const warmedAt = warmedUrlAt.get(trimmed)
    if (warmedAt != null && Date.now() - warmedAt < WARM_TTL_MS) return true
  }

  if (mainPlaybackActive && trimmed === mainPlaybackUrl) {
    markNeteaseAudioUrlWarmed(trimmed)
    return true
  }

  const viaFetch = await warmViaFetchRange(trimmed)
  if (viaFetch) return true

  if (mainPlaybackActive) return false

  const ok = await new Promise<boolean>((resolve) => {
    const audio = new Audio()
    let settled = false

    const finish = (success: boolean) => {
      if (settled) return
      settled = true
      window.clearTimeout(timer)
      audio.onplaying = null
      audio.oncanplay = null
      audio.onloadeddata = null
      audio.onerror = null
      audio.pause()
      audio.removeAttribute('src')
      audio.load()
      if (success) {
        markNeteaseAudioUrlWarmed(trimmed)
        resolve(true)
        return
      }
      resolve(false)
    }

    const tryPlay = () => {
      audio.muted = true
      void audio.play().catch(() => {})
    }

    audio.onplaying = () => {
      window.setTimeout(() => finish(true), 400)
    }
    audio.oncanplay = tryPlay
    audio.onloadeddata = tryPlay
    audio.onerror = () => finish(false)

    const timer = window.setTimeout(() => {
      if (audio.readyState >= HTMLMediaElement.HAVE_FUTURE_DATA) {
        markNeteaseAudioUrlWarmed(trimmed)
        finish(true)
        return
      }
      if (audio.readyState >= HTMLMediaElement.HAVE_CURRENT_DATA && !audio.paused) {
        finish(true)
        return
      }
      finish(false)
    }, 20_000)

    audio.preload = 'auto'
    audio.src = trimmed
    audio.load()
    tryPlay()
  })

  return ok
}
