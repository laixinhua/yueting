import { useSyncExternalStore } from 'react'
import { getProgressSnapshot, subscribeProgress, type PlayerProgress } from './useAudioPlayer'

/**
 * 订阅播放进度（currentTime / duration / progress）。
 * 这些值在播放时以 ~60fps 变化，单独走外部 store 订阅，
 * 避免经 PlayerContext 触发所有消费者每帧重渲染。
 */
export function usePlayerProgress(): PlayerProgress {
  return useSyncExternalStore(subscribeProgress, getProgressSnapshot, getProgressSnapshot)
}
