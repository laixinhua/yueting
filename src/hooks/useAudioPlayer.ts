import { useCallback, useEffect, useRef, useState } from 'react'

function isAutoplayBlocked(err: unknown): boolean {
  return err instanceof DOMException && (err.name === 'NotAllowedError' || err.name === 'AbortError')
}

export function useAudioPlayer() {
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const onEndedRef = useRef<(() => void) | null>(null)
  const mediaRecoverRef = useRef<(() => Promise<boolean>) | null>(null)
  const loadGenRef = useRef(0)
  const endedSrcRef = useRef('')
  const pendingAutoplayRef = useRef(false)
  const rafRef = useRef(0)
  const [currentTime, setCurrentTime] = useState(0)
  const [duration, setDuration] = useState(0)
  const [isPlaying, setIsPlaying] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const resetElement = useCallback((audio: HTMLAudioElement) => {
    audio.pause()
    audio.removeAttribute('src')
    audio.load()
    endedSrcRef.current = ''
    pendingAutoplayRef.current = false
    setCurrentTime(0)
    setDuration(0)
    setIsPlaying(false)
  }, [])

  const fireEndedOnce = useCallback((audio: HTMLAudioElement) => {
    const src = audio.currentSrc || audio.src
    if (!src || endedSrcRef.current === src) return
    endedSrcRef.current = src
    onEndedRef.current?.()
  }, [])

  const maybeFireNearEnd = useCallback(
    (audio: HTMLAudioElement) => {
      if (!document.hidden) return
      if (audio.paused || !Number.isFinite(audio.duration) || audio.duration <= 0) return
      if (audio.currentTime < audio.duration - 0.4) return
      fireEndedOnce(audio)
    },
    [fireEndedOnce],
  )

  const retryPendingAutoplay = useCallback(async () => {
    const audio = audioRef.current
    if (!audio?.src || !pendingAutoplayRef.current || !audio.paused) return false
    try {
      await audio.play()
      pendingAutoplayRef.current = false
      return true
    } catch {
      return false
    }
  }, [])

  useEffect(() => {
    const audio = new Audio()
    audio.preload = 'metadata'
    audioRef.current = audio

    const syncTime = () => {
      if (Number.isFinite(audio.currentTime)) setCurrentTime(audio.currentTime)
      if (!audio.paused) maybeFireNearEnd(audio)
    }
    const syncDuration = () => {
      if (Number.isFinite(audio.duration)) {
        setDuration(audio.duration)
      }
    }
    const onPlay = () => {
      setIsPlaying(true)
      setError(null)
      pendingAutoplayRef.current = false
    }
    const onPause = () => setIsPlaying(false)
    const onWaiting = () => setIsLoading(true)
    const onCanPlay = () => setIsLoading(false)
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

    const onVisibility = () => {
      if (document.visibilityState !== 'visible') return
      maybeFireNearEnd(audio)
      void retryPendingAutoplay()
    }
    document.addEventListener('visibilitychange', onVisibility)

    return () => {
      document.removeEventListener('visibilitychange', onVisibility)
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
  }, [fireEndedOnce, maybeFireNearEnd, resetElement, retryPendingAutoplay])

  useEffect(() => {
    const audio = audioRef.current
    if (!audio || !isPlaying) {
      cancelAnimationFrame(rafRef.current)
      return
    }

    const tick = () => {
      if (Number.isFinite(audio.currentTime)) setCurrentTime(audio.currentTime)
      rafRef.current = requestAnimationFrame(tick)
    }
    rafRef.current = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(rafRef.current)
  }, [isPlaying])

  const prepareTrackChange = useCallback(() => {
    const audio = audioRef.current
    if (!audio) return
    loadGenRef.current += 1
    endedSrcRef.current = ''
    pendingAutoplayRef.current = false
    audio.pause()
    audio.removeAttribute('src')
    audio.load()
    setCurrentTime(0)
    setIsPlaying(false)
    setIsLoading(true)
  }, [])

  const load = useCallback(async (url: string, autoplay = true, allowRecover = true) => {
    const audio = audioRef.current
    if (!audio) return false

    const gen = ++loadGenRef.current
    endedSrcRef.current = ''
    pendingAutoplayRef.current = false

    setError(null)
    setIsLoading(true)
    setCurrentTime(0)

    audio.pause()
    audio.src = url
    audio.load()

    if (!autoplay) {
      if (gen === loadGenRef.current) setIsLoading(false)
      return true
    }

    try {
      await audio.play()
      if (gen !== loadGenRef.current) {
        audio.pause()
        return false
      }
      pendingAutoplayRef.current = false
      return true
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
        setIsPlaying(false)
        return false
      }
      setIsLoading(false)
      setIsPlaying(false)
      setError('播放失败，请重试')
      return false
    }
  }, [])

  const play = useCallback(async () => {
    const audio = audioRef.current
    if (!audio?.src) return false
    try {
      await audio.play()
      pendingAutoplayRef.current = false
      return true
    } catch (err) {
      if (isAutoplayBlocked(err)) {
        pendingAutoplayRef.current = true
        return false
      }
      setError('播放失败，请重试')
      return false
    }
  }, [])

  const pause = useCallback(() => {
    audioRef.current?.pause()
  }, [])

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
  }
}
