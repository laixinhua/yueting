import type { ThemeMode } from '../types/theme'
import { loadJSON, saveJSON } from '../utils/storage'

const KEY = 'yueting-theme'

export async function loadStoredTheme(): Promise<ThemeMode> {
  const v = await loadJSON<string | null>(KEY, null)
  if (v === 'light' || v === 'dark') return v
  return 'dark'
}

export async function applyTheme(mode: ThemeMode) {
  const root = document.documentElement
  root.classList.remove('dark', 'light')
  root.classList.add(mode)
  root.dataset.theme = mode
  root.style.colorScheme = mode

  try {
    await saveJSON(KEY, mode)
  } catch {
    /* ignore */
  }

  const meta = document.querySelector<HTMLMetaElement>('meta[name="theme-color"]')
  if (meta) {
    meta.content = mode === 'light' ? '#ffffff' : '#121212'
  }
}
