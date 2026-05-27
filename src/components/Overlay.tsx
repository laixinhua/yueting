import type { ReactNode } from 'react'
import { useBackHandler } from '../context/BackNavigationContext'
import { useShellOverlayClass } from '../hooks/useShellOverlay'
import { BackButton } from './BackButton'
import { IconChevronLeft } from './icons'

interface OverlayProps {
  title: string
  onClose: () => void
  children: ReactNode
  footer?: ReactNode
  headerRight?: ReactNode
}

export function Overlay({ title, onClose, children, footer, headerRight }: OverlayProps) {
  const shellClass = useShellOverlayClass('base')

  useBackHandler(true, () => {
    onClose()
    return true
  })

  return (
    <div className={`${shellClass} flex flex-col bg-surface`}>
      <header className="shrink-0 flex items-center gap-3 px-4 pt-12 pb-4 border-b border-white/5">
        <BackButton
          aria-label="返回"
          className="w-10 h-10 flex items-center justify-center rounded-full hover:bg-white/10 transition-colors"
        >
          <IconChevronLeft className="w-6 h-6" />
        </BackButton>
        <h1 className="text-xl font-bold text-white flex-1 truncate">{title}</h1>
        {headerRight ? <div className="shrink-0">{headerRight}</div> : null}
      </header>
      <div className="flex-1 min-h-0 overflow-y-auto">{children}</div>
      {footer ? (
        <div className="shrink-0 px-4 pt-3 pb-[calc(1.5rem+env(safe-area-inset-bottom,0px))] border-t border-white/5 bg-surface/95 backdrop-blur-md">
          {footer}
        </div>
      ) : null}
    </div>
  )
}
