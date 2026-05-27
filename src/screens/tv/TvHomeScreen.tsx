import { useEffect } from 'react'

import { useSongCatalog } from '../../context/SongCatalogContext'

import { usePlaylists } from '../../context/PlaylistsContext'

import { usePlayer } from '../../context/PlayerContext'

import { useRecentPlaysContext } from '../../context/RecentPlaysContext'

import { useNeteaseHotSongs } from '../../hooks/useNeteaseHotSongs'

import { takeRecent } from '../../utils/listLimit'

import { AlbumCover } from '../../components/AlbumCover'

import { IconPlay } from '../../components/icons'



export function TvHomeScreen() {

  const { playSong } = usePlayer()

  const { upsertNeteaseSongs } = useSongCatalog()

  const { allPlaylists: playlists } = usePlaylists()

  const { recentSongs } = useRecentPlaysContext()

  const { songs: hotSongs, loading: hotLoading, error: hotError } = useNeteaseHotSongs()



  useEffect(() => {

    if (hotSongs.length > 0) upsertNeteaseSongs(hotSongs)

  }, [hotSongs, upsertNeteaseSongs])



  const fallbackHot = takeRecent(recentSongs)

  const displayHot = hotSongs.length > 0 ? hotSongs : hotError ? fallbackHot : hotSongs



  return (

    <div className="p-8 pb-4">

      <header className="mb-8">

        <h1 className="text-4xl font-bold text-white">悦听 · 点歌台</h1>

        <p className="text-lg text-white/50 mt-2">选择歌曲或歌单，按确认键播放（支持遥控器方向键）</p>

      </header>



      <section className="mb-10">

        <h2 className="text-xl font-bold text-white mb-4">推荐歌单</h2>

        <div className="grid grid-cols-4 gap-5">

          {playlists.map((playlist) => (

            <button

              key={playlist.id}

              type="button"

              onClick={() => playSong(playlist.songs[0], { queue: playlist.songs })}

              className="tv-focus group text-left rounded-2xl overflow-hidden bg-surface-highlight/40 hover:bg-surface-highlight transition-colors"

            >

              <div className={`aspect-video bg-linear-to-br ${playlist.gradient} relative`}>

                <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 group-focus:opacity-100 bg-black/30 transition-opacity">

                  <div className="w-16 h-16 rounded-full bg-white/25 shadow-black/40 flex items-center justify-center">

                    <IconPlay className="w-8 h-8 text-white block" />

                  </div>

                </div>

              </div>

              <div className="p-4">

                <p className="text-lg font-semibold text-white truncate">{playlist.title}</p>

                <p className="text-sm text-white/50 mt-1">{playlist.songs.length} 首</p>

              </div>

            </button>

          ))}

        </div>

      </section>



      <section>

        <h2 className="text-xl font-bold text-white mb-4">热门音乐 · 点歌</h2>

        {hotLoading ? (

          <p className="text-white/40">正在加载热门音乐…</p>

        ) : displayHot.length === 0 ? (

          <p className="text-white/40">暂无热门歌曲</p>

        ) : (

          <div className="grid grid-cols-2 gap-3">

            {displayHot.map((song, i) => (

              <button

                key={song.id}

                type="button"

                onClick={() => playSong(song)}

                className="tv-focus flex items-center gap-4 p-4 rounded-xl bg-surface-highlight/50 hover:bg-surface-highlight text-left transition-colors"

              >

                <span className="w-10 text-center text-lg text-white/40 tabular-nums">{i + 1}</span>

                <AlbumCover gradient={song.gradient} imageUrl={song.coverUrl} size="sm" rounded="md" />

                <div className="flex-1 min-w-0">

                  <p className="text-lg font-medium text-white truncate">{song.title}</p>

                  <p className="text-base text-white/50 truncate">{song.artist}</p>

                </div>

                <IconPlay className="w-8 h-8 text-white/60 shrink-0 block" />

              </button>

            ))}

          </div>

        )}

      </section>



      <section className="mt-10">

        <h2 className="text-xl font-bold text-white mb-4">最近播放</h2>

        <div className="flex gap-4 flex-wrap">

          {recentSongs.map((song) => (

            <button

              key={song.id}

              type="button"

              onClick={() => playSong(song)}

              className="tv-focus flex items-center gap-3 px-5 py-3 rounded-full bg-surface-highlight hover:bg-white/10 transition-colors"

            >

              <AlbumCover gradient={song.gradient} size="sm" rounded="md" />

              <span className="text-base text-white">{song.title}</span>

            </button>

          ))}

        </div>

      </section>

    </div>

  )

}


