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
  // 官方开放平台 raw API 路径已停用（走 B：个人开发者无法直连，改用 EBNR 第三方代理，详见 neteaseOfficial.ts 头部说明）。

  createRoot(document.getElementById('root')!).render(
    <StrictMode>
      <App />
    </StrictMode>,
  )
}

void bootstrap()
