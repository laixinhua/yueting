import type { ButtonHTMLAttributes, ReactNode } from 'react'
import { useBackNavigation } from '../context/BackNavigationContext'

interface BackButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  children: ReactNode
  /** 关闭当前层（弹层/播放器）；未消费时走根级二次退出逻辑 */
  onBack?: () => void
}

export function BackButton({ onBack, onClick, children, ...rest }: BackButtonProps) {
  const { performBack } = useBackNavigation()

  return (
    <button
      type="button"
      {...rest}
      onClick={(e) => {
        onClick?.(e)
        if (e.defaultPrevented) return
        if (onBack) {
          onBack()
          return
        }
        performBack()
      }}
    >
      {children}
    </button>
  )
}
