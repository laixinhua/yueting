import { getAlbumDetail, getPlaylist, getPlaylistTracks } from '../api/ebnr'
import type { Playlist } from '../types'
import {
  readAlbumCache,
  readAlbumProbeCache,
  readPlaylistCache,
  readPlaylistProbeCache,
  writeAlbumCache,
  writeAlbumProbeCache,
  writePlaylistCache,
  writePlaylistProbeCache,
} from './neteaseCache'
import { buildNeteaseAlbumCard, buildNeteaseAlbumPlaylist } from './neteaseAlbum'
import { buildNeteasePlaylist, buildNeteasePlaylistCard } from './neteasePlaylist'
import { FEATURED_MIN_PLAYABLE, PLAYABLE_LIST_DETAIL_LIMIT, filterPlayableNeteaseSongs } from './neteasePlayable'
import { ebnrTrackToSong } from './neteaseSong'

/** 探测样本数（需 ≥ FEATURED_MIN_PLAYABLE，略小以减少 /audio 请求） */
const PROBE_SAMPLE_SIZE = 12

const loadingPlaylists = new Map<number, Promise<Playlist>>()
const loadingAlbums = new Map<number, Promise<Playlist>>()

export async function probePlaylistRecommendable(playlistId: number): Promise<boolean> {
  const cached = readPlaylistProbeCache(playlistId)
  if (cached !== null) return cached

  const tracks = await getPlaylistTracks(playlistId)
  const sample = tracks.slice(0, PROBE_SAMPLE_SIZE).map(ebnrTrackToSong)
  const playable = await filterPlayableNeteaseSongs(sample, { limit: FEATURED_MIN_PLAYABLE })
  const ok = playable.length >= FEATURED_MIN_PLAYABLE
  writePlaylistProbeCache(playlistId, ok)
  return ok
}

export async function probeAlbumRecommendable(albumId: number): Promise<boolean> {
  const cached = readAlbumProbeCache(albumId)
  if (cached !== null) return cached

  const detail = await getAlbumDetail(albumId)
  const sample = (detail.songs ?? []).slice(0, PROBE_SAMPLE_SIZE).map(ebnrTrackToSong)
  const playable = await filterPlayableNeteaseSongs(sample, { limit: FEATURED_MIN_PLAYABLE })
  const ok = playable.length >= FEATURED_MIN_PLAYABLE
  writeAlbumProbeCache(albumId, ok)
  return ok
}

export async function loadCachedOrFreshPlaylist(
  playlistId: number,
  gradient: string,
  label?: string,
): Promise<Playlist> {
  const cached = readPlaylistCache(playlistId)
  if (cached) return cached

  const pending = loadingPlaylists.get(playlistId)
  if (pending) return pending

  const promise = (async () => {
    const [meta, tracks] = await Promise.all([getPlaylist(playlistId), getPlaylistTracks(playlistId)])
    const built = buildNeteasePlaylist(meta, tracks, gradient, label)
    const songs = await filterPlayableNeteaseSongs(built.songs, { limit: PLAYABLE_LIST_DETAIL_LIMIT })
    const playlist = { ...built, songs }
    writePlaylistCache(playlistId, playlist)
    return playlist
  })().finally(() => {
    loadingPlaylists.delete(playlistId)
  })

  loadingPlaylists.set(playlistId, promise)
  return promise
}

export async function loadCachedOrFreshAlbum(albumId: number, gradient: string): Promise<Playlist> {
  const cached = readAlbumCache(albumId)
  if (cached) return cached

  const pending = loadingAlbums.get(albumId)
  if (pending) return pending

  const promise = (async () => {
    const detail = await getAlbumDetail(albumId)
    const built = buildNeteaseAlbumPlaylist(detail, gradient)
    const songs = await filterPlayableNeteaseSongs(built.songs, { limit: PLAYABLE_LIST_DETAIL_LIMIT })
    const playlist = { ...built, songs }
    writeAlbumCache(albumId, playlist)
    return playlist
  })().finally(() => {
    loadingAlbums.delete(albumId)
  })

  loadingAlbums.set(albumId, promise)
  return promise
}

export async function buildFeaturedPlaylistCard(
  item: { id: number; label: string; gradient: string },
): Promise<Playlist | null> {
  const probed = readPlaylistProbeCache(item.id)
  if (probed === false) return null

  const [meta, tracks] = await Promise.all([getPlaylist(item.id), getPlaylistTracks(item.id)])

  if (probed !== true) {
    const sample = tracks.slice(0, PROBE_SAMPLE_SIZE).map(ebnrTrackToSong)
    const playable = await filterPlayableNeteaseSongs(sample, { limit: FEATURED_MIN_PLAYABLE })
    const ok = playable.length >= FEATURED_MIN_PLAYABLE
    writePlaylistProbeCache(item.id, ok)
    if (!ok) return null
  }

  return buildNeteasePlaylistCard(meta, item.gradient, item.label)
}

export async function buildFeaturedAlbumCard(
  item: { id: number; gradient: string },
): Promise<Playlist | null> {
  const probed = readAlbumProbeCache(item.id)
  if (probed === false) return null

  const detail = await getAlbumDetail(item.id)

  if (probed !== true) {
    const sample = (detail.songs ?? []).slice(0, PROBE_SAMPLE_SIZE).map(ebnrTrackToSong)
    const playable = await filterPlayableNeteaseSongs(sample, { limit: FEATURED_MIN_PLAYABLE })
    const ok = playable.length >= FEATURED_MIN_PLAYABLE
    writeAlbumProbeCache(item.id, ok)
    if (!ok) return null
  }

  return buildNeteaseAlbumCard(detail, item.gradient)
}
