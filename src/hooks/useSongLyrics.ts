import { useEffect, useState } from 'react'
import { fetchNeteaseLyric, fetchNeteaseLyricText } from '../api/neteaseLyric'
import { EbnrApiError, searchTracks } from '../api/ebnr'
import { updateLocalTrackLyric } from '../utils/localMusicStore'
import { getLyricTrack } from '../data/lyricsTracks'
import type { Song } from '../types'
import type { LyricTrack } from '../types/lyrics'
import { parseLrcToTrack } from '../utils/lrcParse'
import { resolveNeteaseTrackId } from '../utils/neteaseSong'

/** 为本地导入歌构造搜歌词关键词：占位歌手（本地音乐/未知歌手）时只用歌名 */
function buildLyricSearchKeyword(title: string, artist: string): string {
  const clean = artist?.trim()
  const isPlaceholder = !clean || clean === '本地音乐' || clean === '未知歌手'
  return isPlaceholder ? title.trim() : `${clean} ${title.trim()}`
}

export function useSongLyrics(song: Song, audioDuration = 0) {
  const [track, setTrack] = useState<LyricTrack | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const durationForLyrics = audioDuration > 0 ? audioDuration : song.duration
  const ncmId = resolveNeteaseTrackId(song)

  useEffect(() => {
    let cancelled = false

    const staticTrack = getLyricTrack(song.id)
    if (staticTrack) {
      setTrack(staticTrack)
      setLoading(false)
      setError(null)
      return () => {
        cancelled = true
      }
    }

    const cachedLrc = song.lrc?.trim()
    if (cachedLrc) {
      setTrack(parseLrcToTrack(cachedLrc, durationForLyrics))
      setLoading(false)
      setError(null)
      return () => {
        cancelled = true
      }
    }

    if (ncmId != null) {
      setLoading(true)
      setError(null)
      void fetchNeteaseLyric(ncmId, durationForLyrics)
        .then((result) => {
          if (cancelled) return
          setTrack(result)
          if (!result) setError(null)
        })
        .catch((err: unknown) => {
          if (cancelled) return
          setTrack(null)
          setError(err instanceof EbnrApiError ? err.message : '歌词加载失败')
        })
        .finally(() => {
          if (!cancelled) setLoading(false)
        })
      return () => {
        cancelled = true
      }
    }

    // 本地导入的歌：无内嵌歌词且无线易云 ID，按「歌名/歌手」搜在线歌词并写回
    if (song.local && !song.lrc?.trim()) {
      const title = song.title?.trim()
      if (title) {
        setLoading(true)
        setError(null)
        void (async () => {
          try {
            const keyword = buildLyricSearchKeyword(title, song.artist)
            const tracks = await searchTracks(keyword, 1)
            const top = tracks[0]
            if (!top) {
              if (!cancelled) {
                setTrack(null)
                setLoading(false)
              }
              return
            }
            const lrcText = await fetchNeteaseLyricText(top.id)
            if (cancelled) return
            if (lrcText) {
              setTrack(parseLrcToTrack(lrcText, durationForLyrics))
              void updateLocalTrackLyric(song.id, lrcText, top.id)
            } else if (!cancelled) {
              setTrack(null)
            }
          } catch {
            if (!cancelled) setTrack(null)
          } finally {
            if (!cancelled) setLoading(false)
          }
        })()
        return () => {
          cancelled = true
        }
      }
    }

    setTrack(null)
    setLoading(false)
    setError(null)
    return () => {
      cancelled = true
    }
  }, [song.id, song.lrc, song.neteaseId, song.fileKey, ncmId, durationForLyrics])

  return { track, loading, error }
}
