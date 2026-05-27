import { createContext, useContext, type ReactNode } from 'react'
import { useRecentPlays } from '../hooks/useRecentPlays'
import { useSongCatalog } from './SongCatalogContext'
import type { Song } from '../types'

interface RecentPlaysContextValue {
  recentSongs: Song[]
  recordPlay: (songId: string) => void
}

const RecentPlaysContext = createContext<RecentPlaysContextValue | null>(null)

export function RecentPlaysProvider({ children }: { children: ReactNode }) {
  const { getSongById } = useSongCatalog()
  const { recentSongs, recordPlay } = useRecentPlays(getSongById)

  return (
    <RecentPlaysContext.Provider value={{ recentSongs, recordPlay }}>
      {children}
    </RecentPlaysContext.Provider>
  )
}

export function useRecentPlaysContext() {
  const ctx = useContext(RecentPlaysContext)
  if (!ctx) throw new Error('useRecentPlaysContext must be used within RecentPlaysProvider')
  return ctx
}
