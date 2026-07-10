import { createContext, useCallback, useContext, useEffect, useLayoutEffect, useState, type ReactNode } from 'react'
import { applyTheme, loadStoredTheme } from '../theme/initTheme'
import type { ThemeMode } from '../types/theme'

interface ThemeContextValue {
  theme: ThemeMode
  setTheme: (mode: ThemeMode) => void
  toggleTheme: () => void
  isLight: boolean
}

const ThemeContext = createContext<ThemeContextValue | null>(null)

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setThemeState] = useState<ThemeMode>('dark')

  useEffect(() => {
    let cancelled = false
    void loadStoredTheme().then((m) => {
      if (!cancelled) setThemeState(m)
    })
    return () => { cancelled = true }
  }, [])

  useLayoutEffect(() => {
    void applyTheme(theme)
  }, [theme])

  const setTheme = useCallback((mode: ThemeMode) => {
    void applyTheme(mode)
    setThemeState(mode)
  }, [])

  const toggleTheme = useCallback(() => {
    setThemeState((t) => {
      const next = t === 'dark' ? 'light' : 'dark'
      void applyTheme(next)
      return next
    })
  }, [])

  return (
    <ThemeContext.Provider value={{ theme, setTheme, toggleTheme, isLight: theme === 'light' }}>
      {children}
    </ThemeContext.Provider>
  )
}

export function useTheme() {
  const ctx = useContext(ThemeContext)
  if (!ctx) throw new Error('useTheme must be used within ThemeProvider')
  return ctx
}
