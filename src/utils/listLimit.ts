/** 首页 / 搜索 / 我的 等列表预览条数 */
export const LIST_DISPLAY_LIMIT = 10

export function takeRecent<T>(items: T[], limit = LIST_DISPLAY_LIMIT): T[] {
  return items.slice(0, limit)
}
