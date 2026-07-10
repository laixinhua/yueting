import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react'
import { loadJSON, saveJSON } from '../utils/storage'

export type LyricsMode = 'center' | 'alternate'

const KEY = 'yueting-lyrics-mode'

interface LyricsAlignContextValue {
  mode: LyricsMode
  setMode: (mode: LyricsMode) => void
}

const LyricsAlignContext = createContext<LyricsAlignContextValue | null>(null)

export function LyricsAlignProvider({ children }: { children: ReactNode }) {
  const [mode, setModeState] = useState<LyricsMode>('center')

  useEffect(() => {
    let cancelled = false
    void loadJSON<LyricsMode>(KEY, 'center').then((v) => {
      if (cancelled) return
      if (v === 'center' || v === 'alternate') setModeState(v)
      else if (v === 'left' || v === 'right') setModeState('center')
    })
    return () => { cancelled = true }
  }, [])

  useEffect(() => {
    void saveJSON(KEY, mode)
  }, [mode])

  const setMode = useCallback((value: LyricsMode) => {
    setModeState(value)
  }, [])

  return (
    <LyricsAlignContext.Provider value={{ mode, setMode }}>
      {children}
    </LyricsAlignContext.Provider>
  )
}

export function useLyricsAlign() {
  const ctx = useContext(LyricsAlignContext)
  if (!ctx) throw new Error('useLyricsAlign must be used within LyricsAlignProvider')
  return ctx
}
