import { useRef, useEffect, type ReactNode } from 'react'

const DRAG_THRESHOLD = 10
/** 横向位移需明显大于纵向才视为横滑（避免上拉时误触横滚） */
const HORIZONTAL_BIAS = 1.35

interface HorizontalScrollProps {
  children: ReactNode
  className?: string
}

export function HorizontalScroll({ children, className = '' }: HorizontalScrollProps) {
  const ref = useRef<HTMLDivElement>(null)
  const dragRef = useRef({
    active: false,
    dragging: false,
    moved: false,
    startX: 0,
    startY: 0,
    scrollLeft: 0,
    pointerId: -1,
    /** 首次超过阈值后锁定轴向，避免与页面纵向滚动抢手势 */
    axis: null as 'x' | 'y' | null,
  })

  useEffect(() => {
    const el = ref.current
    if (!el) return

    const onWheel = (e: WheelEvent) => {
      if (el.scrollWidth <= el.clientWidth) return
      const delta = Math.abs(e.deltaX) > Math.abs(e.deltaY) ? e.deltaX : e.deltaY
      if (delta === 0) return
      el.scrollLeft += delta
      e.preventDefault()
    }

    const onPointerDown = (e: PointerEvent) => {
      // 触摸交给原生 overflow 横滚，纵向可正常传给外层
      if (e.pointerType === 'touch') return
      if (e.pointerType === 'mouse' && e.button !== 0) return
      dragRef.current = {
        active: true,
        dragging: false,
        moved: false,
        startX: e.clientX,
        startY: e.clientY,
        scrollLeft: el.scrollLeft,
        pointerId: e.pointerId,
        axis: null,
      }
    }

    const onPointerMove = (e: PointerEvent) => {
      if (!dragRef.current.active || e.pointerId !== dragRef.current.pointerId) return
      const dx = e.clientX - dragRef.current.startX
      const dy = e.clientY - dragRef.current.startY

      if (!dragRef.current.dragging) {
        if (Math.abs(dx) < DRAG_THRESHOLD && Math.abs(dy) < DRAG_THRESHOLD) return

        if (dragRef.current.axis === null) {
          if (Math.abs(dy) >= Math.abs(dx) * HORIZONTAL_BIAS) {
            dragRef.current.active = false
            dragRef.current.axis = 'y'
            return
          }
          if (Math.abs(dx) >= Math.abs(dy) * HORIZONTAL_BIAS) {
            dragRef.current.axis = 'x'
          } else {
            return
          }
        }

        if (dragRef.current.axis !== 'x') return

        dragRef.current.dragging = true
        dragRef.current.moved = true
        el.classList.add('is-dragging')
        try {
          el.setPointerCapture(e.pointerId)
        } catch {
          /* ignore */
        }
      }

      el.scrollLeft = dragRef.current.scrollLeft - dx
    }

    const endDrag = (e: PointerEvent) => {
      if (!dragRef.current.active || e.pointerId !== dragRef.current.pointerId) return
      dragRef.current.active = false
      dragRef.current.dragging = false
      dragRef.current.axis = null
      el.classList.remove('is-dragging')
      try {
        el.releasePointerCapture(e.pointerId)
      } catch {
        /* ignore */
      }
    }

    const onClickCapture = (e: MouseEvent) => {
      if (dragRef.current.moved) {
        e.preventDefault()
        e.stopPropagation()
      }
      dragRef.current.moved = false
    }

    el.addEventListener('wheel', onWheel, { passive: false })
    el.addEventListener('pointerdown', onPointerDown)
    el.addEventListener('pointermove', onPointerMove)
    el.addEventListener('pointerup', endDrag)
    el.addEventListener('pointercancel', endDrag)
    el.addEventListener('click', onClickCapture, true)

    return () => {
      el.removeEventListener('wheel', onWheel)
      el.removeEventListener('pointerdown', onPointerDown)
      el.removeEventListener('pointermove', onPointerMove)
      el.removeEventListener('pointerup', endDrag)
      el.removeEventListener('pointercancel', endDrag)
      el.removeEventListener('click', onClickCapture, true)
    }
  }, [])

  return (
    <div ref={ref} className={`scroll-x-strip ${className}`.trim()}>
      {children}
    </div>
  )
}
