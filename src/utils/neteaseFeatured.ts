/** 并行分批挑选首页推荐项（保持可播探测，缩短冷启动等待） */
export async function pickFeaturedItems<T, R>(
  candidates: readonly T[],
  count: number,
  build: (item: T) => Promise<R | null>,
  batchSize = 3,
): Promise<R[]> {
  const picked: R[] = []

  for (let i = 0; i < candidates.length && picked.length < count; i += batchSize) {
    const batch = candidates.slice(i, i + batchSize)
    const results = await Promise.all(
      batch.map((item) =>
        build(item).catch(() => null),
      ),
    )
    for (const item of results) {
      if (item && picked.length < count) picked.push(item)
    }
  }

  return picked
}
