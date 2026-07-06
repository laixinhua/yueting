import { useEffect, useMemo, useState } from 'react'
import { useSongCatalog } from '../context/SongCatalogContext'
import { usePlayer } from '../context/PlayerContext'
import { SearchResultsSkeleton } from '../components/LoadingSkeletons'
import { Overlay } from '../components/Overlay'
import { PlaylistDetailScreen } from '../components/PlaylistDetailScreen'
import { SearchResultRow } from '../components/SearchResultRow'
import { SongRow } from '../components/SongRow'
import { useEbnrSearch } from '../hooks/useEbnrSearch'
import { getSearchCatalog, searchTypeLabels } from '../utils/searchCatalog'
import type { Playlist } from '../types'

interface SearchResultsScreenProps {
  query: string
  onClose: () => void
}

export function SearchResultsScreen({ query, onClose }: SearchResultsScreenProps) {
  const { allSongs, upsertNeteaseSongs } = useSongCatalog()
  const { playSong } = usePlayer()
  const [detail, setDetail] = useState<Playlist | null>(null)

  const { songs: onlineSongs, loading, error } = useEbnrSearch(query)

  useEffect(() => {
    if (onlineSongs.length > 0) upsertNeteaseSongs(onlineSongs)
  }, [onlineSongs, upsertNeteaseSongs])
  const localCatalog = useMemo(() => getSearchCatalog(query, allSongs), [query, allSongs])

  const catalog = useMemo(() => {
    if (onlineSongs.length > 0) {
      return {
        type: 'song' as const,
        songs: onlineSongs,
        artists: [] as Playlist[],
        albums: [] as Playlist[],
      }
    }
    if (loading) {
      return {
        type: 'song' as const,
        songs: [] as typeof onlineSongs,
        artists: [] as Playlist[],
        albums: [] as Playlist[],
      }
    }
    return localCatalog
  }, [onlineSongs, loading, localCatalog])

  const count =
    catalog.type === 'song'
      ? catalog.songs.length
      : catalog.type === 'artist'
        ? catalog.artists.length
        : catalog.albums.length

  const showLocalFallback =
    !loading &&
    onlineSongs.length === 0 &&
    localCatalog.type === 'song' &&
    localCatalog.songs.length > 0

  const playFromSongs = (song: (typeof catalog.songs)[0]) => {
    playSong(song)
  }

  return (
    <>
      <Overlay title="搜索结果" onClose={onClose}>
        <div className="px-4 pt-2 pb-8">
          <p className="text-sm text-white/50 mb-4">
            关键词「{query}」
            {catalog.type === 'song' && onlineSongs.length > 0 ? ' · 网易云' : ''}
            {count > 0 ? ` · ${searchTypeLabels[catalog.type]} ${count} 项` : ''}
          </p>

          {loading ? (
            <SearchResultsSkeleton />
          ) : error && onlineSongs.length === 0 && count === 0 ? (
            <div className="text-center py-16 space-y-2">
              <p className="text-white/50 text-sm">{error}</p>
              <p className="text-white/35 text-xs">请确认已启动开发服务（npm run dev）以使用音乐代理</p>
            </div>
          ) : count === 0 && !showLocalFallback ? (
            <p className="text-center text-white/40 py-16 text-sm">没有找到相关内容</p>
          ) : catalog.type === 'song' ? (
            <div className="space-y-6">
              {catalog.songs.length > 0 ? (
                <div className="rounded-xl overflow-hidden bg-surface-highlight/30">
                  {catalog.songs.map((song, i) => (
                    <SongRow key={song.id} song={song} index={i} onClick={() => playFromSongs(song)} />
                  ))}
                </div>
              ) : null}

              {error && onlineSongs.length > 0 ? (
                <p className="text-xs text-white/50 px-1">部分结果可能不完整：{error}</p>
              ) : null}

              {showLocalFallback ? (
                <section>
                  <h3 className="text-sm font-semibold text-white/50 mb-2 px-1">本地曲库</h3>
                  <div className="rounded-xl overflow-hidden bg-surface-highlight/30">
                    {localCatalog.songs.map((song, i) => (
                      <SongRow
                        key={song.id}
                        song={song}
                        index={i}
                        onClick={() => playSong(song)}
                      />
                    ))}
                  </div>
                </section>
              ) : null}
            </div>
          ) : catalog.type === 'artist' ? (
            <div className="rounded-xl overflow-hidden bg-surface-highlight/30">
              {catalog.artists.map((artist) => (
                <SearchResultRow
                  key={artist.id}
                  item={artist}
                  kind="artist"
                  onClick={() => setDetail(artist)}
                />
              ))}
            </div>
          ) : (
            <div className="rounded-xl overflow-hidden bg-surface-highlight/30">
              {catalog.albums.map((album) => (
                <SearchResultRow
                  key={album.id}
                  item={album}
                  kind="album"
                  onClick={() => setDetail(album)}
                />
              ))}
            </div>
          )}
        </div>
      </Overlay>

      {detail ? <PlaylistDetailScreen playlist={detail} onClose={() => setDetail(null)} /> : null}
    </>
  )
}
