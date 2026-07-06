import type { ThemeMode } from '../types/theme'

const KEY = 'yueting-theme'

export function loadStoredTheme(): ThemeMode {
  try {
    const v = localStorage.getItem(KEY)
    if (v === 'light' || v === 'dark') return v
  } catch {
    /* ignore */
  }
  return 'dark'
}

export function applyTheme(mode: ThemeMode) {
  const root = document.documentElement
  root.classList.remove('dark', 'light')
  root.classList.add(mode)
  root.dataset.theme = mode
  root.style.colorScheme = mode

  try {
    localStorage.setItem(KEY, mode)
  } catch {
    /* ignore */
  }

  const meta = document.querySelector<HTMLMetaElement>('meta[name="theme-color"]')
  if (meta) {
    meta.content = mode === 'light' ? '#ffffff' : '#121212'
  }
}
