import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useSongCatalog } from '../context/SongCatalogContext'
import { formatDuration } from '../data/mockData'
import {
  isNativeMusicScannerAvailable,
  MusicScanner,
  type ScannedTrack,
} from '../plugins/musicScanner'
import { loadExistingImportKeys } from '../utils/localMusicStore'
import type { ImportAudioResult } from '../utils/localMusicStore'
import { formatTrackMetaLine, sanitizeMusicMeta } from '../utils/musicMeta'
import { Overlay } from './Overlay'

interface LocalMusicScanScreenProps {
  onClose: () => void
  onDone?: (result: ImportAudioResult) => void
}

export function LocalMusicScanScreen({ onClose, onDone }: LocalMusicScanScreenProps) {
  const { importScanned, importFiles, importProgress } = useSongCatalog()
  const folderInputRef = useRef<HTMLInputElement>(null)

  const [phase, setPhase] = useState<'scanning' | 'ready' | 'importing' | 'error'>('scanning')
  const [error, setError] = useState<string | null>(null)
  const [tracks, setTracks] = useState<ScannedTrack[]>([])
  const [importedKeys, setImportedKeys] = useState<Set<string>>(new Set())
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [toast, setToast] = useState<string | null>(null)

  const nativeScan = isNativeMusicScannerAvailable()

  const runScan = useCallback(async () => {
    setPhase('scanning')
    setError(null)
    setToast(null)
    try {
      const existing = await loadExistingImportKeys()
      setImportedKeys(existing)

      if (!nativeScan) {
        setTracks([])
        setSelected(new Set())
        setPhase('ready')
        return
      }

      const { tracks: found } = await MusicScanner.scan()
      const normalized = found.map((track) => ({
        ...track,
        artist: sanitizeMusicMeta(track.artist),
        album: sanitizeMusicMeta(track.album),
      }))
      setTracks(normalized)
      const initial = new Set<string>()
      for (const track of normalized) {
        if (!existing.has(track.fileKey)) {
          initial.add(track.fileKey)
        }
      }
      setSelected(initial)
      setPhase('ready')
    } catch (e) {
      setPhase('error')
      setError(e instanceof Error ? e.message : '扫描失败，请检查存储权限')
    }
  }, [nativeScan])

  useEffect(() => {
    void runScan()
  }, [runScan])

  const importableTracks = useMemo(
    () => tracks.filter((t) => !importedKeys.has(t.fileKey)),
    [tracks, importedKeys],
  )

  const selectedTracks = useMemo(
    () => tracks.filter((t) => selected.has(t.fileKey)),
    [tracks, selected],
  )

  const allImportableSelected =
    importableTracks.length > 0 && importableTracks.every((t) => selected.has(t.fileKey))

  const toggleTrack = (fileKey: string) => {
    if (importedKeys.has(fileKey)) return
    setSelected((prev) => {
      const next = new Set(prev)
      if (next.has(fileKey)) next.delete(fileKey)
      else next.add(fileKey)
      return next
    })
  }

  const toggleSelectAll = () => {
    if (allImportableSelected) {
      setSelected(new Set())
    } else {
      setSelected(new Set(importableTracks.map((t) => t.fileKey)))
    }
  }

  const handleConfirm = async () => {
    if (selectedTracks.length === 0) return
    setPhase('importing')
    setToast(null)
    try {
      const result = await importScanned(selectedTracks)
      onDone?.(result)
    } catch {
      setToast('导入失败，请重试')
      setPhase('ready')
    }
  }

  const handleWebFolder = async (files: FileList | null) => {
    if (!files?.length) return
    setPhase('importing')
    setToast(null)
    try {
      const result = await importFiles(files)
      onDone?.(result)
    } catch {
      setToast('导入失败，请重试')
      setPhase('ready')
      if (folderInputRef.current) folderInputRef.current.value = ''
    }
  }

  const importing = phase === 'importing' || importProgress != null
  const busy = phase === 'scanning' || importing
  const confirmCount = selectedTracks.length

  const progressLabel =
    importProgress && importProgress.total > 0
      ? `正在添加 ${importProgress.done}/${importProgress.total}`
      : phase === 'scanning'
        ? '正在扫描设备音乐…'
        : '正在添加…'

  const footer =
    nativeScan && phase !== 'error' ? (
      <div className="space-y-2">
        <button
          type="button"
          disabled={busy || confirmCount === 0}
          onClick={() => void handleConfirm()}
          className="w-full py-3.5 rounded-full bg-white text-black font-semibold hover:bg-white/90 active:scale-[0.98] transition-all disabled:opacity-40"
        >
          {importing ? progressLabel : `确认添加${confirmCount > 0 ? ` ${confirmCount} 首` : ''}`}
        </button>
      </div>
    ) : null

  return (
    <Overlay
      title="扫描添加"
      onClose={onClose}
      closeDisabled={importing}
      footer={footer}
      headerRight={
        nativeScan && tracks.length > 0 ? (
          <button
            type="button"
            disabled={busy || importableTracks.length === 0}
            onClick={toggleSelectAll}
            className="text-sm text-white/70 hover:text-white disabled:opacity-40 px-2 py-1"
          >
            {allImportableSelected ? '取消全选' : '全选'}
          </button>
        ) : null
      }
    >
      <div className="px-4 py-4 pb-8">
        {phase === 'scanning' ? (
          <div className="py-16 text-center">
            <div className="w-10 h-10 mx-auto mb-4 rounded-full border-2 border-white/20 border-t-white animate-spin" />
            <p className="text-white/70">正在扫描设备内的音乐文件…</p>
            <p className="text-xs text-white/40 mt-2">支持 MP3、FLAC、WAV、M4A 等常见格式</p>
          </div>
        ) : null}

        {phase === 'error' ? (
          <div className="py-12 text-center space-y-4">
            <p className="text-red-400/90">{error}</p>
            <button
              type="button"
              onClick={() => void runScan()}
              className="px-6 py-2.5 rounded-full bg-white/10 text-white text-sm hover:bg-white/15"
            >
              重新扫描
            </button>
          </div>
        ) : null}

        {!nativeScan && phase === 'ready' ? (
          <div className="py-8 text-center space-y-4">
            <p className="text-white/70">自动扫描仅在 Android App 中可用</p>
            <p className="text-xs text-white/40">浏览器中可选择文件夹手动导入</p>
            <button
              type="button"
              disabled={busy}
              onClick={() => folderInputRef.current?.click()}
              className="px-6 py-2.5 rounded-full bg-white text-black text-sm font-medium hover:bg-white/90 disabled:opacity-50"
            >
              {busy ? progressLabel : '选择文件夹'}
            </button>
            {toast ? <p className="text-xs text-emerald-400/90">{toast}</p> : null}
            <input
              ref={folderInputRef}
              type="file"
              accept="audio/*,.mp3,.flac,.wav,.m4a,.ogg,.aac,.ape,.wma,.opus"
              multiple
              className="hidden"
              {...({ webkitdirectory: '', directory: '' } as React.InputHTMLAttributes<HTMLInputElement>)}
              onChange={(e) => void handleWebFolder(e.target.files)}
            />
          </div>
        ) : null}

        {nativeScan && phase === 'ready' ? (
          <>
            <div className="flex items-center justify-between mb-4">
              <p className="text-sm text-white/50">
                共扫描到 {tracks.length} 首
                {importedKeys.size > 0 ? `，已添加 ${tracks.filter((t) => importedKeys.has(t.fileKey)).length} 首` : ''}
              </p>
              <button
                type="button"
                disabled={busy}
                onClick={() => void runScan()}
                className="text-xs text-white/50 hover:text-white/80 disabled:opacity-40"
              >
                重新扫描
              </button>
            </div>

            {tracks.length === 0 ? (
              <p className="text-center text-white/40 py-12">未找到本地音乐文件</p>
            ) : (
              <ul className="space-y-1">
                {tracks.map((track) => {
                  const already = importedKeys.has(track.fileKey)
                  const checked = selected.has(track.fileKey)
                  return (
                    <li key={track.fileKey}>
                      <button
                        type="button"
                        disabled={busy || already}
                        onClick={() => toggleTrack(track.fileKey)}
                        className={`w-full flex items-center gap-3 px-3 py-3 rounded-xl text-left transition-colors ${
                          already
                            ? 'opacity-50'
                            : checked
                              ? 'bg-white/10'
                              : 'hover:bg-white/5'
                        }`}
                      >
                        <span
                          className={`w-5 h-5 shrink-0 rounded-full border-2 flex items-center justify-center ${
                            already
                              ? 'border-white/20 bg-white/5'
                              : checked
                                ? 'border-white bg-white'
                                : 'border-white/30'
                          }`}
                        >
                          {checked && !already ? (
                            <span className="w-2 h-2 rounded-full bg-black" />
                          ) : null}
                        </span>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm text-white truncate">{track.title}</p>
                          <p className="text-xs text-white/50 truncate">
                            {formatTrackMetaLine(track.artist, track.album)}
                          </p>
                        </div>
                        <span className="text-xs text-white/40 tabular-nums shrink-0">
                          {already ? '已添加' : formatDuration(track.duration)}
                        </span>
                      </button>
                    </li>
                  )
                })}
              </ul>
            )}
          </>
        ) : null}
      </div>
    </Overlay>
  )
}
