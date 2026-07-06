import { HorizontalScroll } from './HorizontalScroll'

export function Skeleton({ className = '' }: { className?: string }) {
  return <div className={`skeleton-shimmer ${className}`.trim()} aria-hidden />
}

/** 横向歌单 / 专辑卡片占位 */
export function HorizontalCardSkeleton({ count = 4 }: { count?: number }) {
  return (
    <HorizontalScroll className="px-4 pb-2">
      <div className="flex w-max gap-4">
        {Array.from({ length: count }, (_, i) => (
          <div key={i} className="w-36 shrink-0">
            <Skeleton className="w-full h-36 rounded-lg mb-3" />
            <Skeleton className="h-3.5 w-24 rounded mb-2" />
            <Skeleton className="h-3 w-16 rounded" />
          </div>
        ))}
      </div>
    </HorizontalScroll>
  )
}

/** 歌曲列表占位 */
export function SongListSkeleton({ rows = 5, className = 'mx-4' }: { rows?: number; className?: string }) {
  return (
    <div className={`rounded-xl overflow-hidden bg-surface-highlight/30 ${className}`.trim()}>
      {Array.from({ length: rows }, (_, i) => (
        <div key={i} className="flex items-center gap-3 px-4 py-2.5">
          <Skeleton className="w-6 h-4 rounded shrink-0" />
          <Skeleton className="w-12 h-12 rounded-md shrink-0" />
          <div className="flex-1 min-w-0 space-y-2">
            <Skeleton className="h-3.5 w-[70%] max-w-[12rem] rounded" />
            <Skeleton className="h-3 w-[45%] max-w-[8rem] rounded" />
          </div>
          <Skeleton className="w-9 h-3 rounded shrink-0" />
        </div>
      ))}
    </div>
  )
}

/** 搜索结果页占位 */
export function SearchResultsSkeleton() {
  return (
    <div className="space-y-4 pt-1">
      <Skeleton className="h-4 w-36 rounded" />
      <SongListSkeleton rows={6} className="mx-0" />
    </div>
  )
}
