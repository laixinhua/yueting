import { useBackHandler } from '../context/BackNavigationContext'
import { useLyricsAlign, type LyricsMode } from '../context/LyricsAlignContext'
import { usePlayer } from '../context/PlayerContext'
import { useSongLyrics } from '../hooks/useSongLyrics'
import { isEmptyPlaceholder } from '../constants/emptySong'
import { useShellOverlayClass } from '../hooks/useShellOverlay'
import { BackButton } from './BackButton'
import { IconChevronLeft, IconReload } from './icons'

interface LyricsSettingsPanelProps {
  onClose: () => void
}

const options: { id: LyricsMode; label: string; desc: string }[] = [
  { id: 'center', label: '居中显示', desc: '每行歌词在屏幕中间显示' },
  { id: 'alternate', label: '左右交替', desc: '第一行靠左，第二行靠右，依次交替' },
]

export function LyricsSettingsPanel({ onClose }: LyricsSettingsPanelProps) {
  const { mode, setMode } = useLyricsAlign()
  const shellClass = useShellOverlayClass('above')
  const { currentSong, duration } = usePlayer()
  const { reloading, candidates, candidateError, reload, applyCandidate, cancelReload } =
    useSongLyrics(currentSong, duration)
  const hasSong = !isEmptyPlaceholder(currentSong)

  useBackHandler(true, () => {
    onClose()
    return true
  })

  return (
    <div className={`${shellClass} flex flex-col bg-surface`}>
      <header className="shrink-0 flex items-center gap-3 px-4 pt-12 pb-4 border-b border-white/5">
        <BackButton
          aria-label="返回"
          className="w-10 h-10 flex items-center justify-center rounded-full hover:bg-white/10 transition-colors"
        >
          <IconChevronLeft className="w-6 h-6" />
        </BackButton>
        <h1 className="text-xl font-bold text-white flex-1">歌词设置</h1>
      </header>
      <div className="flex-1 min-h-0 overflow-y-auto px-4 py-6 space-y-3">
        <p className="text-sm text-white/50 mb-4">选择后立即在播放页生效。</p>
        {options.map((opt) => {
          const active = mode === opt.id
          return (
            <button
              key={opt.id}
              type="button"
              onClick={() => setMode(opt.id)}
              className={`w-full p-4 rounded-xl border text-left transition-colors ${
                active
                  ? 'bg-white/10 border-white/25'
                  : 'bg-surface-highlight/50 border-white/5 hover:bg-white/5'
              }`}
            >
              <p className={`font-semibold ${active ? 'text-white' : 'text-white/90'}`}>{opt.label}</p>
              <p className="text-sm text-white/50 mt-1">{opt.desc}</p>
            </button>
          )
        })}
        <div className="pt-2 mt-2 border-t border-white/5">
          <p className="text-sm text-white/50 mb-3 mt-4">歌词来源</p>
          {hasSong ? (
            <div className="space-y-3">
              <button
                type="button"
                onClick={() => void reload()}
                disabled={reloading}
                className="w-full flex items-center justify-center gap-2 p-3 rounded-xl bg-surface-highlight/50 border border-white/5 text-white/90 hover:bg-white/5 disabled:opacity-60 transition-colors"
              >
                <IconReload className={`w-5 h-5 ${reloading ? 'animate-spin' : ''}`} />
                <span>{reloading ? '加载中…' : '重新加载 / 匹配歌词'}</span>
              </button>
              {candidateError && !candidates ? (
                <p className="text-sm text-white/50 text-center">{candidateError}</p>
              ) : null}
              {candidates ? (
                <div className="space-y-2">
                  <p className="text-xs text-white/40 text-center">选择匹配正确的歌词来源</p>
                  {candidates.map((c) => (
                    <button
                      key={c.id}
                      type="button"
                      onClick={() => void applyCandidate(c.id)}
                      disabled={reloading}
                      className="w-full p-3 rounded-xl bg-surface-highlight/40 border border-white/5 text-left hover:bg-white/5 disabled:opacity-60 transition-colors"
                    >
                      <p className="text-sm text-white/90 truncate">{c.title}</p>
                      <p className="text-xs text-white/50 truncate mt-0.5">
                        {c.artist}
                        {c.album ? ` · ${c.album}` : ''}
                      </p>
                    </button>
                  ))}
                  <button
                    type="button"
                    onClick={() => cancelReload()}
                    className="w-full p-2 rounded-xl text-white/40 hover:text-white/70 text-sm transition-colors"
                  >
                    取消
                  </button>
                </div>
              ) : null}
            </div>
          ) : (
            <p className="text-sm text-white/40">当前没有播放歌曲。</p>
          )}
        </div>

        {mode === 'alternate' ? (
          <div className="mt-4 p-4 rounded-xl bg-surface-highlight/40 border border-white/5 text-sm text-white/60 space-y-2">
            <p className="text-left text-white/80">窗外的麻雀…</p>
            <p className="text-right text-white/50">你说这一句…</p>
            <p className="text-left text-white/50">手中的铅笔…</p>
            <p className="text-xs text-white/40 text-center pt-2">预览：左右交替效果</p>
          </div>
        ) : null}
      </div>
    </div>
  )
}
