import { useEffect, useState } from 'react'
import { usePlayer } from '../context/PlayerContext'
import { SectionHeader } from '../components/SectionHeader'
import { SongRow } from '../components/SongRow'
import { SongListSkeleton } from '../components/LoadingSkeletons'
import { IconSearch } from '../components/icons'
import { searchCcMusic } from '../api/ccMusic'
import type { CcTrack } from '../api/ccMusic'
import type { Song } from '../types'

function gradientFor(id: string): string {
  let h = 0
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) % 360
  return `linear-gradient(135deg, hsl(${h} 60% 45%), hsl(${(h + 40) % 360} 60% 30%))`
}

function toSong(t: CcTrack): Song {
  return {
    id: `cc:${t.id}`,
    title: t.title,
    artist: t.artist,
    album: 'CC 曲库',
    duration: t.duration,
    gradient: t.coverUrl ? '' : gradientFor(t.id),
    genre: 'electronic',
    url: t.url,
    source: 'cc',
    coverUrl: t.coverUrl ?? '',
  }
}

const HOT = ['piano', 'jazz', 'ambient', 'lofi', 'classical', 'electronic']

export function CcLibraryScreen() {
  const { playSong, openPlayer, currentTab } = usePlayer()
  const [draft, setDraft] = useState('')
  const [query, setQuery] = useState<string | null>(null)
  const [tracks, setTracks] = useState<CcTrack[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const load = async (q: string | null) => {
    setLoading(true)
    setError(null)
    try {
      const res = await searchCcMusic(q ?? '', 24)
      setTracks(res)
    } catch (e) {
      setError(e instanceof Error ? e.message : '加载失败')
    } finally {
      setLoading(false)
    }
  }

  // 进入曲库 tab 且列表为空时才加载（避免 App 冷启动瞬间网络未就绪导致静默失败）
  useEffect(() => {
    if (currentTab === 'cc' && tracks.length === 0 && !loading) {
      load(null)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentTab, tracks.length, loading])

  const onSearch = (e: React.FormEvent) => {
    e.preventDefault()
    const q = draft.trim()
    setQuery(q)
    load(q)
  }
  const onHot = (kw: string) => {
    setDraft(kw)
    setQuery(kw)
    load(kw)
  }

  const play = (t: CcTrack) => {
    if (!t.url) {
      setError(`「${t.title}」暂无可播放音频`)
      return
    }
    const song = toSong(t)
    playSong(song)
    openPlayer()
  }

  return (
    <div className="pb-4">
      <header className="px-4 pt-12 pb-6">
        <h1 className="text-2xl font-bold text-white mb-2">CC 曲库</h1>
        <p className="text-xs text-white/40 mb-4">公共领域 / Creative Commons 免费音乐（来源：Jamendo）</p>
        <form onSubmit={onSearch} className="relative">
          <IconSearch className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-white/40 pointer-events-none" />
          <input
            type="search"
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            placeholder="搜索曲目或艺术家"
            enterKeyHint="search"
            className="w-full h-12 pl-12 pr-4 rounded-xl bg-surface-highlight text-white placeholder:text-white/40 outline-none focus:ring-2 focus:ring-white/25 transition-shadow"
          />
        </form>
        <p className="mt-2 text-[11px] leading-tight text-white/35">
          仅收录独立音乐人创作的 CC 免费作品
        </p>
      </header>

      <section className="px-4 mb-8">
        <h2 className="text-sm font-medium text-white/50 mb-3">分类速搜</h2>
        <div className="flex flex-wrap gap-2">
          {HOT.map((kw) => (
            <button
              key={kw}
              type="button"
              onClick={() => onHot(kw)}
              className="px-3 py-1.5 rounded-full bg-surface-highlight/80 text-sm text-white/80 hover:bg-white/10 active:scale-95 transition-all"
            >
              {kw}
            </button>
          ))}
        </div>
      </section>

      <section className="mb-8">
        <SectionHeader title={query ? `“${query}” 的结果` : '推荐 CC 音乐'} />
        {loading ? (
          <SongListSkeleton rows={6} />
        ) : error && tracks.length === 0 ? (
          <div className="text-center py-8 px-4">
            <p className="text-white/40 text-sm">{error}</p>
          </div>
        ) : tracks.length === 0 ? (
          <p className="text-center text-white/40 py-8 text-sm">没有找到结果</p>
        ) : (
          <div className="rounded-xl mx-4 overflow-hidden bg-surface-highlight/30">
            {tracks.map((t, i) => (
              <SongRow key={t.id} song={toSong(t)} index={i} onClick={() => play(t)} />
            ))}
          </div>
        )}
        {error && tracks.length > 0 ? (
          <p className="px-4 mt-2 text-xs text-white/35">{error}</p>
        ) : null}
      </section>
    </div>
  )
}
