import { useCallback, useEffect, useRef, useState } from 'react'

export function useAudioPlayer() {
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const onEndedRef = useRef<(() => void) | null>(null)
  const mediaRecoverRef = useRef<(() => Promise<boolean>) | null>(null)
  const rafRef = useRef(0)
  const [currentTime, setCurrentTime] = useState(0)
  const [duration, setDuration] = useState(0)
  const [isPlaying, setIsPlaying] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const audio = new Audio()
    audio.preload = 'metadata'
    audioRef.current = audio

    const syncTime = () => {
      if (audio.paused) return
      if (Number.isFinite(audio.currentTime)) setCurrentTime(audio.currentTime)
    }
    const syncDuration = () => {
      if (Number.isFinite(audio.duration)) {
        setDuration(audio.duration)
      }
    }
    const onPlay = () => {
      setIsPlaying(true)
      setError(null)
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
    const onEnded = () => onEndedRef.current?.()

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

    return () => {
      cancelAnimationFrame(rafRef.current)
      audio.pause()
      audio.removeAttribute('src')
      audio.load()
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
  }, [])

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

  const load = useCallback(async (url: string, autoplay = true, allowRecover = true) => {
    const audio = audioRef.current
    if (!audio) return

    setError(null)
    setIsLoading(true)
    setCurrentTime(0)

    audio.src = url
    audio.load()

    if (!autoplay) {
      setIsLoading(false)
      return
    }

    try {
      await audio.play()
    } catch {
      if (allowRecover) {
        const recovered = await mediaRecoverRef.current?.()
        if (recovered) return
      }
      setIsLoading(false)
      setIsPlaying(false)
      setError('播放失败，请重试')
    }
  }, [])

  const play = useCallback(async () => {
    const audio = audioRef.current
    if (!audio?.src) return
    try {
      await audio.play()
    } catch {
      setError('播放失败，请重试')
    }
  }, [])

  const pause = useCallback(() => {
    audioRef.current?.pause()
  }, [])

  const seek = useCallback((ratio: number) => {
    const audio = audioRef.current
    if (!audio || !Number.isFinite(audio.duration)) return
    const clamped = Math.min(1, Math.max(0, ratio))
    audio.currentTime = clamped * audio.duration
    setCurrentTime(audio.currentTime)
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
      audio.pause()
      audio.removeAttribute('src')
      audio.load()
      setCurrentTime(0)
      setDuration(0)
    }
    setError(message)
    setIsLoading(false)
    setIsPlaying(false)
  }, [])

  return {
    currentTime,
    duration,
    isPlaying,
    isLoading,
    error,
    load,
    play,
    pause,
    seek,
    setOnEnded,
    setMediaRecover,
    reportError,
    getSrc: () => audioRef.current?.src ?? '',
  }
}
