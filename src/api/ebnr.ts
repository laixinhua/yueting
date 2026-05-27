import type { EbnrAlbum, EbnrAlbumDetail, EbnrAudio, EbnrPlaylist, EbnrTrack } from '../types/ebnr'

const BASE = (import.meta.env.VITE_EBNR_BASE as string | undefined)?.replace(/\/$/, '') ?? '/api/ebnr'

export class EbnrApiError extends Error {
  status?: number

  constructor(message: string, status?: number) {
    super(message)
    this.name = 'EbnrApiError'
    this.status = status
  }
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const url = `${BASE}${path}`
  let res: Response
  try {
    res = await fetch(url, {
      ...init,
      headers: {
        Accept: 'application/json',
        ...init?.headers,
      },
    })
  } catch {
    throw new EbnrApiError('无法连接音乐服务，请检查网络')
  }

  if (!res.ok) {
    throw new EbnrApiError(`音乐服务错误（${res.status}）`, res.status)
  }

  return res.json() as Promise<T>
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
