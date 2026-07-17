import type { TabId } from '../types'
import { IconCcLibrary, IconHome, IconLibrary, IconSearch } from '../components/icons'

export const navTabs: { id: TabId; label: string; Icon: typeof IconHome }[] = [
  { id: 'home', label: '首页', Icon: IconHome },
  { id: 'search', label: '搜索', Icon: IconSearch },
  { id: 'cc', label: '曲库', Icon: IconCcLibrary },
  { id: 'library', label: '我的', Icon: IconLibrary },
]
