import type { ReactNode } from 'react'
import { usePlayer } from '../context/PlayerContext'
import { HomeScreen } from '../screens/HomeScreen'
import { LibraryScreen } from '../screens/LibraryScreen'
import { SearchScreen } from '../screens/SearchScreen'
import { TvHomeScreen } from '../screens/tv/TvHomeScreen'

interface ScreenRouterProps {
  variant?: 'default' | 'tv'
}

/** 保持页面挂载，切换 Tab 时不卸载、不重复请求 */
function TabPanel({ active, children }: { active: boolean; children: ReactNode }) {
  return (
    <div
      className={
        active
          ? 'h-full min-h-0 overflow-y-auto overscroll-y-contain'
          : 'hidden'
      }
      aria-hidden={!active}
    >
      {children}
    </div>
  )
}

export function ScreenRouter({ variant = 'default' }: ScreenRouterProps) {
  const { currentTab } = usePlayer()

  if (variant === 'tv') {
    return (
      <>
        <TabPanel active={currentTab === 'home'}>
          <TvHomeScreen />
        </TabPanel>
        <TabPanel active={currentTab === 'search'}>
          <SearchScreen />
        </TabPanel>
        <TabPanel active={currentTab === 'library'}>
          <LibraryScreen />
        </TabPanel>
      </>
    )
  }

  return (
    <>
      <TabPanel active={currentTab === 'home'}>
        <HomeScreen />
      </TabPanel>
      <TabPanel active={currentTab === 'search'}>
        <SearchScreen />
      </TabPanel>
      <TabPanel active={currentTab === 'library'}>
        <LibraryScreen />
      </TabPanel>
    </>
  )
}
