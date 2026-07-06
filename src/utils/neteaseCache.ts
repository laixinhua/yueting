import type { Playlist } from '../types'
import type { Song } from '../types'
import { readStaleTtlCache, readTtlCache, writeTtlCache } from './ttlCache'

const PREFIX = 'yueting-ncm'

/** 可播探测：正缓存 6h，负缓存 2h */
export const PLAYABLE_PROBE_OK_TTL_MS = 6 * 60 * 60 * 1000
export const PLAYABLE_PROBE_NONE_TTL_MS = 2 * 60 * 60 * 1000

/** 播放 URL 本地缓存（CDN 链较短，约 90 分钟） */
export const PLAYABLE_URL_TTL_MS = 90 * 60 * 1000

/** 歌单/专辑曲目、首页池：12h */
export const NETEASE_LIST_CACHE_TTL_MS = 12 * 60 * 60 * 1000

/** 每日推荐卡片、推荐专辑列表：24h */
export const FEATURED_LIST_CACHE_TTL_MS = 24 * 60 * 60 * 1000

/** 歌单/专辑是否值得推荐的探测结果：12h */
export const FEATURED_PROBE_CACHE_TTL_MS = 12 * 60 * 60 * 1000

export type PlayableProbeCache = { canPlay: boolean }

export interface HotPoolCache {
  display: Song[]
  pool: Song[]
}

function key(...parts: string[]) {
  return `${PREFIX}-${parts.join('-')}`
}

export function playableCacheKey(neteaseId: number) {
  return key('playable', String(neteaseId))
}

export function readPlayableProbeCache(neteaseId: number): boolean | null {
  const legacy = readTtlCache<{ kind?: string; canPlay?: boolean }>(playableCacheKey(neteaseId))
  if (!legacy) return null
  if (typeof legacy.canPlay === 'boolean') return legacy.canPlay
  if (legacy.kind === 'url') return true
  if (legacy.kind === 'none') return false
  return null
}

export function writePlayableProbeCache(neteaseId: number, canPlay: boolean): void {
  const ttl = canPlay ? PLAYABLE_PROBE_OK_TTL_MS : PLAYABLE_PROBE_NONE_TTL_MS
  writeTtlCache(playableCacheKey(neteaseId), { canPlay }, ttl)
}

function audioUrlCacheKey(neteaseId: number) {
  return key('audio-url', String(neteaseId))
}

export function readPlayableUrlCache(neteaseId: number): string | null {
  const entry = readTtlCache<{ url: string }>(audioUrlCacheKey(neteaseId))
  const url = entry?.url?.trim()
  return url || null
}

export function writePlayableUrlCache(neteaseId: number, url: string): void {
  writeTtlCache(audioUrlCacheKey(neteaseId), { url }, PLAYABLE_URL_TTL_MS)
}

export function removePlayableUrlCache(neteaseId: number): void {
  try {
    localStorage.removeItem(audioUrlCacheKey(neteaseId))
  } catch {
    /* ignore */
  }
}

export function readPlaylistCache(playlistId: number): Playlist | null {
  return readTtlCache<Playlist>(key('playlist', String(playlistId)))
}

export function readPlaylistCacheStale(playlistId: number): Playlist | null {
  return readStaleTtlCache<Playlist>(key('playlist', String(playlistId)))
}

export function writePlaylistCache(playlistId: number, playlist: Playlist): void {
  writeTtlCache(key('playlist', String(playlistId)), playlist, NETEASE_LIST_CACHE_TTL_MS)
}

export function readAlbumCache(albumId: number): Playlist | null {
  return readTtlCache<Playlist>(key('album', String(albumId)))
}

export function readAlbumCacheStale(albumId: number): Playlist | null {
  return readStaleTtlCache<Playlist>(key('album', String(albumId)))
}

export function writeAlbumCache(albumId: number, playlist: Playlist): void {
  writeTtlCache(key('album', String(albumId)), playlist, NETEASE_LIST_CACHE_TTL_MS)
}

export function readHotPoolCache(): HotPoolCache | null {
  return readTtlCache<HotPoolCache>(key('hot-pool'))
}

export function readHotPoolCacheStale(): HotPoolCache | null {
  return readStaleTtlCache<HotPoolCache>(key('hot-pool'))
}

export function writeHotPoolCache(data: HotPoolCache): void {
  writeTtlCache(key('hot-pool'), data, NETEASE_LIST_CACHE_TTL_MS)
}

export function readRecommendPoolCache(): Song[] | null {
  return readTtlCache<Song[]>(key('recommend-pool'))
}

export function readRecommendPoolCacheStale(): Song[] | null {
  return readStaleTtlCache<Song[]>(key('recommend-pool'))
}

export function writeRecommendPoolCache(songs: Song[]): void {
  writeTtlCache(key('recommend-pool'), songs, NETEASE_LIST_CACHE_TTL_MS)
}

export function readFeaturedPlaylistsCache(): Playlist[] | null {
  return readTtlCache<Playlist[]>(key('featured-playlists'))
}

export function readFeaturedPlaylistsCacheStale(): Playlist[] | null {
  return readStaleTtlCache<Playlist[]>(key('featured-playlists'))
}

export function writeFeaturedPlaylistsCache(playlists: Playlist[]): void {
  writeTtlCache(key('featured-playlists'), playlists, FEATURED_LIST_CACHE_TTL_MS)
}

export function readFeaturedAlbumsCache(): Playlist[] | null {
  return readTtlCache<Playlist[]>(key('featured-albums'))
}

export function readFeaturedAlbumsCacheStale(): Playlist[] | null {
  return readStaleTtlCache<Playlist[]>(key('featured-albums'))
}

export function writeFeaturedAlbumsCache(albums: Playlist[]): void {
  writeTtlCache(key('featured-albums'), albums, FEATURED_LIST_CACHE_TTL_MS)
}

export function readPlaylistProbeCache(playlistId: number): boolean | null {
  const v = readTtlCache<{ ok: boolean }>(key('probe-pl', String(playlistId)))
  return v ? v.ok : null
}

export function writePlaylistProbeCache(playlistId: number, ok: boolean): void {
  writeTtlCache(key('probe-pl', String(playlistId)), { ok }, FEATURED_PROBE_CACHE_TTL_MS)
}

export function readAlbumProbeCache(albumId: number): boolean | null {
  const v = readTtlCache<{ ok: boolean }>(key('probe-album', String(albumId)))
  return v ? v.ok : null
}

export function writeAlbumProbeCache(albumId: number, ok: boolean): void {
  writeTtlCache(key('probe-album', String(albumId)), { ok }, FEATURED_PROBE_CACHE_TTL_MS)
}
