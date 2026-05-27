import type { Playlist, Song } from '../types'

const demo = (n: number) => `https://www.soundhelix.com/examples/mp3/SoundHelix-Song-${n}.mp3`

export const songs: Song[] = [
  {
    id: '1',
    title: '夜曲',
    artist: '周杰伦',
    album: '十一月的萧邦',
    duration: 226,
    genre: 'pop',
    gradient: 'from-violet-600 via-purple-700 to-indigo-900',
    url: demo(1),
  },
  {
    id: '2',
    title: '稻香',
    artist: '周杰伦',
    album: '魔杰座',
    duration: 269,
    genre: 'pop',
    gradient: 'from-sky-400 via-blue-500 to-indigo-600',
    url: demo(2),
  },
  {
    id: '3',
    title: '晴天',
    artist: '周杰伦',
    album: '叶惠美',
    duration: 223,
    genre: 'indie',
    gradient: 'from-amber-400 via-orange-500 to-rose-600',
    url: demo(3),
  },
  {
    id: '4',
    title: '七里香',
    artist: '周杰伦',
    album: '七里香',
    duration: 325,
    genre: 'pop',
    gradient: 'from-teal-400 via-cyan-500 to-blue-700',
    url: demo(4),
  },
  {
    id: '5',
    title: '告白气球',
    artist: '周杰伦',
    album: '周杰伦的床边故事',
    duration: 256,
    genre: 'hiphop',
    gradient: 'from-red-500 via-rose-600 to-purple-800',
    url: demo(5),
  },
  {
    id: '6',
    title: '海阔天空',
    artist: 'Beyond',
    album: '乐与怒',
    duration: 326,
    genre: 'rock',
    gradient: 'from-slate-500 via-gray-600 to-zinc-800',
    url: demo(6),
  },
  {
    id: '7',
    title: '光辉岁月',
    artist: 'Beyond',
    album: '命运派对',
    duration: 301,
    genre: 'rock',
    gradient: 'from-yellow-500 via-amber-600 to-orange-700',
    url: demo(7),
  },
  {
    id: '8',
    title: '泡沫',
    artist: 'G.E.M. 邓紫棋',
    album: 'Xposed',
    duration: 235,
    genre: 'sleep',
    gradient: 'from-fuchsia-500 via-purple-600 to-violet-900',
    url: demo(8),
  },
]

export const playlists: Playlist[] = [
  {
    id: 'daily-mix-1',
    title: '每日推荐',
    description: '为你精选的音乐',
    gradient: 'from-purple-600 to-pink-600',
    playAccent: 'bg-white/25 shadow-black/40',
    songs: [songs[0], songs[3], songs[7], songs[4]],
  },
  {
    id: 'daily-mix-2',
    title: '热门歌单',
    description: '排行榜精选',
    gradient: 'from-blue-600 to-cyan-500',
    playAccent: 'bg-white/25 shadow-black/40',
    songs: [songs[1], songs[2], songs[5], songs[6]],
  },
  {
    id: 'chill',
    title: '轻松时刻',
    description: '放松心情的音乐',
    gradient: 'from-emerald-600 to-teal-500',
    playAccent: 'bg-white/25 shadow-black/40',
    songs: [songs[3], songs[6], songs[2]],
  },
  {
    id: 'workout',
    title: '运动健身',
    description: '动感节奏音乐',
    gradient: 'from-orange-500 to-red-600',
    playAccent: 'bg-white/25 shadow-black/40',
    songs: [songs[4], songs[7], songs[5]],
  },
]

export const recentlyPlayed: Song[] = [songs[0], songs[4], songs[1], songs[7]]

export interface AppNotification {
  id: string
  title: string
  body: string
  time: string
  read: boolean
}

export const initialNotifications: AppNotification[] = [
  {
    id: 'n1',
    title: '每日推荐已更新',
    body: '根据你最近的播放记录，今日推荐歌单已刷新，快来听听吧。',
    time: '2 小时前',
    read: false,
  },
  {
    id: 'n2',
    title: '新歌上架',
    body: '你喜欢的歌手「周杰伦」有歌曲可试听（演示数据）。',
    time: '昨天',
    read: false,
  },
  {
    id: 'n3',
    title: '欢迎使用悦听',
    body: '这是你的音乐播放器，当前使用在线演示音频，后续可接入本地音乐。',
    time: '3 天前',
    read: true,
  },
]

export function formatDuration(seconds: number): string {
  if (!Number.isFinite(seconds) || seconds < 0) return '0:00'
  const m = Math.floor(seconds / 60)
  const s = Math.floor(seconds % 60)
  return `${m}:${s.toString().padStart(2, '0')}`
}
