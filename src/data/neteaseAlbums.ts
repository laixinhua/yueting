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
  // —— 以下为扩充的候选（均已验证可正常返回曲目，曲目数 ≥10 以通过可播放探测）——
  { id: 512370, gradient: 'from-rose-400 via-pink-500 to-purple-700' },
  { id: 135010288, gradient: 'from-emerald-400 via-teal-500 to-cyan-700' },
  { id: 21252, gradient: 'from-amber-400 via-orange-500 to-rose-600' },
  { id: 2292012, gradient: 'from-slate-500 via-gray-700 to-zinc-900' },
  { id: 25475, gradient: 'from-sky-400 via-blue-500 to-indigo-700' },
  { id: 170259767, gradient: 'from-violet-500 via-purple-600 to-fuchsia-800' },
  { id: 38290, gradient: 'from-rose-500 via-red-600 to-amber-700' },
  { id: 73914415, gradient: 'from-cyan-400 via-teal-500 to-emerald-700' },
  { id: 82855264, gradient: 'from-indigo-500 via-blue-600 to-violet-800' },
  { id: 2740205, gradient: 'from-pink-400 via-rose-500 to-red-700' },
  { id: 2681139, gradient: 'from-amber-500 via-yellow-600 to-orange-800' },
  { id: 3170026, gradient: 'from-fuchsia-500 via-purple-600 to-indigo-800' },
  { id: 74999481, gradient: 'from-teal-400 via-cyan-500 to-blue-700' },
  { id: 512175, gradient: 'from-rose-400 via-pink-600 to-purple-800' },
  { id: 3151276, gradient: 'from-sky-400 via-indigo-500 to-violet-700' },
  { id: 30609, gradient: 'from-emerald-500 via-green-600 to-teal-800' },
  { id: 34567265, gradient: 'from-orange-400 via-amber-500 to-rose-700' },
  { id: 34867218, gradient: 'from-violet-600 via-fuchsia-600 to-pink-800' },
  { id: 3075071, gradient: 'from-red-500 via-rose-600 to-purple-800' },
  { id: 365902500, gradient: 'from-blue-500 via-indigo-600 to-violet-800' },
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
