export const NETEASE_CHARTS = [
  { id: 3778678, title: '热歌榜', gradient: 'from-rose-500 to-orange-600' },
  { id: 19723756, title: '飙升榜', gradient: 'from-violet-600 to-fuchsia-600' },
  { id: 2884035, title: '原创榜', gradient: 'from-cyan-500 to-blue-600' },
  { id: 3779629, title: '新歌榜', gradient: 'from-emerald-500 to-teal-600' },
] as const

const CHART_ID_SET = new Set<number>(NETEASE_CHARTS.map((c) => c.id))

/** 首页「每日推荐」：与 NETEASE_CHARTS 不重复的歌单 */
export const NETEASE_DAILY_PLAYLIST_CANDIDATES = [
  {
    id: 3136952023,
    label: '每日推荐',
    gradient: 'from-purple-600 to-pink-600',
  },
  {
    id: 2809577409,
    label: '欧美新歌',
    gradient: 'from-blue-600 to-indigo-600',
  },
  {
    id: 26467411,
    label: '轻松时刻',
    gradient: 'from-emerald-600 to-teal-500',
  },
  {
    id: 5277965913,
    label: '情歌精选',
    gradient: 'from-rose-500 to-pink-600',
  },
  {
    id: 3786861,
    label: '华语女声',
    gradient: 'from-fuchsia-500 to-purple-700',
  },
  {
    id: 2884035,
    label: '原创榜精选',
    gradient: 'from-cyan-500 to-blue-600',
  },
  {
    id: 60198,
    label: '华语经典',
    gradient: 'from-amber-500 to-orange-600',
  },
  {
    id: 2207794311,
    label: '私人雷达',
    gradient: 'from-violet-600 to-indigo-800',
  },
].filter((item) => !CHART_ID_SET.has(item.id))

/** @deprecated 使用 CANDIDATES；保留别名兼容 */
export const NETEASE_DAILY_PLAYLISTS = NETEASE_DAILY_PLAYLIST_CANDIDATES

/** 首页每日推荐展示数量 */
export const FEATURED_DAILY_PLAYLIST_COUNT = 4

/** 首页「推荐音乐」曲目来源歌单 */
export const NETEASE_RECOMMEND_SOURCES = [
  { id: 3778678, name: '热歌榜' },
  { id: 3136952023, name: '私人雷达' },
  { id: 3779629, name: '新歌榜' },
  { id: 19723756, name: '飙升榜' },
] as const

/** 搜索页「热门音乐」：以榜单实时曲目为主 */
export const NETEASE_HOT_SOURCES = [
  { id: 3778678, name: '热歌榜' },
  { id: 19723756, name: '飙升榜' },
  { id: 3779629, name: '新歌榜' },
] as const

/** 搜索页热搜词（点击直接搜索） */
export const HOT_SEARCH_KEYWORDS = [
  '周杰伦',
  '林俊杰',
  '邓紫棋',
  '薛之谦',
  '毛不易',
  '陈奕迅',
  '李荣浩',
  '五月天',
] as const

export function neteasePlaylistId(id: number): string {
  return `ncm-pl-${id}`
}

export function parseNeteasePlaylistId(playlistId: string): number | null {
  const m = /^ncm-pl-(\d+)$/.exec(playlistId)
  return m ? Number(m[1]) : null
}
