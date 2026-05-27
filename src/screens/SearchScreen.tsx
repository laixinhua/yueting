import { useEffect, useMemo, useState } from 'react'
import { HOT_SEARCH_KEYWORDS } from '../data/neteaseCharts'
import { useSongCatalog } from '../context/SongCatalogContext'
import { usePlayer } from '../context/PlayerContext'
import { useNeteaseHotSongs } from '../hooks/useNeteaseHotSongs'
import { SongListSkeleton } from '../components/LoadingSkeletons'
import { SectionHeader } from '../components/SectionHeader'
import { SongRow } from '../components/SongRow'
import { IconSearch } from '../components/icons'
import { useRecentPlaysContext } from '../context/RecentPlaysContext'
import { SearchResultsScreen } from './SearchResultsScreen'
import { takeRecent } from '../utils/listLimit'
import type { Song } from '../types'

export function SearchScreen() {
  const { playSong } = usePlayer()
  const { upsertNeteaseSongs } = useSongCatalog()
  const { recentSongs } = useRecentPlaysContext()
  const { songs: hotSongs, loading: hotLoading, error: hotError, refresh: refreshHot } = useNeteaseHotSongs()
  const [draftQuery, setDraftQuery] = useState('')
  const [resultsQuery, setResultsQuery] = useState<string | null>(null)

  useEffect(() => {
    if (hotSongs.length > 0) upsertNeteaseSongs(hotSongs)
  }, [hotSongs, upsertNeteaseSongs])

  const fallbackHot = useMemo(() => takeRecent(recentSongs), [recentSongs])
  const displayHot = hotSongs.length > 0 ? hotSongs : hotError ? fallbackHot : hotSongs

  const playHot = (song: Song) => {
    playSong(song)
  }

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    const q = draftQuery.trim()
    if (!q) return
    setResultsQuery(q)
  }

  const searchKeyword = (keyword: string) => {
    setDraftQuery(keyword)
    setResultsQuery(keyword)
  }

  return (
    <div className="pb-4">
      <header className="px-4 pt-12 pb-6">
        <h1 className="text-2xl font-bold text-white mb-5">搜索</h1>
        <form onSubmit={handleSearch} className="relative">
          <IconSearch className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-white/40 pointer-events-none" />
          <input
            type="search"
            value={draftQuery}
            onChange={(e) => setDraftQuery(e.target.value)}
            placeholder="搜索歌曲、歌手或专辑"
            enterKeyHint="search"
            className="w-full h-12 pl-12 pr-4 rounded-xl bg-surface-highlight text-white placeholder:text-white/40 outline-none focus:ring-2 focus:ring-white/25 transition-shadow"
          />
        </form>
      </header>

      <section className="px-4 mb-8">
        <h2 className="text-sm font-medium text-white/50 mb-3">热搜</h2>
        <div className="flex flex-wrap gap-2">
          {HOT_SEARCH_KEYWORDS.map((keyword) => (
            <button
              key={keyword}
              type="button"
              onClick={() => searchKeyword(keyword)}
              className="px-3 py-1.5 rounded-full bg-surface-highlight/80 text-sm text-white/80 hover:bg-white/10 active:scale-95 transition-all"
            >
              {keyword}
            </button>
          ))}
        </div>
      </section>

      <section className="mb-8">
        <SectionHeader
          title="热门音乐"
          action={displayHot.length > 0 || !hotLoading ? '换一换' : undefined}
          onAction={refreshHot}
        />
        {hotLoading ? (
          <SongListSkeleton rows={5} />
        ) : (
          <div className="rounded-xl mx-4 overflow-hidden bg-surface-highlight/30">
            {hotError && displayHot.length === 0 ? (
              <div className="text-center py-8 px-4 space-y-1">
                <p className="text-white/40 text-sm">{hotError}</p>
                <p className="text-white/30 text-xs">请确认已启动开发服务以使用音乐代理</p>
              </div>
            ) : displayHot.length === 0 ? (
              <p className="text-center text-white/40 py-8 text-sm">暂无热门歌曲</p>
            ) : (
              displayHot.map((song, i) => (
                <SongRow key={song.id} song={song} index={i} onClick={() => playHot(song)} />
              ))
            )}
          </div>
        )}
        {hotError && displayHot.length > 0 ? (
          <p className="px-4 mt-2 text-xs text-white/35">在线榜单暂不可用，已显示最近播放</p>
        ) : null}
        {!hotLoading && displayHot.length > 0 && hotSongs.length > 0 ? (
          <p className="px-4 mt-2 text-xs text-white/35">来自网易云热歌榜、飙升榜、新歌榜</p>
        ) : null}
      </section>

      {resultsQuery ? (
        <SearchResultsScreen query={resultsQuery} onClose={() => setResultsQuery(null)} />
      ) : null}
    </div>
  )
}
