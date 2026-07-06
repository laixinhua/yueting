import { normalizeImageUrl } from './imageUrl'

const DB_NAME = 'yueting-cover-cache'
const DB_VERSION = 1
const STORE = 'covers'
const COVER_TTL_MS = 30 * 24 * 60 * 60 * 1000

const memoryUrls = new Map<string, string>()

interface CoverRecord {
  url: string
  blob: Blob
  cachedAt: number
}

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION)
    req.onerror = () => reject(req.error)
    req.onsuccess = () => resolve(req.result)
    req.onupgradeneeded = () => {
      const db = req.result
      if (!db.objectStoreNames.contains(STORE)) {
        db.createObjectStore(STORE, { keyPath: 'url' })
      }
    }
  })
}

function registerMemory(url: string, blob: Blob): string {
  const existing = memoryUrls.get(url)
  if (existing) return existing
  const blobUrl = URL.createObjectURL(blob)
  memoryUrls.set(url, blobUrl)
  return blobUrl
}

async function readBlob(url: string): Promise<Blob | null> {
  try {
    const db = await openDb()
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE, 'readonly')
      const req = tx.objectStore(STORE).get(url)
      req.onsuccess = () => {
        db.close()
        const rec = req.result as CoverRecord | undefined
        if (!rec?.blob) {
          resolve(null)
          return
        }
        if (Date.now() - rec.cachedAt > COVER_TTL_MS) {
          void deleteCover(url)
          resolve(null)
          return
        }
        resolve(rec.blob)
      }
      req.onerror = () => {
        db.close()
        reject(req.error)
      }
    })
  } catch {
    return null
  }
}

async function writeBlob(url: string, blob: Blob): Promise<void> {
  const db = await openDb()
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, 'readwrite')
    tx.objectStore(STORE).put({ url, blob, cachedAt: Date.now() } satisfies CoverRecord)
    tx.oncomplete = () => {
      db.close()
      resolve()
    }
    tx.onerror = () => {
      db.close()
      reject(tx.error)
    }
  })
}

async function deleteCover(url: string): Promise<void> {
  try {
    const db = await openDb()
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(STORE, 'readwrite')
      tx.objectStore(STORE).delete(url)
      tx.oncomplete = () => {
        db.close()
        resolve()
      }
      tx.onerror = () => {
        db.close()
        reject(tx.error)
      }
    })
  } catch {
    /* ignore */
  }
}

export function getMemoryCachedCoverUrl(src?: string | null): string | null {
  const url = normalizeImageUrl(src)
  if (!url) return null
  return memoryUrls.get(url) ?? null
}

export function isCoverCachedInMemory(src?: string | null): boolean {
  return getMemoryCachedCoverUrl(src) != null
}

/** 优先内存 / IndexedDB，否则返回原 URL 走网络 */
export async function resolveCoverUrl(src?: string | null): Promise<string | null> {
  const url = normalizeImageUrl(src)
  if (!url) return null

  const mem = memoryUrls.get(url)
  if (mem) return mem

  const blob = await readBlob(url)
  if (blob) return registerMemory(url, blob)

  return url
}

/** 网络加载成功后写入 IndexedDB */
export async function cacheCoverFromNetwork(src: string): Promise<string | null> {
  const url = normalizeImageUrl(src)
  if (!url) return null

  const mem = memoryUrls.get(url)
  if (mem) return mem

  const blobFromDb = await readBlob(url)
  if (blobFromDb) return registerMemory(url, blobFromDb)

  try {
    const res = await fetch(url, { referrerPolicy: 'no-referrer' })
    if (!res.ok) return null
    const blob = await res.blob()
    if (!blob.type.startsWith('image/') && blob.size < 64) return null
    await writeBlob(url, blob)
    return registerMemory(url, blob)
  } catch {
    return null
  }
}

export function prefetchCover(src?: string | null): void {
  const url = normalizeImageUrl(src)
  if (!url || memoryUrls.has(url)) return
  void cacheCoverFromNetwork(url)
}

/** 启动时把已缓存封面载入内存，避免二次进入先闪渐变色 */
export async function warmCovers(srcs: (string | undefined | null)[]): Promise<void> {
  const urls = [...new Set(srcs.map((s) => normalizeImageUrl(s)).filter(Boolean) as string[])]
  await Promise.all(
    urls.map(async (url) => {
      if (memoryUrls.has(url)) return
      const blob = await readBlob(url)
      if (blob) registerMemory(url, blob)
    }),
  )
}
