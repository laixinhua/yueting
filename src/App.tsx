import { AppShell } from './components/AppShell'
import { DeviceProvider } from './context/DeviceContext'
import { ThemeProvider } from './context/ThemeContext'
import { FavoritesProvider } from './context/FavoritesContext'
import { LyricsAlignProvider } from './context/LyricsAlignContext'
import { PlaylistsProvider } from './context/PlaylistsContext'
import { BackNavigationProvider } from './context/BackNavigationContext'
import { PlayerProvider } from './context/PlayerContext'
import { RecentPlaysProvider } from './context/RecentPlaysContext'
import { SongCatalogProvider } from './context/SongCatalogContext'

export default function App() {
  return (
    <ThemeProvider>
      <DeviceProvider>
        <SongCatalogProvider>
          <RecentPlaysProvider>
            <PlaylistsProvider>
              <LyricsAlignProvider>
                <FavoritesProvider>
                  <PlayerProvider>
                    <BackNavigationProvider>
                      <div className="h-full w-full" data-app-root>
                        <AppShell />
                      </div>
                    </BackNavigationProvider>
                  </PlayerProvider>
                </FavoritesProvider>
              </LyricsAlignProvider>
            </PlaylistsProvider>
          </RecentPlaysProvider>
        </SongCatalogProvider>
      </DeviceProvider>
    </ThemeProvider>
  )
}
