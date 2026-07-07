import { EbnrApiError } from '../api/ebnr'

/** 将播放异常转为用户可读提示（英文/未知异常统一转为中文） */
export function formatPlayError(err: unknown): string {
  if (err instanceof EbnrApiError) return err.message
  if (err instanceof Error) {
    const msg = err.message.trim()
    if (msg) {
      // 已含中文，直接展示
      if (/[一-龥]/.test(msg)) return msg
      // 英文/未知异常 -> 友好中文
      if (/timeout|timed out|超时/i.test(msg)) return '获取播放地址超时，请稍后重试'
      if (/cors|blocked by|not allowed/i.test(msg)) return '音乐接口被浏览器拦截，请稍后重试'
      if (/fail|refused|reset|abort|unreachable|network|connect/i.test(msg)) return '网络连接失败，请检查网络后重试'
      return '播放失败，请换一首或稍后重试'
    }
  }
  return '播放失败，请换一首或稍后重试'
}

/** 下载失败提示 */
export function formatDownloadError(err: unknown): string {
  if (err instanceof EbnrApiError) {
    return '获取下载链接失败，请检查网络后重试'
  }
  if (err instanceof Error) {
    const msg = err.message.trim()
    if (msg.includes('403')) return '音频下载被拒绝，请稍后重试'
    if (msg.includes('未获取到播放地址')) return '该歌曲暂无法下载（可能无版权或需 VIP）'
    if (msg) return msg
  }
  return '下载失败，请稍后重试'
}
