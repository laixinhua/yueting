import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { EMPTY_CURRENT_SONG, isEmptyPlaceholder } from '../constants/emptySong'
import { useAudioPlayer } from '../hooks/useAudioPlayer'
import type { PlayMode, Song, TabId } from '../types'
import { useRecentPlaysContext } from './RecentPlaysContext'
import { useSongCatalog } from './SongCatalogContext'
import { nextPlayMode } from '../utils/playMode'
import { resolveQueueSongs, restoreQueueFromStorage, saveStoredQueue } from '../utils/playbackQueue'
import { formatPlayError } from '../utils/playError'
import { isNeteaseSong, invalidateNeteaseAudioCache, parseNeteaseId, resolveNeteasePlayUrl, resolveSongPlayUrl } from '../utils/neteaseSong'
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
  currentSongRef.current = currentSong

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
    setQueue(resolved)
    setQueueIndex(idx)
    saveStoredQueue(
      resolved.map((s) => s.id),
      idx,
    )
    return { list: resolved, index: idx }
  }, [getSongById])

  useEffect(() => {
    if (restoredRef.current) return
    restoredRef.current = true
    const restored = restoreQueueFromStorage(getSongById)
    if (!restored) return
    const { list, index } = applyQueue(restored.queue, restored.queueIndex)
    const song = list[index]
    if (song) setCurrentSong(song)
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
        return true
      } catch {
        return false
      }
    })
    return () => audio.setMediaRecover(null)
  }, [audio])

  const playAtIndex = useCallback(
    async (index: number, list: Song[]) => {
      const session = ++playSessionRef.current
      const { list: resolved, index: idx } = applyQueue(list, index)
      const song = resolved[idx]
      if (!song) return

      audio.pause()
      const target = resolveSong(song)
      setCurrentSong(target)
      if (isNeteaseSong(target)) upsertNeteaseSong(target)
      recordPlay(target.id)

      const tryLoad = async (forceRefresh: boolean) => {
        const url = await resolveSongPlayUrl(target, { forceRefresh })
        if (session !== playSessionRef.current) return
        await audio.load(url, true)
      }

      try {
        await tryLoad(false)
      } catch (err) {
        if (session !== playSessionRef.current) return
        if (isNeteaseSong(target)) {
          const ncmId = target.neteaseId ?? parseNeteaseId(target.id)
          if (ncmId != null) invalidateNeteaseAudioCache(ncmId)
          try {
            await tryLoad(true)
            return
          } catch (retryErr) {
            if (session !== playSessionRef.current) return
            audio.reportError(formatPlayError(retryErr))
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
    if (queue.length === 0) return
    if (playMode === 'shuffle') {
      void playAtIndex(pickShuffleIndex(queue.length, queueIndex), queue)
      return
    }
    const atEnd = queueIndex + 1 >= queue.length
    if (atEnd) {
      if (playMode === 'loop') void playAtIndex(0, queue)
      return
    }
    void playAtIndex(queueIndex + 1, queue)
  }, [queue, queueIndex, playMode, playAtIndex])

  const playPrevious = useCallback(() => {
    if (queue.length === 0) return
    if (audio.currentTime > 3) {
      audio.seek(0)
      return
    }
    if (playMode === 'shuffle') {
      void playAtIndex(pickShuffleIndex(queue.length, queueIndex), queue)
      return
    }
    const atStart = queueIndex <= 0
    if (atStart) {
      if (playMode === 'loop') void playAtIndex(queue.length - 1, queue)
      return
    }
    void playAtIndex(queueIndex - 1, queue)
  }, [queue, queueIndex, playMode, playAtIndex, audio])

  const togglePlay = useCallback(() => {
    if (isEmptyPlaceholder(currentSong)) return
    if (audio.isPlaying) {
      audio.pause()
      return
    }
    if (audio.getSrc()) {
      void audio.play()
      return
    }
    const target = resolveSong(currentSong)
    const loadFresh = async (forceRefresh: boolean) => {
      const url = await resolveSongPlayUrl(target, { forceRefresh })
      await audio.load(url, true)
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
  }, [audio, currentSong, resolveSong])

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
        saveStoredQueue(
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
        saveStoredQueue(
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
          saveStoredQueue([], 0)
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
        saveStoredQueue(
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
    saveStoredQueue([], 0)
    audio.pause()
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
    audio.setOnEnded(() => {
      if (sleepEndOfTrackRef.current) {
        sleepEndOfTrackRef.current = false
        sleepTimerFiredRef.current = true
        cancelSleepTimer()
        audio.pause()
        return
      }
      if (!autoPlayNext || queue.length === 0) return
      if (playMode === 'one') {
        audio.seek(0)
        void audio.play()
        return
      }
      if (playMode === 'loop' || playMode === 'shuffle') {
        playNext()
        return
      }
      if (playMode === 'list') {
        if (queueIndex + 1 < queue.length) playNext()
      }
    })
    return () => audio.setOnEnded(null)
  }, [audio, playNext, playMode, queueIndex, queue.length, autoPlayNext, cancelSleepTimer])

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
