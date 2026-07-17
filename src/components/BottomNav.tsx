import { navTabs } from '../config/navigation'
import { usePlayer } from '../context/PlayerContext'

export function BottomNav() {
  const { currentTab, setCurrentTab } = usePlayer()

  return (
    <nav className="glass border-t border-white/5 safe-bottom">
      <div className="flex items-center justify-around h-14 px-2">
        {navTabs.map(({ id, label, Icon }) => {
          const active = currentTab === id
          return (
            <button
              key={id}
              type="button"
              onClick={() => setCurrentTab(id)}
              className={`flex flex-col items-center justify-center gap-0.5 flex-1 h-full transition-colors ${
                active ? 'text-white' : 'text-white/40'
              }`}
            >
              <Icon className="w-6 h-6" filled={active && id !== 'search' && id !== 'cc'} />
              <span className="text-[10px] font-medium">{label}</span>
            </button>
          )
        })}
      </div>
    </nav>
  )
}
