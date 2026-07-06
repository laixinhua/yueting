import { useSongCatalog } from '../context/SongCatalogContext'
import { sanitizeMusicMeta } from '../utils/musicMeta'
import { formatDuration } from '../data/mockData'
import { takeRecent } from '../utils/listLimit'
import { AlbumCover } from './AlbumCover'
import { IconMusic } from './icons'
import { LocalMusicImportControls } from './LocalMusicImportControls'

interface LocalMusicPanelProps {
  compact?: boolean
}

export function LocalMusicPanel({ compact }: LocalMusicPanelProps) {
  const { localSongs, localLoading, removeLocalSong } = useSongCatalog()
  const displayLocal = takeRecent(localSongs)

  return (
    <section className={compact ? '' : 'px-4 mb-8'}>
      {!compact ? <h2 className="text-lg font-bold text-white mb-4">本地音乐</h2> : null}
      <div className={`rounded-xl bg-surface-highlight/50 ${compact ? 'p-3' : 'p-4'} space-y-3`}>
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 shrink-0 rounded-lg bg-white/10 flex items-center justify-center">
            <IconMusic className="w-5 h-5 text-white/60" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-white font-medium">导入本地音频</p>
            <p className="text-xs text-white/50 mt-0.5">
              自动扫描手机内 MP3、FLAC、WAV 等，勾选后确认添加
            </p>
          </div>
          <LocalMusicImportControls variant="panel" />
        </div>
        {localLoading ? (
          <p className="text-sm text-white/40">正在加载本地音乐…</p>
        ) : localSongs.length === 0 ? (
          <p className="text-sm text-white/40">暂无本地歌曲，点击「扫描添加」自动扫描设备音乐</p>
        ) : (
          <ul className="space-y-1 max-h-48 overflow-y-auto">
            {localSongs.length > displayLocal.length ? (
              <p className="text-xs text-white/40 px-2 pb-1">显示最近 {displayLocal.length} 首（共 {localSongs.length} 首）</p>
            ) : null}
            {displayLocal.map((song) => (
              <li key={song.id} className="flex items-center gap-3 py-2 px-2 rounded-lg hover:bg-white/5">
                <AlbumCover gradient={song.gradient} size="sm" rounded="md" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-white truncate">{song.title}</p>
                  <p className="text-xs text-white/50 truncate">{sanitizeMusicMeta(song.artist)}</p>
                </div>
                <span className="text-xs text-white/40 tabular-nums">{formatDuration(song.duration)}</span>
                <button
                  type="button"
                  onClick={() => void removeLocalSong(song.id)}
                  className="text-xs text-red-400/80 hover:text-red-400 px-2 py-1"
                >
                  删除
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  )
}
