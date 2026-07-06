/** 首页「推荐专辑」候选（会过滤无可用播放源的专辑） */
export const NETEASE_FEATURED_ALBUM_CANDIDATES = [
  { id: 34720827, gradient: 'from-violet-600 via-purple-700 to-indigo-900' },
  { id: 149367827, gradient: 'from-fuchsia-500 via-purple-600 to-violet-900' },
  { id: 163678212, gradient: 'from-sky-400 via-blue-500 to-indigo-600' },
  { id: 151839715, gradient: 'from-slate-500 via-gray-600 to-zinc-800' },
  { id: 39483040, gradient: 'from-emerald-500 via-teal-600 to-cyan-800' },
  { id: 3189002, gradient: 'from-rose-500 via-pink-600 to-purple-800' },
  { id: 3264083, gradient: 'from-amber-400 via-orange-500 to-rose-600' },
  { id: 26935258, gradient: 'from-teal-400 via-cyan-500 to-blue-700' },
  { id: 2508161, gradient: 'from-red-500 via-rose-600 to-purple-800' },
  { id: 30440361, gradient: 'from-indigo-500 via-purple-600 to-violet-900' },
] as const

export const NETEASE_FEATURED_ALBUMS = NETEASE_FEATURED_ALBUM_CANDIDATES

/** 首页推荐专辑展示数量 */
export const FEATURED_ALBUM_COUNT = 4

export function neteaseAlbumId(id: number): string {
  return `ncm-album-${id}`
}

export function parseNeteaseAlbumId(playlistId: string): number | null {
  const m = /^ncm-album-(\d+)$/.exec(playlistId)
  return m ? Number(m[1]) : null
}
