import { useEffect, useState } from 'react'
import { fetchNeteaseLyric, fetchNeteaseLyricText } from '../api/neteaseLyric'
import { EbnrApiError, searchTracks } from '../api/ebnr'
import { updateLocalTrackLyric } from '../utils/localMusicStore'
import { cacheCoverFromNetwork } from '../utils/coverImageCache'
import { normalizeImageUrl } from '../utils/imageUrl'
import { getLyricTrack } from '../data/lyricsTracks'
import type { Song } from '../types'
import type { LyricTrack } from '../types/lyrics'
import { parseLrcToTrack } from '../utils/lrcParse'
import { resolveNeteaseTrackId } from '../utils/neteaseSong'
import { usePlayer } from '../context/PlayerContext'

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
  const { patchCurrentSong, currentSong: ctxSong } = usePlayer()

  useEffect(() => {
    let cancelled = false

    // 1) 歌词加载：静态 > 缓存 > 按 ID > 本地歌按关键词搜（保持原行为）
    const staticTrack = getLyricTrack(song.id)
    if (staticTrack) {
      setTrack(staticTrack)
      setLoading(false)
      setError(null)
    } else {
      const cachedLrc = song.lrc?.trim()
      if (cachedLrc) {
        setTrack(parseLrcToTrack(cachedLrc, durationForLyrics))
        setLoading(false)
        setError(null)
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
      } else if (song.local) {
        const title = song.title?.trim()
        if (title) {
          setLoading(true)
          setError(null)
          void (async () => {
            try {
              const tracks = await searchTracks(buildLyricSearchKeyword(title, song.artist), 1)
              const top = tracks[0]
              if (!top) {
                if (!cancelled) setTrack(null)
                return
              }
              const lrcText = await fetchNeteaseLyricText(top.id)
              if (cancelled) return
              if (lrcText) {
                setTrack(parseLrcToTrack(lrcText, durationForLyrics))
                void updateLocalTrackLyric(song.id, {
                  lrc: lrcText,
                  neteaseId: top.id,
                  coverUrl: normalizeImageUrl(top.album?.cover_url) ?? undefined,
                })
              } else if (!cancelled) {
                setTrack(null)
              }
            } catch {
              if (!cancelled) setTrack(null)
            } finally {
              if (!cancelled) setLoading(false)
            }
          })()
        }
      }
    }

    // 2) 封面补取（独立于歌词）：本地歌缺封面即搜，无论是否已绑定网易云 ID
    if (song.local && !song.coverUrl && !cancelled) {
      void (async () => {
        try {
          const keyword = buildLyricSearchKeyword(song.title ?? '', song.artist)
          const tracks = await searchTracks(keyword, 1)
          const top = tracks[0]
          const coverUrl = normalizeImageUrl(top?.album?.cover_url) ?? undefined
          if (cancelled || !top || !coverUrl) return
          void updateLocalTrackLyric(song.id, { coverUrl })
          void cacheCoverFromNetwork(coverUrl)
          if (ctxSong?.id === song.id) patchCurrentSong({ coverUrl })
        } catch {
          /* 封面失败不影响歌词 */
        }
      })()
    }

    return () => {
      cancelled = true
    }
  }, [song.id, song.lrc, song.neteaseId, song.fileKey, song.coverUrl, ncmId, durationForLyrics])

  return { track, loading, error }
}
