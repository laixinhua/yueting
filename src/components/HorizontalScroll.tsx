import { useRef, useEffect, type ReactNode } from 'react'

const DRAG_THRESHOLD = 8

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
    scrollLeft: 0,
    pointerId: -1,
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
      if (e.pointerType === 'mouse' && e.button !== 0) return
      dragRef.current = {
        active: true,
        dragging: false,
        moved: false,
        startX: e.clientX,
        scrollLeft: el.scrollLeft,
        pointerId: e.pointerId,
      }
    }

    const onPointerMove = (e: PointerEvent) => {
      if (!dragRef.current.active || e.pointerId !== dragRef.current.pointerId) return
      const dx = e.clientX - dragRef.current.startX

      if (!dragRef.current.dragging) {
        if (Math.abs(dx) < DRAG_THRESHOLD) return
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
