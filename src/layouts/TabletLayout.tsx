import { PlaybackBar } from '../components/PlaybackBar'
import { QueuePanel } from '../components/QueuePanel'
import { IconQueue } from '../components/icons'
import { ScreenRouter } from '../components/ScreenRouter'
import { navTabs } from '../config/navigation'
import { usePlayer } from '../context/PlayerContext'
import { PlayerScreen } from '../screens/PlayerScreen'

export function TabletLayout() {
  const { currentTab, setCurrentTab, isQueueOpen, openQueue, queue } = usePlayer()

  return (
    <div className="h-full flex bg-surface">
      <aside className="w-56 shrink-0 flex flex-col border-r border-white/5 bg-surface-elevated safe-bottom">
        <div className="px-6 pt-12 pb-8">
          <h1 className="text-2xl font-bold text-white">悦听</h1>
          <p className="text-xs text-white/40 mt-1">平板模式</p>
        </div>
        <nav className="flex-1 px-3 space-y-1">
          {navTabs.map(({ id, label, Icon }) => {
            const active = currentTab === id
            return (
              <button
                key={id}
                type="button"
                onClick={() => setCurrentTab(id)}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-colors ${
                  active ? 'bg-white/10 text-white' : 'text-white/50 hover:bg-white/5 hover:text-white'
                }`}
              >
                <Icon className="w-6 h-6" filled={active && id !== 'search'} />
                <span className="font-medium">{label}</span>
              </button>
            )
          })}
        </nav>
        <div className="px-3 pb-4">
          <button
            type="button"
            onClick={openQueue}
            className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-white/50 hover:bg-white/5 hover:text-white transition-colors"
          >
            <IconQueue className="w-6 h-6 shrink-0" />
            <span className="font-medium flex-1 text-left">播放队列</span>
            <span className="text-xs tabular-nums text-white/40">{queue.length}</span>
          </button>
        </div>
      </aside>

      <div className="flex-1 min-w-0 flex flex-col">
        <main className="flex-1 min-w-0 min-h-0 overflow-hidden">
          <div className="max-w-4xl mx-auto w-full h-full min-h-0">
            <ScreenRouter />
          </div>
        </main>
        <PlaybackBar />
        <PlayerScreen />
        {isQueueOpen ? <QueuePanel /> : null}
      </div>
    </div>
  )
}
