import { useEffect, useState } from 'react'
import { initialNotifications, type AppNotification } from '../data/mockData'
import { Overlay } from './Overlay'

const READ_KEY = 'yueting-notifications-read'

function loadReadIds(): string[] {
  try {
    const raw = localStorage.getItem(READ_KEY)
    if (raw) return JSON.parse(raw) as string[]
  } catch {
    /* ignore */
  }
  return ['n3']
}

interface NotificationsPanelProps {
  onClose: () => void
}

export function NotificationsPanel({ onClose }: NotificationsPanelProps) {
  const [readIds, setReadIds] = useState<string[]>(loadReadIds)
  const [items] = useState<AppNotification[]>(initialNotifications)

  useEffect(() => {
    localStorage.setItem(READ_KEY, JSON.stringify(readIds))
  }, [readIds])

  const markRead = (id: string) => {
    setReadIds((prev) => (prev.includes(id) ? prev : [...prev, id]))
  }

  const unread = items.filter((n) => !readIds.includes(n.id)).length

  return (
    <Overlay title={`通知${unread > 0 ? ` (${unread})` : ''}`} onClose={onClose}>
      <div className="px-4 py-4 space-y-3">
        {items.length === 0 ? (
          <p className="text-center text-white/50 py-12">暂无通知</p>
        ) : (
          items.map((item) => {
            const read = readIds.includes(item.id)
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => markRead(item.id)}
                className={`w-full p-4 rounded-xl border text-left transition-colors ${
                  read ? 'bg-surface-highlight/30 border-white/5' : 'bg-white/10 border-white/20'
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <h3 className="font-semibold text-white text-sm">{item.title}</h3>
                  {!read ? <span className="w-2 h-2 rounded-full bg-white shrink-0 mt-1.5" /> : null}
                </div>
                <p className="text-sm text-white/60 mt-1 leading-relaxed">{item.body}</p>
                <p className="text-xs text-white/40 mt-2">{item.time}</p>
              </button>
            )
          })
        )}
      </div>
    </Overlay>
  )
}
