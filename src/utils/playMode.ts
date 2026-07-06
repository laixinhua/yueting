import type { PlayMode } from '../types'

export const playModeMeta: Record<
  PlayMode,
  { label: string; ariaLabel: string }
> = {
  loop: { label: '循环', ariaLabel: '列表循环：播完重新播放' },
  one: { label: '单曲', ariaLabel: '单曲循环：重复当前歌曲' },
  list: { label: '列表', ariaLabel: '顺序播放：按列表播完即停' },
  shuffle: { label: '随机', ariaLabel: '随机播放：打乱播放顺序' },
}

export function nextPlayMode(current: PlayMode): PlayMode {
  const order: PlayMode[] = ['loop', 'one', 'list', 'shuffle']
  const i = order.indexOf(current)
  return order[(i + 1) % order.length]
}
