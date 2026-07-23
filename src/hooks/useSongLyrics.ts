import { useCallback, useEffect, useState } from 'react'
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

/** 重新匹配时供用户点选的候选曲目 */
export interface LyricCandidate {
  id: number
  title: string
  artist: string
  album?: string | null
  coverUrl?: string | null
}

export function useSongLyrics(song: Song, audioDuration = 0) {
  const [track, setTrack] = useState<LyricTrack | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [reloading, setReloading] = useState(false)
  const [candidates, setCandidates] = useState<LyricCandidate[] | null>(null)
  const [candidateError, setCandidateError] = useState<string | null>(null)

  const durationForLyrics = audioDuration > 0 ? audioDuration : song.duration
  const ncmId = resolveNeteaseTrackId(song)
  const { patchCurrentSong, currentSong: ctxSong } = usePlayer()
  /** 本地导入歌（未绑定权威网易云 ID）才需要模糊重匹配；在线/下载歌的 ID 即曲源，按 ID 重拉即可 */
  const isLocalFuzzy = song.local && ncmId == null

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

  /** 重新加载歌词：本地模糊匹配歌重搜候选；在线/下载歌按 ID 重拉 */
  const reload = useCallback(async () => {
    setReloading(true)
    setCandidateError(null)
    setCandidates(null)
    try {
      if (isLocalFuzzy) {
        const tracks = await searchTracks(buildLyricSearchKeyword(song.title ?? '', song.artist), 6)
        const mapped: LyricCandidate[] = tracks.map((t) => ({
          id: t.id,
          title: t.name,
          artist: t.artists?.map((a) => a.name).filter(Boolean).join(' / ') || '未知歌手',
          album: t.album?.name,
          coverUrl: normalizeImageUrl(t.album?.cover_url),
        }))
        if (mapped.length === 0) {
          setCandidateError('没有找到可匹配的歌词')
        } else {
          setCandidates(mapped)
        }
      } else if (ncmId != null) {
        const result = await fetchNeteaseLyric(ncmId, durationForLyrics)
        if (result) {
          setTrack(result)
        } else {
          setCandidateError('该曲目暂无歌词')
        }
      } else {
        setCandidateError('暂不支持重新加载')
      }
    } catch (err) {
      setCandidateError(err instanceof EbnrApiError ? err.message : '歌词加载失败')
    } finally {
      setReloading(false)
    }
  }, [song.title, song.artist, isLocalFuzzy, ncmId, durationForLyrics])

  /** 从候选中选一首，抓取歌词并写回（覆盖错误的 neteaseId/lrc） */
  const applyCandidate = useCallback(async (trackId: number) => {
    setReloading(true)
    setCandidateError(null)
    try {
      const lrcText = await fetchNeteaseLyricText(trackId)
      if (!lrcText) {
        setCandidateError('该曲目暂无歌词')
        return
      }
      const chosen = candidates?.find((c) => c.id === trackId)
      const coverUrl = chosen?.coverUrl ?? undefined
      setTrack(parseLrcToTrack(lrcText, durationForLyrics))
      await updateLocalTrackLyric(song.id, {
        lrc: lrcText,
        neteaseId: trackId,
        ...(coverUrl ? { coverUrl } : {}),
      })
      if (coverUrl) void cacheCoverFromNetwork(coverUrl)
      if (ctxSong?.id === song.id) {
        patchCurrentSong({ neteaseId: trackId, lrc: lrcText, ...(coverUrl ? { coverUrl } : {}) })
      }
      setCandidates(null)
    } catch (err) {
      setCandidateError(err instanceof EbnrApiError ? err.message : '歌词加载失败')
    } finally {
      setReloading(false)
    }
  }, [song.id, durationForLyrics, candidates, ctxSong, patchCurrentSong])

  const cancelReload = useCallback(() => {
    setCandidates(null)
    setCandidateError(null)
  }, [])

  return { track, loading, error, reloading, candidates, candidateError, reload, applyCandidate, cancelReload }
}
