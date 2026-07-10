import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { Capacitor } from '@capacitor/core'
import { App } from '@capacitor/app'
import { EMPTY_CURRENT_SONG, isEmptyPlaceholder } from '../constants/emptySong'
import { useAudioPlayer } from '../hooks/useAudioPlayer'
import type { PlayMode, Song, TabId } from '../types'
import { useRecentPlaysContext } from './RecentPlaysContext'
import { useSongCatalog } from './SongCatalogContext'
import { nextPlayMode } from '../utils/playMode'
import { resolveQueueSongs, restoreQueueFromStorage, saveStoredQueue } from '../utils/playbackQueue'
import { formatPlayError } from '../utils/playError'
import { isNeteaseSong, invalidateNeteaseAudioCache, parseNeteaseId, resolveNeteasePlayUrl, resolveSongPlayUrl, warmNeteaseAudioUrl } from '../utils/neteaseSong'
import { PlaybackErrorToast } from '../components/PlaybackErrorToast'
import {
  formatSleepTimerRemaining,
  loadSleepTimerEndsAt,
  persistSleepTimerEndsAt,
  type SleepTimerKind,
} from '../utils/sleepTimer'

interface PlayOptions {
  /** 「播放全部」时传入完整列表，会追加到现有播放队列（不覆盖） */
  queue?: Song[]
}

interface PlayerContextValue {
  currentTab: TabId
  setCurrentTab: (tab: TabId) => void
  currentSong: Song
  hasActiveTrack: boolean
  playSong: (song: Song, options?: PlayOptions) => void
  playQueueIndex: (index: number) => void
  isPlaying: boolean
  isLoading: boolean
  error: string | null
  dismissError: () => void
  togglePlay: () => void
  playNext: () => void
  playPrevious: () => void
  isPlayerOpen: boolean
  openPlayer: () => void
  closePlayer: () => void
  isQueueOpen: boolean
  openQueue: () => void
  closeQueue: () => void
  isLyricsOpen: boolean
  openLyrics: () => void
  closeLyrics: () => void
  progress: number
  currentTime: number
  duration: number
  seek: (ratio: number) => void
  queue: Song[]
  queueIndex: number
  playMode: PlayMode
  cyclePlayMode: () => void
  autoPlayNext: boolean
  setAutoPlayNext: (value: boolean) => void
  sleepTimerKind: SleepTimerKind
  sleepTimerRemainingLabel: string | null
  sleepTimerActive: boolean
  /** 分钟定时所选时长，用于设置页高亮 */
  sleepTimerMinutesPlanned: number | null
  startSleepTimerMinutes: (minutes: number) => void
  startSleepTimerEndOfTrack: () => void
  cancelSleepTimer: () => void
  addToQueue: (song: Song) => void
  insertAfterCurrent: (song: Song) => void
  removeFromQueue: (index: number) => void
  clearQueue: () => void
}

const PlayerContext = createContext<PlayerContextValue | null>(null)

function pickShuffleIndex(length: number, exclude: number): number {
  if (length <= 1) return 0
  let next = exclude
  while (next === exclude) {
    next = Math.floor(Math.random() * length)
  }
  return next
}

export function PlayerProvider({ children }: { children: ReactNode }) {
  const [currentTab, setCurrentTab] = useState<TabId>('home')
  const [queue, setQueue] = useState<Song[]>([])
  const [queueIndex, setQueueIndex] = useState(0)
  const [currentSong, setCurrentSong] = useState<Song>(EMPTY_CURRENT_SONG)
  const [isPlayerOpen, setIsPlayerOpen] = useState(false)
  const [isQueueOpen, setIsQueueOpen] = useState(false)
  const [isLyricsOpen, setIsLyricsOpen] = useState(false)
  const [autoPlayNext, setAutoPlayNext] = useState(true)
  const [playMode, setPlayMode] = useState<PlayMode>('loop')
  const initialEndsAt = loadSleepTimerEndsAt()
  const [sleepTimerKind, setSleepTimerKind] = useState<SleepTimerKind>(
    initialEndsAt != null ? 'minutes' : 'off',
  )
  const [sleepTimerEndsAt, setSleepTimerEndsAt] = useState<number | null>(initialEndsAt)
  const [sleepTimerRemainingSec, setSleepTimerRemainingSec] = useState(() =>
    initialEndsAt != null ? Math.max(0, Math.ceil((initialEndsAt - Date.now()) / 1000)) : 0,
  )
  const [sleepTimerMinutesPlanned, setSleepTimerMinutesPlanned] = useState<number | null>(() => {
    if (initialEndsAt == null) return null
    const sec = Math.max(0, Math.ceil((initialEndsAt - Date.now()) / 1000))
    const match = [15, 30, 45, 60, 90].find((m) => Math.abs(m * 60 - sec) < 120)
    return match ?? null
  })
  const sleepEndOfTrackRef = useRef(false)
  const sleepTimerFiredRef = useRef(false)
  const restoredRef = useRef(false)
  const playSessionRef = useRef(0)
  const currentSongRef = useRef(currentSong)
  const loadedSongIdRef = useRef<string | null>(null)
  const prefetchedNextIdRef = useRef<string | null>(null)
  const bgAdvanceSongIdRef = useRef<string | null>(null)
  const advanceInFlightRef = useRef(false)
  const appInBackgroundRef = useRef(false)
  const queueRef = useRef(queue)
  const queueIndexRef = useRef(queueIndex)
  const autoPlayNextRef = useRef(autoPlayNext)
  const playModeRef = useRef(playMode)
  currentSongRef.current = currentSong
  queueRef.current = queue
  queueIndexRef.current = queueIndex
  autoPlayNextRef.current = autoPlayNext
  playModeRef.current = playMode

  const audio = useAudioPlayer()
  const { recordPlay } = useRecentPlaysContext()
  const { getSongById, upsertNeteaseSong } = useSongCatalog()

  const resolveSong = useCallback(
    (song: Song) => getSongById(song.id) ?? song,
    [getSongById],
  )

  const applyQueue = useCallback((list: Song[], index: number) => {
    const resolved = resolveQueueSongs(list, getSongById)
    const idx = Math.max(0, Math.min(index, Math.max(0, resolved.length - 1)))
    queueRef.current = resolved
    queueIndexRef.current = idx
    setQueue(resolved)
    setQueueIndex(idx)
    void saveStoredQueue(
      resolved.map((s) => s.id),
      idx,
    )
    return { list: resolved, index: idx }
  }, [getSongById])

  useEffect(() => {
    if (restoredRef.current) return
    let cancelled = false
    void (async () => {
      const restored = await restoreQueueFromStorage(getSongById)
      // catalog（含网易云歌曲库）可能尚未异步加载完，此时解析不出歌曲：
      // 不标记已完成，等 getSongById 引用变化后本 effect 重试。
      if (cancelled || !restored) return
      restoredRef.current = true
      const { list, index } = applyQueue(restored.queue, restored.queueIndex)
      const song = list[index]
      if (song) setCurrentSong(song)
    })()
    return () => { cancelled = true }
  }, [getSongById, applyQueue])

  useEffect(() => {
    audio.setMediaRecover(async () => {
      const song = currentSongRef.current
      if (isEmptyPlaceholder(song) || !isNeteaseSong(song)) return false

      const ncmId = song.neteaseId ?? parseNeteaseId(song.id)
      if (ncmId == null) return false

      invalidateNeteaseAudioCache(ncmId)
      const session = playSessionRef.current
      try {
        const url = await resolveNeteasePlayUrl(ncmId, { forceRefresh: true })
        if (session !== playSessionRef.current) return false
        await audio.load(url, true, false)
        loadedSongIdRef.current = song.id
        return true
      } catch {
        return false
      }
    })
    return () => audio.setMediaRecover(null)
  }, [audio.setMediaRecover, audio.load])

  const playAtIndex = useCallback(
    async (index: number, list: Song[]) => {
      const session = ++playSessionRef.current
      audio.beginSession()
      const { list: resolved, index: idx } = applyQueue(list, index)
      const song = resolved[idx]
      if (!song) return

      loadedSongIdRef.current = null
      prefetchedNextIdRef.current = null
      const target = resolveSong(song)
      setCurrentSong(target)
      if (isNeteaseSong(target)) upsertNeteaseSong(target)
      recordPlay(target.id)

      const tryLoad = async (forceRefresh: boolean) => {
        const url = await resolveSongPlayUrl(target, { forceRefresh })
        if (session !== playSessionRef.current) return
        await warmNeteaseAudioUrl(url, { force: forceRefresh })
        if (session !== playSessionRef.current) return
        const ok = await audio.load(url, true)
        if (!ok) throw new Error('PLAYBACK_START_FAILED')
      }

      try {
        await tryLoad(false)
        if (session === playSessionRef.current) {
          loadedSongIdRef.current = target.id
          advanceInFlightRef.current = false
        }
      } catch (err) {
        if (session !== playSessionRef.current) return
        advanceInFlightRef.current = false
        bgAdvanceSongIdRef.current = null
        if (isNeteaseSong(target)) {
          const ncmId = target.neteaseId ?? parseNeteaseId(target.id)
          if (ncmId != null) invalidateNeteaseAudioCache(ncmId)
          try {
            await tryLoad(true)
            if (session === playSessionRef.current) {
              loadedSongIdRef.current = target.id
              advanceInFlightRef.current = false
            }
            return
          } catch (retryErr) {
            if (session !== playSessionRef.current) return
            audio.reportError(
              isNeteaseSong(target)
                ? '当前网络无法连接网易云音频服务器（music.126.net 被屏蔽），请切换网络或使用代理后重试'
                : formatPlayError(retryErr),
            )
            return
          }
        }
        audio.reportError(formatPlayError(err))
      }
    },
    [audio, recordPlay, upsertNeteaseSong, applyQueue, resolveSong],
  )

  const playSong = useCallback(
    (song: Song, options?: PlayOptions) => {
      const target = resolveSong(song)
      if (isNeteaseSong(target)) upsertNeteaseSong(target)

      let list: Song[]
      let idx: number

      if (options?.queue && options.queue.length > 0) {
        const incoming = resolveQueueSongs(options.queue, getSongById)
        idx = incoming.findIndex((s) => s.id === target.id)
        if (idx < 0) {
          incoming.push(target)
          idx = incoming.findIndex((s) => s.id === target.id)
        }

        const existing = resolveQueueSongs(queue, getSongById)
        if (existing.length === 0) {
          list = incoming
        } else {
          const existingIds = new Set(existing.map((s) => s.id))
          const appended = incoming.filter((s) => !existingIds.has(s.id))
          list = [...existing, ...appended]
          idx = list.findIndex((s) => s.id === target.id)
        }
      } else {
        const existing = resolveQueueSongs(queue, getSongById)
        if (existing.length === 0) {
          list = [target]
          idx = 0
        } else {
          const foundIdx = existing.findIndex((s) => s.id === target.id)
          if (foundIdx >= 0) {
            list = existing
            idx = foundIdx
          } else {
            list = resolveQueueSongs([target, ...existing], getSongById)
            idx = 0
          }
        }
      }

      void playAtIndex(idx, list)
    },
    [queue, getSongById, resolveSong, upsertNeteaseSong, playAtIndex],
  )

  const playQueueIndex = useCallback(
    (index: number) => {
      if (queue.length === 0) return
      void playAtIndex(index, queue)
    },
    [queue, playAtIndex],
  )

  const playNext = useCallback(() => {
    const q = queueRef.current
    const qi = queueIndexRef.current
    const mode = playModeRef.current
    if (q.length === 0) return
    if (mode === 'shuffle') {
      void playAtIndex(pickShuffleIndex(q.length, qi), q)
      return
    }
    const atEnd = qi + 1 >= q.length
    if (atEnd) {
      if (mode === 'loop') void playAtIndex(0, q)
      return
    }
    void playAtIndex(qi + 1, q)
  }, [playAtIndex])

  const playPrevious = useCallback(() => {
    const q = queueRef.current
    const qi = queueIndexRef.current
    const mode = playModeRef.current
    if (q.length === 0) return
    if (audio.currentTime > 3) {
      audio.seek(0)
      return
    }
    if (mode === 'shuffle') {
      void playAtIndex(pickShuffleIndex(q.length, qi), q)
      return
    }
    const atStart = qi <= 0
    if (atStart) {
      if (mode === 'loop') void playAtIndex(q.length - 1, q)
      return
    }
    void playAtIndex(qi - 1, q)
  }, [playAtIndex, audio])

  const togglePlay = useCallback(() => {
    if (isEmptyPlaceholder(currentSong)) return
    if (audio.isPlaying) {
      audio.pause()
      return
    }
    const target = resolveSong(currentSong)
    if (loadedSongIdRef.current === target.id && audio.getSrc()) {
      void audio.play()
      return
    }
    if (queue.length > 0) {
      void playAtIndex(queueIndex, queue)
      return
    }
    const loadFresh = async (forceRefresh: boolean) => {
      loadedSongIdRef.current = null
      audio.beginSession()
      const url = await resolveSongPlayUrl(target, { forceRefresh })
      await warmNeteaseAudioUrl(url, { force: forceRefresh })
      const ok = await audio.load(url, true)
      if (!ok) throw new Error('PLAYBACK_START_FAILED')
      loadedSongIdRef.current = target.id
    }
    void loadFresh(false).catch(async (err) => {
      if (!isNeteaseSong(target)) {
        audio.reportError(formatPlayError(err))
        return
      }
      const ncmId = target.neteaseId ?? parseNeteaseId(target.id)
      if (ncmId != null) invalidateNeteaseAudioCache(ncmId)
      try {
        await loadFresh(true)
      } catch (retryErr) {
        audio.reportError(formatPlayError(retryErr))
      }
    })
  }, [audio, currentSong, resolveSong, queue, queueIndex, playAtIndex])

  const dismissError = useCallback(() => {
    audio.reportError(null)
  }, [audio])

  const cyclePlayMode = useCallback(() => {
    setPlayMode((m) => nextPlayMode(m))
  }, [])

  const addToQueue = useCallback(
    (song: Song) => {
      const target = resolveSong(song)
      if (isNeteaseSong(target)) upsertNeteaseSong(target)
      setQueue((prev) => {
        const resolved = resolveQueueSongs(prev, getSongById)
        if (resolved.some((s) => s.id === target.id)) return resolved
        const next = resolveQueueSongs([...resolved, target], getSongById)
        void saveStoredQueue(
          next.map((s) => s.id),
          queueIndex,
        )
        return next
      })
    },
    [getSongById, queueIndex, resolveSong, upsertNeteaseSong],
  )

  const insertAfterCurrent = useCallback(
    (song: Song) => {
      const target = resolveSong(song)
      if (isNeteaseSong(target)) upsertNeteaseSong(target)
      setQueue((prev) => {
        const without = resolveQueueSongs(prev, getSongById).filter((s) => s.id !== target.id)
        const insertAt = queue.length > 0 ? Math.min(queueIndex + 1, without.length) : 0
        const next = resolveQueueSongs(
          [...without.slice(0, insertAt), target, ...without.slice(insertAt)],
          getSongById,
        )
        void saveStoredQueue(
          next.map((s) => s.id),
          queueIndex,
        )
        return next
      })
    },
    [getSongById, queueIndex, queue.length, resolveSong, upsertNeteaseSong],
  )

  const removeFromQueue = useCallback(
    (index: number) => {
      setQueue((prev) => {
        if (index < 0 || index >= prev.length) return prev
        const next = prev.filter((_, i) => i !== index)
        if (next.length === 0) {
          void saveStoredQueue([], 0)
          setQueueIndex(0)
          setCurrentSong(EMPTY_CURRENT_SONG)
          audio.pause()
          return []
        }

        let newIndex = queueIndex
        if (index < queueIndex) newIndex = queueIndex - 1
        else if (index === queueIndex) {
          newIndex = Math.min(queueIndex, next.length - 1)
          const song = next[newIndex]
          if (song) {
            setCurrentSong(song)
            void resolveSongPlayUrl(song)
              .then((url) => audio.load(url, false))
              .catch(() => {})
          }
        }

        setQueueIndex(newIndex)
        void saveStoredQueue(
          next.map((s) => s.id),
          newIndex,
        )
        return next
      })
    },
    [queueIndex, audio],
  )

  const clearQueue = useCallback(() => {
    setQueue([])
    setQueueIndex(0)
    setCurrentSong(EMPTY_CURRENT_SONG)
    loadedSongIdRef.current = null
    void saveStoredQueue([], 0)
    audio.stop()
  }, [audio])

  const cancelSleepTimer = useCallback(() => {
    setSleepTimerKind('off')
    setSleepTimerEndsAt(null)
    setSleepTimerRemainingSec(0)
    setSleepTimerMinutesPlanned(null)
    sleepEndOfTrackRef.current = false
    sleepTimerFiredRef.current = false
    persistSleepTimerEndsAt(null)
  }, [])

  const startSleepTimerMinutes = useCallback((minutes: number) => {
    const endsAt = Date.now() + minutes * 60 * 1000
    sleepEndOfTrackRef.current = false
    sleepTimerFiredRef.current = false
    setSleepTimerKind('minutes')
    setSleepTimerEndsAt(endsAt)
    setSleepTimerRemainingSec(minutes * 60)
    setSleepTimerMinutesPlanned(minutes)
    persistSleepTimerEndsAt(endsAt)
  }, [])

  const startSleepTimerEndOfTrack = useCallback(() => {
    sleepEndOfTrackRef.current = true
    sleepTimerFiredRef.current = false
    setSleepTimerKind('end-of-track')
    setSleepTimerEndsAt(null)
    setSleepTimerRemainingSec(0)
    setSleepTimerMinutesPlanned(null)
    persistSleepTimerEndsAt(null)
  }, [])

  useEffect(() => {
    if (sleepTimerKind !== 'minutes' || sleepTimerEndsAt == null) return

    const tick = () => {
      const left = Math.max(0, Math.ceil((sleepTimerEndsAt - Date.now()) / 1000))
      setSleepTimerRemainingSec(left)
      if (left <= 0 && !sleepTimerFiredRef.current) {
        sleepTimerFiredRef.current = true
        audio.pause()
        cancelSleepTimer()
      }
    }

    tick()
    const id = window.setInterval(tick, 1000)
    return () => window.clearInterval(id)
  }, [sleepTimerKind, sleepTimerEndsAt, audio, cancelSleepTimer])

  useEffect(() => {
    if (!audio.isPlaying || !autoPlayNext) return
    const duration = audio.duration
    if (!Number.isFinite(duration) || duration <= 0) return
    if (audio.currentTime / duration < 0.85) return

    const q = queueRef.current
    const qi = queueIndexRef.current
    const mode = playModeRef.current
    if (q.length === 0 || mode === 'one' || mode === 'shuffle') return

    let nextIdx = qi + 1
    if (nextIdx >= q.length) {
      if (mode !== 'loop') return
      nextIdx = 0
    }

    const nextSong = q[nextIdx]
    if (!nextSong || prefetchedNextIdRef.current === nextSong.id) return
    prefetchedNextIdRef.current = nextSong.id
    void resolveSongPlayUrl(resolveSong(nextSong)).catch(() => {})
  }, [audio.currentTime, audio.duration, audio.isPlaying, autoPlayNext, resolveSong])

  const playNextRef = useRef(playNext)
  playNextRef.current = playNext

  const handleTrackEndedImpl = useCallback(() => {
    if (isEmptyPlaceholder(currentSongRef.current)) return
    if (advanceInFlightRef.current) return

    if (sleepEndOfTrackRef.current) {
      sleepEndOfTrackRef.current = false
      sleepTimerFiredRef.current = true
      cancelSleepTimer()
      audio.pause()
      return
    }
    if (!autoPlayNextRef.current) return
    const q = queueRef.current
    const qi = queueIndexRef.current
    const mode = playModeRef.current
    if (q.length === 0) return
    if (mode === 'one') {
      audio.seek(0)
      void audio.play()
      return
    }
    if (mode === 'loop' || mode === 'shuffle') {
      advanceInFlightRef.current = true
      playNextRef.current()
      return
    }
    if (mode === 'list' && qi + 1 < q.length) {
      advanceInFlightRef.current = true
      playNextRef.current()
    }
  }, [audio.pause, audio.play, audio.seek, cancelSleepTimer])

  const handleTrackEndedRef = useRef(handleTrackEndedImpl)
  handleTrackEndedRef.current = handleTrackEndedImpl

  const handleTrackEnded = useCallback(() => {
    handleTrackEndedRef.current()
  }, [])

  useEffect(() => {
    audio.setOnEnded(handleTrackEnded)
    return () => audio.setOnEnded(null)
  }, [audio.setOnEnded, handleTrackEnded])

  /** 原生后台定时器直接调用，不依赖 Capacitor 事件派发 */
  useEffect(() => {
    if (!Capacitor.isNativePlatform()) return
    window.__yuetingAdvanceTrack = () => handleTrackEndedRef.current()
    return () => {
      delete window.__yuetingAdvanceTrack
    }
  }, [])

  /** 后台时 ended/timeupdate 可能被冻结，临近结束时主动切歌 */
  useEffect(() => {
    if (!Capacitor.isNativePlatform()) return
    let remove: (() => void) | undefined
    void App.addListener('appStateChange', ({ isActive }) => {
      appInBackgroundRef.current = !isActive
    }).then((handle) => {
      remove = () => void handle.remove()
    })
    return () => remove?.()
  }, [])

  useEffect(() => {
    advanceInFlightRef.current = false
    bgAdvanceSongIdRef.current = null
  }, [currentSong.id])

  /** 播完检测：不依赖 isPlaying（结束时已为 false），也不依赖 WebView ended 事件 */
  useEffect(() => {
    if (!autoPlayNext) return
    if (isEmptyPlaceholder(currentSong)) return

    const audioDur = audio.duration
    const metaDur = currentSong.duration
    const d = Number.isFinite(audioDur) && audioDur > 0 ? audioDur : metaDur
    const t = audio.currentTime
    if (!Number.isFinite(d) || d <= 0 || !Number.isFinite(t)) return

    const remaining = d - t
    if (remaining > 0.5) return

    handleTrackEndedRef.current()
  }, [audio.currentTime, audio.duration, autoPlayNext, currentSong])

  const sleepTimerActive = sleepTimerKind !== 'off'
  const sleepTimerRemainingLabel =
    sleepTimerKind === 'minutes' && sleepTimerRemainingSec > 0
      ? formatSleepTimerRemaining(sleepTimerRemainingSec)
      : sleepTimerKind === 'end-of-track'
        ? '播完当前首'
        : null

  useEffect(() => {
    const audioDuration = audio.duration
    if (!Number.isFinite(audioDuration) || audioDuration <= 0) return
    const rounded = Math.round(audioDuration)
    setCurrentSong((prev) => {
      if (isEmptyPlaceholder(prev) || Math.abs(prev.duration - rounded) <= 1) return prev
      return { ...prev, duration: rounded }
    })
  }, [audio.duration, currentSong.id])

  const hasActiveTrack = !isEmptyPlaceholder(currentSong)
  const duration = audio.duration > 0 ? audio.duration : currentSong.duration
  const progress = duration > 0 ? audio.currentTime / duration : 0

  const value = useMemo<PlayerContextValue>(
    () => ({
      currentTab,
      setCurrentTab,
      currentSong,
      hasActiveTrack,
      playSong,
      playQueueIndex,
      isPlaying: audio.isPlaying,
      isLoading: audio.isLoading,
      error: audio.error,
      dismissError,
      togglePlay,
      playNext,
      playPrevious,
      isPlayerOpen,
      openPlayer: () => setIsPlayerOpen(true),
      closePlayer: () => {
        setIsPlayerOpen(false)
        setIsQueueOpen(false)
        setIsLyricsOpen(false)
      },
      isQueueOpen,
      openQueue: () => setIsQueueOpen(true),
      closeQueue: () => setIsQueueOpen(false),
      isLyricsOpen,
      openLyrics: () => setIsLyricsOpen(true),
      closeLyrics: () => setIsLyricsOpen(false),
      progress,
      currentTime: audio.currentTime,
      duration,
      seek: audio.seek,
      queue,
      queueIndex,
      playMode,
      cyclePlayMode,
      autoPlayNext,
      setAutoPlayNext,
      sleepTimerKind,
      sleepTimerRemainingLabel,
      sleepTimerActive,
      sleepTimerMinutesPlanned,
      startSleepTimerMinutes,
      startSleepTimerEndOfTrack,
      cancelSleepTimer,
      addToQueue,
      insertAfterCurrent,
      removeFromQueue,
      clearQueue,
    }),
    [
      currentTab,
      currentSong,
      hasActiveTrack,
      playSong,
      playQueueIndex,
      audio.isPlaying,
      audio.isLoading,
      audio.error,
      dismissError,
      audio.currentTime,
      togglePlay,
      playNext,
      playPrevious,
      isPlayerOpen,
      isQueueOpen,
      isLyricsOpen,
      progress,
      duration,
      audio.seek,
      queue,
      queueIndex,
      playMode,
      cyclePlayMode,
      autoPlayNext,
      sleepTimerKind,
      sleepTimerRemainingLabel,
      sleepTimerActive,
      sleepTimerMinutesPlanned,
      startSleepTimerMinutes,
      startSleepTimerEndOfTrack,
      cancelSleepTimer,
      addToQueue,
      insertAfterCurrent,
      removeFromQueue,
      clearQueue,
    ],
  )

  return (
    <PlayerContext.Provider value={value}>
      {children}
      <PlaybackErrorToast />
    </PlayerContext.Provider>
  )
}

export function usePlayer() {
  const ctx = useContext(PlayerContext)
  if (!ctx) throw new Error('usePlayer must be used within PlayerProvider')
  return ctx
}
