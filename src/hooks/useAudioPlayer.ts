import { useCallback, useEffect, useRef, useState } from 'react'
import { Capacitor } from '@capacitor/core'
import { App } from '@capacitor/app'
import { Playback } from '../plugins/playback'
import { markNeteaseAudioUrlWarmed, setMainPlaybackState } from '../utils/neteaseSong'

function sleep(ms: number) {
  return new Promise<void>((resolve) => window.setTimeout(resolve, ms))
}

function isAutoplayBlocked(err: unknown): boolean {
  return err instanceof DOMException && (err.name === 'NotAllowedError' || err.name === 'AbortError')
}

function isAppBackground(appInBackground: boolean): boolean {
  return appInBackground || document.hidden
}

export function useAudioPlayer() {
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const onEndedRef = useRef<(() => void) | null>(null)
  const mediaRecoverRef = useRef<(() => Promise<boolean>) | null>(null)
  const loadGenRef = useRef(0)
  const endedSrcRef = useRef('')
  const pendingAutoplayRef = useRef(false)
  const intendedPlayingRef = useRef(false)
  const rafRef = useRef(0)
  const watchTimerRef = useRef(0)
  const resumeCooldownRef = useRef(0)
  const lastUiTimeRef = useRef(0)
  const stallCheckRef = useRef({ time: 0, at: 0 })
  const appInBackgroundRef = useRef(false)
  const nativeEndScheduledAtRef = useRef(0)
  const lastNativeScheduleRef = useRef(0)
  const [currentTime, setCurrentTime] = useState(0)
  const [duration, setDuration] = useState(0)
  const [isPlaying, setIsPlaying] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const cancelNativeTrackEnd = useCallback(() => {
    nativeEndScheduledAtRef.current = 0
    if (Capacitor.isNativePlatform()) {
      void Playback.cancelTrackEnd().catch(() => {})
    }
  }, [])

  const syncNativeKeepAlive = useCallback((active: boolean) => {
    if (!Capacitor.isNativePlatform()) return
    void Playback.setKeepAlive({ active }).catch(() => {})
  }, [])

  const resetElement = useCallback((audio: HTMLAudioElement) => {
    cancelNativeTrackEnd()
    syncNativeKeepAlive(false)
    setMainPlaybackState(false)
    audio.pause()
    audio.removeAttribute('src')
    audio.load()
    endedSrcRef.current = ''
    pendingAutoplayRef.current = false
    intendedPlayingRef.current = false
    setCurrentTime(0)
    setDuration(0)
    setIsPlaying(false)
  }, [cancelNativeTrackEnd, syncNativeKeepAlive])

  const fireEndedOnce = useCallback((audio: HTMLAudioElement) => {
    const src = audio.currentSrc || audio.src
    if (!src || endedSrcRef.current === src) return
    endedSrcRef.current = src
    onEndedRef.current?.()
  }, [])

  const scheduleNativeTrackEnd = useCallback((audio: HTMLAudioElement) => {
    if (!Capacitor.isNativePlatform()) return
    if (!intendedPlayingRef.current || !Number.isFinite(audio.duration) || audio.duration <= 0) {
      cancelNativeTrackEnd()
      return
    }
    const remainingMs = Math.max(0, (audio.duration - audio.currentTime) * 1000)
    if (remainingMs <= 0) {
      fireEndedOnce(audio)
      return
    }
    const now = Date.now()
    const rescheduleMin = remainingMs < 30_000 ? 800 : 1500
    const driftLimit = remainingMs < 30_000 ? 800 : 2500
    if (now - lastNativeScheduleRef.current < rescheduleMin && nativeEndScheduledAtRef.current > 0) {
      const drift = Math.abs(nativeEndScheduledAtRef.current - (now + remainingMs))
      if (drift < driftLimit) return
    }
    lastNativeScheduleRef.current = now
    nativeEndScheduledAtRef.current = now + remainingMs
    void Playback.scheduleTrackEnd({ delayMs: Math.ceil(remainingMs + 200) }).catch(() => {})
  }, [cancelNativeTrackEnd, fireEndedOnce])

  const maybeFireNearEnd = useCallback(
    (audio: HTMLAudioElement) => {
      if (!intendedPlayingRef.current) return
      if (!Number.isFinite(audio.duration) || audio.duration <= 0) return

      const remaining = audio.duration - audio.currentTime
      if (audio.ended || remaining <= 0.05) {
        fireEndedOnce(audio)
        return
      }
      if (remaining <= 0.5) {
        fireEndedOnce(audio)
        return
      }
      if (!isAppBackground(appInBackgroundRef.current)) return
      if (audio.paused && remaining <= 10) {
        fireEndedOnce(audio)
      }
    },
    [fireEndedOnce],
  )

  const syncPlaybackProgress = useCallback(
    (audio: HTMLAudioElement) => {
      const t = audio.currentTime
      if (Number.isFinite(t)) {
        const now = Date.now()
        if (!isAppBackground(appInBackgroundRef.current) || now - lastUiTimeRef.current >= 2000) {
          lastUiTimeRef.current = now
          setCurrentTime(t)
        }
      }
      maybeFireNearEnd(audio)
      scheduleNativeTrackEnd(audio)
    },
    [maybeFireNearEnd, scheduleNativeTrackEnd],
  )

  const tryResumePlayback = useCallback(async (force = false) => {
    const audio = audioRef.current
    if (!audio?.src || !audio.paused) return false
    const shouldResume =
      pendingAutoplayRef.current || (force && intendedPlayingRef.current)
    if (!shouldResume) return false

    const now = Date.now()
    if (!force && now - resumeCooldownRef.current < 2500) return false
    resumeCooldownRef.current = now

    try {
      await audio.play()
      pendingAutoplayRef.current = false
      return true
    } catch (err) {
      if (isAutoplayBlocked(err)) {
        pendingAutoplayRef.current = true
      }
      return false
    }
  }, [])

  const checkEndedAfterResume = useCallback(
    (audio: HTMLAudioElement) => {
      if (!audio.src) return
      maybeFireNearEnd(audio)
      if (audio.ended) fireEndedOnce(audio)
    },
    [fireEndedOnce, maybeFireNearEnd],
  )

  const runPlaybackWatchTick = useCallback(() => {
    const el = audioRef.current
    if (!el?.src) return
    const active =
      intendedPlayingRef.current || pendingAutoplayRef.current || !el.paused || isLoading
    if (!active && !intendedPlayingRef.current) return

    if (!el.paused) {
      if (isAppBackground(appInBackgroundRef.current)) {
        const now = Date.now()
        if (
          el.currentTime === stallCheckRef.current.time &&
          now - stallCheckRef.current.at > 2000 &&
          intendedPlayingRef.current
        ) {
          const remaining = el.duration - el.currentTime
          if (Number.isFinite(remaining) && remaining <= 15) {
            fireEndedOnce(el)
            return
          }
        }
        if (el.currentTime !== stallCheckRef.current.time) {
          stallCheckRef.current = { time: el.currentTime, at: now }
        }
      }
      syncPlaybackProgress(el)
    } else if (intendedPlayingRef.current || pendingAutoplayRef.current) {
      if (pendingAutoplayRef.current) void tryResumePlayback()
      maybeFireNearEnd(el)
    }
  }, [fireEndedOnce, maybeFireNearEnd, syncPlaybackProgress, tryResumePlayback, isLoading])

  const waitUntilCanPlay = useCallback((audio: HTMLAudioElement, gen: number) => {
    return new Promise<boolean>((resolve) => {
      if (gen !== loadGenRef.current) {
        resolve(false)
        return
      }
      if (audio.readyState >= HTMLMediaElement.HAVE_FUTURE_DATA) {
        resolve(true)
        return
      }
      const cleanup = () => {
        audio.removeEventListener('canplay', onReady)
        audio.removeEventListener('error', onError)
      }
      const onReady = () => {
        cleanup()
        resolve(gen === loadGenRef.current)
      }
      const onError = () => {
        cleanup()
        resolve(false)
      }
      audio.addEventListener('canplay', onReady, { once: true })
      audio.addEventListener('error', onError, { once: true })
    })
  }, [])

  const runPlaybackWatchTickRef = useRef(runPlaybackWatchTick)
  runPlaybackWatchTickRef.current = runPlaybackWatchTick

  useEffect(() => {
    const audio = new Audio()
    audio.preload = 'metadata'
    audioRef.current = audio

    const syncTime = () => syncPlaybackProgress(audio)
    const syncDuration = () => {
      if (Number.isFinite(audio.duration)) {
        setDuration(audio.duration)
      }
    }
    const onPlay = () => {
      setIsPlaying(true)
      setError(null)
      pendingAutoplayRef.current = false
      intendedPlayingRef.current = true
      const src = audio.currentSrc || audio.src
      if (src) {
        markNeteaseAudioUrlWarmed(src)
        setMainPlaybackState(true, src)
      }
      scheduleNativeTrackEnd(audio)
      syncNativeKeepAlive(true)
    }
    const onPause = () => {
      setIsPlaying(false)
      if (!intendedPlayingRef.current) {
        setMainPlaybackState(false)
        cancelNativeTrackEnd()
        syncNativeKeepAlive(false)
      }
    }
    const onWaiting = () => setIsLoading(true)
    const onCanPlay = () => {
      setIsLoading(false)
      if (pendingAutoplayRef.current) void tryResumePlayback()
    }
    const onPlaying = () => setIsLoading(false)
    const onError = () => {
      void (async () => {
        const recovered = await mediaRecoverRef.current?.()
        if (recovered) return
        const code = audio.error?.code
        const message =
          code === MediaError.MEDIA_ERR_NETWORK
            ? '音频加载失败，请检查网络'
            : code === MediaError.MEDIA_ERR_SRC_NOT_SUPPORTED
              ? '该歌曲暂无法播放，请换一首'
              : '播放失败，请换一首或稍后重试'
        setError(message)
        setIsLoading(false)
        setIsPlaying(false)
      })()
    }
    const onEnded = () => fireEndedOnce(audio)

    audio.addEventListener('timeupdate', syncTime)
    audio.addEventListener('durationchange', syncDuration)
    audio.addEventListener('loadedmetadata', syncDuration)
    audio.addEventListener('play', onPlay)
    audio.addEventListener('pause', onPause)
    audio.addEventListener('waiting', onWaiting)
    audio.addEventListener('canplay', onCanPlay)
    audio.addEventListener('playing', onPlaying)
    audio.addEventListener('error', onError)
    audio.addEventListener('ended', onEnded)

    const scheduleWatch = () => {
      if (watchTimerRef.current) window.clearInterval(watchTimerRef.current)
      runPlaybackWatchTickRef.current()
      const ms = document.hidden ? 300 : 500
      watchTimerRef.current = window.setInterval(() => {
        runPlaybackWatchTickRef.current()
      }, ms)
    }
    scheduleWatch()

    const onVisibility = () => {
      appInBackgroundRef.current = document.visibilityState === 'hidden'
      syncPlaybackProgress(audio)
      maybeFireNearEnd(audio)
      scheduleWatch()
      if (document.visibilityState === 'visible') {
        if (Number.isFinite(audio.currentTime)) setCurrentTime(audio.currentTime)
        checkEndedAfterResume(audio)
        window.setTimeout(() => void tryResumePlayback(true), 50)
        window.setTimeout(() => {
          checkEndedAfterResume(audio)
          void tryResumePlayback(true)
        }, 400)
      } else {
        scheduleNativeTrackEnd(audio)
      }
    }
    document.addEventListener('visibilitychange', onVisibility)

    const onNativeTrackEnd = () => {
      const el = audioRef.current
      if (!el?.src) return
      if (!intendedPlayingRef.current && !el.ended) return
      maybeFireNearEnd(el)
      fireEndedOnce(el)
    }
    window.addEventListener('yuetingNativeTrackEnd', onNativeTrackEnd)

    let removePlaybackListener: (() => void) | undefined
    if (Capacitor.isNativePlatform()) {
      void Playback.addListener('trackEndDue', () => {
        const el = audioRef.current
        if (!el?.src) return
        if (!intendedPlayingRef.current && !el.ended) return
        maybeFireNearEnd(el)
        fireEndedOnce(el)
      }).then((handle) => {
        removePlaybackListener = () => void handle.remove()
      })
    }

    let removeAppListener: (() => void) | undefined
    if (Capacitor.isNativePlatform()) {
      void App.addListener('appStateChange', ({ isActive }) => {
        appInBackgroundRef.current = !isActive
        syncPlaybackProgress(audio)
        maybeFireNearEnd(audio)
        scheduleWatch()
        if (isActive) {
          if (Number.isFinite(audio.currentTime)) setCurrentTime(audio.currentTime)
          checkEndedAfterResume(audio)
          window.setTimeout(() => void tryResumePlayback(true), 50)
          window.setTimeout(() => {
            checkEndedAfterResume(audio)
            void tryResumePlayback(true)
          }, 400)
        } else {
          scheduleNativeTrackEnd(audio)
        }
      }).then((handle) => {
        removeAppListener = () => void handle.remove()
      })
    }

    return () => {
      window.removeEventListener('yuetingNativeTrackEnd', onNativeTrackEnd)
      document.removeEventListener('visibilitychange', onVisibility)
      removeAppListener?.()
      removePlaybackListener?.()
      cancelNativeTrackEnd()
      if (watchTimerRef.current) {
        window.clearInterval(watchTimerRef.current)
        watchTimerRef.current = 0
      }
      cancelAnimationFrame(rafRef.current)
      resetElement(audio)
      audio.removeEventListener('timeupdate', syncTime)
      audio.removeEventListener('durationchange', syncDuration)
      audio.removeEventListener('loadedmetadata', syncDuration)
      audio.removeEventListener('play', onPlay)
      audio.removeEventListener('pause', onPause)
      audio.removeEventListener('waiting', onWaiting)
      audio.removeEventListener('canplay', onCanPlay)
      audio.removeEventListener('playing', onPlaying)
      audio.removeEventListener('error', onError)
      audio.removeEventListener('ended', onEnded)
    }
  }, [cancelNativeTrackEnd, checkEndedAfterResume, fireEndedOnce, maybeFireNearEnd, resetElement, scheduleNativeTrackEnd, syncNativeKeepAlive, syncPlaybackProgress, tryResumePlayback])

  useEffect(() => {
    const audio = audioRef.current
    if (!audio || !isPlaying || document.hidden) {
      cancelAnimationFrame(rafRef.current)
      return
    }

    const tick = () => {
      if (document.hidden) return
      if (Number.isFinite(audio.currentTime)) setCurrentTime(audio.currentTime)
      rafRef.current = requestAnimationFrame(tick)
    }
    rafRef.current = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(rafRef.current)
  }, [isPlaying])

  const prepareTrackChange = useCallback((options?: { keepPlaying?: boolean }) => {
    const audio = audioRef.current
    if (!audio) return
    loadGenRef.current += 1
    endedSrcRef.current = ''
    stallCheckRef.current = { time: 0, at: 0 }
    cancelNativeTrackEnd()
    const keepPlaying = options?.keepPlaying ?? false
    if (keepPlaying) {
      intendedPlayingRef.current = true
      pendingAutoplayRef.current = true
    } else {
      intendedPlayingRef.current = false
      pendingAutoplayRef.current = false
    }
    audio.pause()
    audio.removeAttribute('src')
    audio.load()
    setCurrentTime(0)
    setIsPlaying(false)
    setIsLoading(true)
    lastUiTimeRef.current = 0
  }, [cancelNativeTrackEnd])

  const load = useCallback(async (url: string, autoplay = true, allowRecover = true) => {
    const audio = audioRef.current
    if (!audio) return false

    cancelNativeTrackEnd()
    const gen = ++loadGenRef.current
    endedSrcRef.current = ''
    stallCheckRef.current = { time: 0, at: 0 }

    setError(null)
    setIsLoading(true)
    setCurrentTime(0)
    lastUiTimeRef.current = 0

    audio.pause()
    audio.src = url
    audio.load()

    if (!autoplay) {
      intendedPlayingRef.current = false
      pendingAutoplayRef.current = false
      setMainPlaybackState(false)
      syncNativeKeepAlive(false)
      if (gen === loadGenRef.current) setIsLoading(false)
      return true
    }

    intendedPlayingRef.current = true
    pendingAutoplayRef.current = true
    setMainPlaybackState(true, url)
    syncNativeKeepAlive(true)

    const ready = await waitUntilCanPlay(audio, gen)
    if (!ready || gen !== loadGenRef.current) return false

    const tryStartPlayback = async (): Promise<boolean> => {
      for (let attempt = 0; attempt < 4; attempt++) {
        if (gen !== loadGenRef.current) return false
        if (audio.readyState < HTMLMediaElement.HAVE_CURRENT_DATA) {
          const again = await waitUntilCanPlay(audio, gen)
          if (!again) return false
        }
        try {
          await audio.play()
          if (gen !== loadGenRef.current) {
            audio.pause()
            return false
          }
          return true
        } catch (err) {
          if (gen !== loadGenRef.current) return false
          if (isAutoplayBlocked(err)) {
            pendingAutoplayRef.current = true
            await sleep(180 * (attempt + 1))
            continue
          }
          throw err
        }
      }
      return false
    }

    try {
      const started = await tryStartPlayback()
      if (started) {
        pendingAutoplayRef.current = false
        scheduleNativeTrackEnd(audio)
        if (gen === loadGenRef.current) setIsLoading(false)
        return true
      }

      if (allowRecover) {
        const recovered = await mediaRecoverRef.current?.()
        if (recovered && gen === loadGenRef.current) return true
      }

      if (gen !== loadGenRef.current) return false

      if (pendingAutoplayRef.current) {
        setIsLoading(false)
        void tryResumePlayback(true)
        return false
      }

      intendedPlayingRef.current = false
      setMainPlaybackState(false)
      setIsLoading(false)
      setIsPlaying(false)
      setError('播放失败，请重试')
      return false
    } catch (err) {
      if (gen !== loadGenRef.current) return false
      if (allowRecover) {
        const recovered = await mediaRecoverRef.current?.()
        if (recovered && gen === loadGenRef.current) return true
      }
      if (gen !== loadGenRef.current) return false
      if (isAutoplayBlocked(err)) {
        pendingAutoplayRef.current = true
        setIsLoading(false)
        void tryResumePlayback(true)
        return false
      }
      intendedPlayingRef.current = false
      setMainPlaybackState(false)
      setIsLoading(false)
      setIsPlaying(false)
      setError('播放失败，请重试')
      return false
    }
  }, [cancelNativeTrackEnd, syncNativeKeepAlive, waitUntilCanPlay, scheduleNativeTrackEnd, tryResumePlayback])

  const play = useCallback(async () => {
    const audio = audioRef.current
    if (!audio?.src) return false
    intendedPlayingRef.current = true
    try {
      await audio.play()
      pendingAutoplayRef.current = false
      return true
    } catch (err) {
      if (isAutoplayBlocked(err)) {
        pendingAutoplayRef.current = true
        return false
      }
      intendedPlayingRef.current = false
      setError('播放失败，请重试')
      return false
    }
  }, [])

  const pause = useCallback(() => {
    intendedPlayingRef.current = false
    pendingAutoplayRef.current = false
    setMainPlaybackState(false)
    cancelNativeTrackEnd()
    syncNativeKeepAlive(false)
    audioRef.current?.pause()
  }, [cancelNativeTrackEnd, syncNativeKeepAlive])

  const stop = useCallback(() => {
    const audio = audioRef.current
    if (!audio) return
    loadGenRef.current += 1
    resetElement(audio)
    setIsLoading(false)
    setError(null)
  }, [resetElement])

  const seek = useCallback((ratio: number) => {
    const audio = audioRef.current
    if (!audio || !Number.isFinite(audio.duration)) return
    const clamped = Math.min(1, Math.max(0, ratio))
    audio.currentTime = clamped * audio.duration
    setCurrentTime(audio.currentTime)
    if (clamped < 0.99) {
      const src = audio.currentSrc || audio.src
      if (src && endedSrcRef.current === src) endedSrcRef.current = ''
    }
  }, [])

  const setOnEnded = useCallback((handler: (() => void) | null) => {
    onEndedRef.current = handler
  }, [])

  const setMediaRecover = useCallback((handler: (() => Promise<boolean>) | null) => {
    mediaRecoverRef.current = handler
  }, [])

  const reportError = useCallback((message: string | null) => {
    const audio = audioRef.current
    if (message && audio) {
      loadGenRef.current += 1
      resetElement(audio)
    } else {
      setError(message)
      setIsLoading(false)
      setIsPlaying(false)
      return
    }
    setError(message)
    setIsLoading(false)
    setIsPlaying(false)
  }, [resetElement])

  return {
    currentTime,
    duration,
    isPlaying,
    isLoading,
    error,
    load,
    play,
    pause,
    stop,
    prepareTrackChange,
    seek,
    setOnEnded,
    setMediaRecover,
    reportError,
    getSrc: () => audioRef.current?.src ?? '',
    hasPendingAutoplay: () => pendingAutoplayRef.current,
    tryResumePlayback,
  }
}
