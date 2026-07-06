/** 规范化外链图片 URL（APK 内 https 页面无法加载 http 混合内容） */
export function normalizeImageUrl(url?: string | null): string | undefined {
  if (!url) return undefined
  let normalized = url.trim()
  if (!normalized) return undefined

  if (normalized.startsWith('//')) {
    normalized = `https:${normalized}`
  } else if (normalized.startsWith('http://')) {
    normalized = `https://${normalized.slice(7)}`
  }

  return normalized
}
