import { CapacitorHttp } from '@capacitor/core'

const JAMENDO = 'https://api.jamendo.com/v3.0'
/** 从 https://devportal.jamendo.com 注册的免费 key（Read only，35k次/月） */
const CLIENT_ID = 'e417139b'

/** 曲库里的单首曲目（来自 Jamendo CC 音乐库） */
export interface CcTrack {
  id: string
  title: string
  artist: string
  /** mp3 直链（搜索时已返回，无需二次解析） */
  url: string
  /** 封面图 URL */
  coverUrl: string
  /** 时长（秒） */
  duration: number
  source: 'cc'
}

/** CapacitorHttp 在 Android 上 data 可能是字符串，需兼容解析 */
function parseBody(raw: unknown): unknown {
  if (typeof raw === 'string') {
    const t = raw.trim()
    if (!t) return null
    try { return JSON.parse(t) } catch { return raw }
  }
  return raw
}

function buildSearchUrl(query: string, limit: number): string {
  const rows = Math.min(Math.max(limit, 1), 200)
  const params = new URLSearchParams()
  params.append('client_id', CLIENT_ID)
  params.append('format', 'json')
  params.append('limit', String(rows))
  params.append('audioformat', 'mp32')
  // 注意：不要传 order[] —— 设备端 [] 被 URL 编码成 %5B%5D 后
  // Jamendo 服务端解析不到 search 词，会回退成默认热门榜（搜索"看起来没反应"）。
  if (query.trim()) {
    params.append('search', query.trim())
  }
  return `${JAMENDO}/tracks/?${params.toString()}`
}

/** 搜索 / 浏览 CC 曲库（Jamendo），返回含可播放直链的曲目列表 */
export async function searchCcMusic(query: string, limit = 24): Promise<CcTrack[]> {
  const url = buildSearchUrl(query, limit)
  const res = await CapacitorHttp.get({
    url,
    headers: { Accept: 'application/json' },
    connectTimeout: 30_000,
    readTimeout: 30_000,
  })
  if (res.status < 200 || res.status >= 300) {
    throw new Error(`CC 曲库请求失败（${res.status}）`)
  }
  const data = parseBody(res.data) as {
    headers?: { status?: string; code?: number }
    results?: any[]
    results_count?: number
  }
  if ((data.headers?.code ?? 0) !== 0) {
    throw new Error(`CC 曲库 API 错误：${data.headers?.status ?? '未知'}`)
  }
  const docs: any[] = data?.results ?? []
  return docs
    .filter(d => d && d.id && d.name && d.audio)
    .map((d): CcTrack => ({
      id: String(d.id),
      title: d.name,
      artist: String(d.artist_name ?? '未知艺术家'),
      url: d.audio || '',
      coverUrl: d.image || '',
      duration: typeof d.duration === 'number' ? Math.round(d.duration) : 0,
      source: 'cc',
    }))
}
