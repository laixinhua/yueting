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
import { buildNeteaseAlbumPlaylist } from './neteaseAlbum'
import { buildNeteasePlaylist, buildNeteasePlaylistCard } from './neteasePlaylist'
import { FEATURED_MIN_PLAYABLE, filterPlayableNeteaseSongs } from './neteasePlayable'
import { ebnrTrackToSong } from './neteaseSong'

const PROBE_SAMPLE_SIZE = 18

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
    const songs = await filterPlayableNeteaseSongs(built.songs)
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
    const songs = await filterPlayableNeteaseSongs(built.songs)
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
  const ok = await probePlaylistRecommendable(item.id)
  if (!ok) return null

  const meta = await getPlaylist(item.id)
  return buildNeteasePlaylistCard(meta, item.gradient, item.label)
}
