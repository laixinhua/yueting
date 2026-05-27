import { getAudioUrl } from '../api/ebnr'
import type { EbnrTrack } from '../types/ebnr'
import type { Song, SongGenre } from '../types'
import {
  readPlayableProbeCache,
  writePlayableProbeCache,
} from './neteaseCache'

const GRADIENTS = [
  'from-violet-600 via-purple-700 to-indigo-900',
  'from-sky-400 via-blue-500 to-indigo-600',
  'from-amber-400 via-orange-500 to-rose-600',
  'from-teal-400 via-cyan-500 to-blue-700',
  'from-emerald-500 via-teal-600 to-cyan-800',
  'from-fuchsia-500 via-purple-600 to-violet-900',
] as const

/** 网易云 CDN 链接有效期较短，内存缓存不宜过久 */
const URL_MEMORY_TTL_MS = 45 * 60 * 1000

type UrlMemoryEntry = { url: string; fetchedAt: number }

const urlMemory = new Map<number, UrlMemoryEntry>()

async function fetchAudioUrlFromApi(neteaseId: number): Promise<string | null> {
  const audio = await getAudioUrl(neteaseId)
  const url = audio.url?.trim()
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

/** 清除某首歌的播放地址缓存（播放失败时重试用） */
export function invalidateNeteaseAudioCache(neteaseId: number): void {
  urlMemory.delete(neteaseId)
}

/** 探测网易云歌曲是否可播放（仅缓存「能/不能」，不长期缓存 URL） */
export async function isNeteaseSongPlayable(neteaseId: number): Promise<boolean> {
  const probed = readPlayableProbeCache(neteaseId)
  if (probed !== null) return probed

  try {
    const url = await fetchAudioUrlFromApi(neteaseId)
    if (url) {
      writePlayableProbeCache(neteaseId, true)
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
    coverUrl: track.album?.cover_url ?? undefined,
  }
}

/** 解析网易云歌曲的可播放地址（播放时尽量取新链，避免过期） */
export async function resolveNeteasePlayUrl(
  neteaseId: number,
  options?: { forceRefresh?: boolean },
): Promise<string> {
  if (!options?.forceRefresh) {
    const cached = readMemoryUrl(neteaseId)
    if (cached) return cached
  } else {
    invalidateNeteaseAudioCache(neteaseId)
  }

  const url = await fetchAudioUrlFromApi(neteaseId)
  if (!url) throw new Error('未获取到播放地址')

  writeMemoryUrl(neteaseId, url)
  writePlayableProbeCache(neteaseId, true)
  return url
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
