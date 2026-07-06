import type { PlayMode } from '../types'
import { IconListOrder, IconRepeat, IconShuffle } from './icons'

interface PlayModeIconProps {
  mode: PlayMode
  className?: string
}

export function PlayModeIcon({ mode, className }: PlayModeIconProps) {
  switch (mode) {
    case 'loop':
      return <IconRepeat className={className} />
    case 'one':
      return <IconRepeat className={className} one />
    case 'list':
      return <IconListOrder className={className} />
    case 'shuffle':
      return <IconShuffle className={className} />
  }
}
