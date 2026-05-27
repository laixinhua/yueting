import { useLyricsAlign, type LyricsMode } from '../context/LyricsAlignContext'
import { useShellOverlayClass } from '../hooks/useShellOverlay'
import { IconChevronLeft } from './icons'

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

  return (
    <div className={`${shellClass} flex flex-col bg-surface`}>
      <header className="shrink-0 flex items-center gap-3 px-4 pt-12 pb-4 border-b border-white/5">
        <button
          type="button"
          onClick={onClose}
          className="w-10 h-10 flex items-center justify-center rounded-full hover:bg-white/10 transition-colors"
          aria-label="返回"
        >
          <IconChevronLeft className="w-6 h-6" />
        </button>
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
