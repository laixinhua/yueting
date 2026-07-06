import { NETEASE_CHARTS } from '../data/neteaseCharts'
import { prefetchCover } from './coverImageCache'
import { readFeaturedAlbumsCacheStale, readFeaturedPlaylistsCacheStale } from './neteaseCache'
import { prefetchCharts, startNeteasePrefetch } from './neteasePrefetch'

/** 应用启动时在后台预热 EBNR 数据（不阻塞 UI） */
export function warmEbnrOnStartup() {
  startNeteasePrefetch()
  prefetchCharts(NETEASE_CHARTS)

  const playlists = readFeaturedPlaylistsCacheStale()
  const albums = readFeaturedAlbumsCacheStale()
  for (const p of playlists ?? []) prefetchCover(p.coverUrl)
  for (const a of albums ?? []) prefetchCover(a.coverUrl)
}
