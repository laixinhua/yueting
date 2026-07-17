import { QueuePanel } from '../components/QueuePanel'
import { ScreenRouter } from '../components/ScreenRouter'
import { TvMiniPlayer } from '../components/TvMiniPlayer'
import { IconQueue } from '../components/icons'
import { navTabs } from '../config/navigation'
import { usePlayer } from '../context/PlayerContext'
import { PlayerScreen } from '../screens/PlayerScreen'

export function TvLayout() {
  const { currentTab, setCurrentTab, openQueue, queue, isQueueOpen } = usePlayer()

  return (
    <div className="h-full flex flex-col bg-surface">
      <div className="shrink-0 flex items-center justify-between px-8 pt-8 pb-4 border-b border-white/5">
        <div>
          <h1 className="text-3xl font-bold text-white">悦听</h1>
          <p className="text-sm text-white/40 mt-0.5">电视模式 · 遥控器方向键可操作</p>
        </div>
        <nav className="flex gap-2">
          {navTabs.map(({ id, label, Icon }) => {
            const active = currentTab === id
            return (
              <button
                key={id}
                type="button"
                onClick={() => setCurrentTab(id)}
                className={`tv-focus flex items-center gap-2 px-6 py-3 rounded-xl text-lg font-medium transition-colors ${
                  active ? 'bg-white/15 text-white' : 'bg-surface-highlight text-white/60 hover:text-white'
                }`}
              >
                <Icon className="w-6 h-6" filled={active && id !== 'search' && id !== 'cc'} />
                {label}
              </button>
            )
          })}
          <button
            type="button"
            onClick={openQueue}
            className="tv-focus flex items-center gap-2 px-6 py-3 rounded-xl text-lg font-medium bg-surface-highlight text-white/60 hover:text-white transition-colors"
          >
            <IconQueue className="w-6 h-6" />
            播放队列
            <span className="text-sm tabular-nums text-white/40">({queue.length})</span>
          </button>
        </nav>
      </div>

      <main className="flex-1 min-h-0 overflow-hidden">
        <ScreenRouter variant="tv" />
      </main>

      <TvMiniPlayer />
      <PlayerScreen />
      {isQueueOpen ? <QueuePanel /> : null}
    </div>
  )
}
