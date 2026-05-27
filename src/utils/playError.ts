import { EbnrApiError } from '../api/ebnr'

/** 将播放异常转为用户可读提示 */
export function formatPlayError(err: unknown): string {
  if (err instanceof EbnrApiError) return err.message
  if (err instanceof Error) {
    const msg = err.message.trim()
    if (msg) return msg
  }
  return '播放失败，请换一首或稍后重试'
}
