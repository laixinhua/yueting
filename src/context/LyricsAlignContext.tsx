import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react'

export type LyricsMode = 'center' | 'alternate'

const KEY = 'yueting-lyrics-mode'

function loadMode(): LyricsMode {
  try {
    const v = localStorage.getItem(KEY)
    if (v === 'center' || v === 'alternate') return v
    if (v === 'left' || v === 'right') return 'center'
  } catch {
    /* ignore */
  }
  return 'center'
}

interface LyricsAlignContextValue {
  mode: LyricsMode
  setMode: (mode: LyricsMode) => void
}

const LyricsAlignContext = createContext<LyricsAlignContextValue | null>(null)

export function LyricsAlignProvider({ children }: { children: ReactNode }) {
  const [mode, setModeState] = useState<LyricsMode>(loadMode)

  useEffect(() => {
    localStorage.setItem(KEY, mode)
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
