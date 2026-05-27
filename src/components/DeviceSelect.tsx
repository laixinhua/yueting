import { useEffect, useLayoutEffect, useRef, useState, type CSSProperties } from 'react'
import { createPortal } from 'react-dom'
import type { DeviceOverride } from '../types/device'
import { IconChevronDown } from './icons'

const OPTIONS: { value: DeviceOverride; label: string }[] = [
  { value: 'auto', label: '自动（根据屏幕宽度）' },
  { value: 'phone', label: '手机' },
  { value: 'tablet', label: '平板' },
  { value: 'tv', label: '电视' },
]

export const deviceLabels: Record<DeviceOverride, string> = Object.fromEntries(
  OPTIONS.map((o) => [o.value, o.label]),
) as Record<DeviceOverride, string>

interface DeviceSelectProps {
  value: DeviceOverride
  onChange: (value: DeviceOverride) => void
}

export function DeviceSelect({ value, onChange }: DeviceSelectProps) {
  const [open, setOpen] = useState(false)
  const [menuStyle, setMenuStyle] = useState<CSSProperties>()
  const rootRef = useRef<HTMLDivElement>(null)
  const triggerRef = useRef<HTMLButtonElement>(null)
  const menuRef = useRef<HTMLUListElement>(null)

  const selectedLabel = deviceLabels[value]

  useLayoutEffect(() => {
    if (!open || !triggerRef.current) return
    const update = () => {
      const rect = triggerRef.current!.getBoundingClientRect()
      setMenuStyle({
        position: 'fixed',
        top: rect.bottom + 6,
        left: rect.left,
        width: rect.width,
        zIndex: 200,
      })
    }
    update()
    window.addEventListener('resize', update)
    window.addEventListener('scroll', update, true)
    return () => {
      window.removeEventListener('resize', update)
      window.removeEventListener('scroll', update, true)
    }
  }, [open])

  useEffect(() => {
    if (!open) return
    const onPointerDown = (e: PointerEvent) => {
      const target = e.target as Node
      if (rootRef.current?.contains(target) || menuRef.current?.contains(target)) return
      setOpen(false)
    }
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false)
    }
    document.addEventListener('pointerdown', onPointerDown)
    document.addEventListener('keydown', onKeyDown)
    return () => {
      document.removeEventListener('pointerdown', onPointerDown)
      document.removeEventListener('keydown', onKeyDown)
    }
  }, [open])

  const menu =
    open && menuStyle
      ? createPortal(
          <ul
            ref={menuRef}
            role="listbox"
            aria-label="选择界面布局"
            style={menuStyle}
            className="m-0 p-0 list-none rounded-xl border border-white/10 bg-surface-elevated shadow-xl shadow-black/40 overflow-hidden"
          >
            {OPTIONS.map((opt) => {
              const active = opt.value === value
              return (
                <li key={opt.value} role="option" aria-selected={active}>
                  <button
                    type="button"
                    onClick={() => {
                      onChange(opt.value)
                      setOpen(false)
                    }}
                    className={`w-full px-3.5 py-2.5 text-sm text-left transition-colors ${
                      active
                        ? 'bg-white/15 text-white font-medium'
                        : 'text-white/80 hover:bg-white/5 active:bg-white/10'
                    }`}
                  >
                    {opt.label}
                  </button>
                </li>
              )
            })}
          </ul>,
          document.body,
        )
      : null

  return (
    <div ref={rootRef} className="relative">
      <button
        ref={triggerRef}
        type="button"
        aria-haspopup="listbox"
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
        className="w-full h-11 pl-3.5 pr-10 rounded-xl border border-white/10 bg-surface-elevated text-white text-sm text-left transition-colors hover:border-white/15 focus:outline-none focus:ring-2 focus:ring-white/25"
      >
        {selectedLabel}
      </button>
      <IconChevronDown
        className={`pointer-events-none absolute right-3.5 top-1/2 -translate-y-1/2 w-5 h-5 text-white/45 transition-transform ${open ? 'rotate-180' : ''}`}
        aria-hidden
      />
      {menu}
    </div>
  )
}
