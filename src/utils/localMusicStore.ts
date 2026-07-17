import type { Song, SongGenre } from '../types'
import type { ScannedTrack } from '../plugins/musicScanner'
import { Capacitor } from '@capacitor/core'
import { MusicScanner, isNativeMusicScannerAvailable } from '../plugins/musicScanner'
import { sanitizeMusicMeta } from './musicMeta'
import { parseNeteaseId, resolveNeteaseTrackId, resolveSongPlayUrl, warmNeteaseAudioUrl, isMainPlaybackActive } from './neteaseSong'
import { formatDownloadError } from './playError'
import { fetchNeteaseLyricText } from '../api/neteaseLyric'
import { cacheCoverFromNetwork } from './coverImageCache'

const DB_NAME = 'yueting-local-music'
const DB_VERSION = 2
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
  /** 用于批量导入时跳过重复文件 */
  fileKey?: string
  /** 下载时缓存的 LRC 原文 */
  lrc?: string
  /** 来源网易云曲目 ID（下载曲目） */
  neteaseId?: number
  /** 封面图 URL（下载曲目） */
  coverUrl?: string
}

export interface ImportAudioResult {
  imported: Song[]
  skipped: number
  failed: number
}

export interface ImportAudioOptions {
  onProgress?: (done: number, total: number) => void
  skipDuplicates?: boolean
}

export interface DownloadOptions {
  onProgress?: (percent: number) => void
}

const GRADIENTS = [
  'from-violet-600 via-purple-700 to-indigo-900',
  'from-sky-400 via-blue-500 to-indigo-600',
  'from-amber-400 via-orange-500 to-rose-600',
  'from-teal-400 via-cyan-500 to-blue-700',
  'from-emerald-500 via-teal-600 to-cyan-800',
  'from-fuchsia-500 via-purple-600 to-violet-900',
] as const

const AUDIO_EXT = /\.(mp3|flac|wav|m4a|ogg|aac|ape|wma|opus)$/i
const DURATION_CONCURRENCY = 6
const SAVE_CHUNK_SIZE = 40

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

export function fileImportKey(file: File): string {
  return `${file.name}|${file.size}|${file.lastModified}`
}

export function trackImportKey(track: StoredLocalTrack): string | null {
  if (track.fileKey) return track.fileKey
  return `${track.title}|${track.blob.size}`
}

/** 在线歌曲下载去重键 */
export function songDownloadKey(song: Song): string | null {
  if (song.local) return null
  const ncmId = song.neteaseId ?? parseNeteaseId(song.id)
  if (ncmId != null) return `download:ncm:${ncmId}`
  return `download:song:${song.id}`
}

export async function isSongDownloaded(song: Song): Promise<boolean> {
  if (song.local) return true
  const key = songDownloadKey(song)
  if (!key) return false
  const keys = await loadExistingImportKeys()
  return keys.has(key)
}

export async function downloadSongToLocal(song: Song, options?: DownloadOptions): Promise<ImportAudioResult> {
  const report = (percent: number) => options?.onProgress?.(percent)

  if (song.local) {
    return { imported: [], skipped: 1, failed: 0 }
  }

  const fileKey = songDownloadKey(song)
  if (!fileKey) {
    return { imported: [], skipped: 0, failed: 1 }
  }

  report(3)
  let playUrl = await resolveDownloadPlayUrl(song)
  report(8)
  await warmNeteaseAudioUrl(playUrl)
  report(10)

  const lyricPromise = fetchDownloadLyricMeta(song)

  let blob: Blob
  try {
    blob = await downloadAudioBlob(song, playUrl, (p) => report(10 + Math.round(p * 0.75)))
  } catch (err) {
    throw new Error(formatDownloadError(err))
  }
  await assertValidAudioBlob(blob)

  report(88)
  const lyricMeta = await lyricPromise

  if (isNativeMusicScannerAvailable()) {
    await saveNativeDownloadFile(song, playUrl)
  }

  report(94)
  await removeLocalTracksByFileKey(fileKey)
  const result = await saveDownloadBlob(song, blob, fileKey, lyricMeta)
  report(100)
  return result
}

async function resolveDownloadPlayUrl(song: Song): Promise<string> {
  try {
    return await resolveSongPlayUrl(song, { forceRefresh: false })
  } catch (err) {
    throw new Error(formatDownloadError(err))
  }
}

/** 多策略下载音频：Android 优先原生 HTTP，403 时先重试预热再换链 */
async function downloadAudioBlob(
  song: Song,
  playUrl: string,
  report?: (percent: number) => void,
): Promise<Blob> {
  const tryFetch = (url: string) => fetchBlobWithProgress(url, report)

  try {
    return await tryFetch(playUrl)
  } catch (firstErr) {
    const msg = firstErr instanceof Error ? firstErr.message : ''
    await warmNeteaseAudioUrl(playUrl, { force: true })
    try {
      return await tryFetch(playUrl)
    } catch {
      if (!msg.includes('403') && !msg.includes('无效') && !msg.includes('不完整')) {
        throw firstErr
      }
    }
  }

  try {
    const freshUrl = await resolveSongPlayUrl(song, { forceRefresh: true })
    if (freshUrl === playUrl) {
      throw new Error('音频下载失败（403）')
    }
    await warmNeteaseAudioUrl(freshUrl, { force: true })
    return await tryFetch(freshUrl)
  } catch (err) {
    if (err instanceof Error && err.message.includes('403')) throw err
    throw new Error(formatDownloadError(err))
  }
}

async function saveNativeDownloadFile(song: Song, playUrl: string): Promise<void> {
  try {
    await MusicScanner.saveDownload({
      url: playUrl,
      fileName: buildDownloadFileName(song),
      title: song.title,
      artist: sanitizeMusicMeta(song.artist) || '未知歌手',
      album: sanitizeMusicMeta(song.album) || '本地下载',
    })
  } catch {
    /* 写入 Music/悦听 失败不影响 App 内本地播放 */
  }
}

async function fetchBlobWithProgress(
  url: string,
  report?: (percent: number) => void,
): Promise<Blob> {
  let lastNativeErr: unknown = null

  if (isNativeMusicScannerAvailable()) {
    try {
      return await fetchBlobViaNative(url, report)
    } catch (nativeErr) {
      lastNativeErr = nativeErr
      const msg = nativeErr instanceof Error ? nativeErr.message : String(nativeErr)
      if (!msg.includes('403') && !msg.includes('无效') && !msg.includes('不完整')) {
        if (!isMainPlaybackActive()) throw nativeErr
      }
    }
  }

  if (isMainPlaybackActive()) {
    if (lastNativeErr instanceof Error) throw lastNativeErr
    throw new Error('播放中下载失败，请暂停后重试')
  }

  try {
    return await fetchBlobViaWebView(url, report)
  } catch (webErr) {
    const webMsg = webErr instanceof Error ? webErr.message : String(webErr)
    if (!isNativeMusicScannerAvailable() || !webMsg.includes('403')) throw webErr
    return fetchBlobViaNative(url, report)
  }
}

async function fetchBlobViaNative(url: string, report?: (percent: number) => void): Promise<Blob> {
  report?.(12)
  const { path, size } = await MusicScanner.downloadAudio({ url })
  report?.(78)
  const webUrl = Capacitor.convertFileSrc(path)
  const res = await fetch(webUrl)
  if (!res.ok) {
    throw new Error('读取下载缓存失败')
  }
  const blob = await res.blob()
  if (size > 0 && blob.size < Math.min(size, 1024)) {
    throw new Error('下载的文件不完整')
  }
  report?.(88)
  return blob
}

async function fetchBlobViaWebView(url: string, report?: (percent: number) => void): Promise<Blob> {
  const res = await fetch(url, {
    headers: { Referer: 'https://music.163.com/' },
  })
  if (!res.ok) {
    throw new Error(`音频下载失败（${res.status}）`)
  }

  const total = Number(res.headers.get('content-length')) || 0
  if (!res.body || total <= 0) {
    report?.(90)
    return res.blob()
  }

  const reader = res.body.getReader()
  const chunks: Uint8Array[] = []
  let loaded = 0

  while (true) {
    const { done, value } = await reader.read()
    if (done) break
    chunks.push(value)
    loaded += value.length
    report?.(8 + Math.round((loaded / total) * 82))
  }

  report?.(92)
  return new Blob(chunks as BlobPart[], { type: res.headers.get('content-type') ?? 'audio/mpeg' })
}

async function assertValidAudioBlob(blob: Blob): Promise<void> {
  if (blob.size < 1024) {
    throw new Error('下载的文件无效，请稍后重试')
  }
  const head = new Uint8Array(await blob.slice(0, 12).arrayBuffer())
  const isId3 = head[0] === 0x49 && head[1] === 0x44 && head[2] === 0x33
  const isMp3Sync = head[0] === 0xff && (head[1]! & 0xe0) === 0xe0
  const isFlac = head[0] === 0x66 && head[1] === 0x4c && head[2] === 0x61 && head[3] === 0x43
  const isOgg = head[0] === 0x4f && head[1] === 0x67 && head[2] === 0x67
  const looksLikeHtml =
    (head[0] === 0x3c && head[1] === 0x21) || (head[0] === 0x3c && head[1] === 0x68)
  if (looksLikeHtml) {
    throw new Error('音频下载被拒绝（403），请稍后重试')
  }
  if (!(isId3 || isMp3Sync || isFlac || isOgg)) {
    throw new Error('下载的文件不是有效音频')
  }
}

function buildDownloadFileName(song: Song): string {
  const artist = sanitizeMusicMeta(song.artist) || '未知歌手'
  const title = song.title.replace(/[/\\?%*:|"<>]/g, '_').trim() || '未命名'
  return `${artist} - ${title}.mp3`
}

interface DownloadLyricMeta {
  lrc?: string
  neteaseId?: number
}

async function fetchDownloadLyricMeta(song: Song): Promise<DownloadLyricMeta> {
  const neteaseId = resolveNeteaseTrackId(song)
  if (neteaseId == null) return {}
  try {
    const lrc = await fetchNeteaseLyricText(neteaseId)
    return { neteaseId, lrc: lrc ?? undefined }
  } catch {
    return { neteaseId }
  }
}

function buildStoredDownloadTrack(
  song: Song,
  blob: Blob,
  fileKey: string,
  lyricMeta: DownloadLyricMeta,
  overrides?: Partial<Pick<StoredLocalTrack, 'title' | 'artist' | 'album' | 'duration'>>,
): { stored: StoredLocalTrack; imported: Song } {
  const id = `local-${crypto.randomUUID()}`
  const storedTrack: StoredLocalTrack = {
    id,
    title: overrides?.title ?? song.title,
    artist: sanitizeMusicMeta(overrides?.artist ?? song.artist),
    album: sanitizeMusicMeta(overrides?.album ?? song.album) || '本地下载',
    duration: overrides?.duration ?? (song.duration > 0 ? song.duration : 240),
    genre: (song.genre ?? 'pop') as SongGenre,
    gradient: song.gradient || pickGradient(id),
    blob,
    importedAt: Date.now(),
    fileKey,
    lrc: lyricMeta.lrc,
    neteaseId: lyricMeta.neteaseId,
    coverUrl: song.coverUrl,
  }
  const imported: Song = {
    ...storedTrack,
    url: URL.createObjectURL(blob),
    local: true,
    source: 'local',
    coverUrl: song.coverUrl,
    fileKey,
  }
  return { stored: storedTrack, imported }
}

async function saveDownloadBlob(
  song: Song,
  blob: Blob,
  fileKey: string,
  lyricMeta: DownloadLyricMeta,
): Promise<ImportAudioResult> {
  const { stored: storedTrack, imported } = buildStoredDownloadTrack(song, blob, fileKey, lyricMeta)

  await saveLocalTracksBatch([storedTrack])
  if (imported.coverUrl) void cacheCoverFromNetwork(imported.coverUrl)
  return { imported: [imported], skipped: 0, failed: 0 }
}

export function filterAudioFiles(files: FileList | File[]): File[] {
  return Array.from(files).filter(
    (f) => f.type.startsWith('audio/') || AUDIO_EXT.test(f.name),
  )
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

async function mapWithConcurrency<T, R>(
  items: T[],
  concurrency: number,
  mapper: (item: T, index: number) => Promise<R>,
  onProgress?: (done: number, total: number) => void,
): Promise<R[]> {
  const results: R[] = new Array(items.length)
  let nextIndex = 0
  let done = 0

  async function worker() {
    while (nextIndex < items.length) {
      const i = nextIndex++
      results[i] = await mapper(items[i]!, i)
      done += 1
      onProgress?.(done, items.length)
    }
  }

  const workers = Array.from({ length: Math.min(concurrency, items.length) }, () => worker())
  await Promise.all(workers)
  return results
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
  await saveLocalTracksBatch([track])
}

export async function saveLocalTracksBatch(tracks: StoredLocalTrack[]): Promise<void> {
  if (tracks.length === 0) return

  const db = await openDb()
  try {
    for (let i = 0; i < tracks.length; i += SAVE_CHUNK_SIZE) {
      const chunk = tracks.slice(i, i + SAVE_CHUNK_SIZE)
      await new Promise<void>((resolve, reject) => {
        const tx = db.transaction(STORE, 'readwrite')
        const store = tx.objectStore(STORE)
        for (const track of chunk) store.put(track)
        tx.oncomplete = () => resolve()
        tx.onerror = () => reject(tx.error)
      })
    }
  } finally {
    db.close()
  }
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

/** 删除同一首下载曲目的旧记录（重复下载时覆盖） */
export async function removeLocalTracksByFileKey(fileKey: string): Promise<string[]> {
  const tracks = await loadLocalTracks()
  const ids = tracks.filter((t) => t.fileKey === fileKey).map((t) => t.id)
  for (const id of ids) {
    await deleteLocalTrack(id)
  }
  return ids
}

export async function clearAllLocalTracks(): Promise<void> {
  const db = await openDb()
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, 'readwrite')
    tx.objectStore(STORE).clear()
    tx.oncomplete = () => {
      db.close()
      resolve()
    }
    tx.onerror = () => reject(tx.error)
  })
}

export async function importAudioFiles(
  files: FileList | File[],
  options?: ImportAudioOptions,
): Promise<ImportAudioResult> {
  const list = filterAudioFiles(files)
  if (list.length === 0) {
    return { imported: [], skipped: 0, failed: 0 }
  }

  const skipDuplicates = options?.skipDuplicates !== false
  let existingKeys = new Set<string>()
  if (skipDuplicates) {
    const existing = await loadLocalTracks()
    existingKeys = new Set(
      existing.map(trackImportKey).filter((k): k is string => k != null),
    )
  }

  const toImport: File[] = []
  let skipped = 0
  for (const file of list) {
    const key = fileImportKey(file)
    if (skipDuplicates && existingKeys.has(key)) {
      skipped += 1
      continue
    }
    toImport.push(file)
    existingKeys.add(key)
  }

  if (toImport.length === 0) {
    return { imported: [], skipped, failed: 0 }
  }

  const durations = await mapWithConcurrency(
    toImport,
    DURATION_CONCURRENCY,
    (file) => readDuration(file),
    options?.onProgress,
  )

  const now = Date.now()
  const stored: StoredLocalTrack[] = []
  const imported: Song[] = []

  for (let i = 0; i < toImport.length; i++) {
    const file = toImport[i]!
    const rawDuration = durations[i] ?? 0
    const id = `local-${crypto.randomUUID()}`
    const { title, artist } = parseFilename(file.name)
    const track: StoredLocalTrack = {
      id,
      title,
      artist: sanitizeMusicMeta(artist),
      album: '本地导入',
      duration: rawDuration > 0 ? rawDuration : 240,
      genre: 'indie',
      gradient: pickGradient(id),
      blob: file,
      importedAt: now + i,
      fileKey: fileImportKey(file),
    }
    stored.push(track)
    imported.push({ ...track, url: URL.createObjectURL(file), local: true, source: 'local' })
  }

  await saveLocalTracksBatch(stored)
  return { imported, skipped, failed: 0 }
}

export async function loadExistingImportKeys(): Promise<Set<string>> {
  const existing = await loadLocalTracks()
  return new Set(existing.map(trackImportKey).filter((k): k is string => k != null))
}

export async function importNativeScannedTracks(
  tracks: ScannedTrack[],
  options?: ImportAudioOptions,
): Promise<ImportAudioResult> {
  if (tracks.length === 0) {
    return { imported: [], skipped: 0, failed: 0 }
  }

  const skipDuplicates = options?.skipDuplicates !== false
  const existingKeys = skipDuplicates ? await loadExistingImportKeys() : new Set<string>()

  const toImport: ScannedTrack[] = []
  let skipped = 0
  for (const track of tracks) {
    if (skipDuplicates && existingKeys.has(track.fileKey)) {
      skipped += 1
      continue
    }
    toImport.push(track)
    existingKeys.add(track.fileKey)
  }

  if (toImport.length === 0) {
    return { imported: [], skipped, failed: 0 }
  }

  const now = Date.now()
  const stored: StoredLocalTrack[] = []
  const imported: Song[] = []
  let failed = 0

  for (let i = 0; i < toImport.length; i++) {
    const track = toImport[i]!
    try {
      const native = await MusicScanner.importTrack({ uri: track.uri })
      const webUrl = Capacitor.convertFileSrc(native.path)
      const res = await fetch(webUrl)
      if (!res.ok) throw new Error('读取音频失败')
      const blob = await res.blob()

      const id = `local-${crypto.randomUUID()}`
      const albumRaw = sanitizeMusicMeta(native.album || track.album)
      const storedTrack: StoredLocalTrack = {
        id,
        title: native.title || track.title,
        artist: sanitizeMusicMeta(native.artist || track.artist),
        album: albumRaw || '本地导入',
        duration: native.duration > 0 ? native.duration : track.duration > 0 ? track.duration : 240,
        genre: 'indie',
        gradient: pickGradient(id),
        blob,
        importedAt: now + i,
        fileKey: native.fileKey || track.fileKey,
      }
      stored.push(storedTrack)
      imported.push({ ...storedTrack, url: URL.createObjectURL(blob), local: true, source: 'local' })
    } catch {
      failed += 1
    }
    options?.onProgress?.(i + 1, toImport.length)
  }

  if (stored.length > 0) await saveLocalTracksBatch(stored)
  return { imported, skipped, failed }
}

export function storedToSong(track: StoredLocalTrack): Song {
  return {
    id: track.id,
    title: track.title,
    artist: sanitizeMusicMeta(track.artist),
    album: sanitizeMusicMeta(track.album),
    duration: track.duration,
    genre: track.genre,
    gradient: track.gradient,
    url: URL.createObjectURL(track.blob),
    local: true,
    source: 'local',
    fileKey: track.fileKey,
    lrc: track.lrc,
    neteaseId: track.neteaseId,
    coverUrl: track.coverUrl,
  }
}

/** 写回本地歌曲的在线歌词（按歌名搜索到后绑定 neteaseId + lrc，避免重复搜索） */
export async function updateLocalTrackLyric(
  id: string,
  lrc: string,
  neteaseId: number,
): Promise<void> {
  const db = await openDb()
  try {
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(STORE, 'readwrite')
      const store = tx.objectStore(STORE)
      const req = store.get(id)
      req.onsuccess = () => {
        const track = req.result as StoredLocalTrack | undefined
        if (!track) {
          resolve()
          return
        }
        track.lrc = lrc
        track.neteaseId = neteaseId
        store.put(track)
      }
      req.onerror = () => reject(req.error)
      tx.oncomplete = () => resolve()
      tx.onerror = () => reject(tx.error)
    })
  } finally {
    db.close()
  }
}
