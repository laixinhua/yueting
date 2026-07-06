import { playlists } from '../data/mockData'
import { usePlayer } from '../context/PlayerContext'
import { PlaylistCard } from '../components/PlaylistCard'
import { Overlay } from '../components/Overlay'

interface DailyRecommendScreenProps {
  onClose: () => void
}

export function DailyRecommendScreen({ onClose }: DailyRecommendScreenProps) {
  const { playSong } = usePlayer()

  return (
    <Overlay title="每日推荐" onClose={onClose}>
      <p className="px-4 pt-2 pb-4 text-sm text-white/50">根据你的收听习惯生成的歌单合集</p>
      <div className="px-4 pb-6 grid grid-cols-2 gap-4">
        {playlists.map((playlist) => (
          <PlaylistCard
            key={playlist.id}
            playlist={playlist}
            onClick={() => {
              playSong(playlist.songs[0], { queue: playlist.songs })
              onClose()
            }}
          />
        ))}
      </div>
      <div className="px-4 pb-8 space-y-2">
        <h2 className="text-sm font-semibold text-white/50 mb-3">全部歌单列表</h2>
        {playlists.map((playlist) => (
          <PlaylistCard
            key={`list-${playlist.id}`}
            playlist={playlist}
            variant="wide"
            onClick={() => {
              playSong(playlist.songs[0], { queue: playlist.songs })
              onClose()
            }}
          />
        ))}
      </div>
    </Overlay>
  )
}
