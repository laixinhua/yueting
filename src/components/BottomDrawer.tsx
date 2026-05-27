import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { useShellOverlayClass } from '../hooks/useShellOverlay'

const DISMISS_DRAG_PX = 72

interface BottomDrawerProps {
  onClose: () => void
  children: ReactNode
}

export function BottomDrawer({ onClose, children }: BottomDrawerProps) {
  const shellClass = useShellOverlayClass('above')
  const [dragY, setDragY] = useState(0)
  const [isDragging, setIsDragging] = useState(false)
  const draggingRef = useRef(false)
  const startYRef = useRef(0)
  const dragYRef = useRef(0)

  useEffect(() => {
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = prev
    }
  }, [])

  const finishDrag = useCallback(() => {
    draggingRef.current = false
    setIsDragging(false)
    if (dragYRef.current >= DISMISS_DRAG_PX) {
      onClose()
      return
    }
    dragYRef.current = 0
    setDragY(0)
  }, [onClose])

  const onHandlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    draggingRef.current = true
    setIsDragging(true)
    startYRef.current = e.clientY
    dragYRef.current = 0
    setDragY(0)
    e.currentTarget.setPointerCapture(e.pointerId)
  }

  const onHandlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!draggingRef.current) return
    const next = Math.max(0, e.clientY - startYRef.current)
    dragYRef.current = next
    setDragY(next)
  }

  const onHandlePointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!draggingRef.current) return
    e.currentTarget.releasePointerCapture(e.pointerId)
    finishDrag()
  }

  const onHandlePointerCancel = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!draggingRef.current) return
    e.currentTarget.releasePointerCapture(e.pointerId)
    finishDrag()
  }

  return createPortal(
    <div className={`${shellClass} z-[100] flex flex-col justify-end`}>
      <button
        type="button"
        className="absolute inset-0 bg-black/60 drawer-backdrop-enter"
        onClick={onClose}
        aria-label="关闭"
      />
      <div
        className={`relative z-10 w-full max-h-[85vh] flex flex-col bg-surface-elevated rounded-t-2xl border-t border-white/5 safe-bottom drawer-panel-enter ${
          isDragging ? '' : 'transition-transform duration-200 ease-out'
        }`}
        style={{ transform: dragY > 0 ? `translateY(${dragY}px)` : undefined }}
      >
        <div
          className="shrink-0 flex justify-center pt-3 pb-1 touch-none cursor-grab active:cursor-grabbing"
          onPointerDown={onHandlePointerDown}
          onPointerMove={onHandlePointerMove}
          onPointerUp={onHandlePointerUp}
          onPointerCancel={onHandlePointerCancel}
          aria-hidden
        >
          <div className="w-10 h-1 rounded-full bg-white/25" />
        </div>
        <div className="min-h-0 overflow-y-auto">{children}</div>
      </div>
    </div>,
    document.body,
  )
}
