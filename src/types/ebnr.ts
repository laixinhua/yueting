/** EBNR（Even Better Netease Resolver）接口类型 */

export interface EbnrArtist {
  id: number
  name: string
}

export interface EbnrAlbum {
  id: number
  name: string
  cover_url?: string | null
  description?: string | null
  artists?: EbnrArtist[]
}

/** POST /album 返回的专辑详情（含曲目） */
export interface EbnrAlbumDetail extends EbnrAlbum {
  songs: EbnrTrack[]
}

export interface EbnrQuality {
  bitrate: number
  size: number
  sample_rate?: number
}

export interface EbnrTrack {
  id: number
  name: string
  artists: EbnrArtist[]
  album: EbnrAlbum
  pop?: number
  qualities?: Record<string, EbnrQuality | null>
}

export interface EbnrAudio {
  id: number
  url?: string | null
  encoding?: string
  bitrate?: number
  size?: number
  md5?: string
}

export interface EbnrPlaylist {
  id: number
  name: string
  description?: string | null
  cover_url?: string | null
  track_count?: number
  play_count?: number
}
