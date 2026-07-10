import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { loadStoredTheme, applyTheme } from './theme/initTheme'
import { warmEbnrOnStartup } from './utils/ebnrStartupWarmup'
import { installNeteaseAudioUnlock } from './utils/neteaseSong'
import { warmCovers } from './utils/coverImageCache'
import { readFeaturedAlbumsCacheStale, readFeaturedPlaylistsCacheStale } from './utils/neteaseCache'
import './index.css'
import App from './App.tsx'

async function bootstrap() {
  void loadStoredTheme().then(applyTheme)

  const playlists = readFeaturedPlaylistsCacheStale()
  const albums = readFeaturedAlbumsCacheStale()
  await warmCovers([
    ...(playlists?.map((p) => p.coverUrl) ?? []),
    ...(albums?.map((a) => a.coverUrl) ?? []),
  ])

  warmEbnrOnStartup()
  installNeteaseAudioUnlock()

  createRoot(document.getElementById('root')!).render(
    <StrictMode>
      <App />
    </StrictMode>,
  )
}

void bootstrap()
