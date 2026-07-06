import { BottomNav } from '../components/BottomNav'
import { PlaybackBar } from '../components/PlaybackBar'
import { QueuePanel } from '../components/QueuePanel'
import { ScreenRouter } from '../components/ScreenRouter'
import { usePlayer } from '../context/PlayerContext'
import { PlayerScreen } from '../screens/PlayerScreen'

export function PhoneLayout() {
  const { isQueueOpen } = usePlayer()

  return (
    <div className="h-full w-full max-w-md mx-auto relative shadow-2xl shadow-black/50 border-x border-white/5">
      <div className="h-full flex flex-col bg-surface relative overflow-hidden">
        <main className="flex-1 min-w-0 min-h-0 overflow-hidden">
          <ScreenRouter />
        </main>
        <PlaybackBar />
        <BottomNav />
        <PlayerScreen />
        {isQueueOpen ? <QueuePanel /> : null}
      </div>
    </div>
  )
}
