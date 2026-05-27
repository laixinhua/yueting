import type { Song, SongGenre } from '../types'

const DB_NAME = 'yueting-local-music'
const DB_VERSION = 1
const STORE = 'tracks'

export interface StoredLocalTrack {
  id: string
  title: string
  artist: string
  album: string
  duration: number
  genre: SongGenre
  gradient: string
  blob: Blob
  importedAt: number
}

const GRADIENTS = [
  'from-violet-600 via-purple-700 to-indigo-900',
  'from-sky-400 via-blue-500 to-indigo-600',
  'from-amber-400 via-orange-500 to-rose-600',
  'from-teal-400 via-cyan-500 to-blue-700',
  'from-emerald-500 via-teal-600 to-cyan-800',
  'from-fuchsia-500 via-purple-600 to-violet-900',
] as const

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION)
    req.onerror = () => reject(req.error)
    req.onsuccess = () => resolve(req.result)
    req.onupgradeneeded = () => {
      const db = req.result
      if (!db.objectStoreNames.contains(STORE)) {
        db.createObjectStore(STORE, { keyPath: 'id' })
      }
    }
  })
}

function pickGradient(seed: string): string {
  let hash = 0
  for (let i = 0; i < seed.length; i++) hash = (hash + seed.charCodeAt(i) * (i + 1)) % GRADIENTS.length
  return GRADIENTS[hash]!
}

function parseFilename(name: string): { title: string; artist: string } {
  const base = name.replace(/\.[^.]+$/, '').trim()
  const dash = base.match(/^(.+?)\s[-–—]\s(.+)$/)
  if (dash) return { artist: dash[1]!.trim(), title: dash[2]!.trim() }
  return { title: base || '未命名', artist: '本地音乐' }
}

async function readDuration(blob: Blob): Promise<number> {
  return new Promise((resolve) => {
    const audio = new Audio()
    const url = URL.createObjectURL(blob)
    audio.preload = 'metadata'
    audio.onloadedmetadata = () => {
      const d = Number.isFinite(audio.duration) ? Math.round(audio.duration) : 0
      URL.revokeObjectURL(url)
      resolve(d)
    }
    audio.onerror = () => {
      URL.revokeObjectURL(url)
      resolve(0)
    }
    audio.src = url
  })
}

export async function loadLocalTracks(): Promise<StoredLocalTrack[]> {
  const db = await openDb()
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, 'readonly')
    const req = tx.objectStore(STORE).getAll()
    req.onerror = () => reject(req.error)
    req.onsuccess = () => {
      const rows = req.result as StoredLocalTrack[]
      rows.sort((a, b) => (b.importedAt ?? 0) - (a.importedAt ?? 0))
      resolve(rows)
    }
    tx.oncomplete = () => db.close()
  })
}

export async function saveLocalTrack(track: StoredLocalTrack): Promise<void> {
  const db = await openDb()
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, 'readwrite')
    tx.objectStore(STORE).put(track)
    tx.oncomplete = () => {
      db.close()
      resolve()
    }
    tx.onerror = () => reject(tx.error)
  })
}

export async function deleteLocalTrack(id: string): Promise<void> {
  const db = await openDb()
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, 'readwrite')
    tx.objectStore(STORE).delete(id)
    tx.oncomplete = () => {
      db.close()
      resolve()
    }
    tx.onerror = () => reject(tx.error)
  })
}

export async function importAudioFiles(files: FileList | File[]): Promise<Song[]> {
  const list = Array.from(files).filter((f) => f.type.startsWith('audio/') || /\.(mp3|flac|wav|m4a|ogg|aac)$/i.test(f.name))
  const imported: Song[] = []

  for (const file of list) {
    const id = `local-${crypto.randomUUID()}`
    const { title, artist } = parseFilename(file.name)
    const duration = await readDuration(file)
    const gradient = pickGradient(id)
    const track: StoredLocalTrack = {
      id,
      title,
      artist,
      album: '本地导入',
      duration,
      genre: 'indie',
      gradient,
      blob: file,
      importedAt: Date.now(),
    }
    await saveLocalTrack(track)
    imported.push({ ...track, url: URL.createObjectURL(file), local: true, source: 'local' })
  }

  return imported
}

export function storedToSong(track: StoredLocalTrack): Song {
  return {
    id: track.id,
    title: track.title,
    artist: track.artist,
    album: track.album,
    duration: track.duration,
    genre: track.genre,
    gradient: track.gradient,
    url: URL.createObjectURL(track.blob),
    local: true,
    source: 'local',
  }
}
