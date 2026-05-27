import { useState } from 'react'
import { useFavoritesContext } from '../context/FavoritesContext'
import { usePlayer } from '../context/PlayerContext'
import { AlbumCover } from '../components/AlbumCover'
import { InlineLyrics } from '../components/InlineLyrics'
import { LyricsSettingsPanel } from '../components/LyricsSettingsPanel'
import { ProgressBar } from '../components/MiniPlayer'
import { PlayModeIcon } from '../components/PlayModeIcon'
import { PlayerModeButton } from '../components/PlayerModeButton'
import { SongActionSheet } from '../components/SongActionSheet'
import { usePlayerShellClass } from '../hooks/useShellOverlay'
import { playModeMeta } from '../utils/playMode'
import {
  IconChevronLeft,
  IconHeart,
  IconLyrics,
  IconMore,
  IconPause,
  IconPlay,
  IconQueue,
  IconSkipBack,
  IconSkipForward,
} from '../components/icons'

export function PlayerScreen() {
  const shellClass = usePlayerShellClass()
  const {
    currentSong,
    isPlaying,
    isLoading,
    togglePlay,
    playNext,
    playPrevious,
    closePlayer,
    progress,
    currentTime,
    duration,
    seek,
    isPlayerOpen,
    isLyricsOpen,
    openLyrics,
    closeLyrics,
    openQueue,
    playMode,
    cyclePlayMode,
  } = usePlayer()
  const { isFavorite, toggleFavorite } = useFavoritesContext()
  const [menuOpen, setMenuOpen] = useState(false)

  const modeMeta = playModeMeta[playMode]

  if (!isPlayerOpen) return null

  const liked = isFavorite(currentSong.id)

  return (
    <>
      <div className={`${shellClass} flex flex-col overflow-hidden bg-surface`}>
        <div className="relative flex flex-col h-full min-h-0 safe-bottom">
          <header className="shrink-0 flex items-center justify-between px-4 pt-10 pb-2">
            <button type="button" onClick={closePlayer} className="w-10 h-10 flex items-center justify-center rounded-full hover:bg-white/10 transition-colors" aria-label="返回">
              <IconChevronLeft className="w-6 h-6" />
            </button>
            <p className="text-xs font-medium text-white/60 tracking-widest">{isLoading ? '加载中' : '正在播放'}</p>
            <button type="button" onClick={() => setMenuOpen(true)} className="w-10 h-10 flex items-center justify-center rounded-full hover:bg-white/10 transition-colors" aria-label="更多">
              <IconMore className="w-5 h-5 text-white/70" />
            </button>
          </header>
          <div className="shrink-0 flex justify-center pt-2 pb-4 px-8">
            <AlbumCover
              gradient={currentSong.gradient}
              imageUrl={currentSong.coverUrl}
              size="player"
              rounded="xl"
              className="shadow-2xl shadow-black/50 !w-[min(60vw,200px)]"
            />
          </div>
          <InlineLyrics song={currentSong} />
          <div className="shrink-0 flex items-center gap-3 px-5 pb-2">
            <div className="flex-1 min-w-0">
              <h2 className="text-xl font-bold text-white truncate">{currentSong.title}</h2>
              <p className="text-sm text-white/60 truncate">{currentSong.artist}</p>
            </div>
            <button type="button" onClick={() => toggleFavorite(currentSong)} aria-label={liked ? '取消收藏' : '收藏'}>
              <IconHeart
                className={`w-7 h-7 transition-colors ${liked ? 'text-white' : 'text-white/40'}`}
                filled={liked}
              />
            </button>
          </div>
          <div className="shrink-0 px-5 pb-5 pt-1 space-y-4 border-t border-white/5">
            <ProgressBar progress={progress} currentTime={currentTime} duration={duration} onSeek={seek} />
            <div className="flex items-center justify-between gap-1">
              <div className="min-w-[52px]" aria-hidden />
              <div className="flex items-center gap-1">
                <button type="button" onClick={playPrevious} className="w-11 h-11 flex items-center justify-center text-white" aria-label="上一首">
                  <IconSkipBack className="w-8 h-8 block" />
                </button>
                <button
                  type="button"
                  onClick={togglePlay}
                  disabled={isLoading}
                  className="w-14 h-14 rounded-full bg-white text-black flex items-center justify-center shadow-lg disabled:opacity-70 hover:bg-white/90 active:scale-95 transition-all"
                  aria-label={isPlaying ? '暂停' : '播放'}
                >
                  {isPlaying ? <IconPause className="w-6 h-6 block" /> : <IconPlay className="w-6 h-6 block" />}
                </button>
                <button type="button" onClick={playNext} className="w-11 h-11 flex items-center justify-center text-white" aria-label="下一首">
                  <IconSkipForward className="w-8 h-8 block" />
                </button>
              </div>
              <PlayerModeButton label={modeMeta.label} onClick={cyclePlayMode} ariaLabel={modeMeta.ariaLabel}>
                <PlayModeIcon mode={playMode} className="w-6 h-6" />
              </PlayerModeButton>
            </div>
            <div className="flex items-center justify-between text-sm">
              <button
                type="button"
                onClick={openLyrics}
                className="flex items-center gap-2 text-white/50 hover:text-white/80 transition-colors"
              >
                <IconLyrics className="w-5 h-5" />
                <span>歌词设置</span>
              </button>
              <button
                type="button"
                onClick={openQueue}
                className="flex items-center gap-2 text-white/50 hover:text-white/80 transition-colors"
              >
                <IconQueue className="w-5 h-5" />
                <span>播放队列</span>
              </button>
            </div>
          </div>
        </div>
      </div>
      {isLyricsOpen ? <LyricsSettingsPanel onClose={closeLyrics} /> : null}
      {menuOpen ? <SongActionSheet song={currentSong} onClose={() => setMenuOpen(false)} /> : null}
    </>
  )
}
