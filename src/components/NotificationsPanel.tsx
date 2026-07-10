import { useEffect, useState } from 'react'
import { initialNotifications, type AppNotification } from '../data/mockData'
import { Overlay } from './Overlay'
import { loadJSON, saveJSON } from '../utils/storage'

const READ_KEY = 'yueting-notifications-read'

interface NotificationsPanelProps {
  onClose: () => void
}

export function NotificationsPanel({ onClose }: NotificationsPanelProps) {
  const [readIds, setReadIds] = useState<string[]>(['n3'])
  const [items] = useState<AppNotification[]>(initialNotifications)

  useEffect(() => {
    let cancelled = false
    void loadJSON<string[]>(READ_KEY, ['n3']).then((data) => {
      if (!cancelled) setReadIds(Array.isArray(data) ? data : ['n3'])
    })
    return () => { cancelled = true }
  }, [])

  useEffect(() => {
    void saveJSON(READ_KEY, readIds)
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
                  read ? 'bg-surface-high-light/30 border-white/5' : 'bg-white/10 border-white/20'
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
