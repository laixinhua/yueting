import { useEffect } from 'react'
import { parseNeteaseAlbumId } from '../data/neteaseAlbums'
import { NETEASE_CHARTS, parseNeteasePlaylistId } from '../data/neteaseCharts'
import type { Playlist } from '../types'
import {
  prefetchCharts,
  prefetchHomeAlbums,
  prefetchHomePlaylists,
  startNeteasePrefetch,
  stopNeteasePrefetch,
} from '../utils/neteasePrefetch'

/** 在首页停留时后台预加载歌单/专辑详情，点击时可直接用缓存 */
export function useNeteaseHomePrefetch(dailyPlaylists: Playlist[], featuredAlbums: Playlist[]) {
  useEffect(() => {
    startNeteasePrefetch()
    prefetchCharts(NETEASE_CHARTS)

    return () => {
      stopNeteasePrefetch()
    }
  }, [])

  useEffect(() => {
    const playlists = dailyPlaylists
      .map((p) => {
        const id = parseNeteasePlaylistId(p.id)
        if (id == null) return null
        return { id, gradient: p.gradient, title: p.title }
      })
      .filter((x): x is { id: number; gradient: string; title: string } => x != null)

    if (playlists.length > 0) prefetchHomePlaylists(playlists)
  }, [dailyPlaylists])

  useEffect(() => {
    const albums = featuredAlbums
      .map((a) => {
        const id = parseNeteaseAlbumId(a.id)
        if (id == null) return null
        return { id, gradient: a.gradient }
      })
      .filter((x): x is { id: number; gradient: string } => x != null)

    if (albums.length > 0) prefetchHomeAlbums(albums)
  }, [featuredAlbums])
}
