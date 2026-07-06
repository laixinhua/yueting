import { useEffect, useState } from 'react'
import { usePlayer } from '../context/PlayerContext'
import { useSongCatalog } from '../context/SongCatalogContext'
import { useNeteaseRecommendedSongs } from '../hooks/useNeteaseRecommendedSongs'
import { HorizontalCardSkeleton, SongListSkeleton } from '../components/LoadingSkeletons'
import { HorizontalScroll } from '../components/HorizontalScroll'
import { PlaylistCard } from '../components/PlaylistCard'
import { NeteasePlaylistDetailScreen } from '../components/NeteasePlaylistDetailScreen'
import { PlaylistDetailScreen } from '../components/PlaylistDetailScreen'
import { parseNeteaseAlbumId } from '../data/neteaseAlbums'
import { NETEASE_CHARTS, parseNeteasePlaylistId } from '../data/neteaseCharts'
import { useNeteaseFeaturedAlbums } from '../hooks/useNeteaseFeaturedAlbums'
import { useNeteaseFeaturedPlaylists } from '../hooks/useNeteaseFeaturedPlaylists'
import { useNeteaseHomePrefetch } from '../hooks/useNeteaseHomePrefetch'
import { NeteaseAlbumDetailScreen } from '../components/NeteaseAlbumDetailScreen'
import { SectionHeader } from '../components/SectionHeader'
import { SongRow } from '../components/SongRow'
import { useRecentPlaysContext } from '../context/RecentPlaysContext'
import { takeRecent } from '../utils/listLimit'
import { gradientStyle } from '../utils/gradientStyle'
import type { Playlist, Song } from '../types'

function getGreeting() {
  const hour = new Date().getHours()
  if (hour < 12) return '早上好'
  if (hour < 18) return '下午好'
  return '晚上好'
}

export function HomeScreen() {
  const { playSong, openPlayer } = usePlayer()
  const { playlists: dailyPlaylists, loading: dailyLoading, error: dailyError } = useNeteaseFeaturedPlaylists()
  const { albums: featuredAlbums, loading: albumsLoading, error: albumsError } = useNeteaseFeaturedAlbums()
  const {
    songs: recommendedSongs,
    loading: recommendLoading,
    error: recommendError,
    refresh: refreshRecommended,
  } = useNeteaseRecommendedSongs()
  const { upsertNeteaseSongs } = useSongCatalog()
  const { recentSongs } = useRecentPlaysContext()
  const [detailPlaylist, setDetailPlaylist] = useState<Playlist | null>(null)
  const [neteaseChart, setNeteaseChart] = useState<(typeof NETEASE_CHARTS)[number] | null>(null)
  const [neteaseDaily, setNeteaseDaily] = useState<{ id: number; title: string; gradient: string } | null>(null)
  const [neteaseAlbum, setNeteaseAlbum] = useState<{ id: number; title: string; gradient: string } | null>(null)

  useNeteaseHomePrefetch(dailyPlaylists, featuredAlbums)

  useEffect(() => {
    if (recommendedSongs.length > 0) upsertNeteaseSongs(recommendedSongs)
  }, [recommendedSongs, upsertNeteaseSongs])

  const fallbackRecommended = takeRecent(recentSongs)
  const displayRecommended =
    recommendedSongs.length > 0 ? recommendedSongs : recommendError ? fallbackRecommended : recommendedSongs

  const playRecommended = (song: Song) => {
    playSong(song)
    openPlayer()
  }

  return (
    <div className="pb-4 min-w-0">
      <header className="px-4 pt-12 pb-6">
        <p className="text-sm text-white/50">{getGreeting()}</p>
        <h1 className="text-2xl font-bold text-white mt-0.5">发现</h1>
      </header>

      <section className="mb-8 min-w-0">
        <SectionHeader title="网易云热榜" />
        <HorizontalScroll className="px-4 pb-2">
          <div className="flex w-max gap-4">
            {NETEASE_CHARTS.map((chart) => (
              <button
                key={chart.id}
                type="button"
                onClick={() => setNeteaseChart(chart)}
                className={`w-36 shrink-0 text-left active:scale-[0.97] transition-transform`}
              >
                <div
                  className="relative w-full h-36 rounded-lg shadow-lg shadow-black/40 mb-3 overflow-hidden flex items-center justify-center"
                  style={gradientStyle(chart.gradient)}
                >
                  <span
                    className="px-2 text-center font-bold text-lg text-white leading-tight"
                    style={{ textShadow: '0 1px 8px rgba(0,0,0,0.35)' }}
                  >
                    {chart.title}
                  </span>
                </div>
                <p className="font-semibold text-sm text-white truncate">{chart.title}</p>
                <p className="text-xs text-white/50 truncate mt-1">网易云音乐</p>
              </button>
            ))}
          </div>
        </HorizontalScroll>
      </section>

      <section className="mb-8 min-w-0">
        <SectionHeader title="每日推荐" />
        {dailyLoading ? (
          <HorizontalCardSkeleton count={4} />
        ) : dailyError ? (
          <p className="px-4 text-sm text-white/40">{dailyError}</p>
        ) : (
          <HorizontalScroll className="px-4 pb-2">
            <div className="flex w-max gap-4">
              {dailyPlaylists.map((playlist) => {
                const ncmId = parseNeteasePlaylistId(playlist.id)
                return (
                  <PlaylistCard
                    key={playlist.id}
                    playlist={playlist}
                    scrollable
                    onClick={() => {
                      if (ncmId != null) {
                        setNeteaseDaily({
                          id: ncmId,
                          title: playlist.title,
                          gradient: playlist.gradient,
                        })
                      } else {
                        setDetailPlaylist(playlist)
                      }
                    }}
                  />
                )
              })}
            </div>
          </HorizontalScroll>
        )}
      </section>

      <section className="mb-8 min-w-0">
        <SectionHeader title="推荐专辑" />
        {albumsLoading ? (
          <HorizontalCardSkeleton count={4} />
        ) : albumsError ? (
          <p className="px-4 text-sm text-white/40">{albumsError}</p>
        ) : featuredAlbums.length === 0 ? (
          <p className="px-4 text-sm text-white/40">暂无推荐专辑</p>
        ) : (
          <HorizontalScroll className="px-4 pb-2">
            <div className="flex w-max gap-4">
              {featuredAlbums.map((album) => {
                const ncmAlbumId = parseNeteaseAlbumId(album.id)
                return (
                  <PlaylistCard
                    key={album.id}
                    playlist={album}
                    scrollable
                    onClick={() => {
                      if (ncmAlbumId != null) {
                        setNeteaseAlbum({
                          id: ncmAlbumId,
                          title: album.title,
                          gradient: album.gradient,
                        })
                      } else {
                        setDetailPlaylist(album)
                      }
                    }}
                  />
                )
              })}
            </div>
          </HorizontalScroll>
        )}
      </section>

      <section className="mb-8">
        <SectionHeader
          title="推荐音乐"
          action={displayRecommended.length > 0 || !recommendLoading ? '换一换' : undefined}
          onAction={refreshRecommended}
        />
        {recommendLoading ? (
          <SongListSkeleton rows={5} />
        ) : (
          <div className="rounded-xl mx-4 overflow-hidden bg-surface-highlight/30">
            {recommendError && displayRecommended.length === 0 ? (
              <div className="text-center py-8 px-4 space-y-1">
                <p className="text-white/40 text-sm">{recommendError}</p>
                <p className="text-white/30 text-xs">请确认已启动开发服务以使用音乐代理</p>
              </div>
            ) : displayRecommended.length === 0 ? (
              <p className="text-center text-white/40 py-8 text-sm">暂无推荐歌曲</p>
            ) : (
              displayRecommended.map((song, i) => (
                <SongRow key={song.id} song={song} index={i} onClick={() => playRecommended(song)} />
              ))
            )}
          </div>
        )}
        {recommendError && displayRecommended.length > 0 ? (
          <p className="px-4 mt-2 text-xs text-white/35">在线推荐暂不可用，已显示最近播放</p>
        ) : null}
        {!recommendLoading && displayRecommended.length > 0 && recommendedSongs.length > 0 ? (
          <p className="px-4 mt-2 text-xs text-white/35">来自网易云热歌榜、私人雷达等</p>
        ) : null}
      </section>

      {detailPlaylist ? (
        <PlaylistDetailScreen playlist={detailPlaylist} onClose={() => setDetailPlaylist(null)} />
      ) : null}
      {neteaseChart ? (
        <NeteasePlaylistDetailScreen
          playlistId={neteaseChart.id}
          title={neteaseChart.title}
          gradient={neteaseChart.gradient}
          onClose={() => setNeteaseChart(null)}
        />
      ) : null}
      {neteaseDaily ? (
        <NeteasePlaylistDetailScreen
          playlistId={neteaseDaily.id}
          title={neteaseDaily.title}
          gradient={neteaseDaily.gradient}
          onClose={() => setNeteaseDaily(null)}
        />
      ) : null}
      {neteaseAlbum ? (
        <NeteaseAlbumDetailScreen
          albumId={neteaseAlbum.id}
          title={neteaseAlbum.title}
          gradient={neteaseAlbum.gradient}
          onClose={() => setNeteaseAlbum(null)}
        />
      ) : null}
    </div>
  )
}
