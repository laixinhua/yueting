import { ToastBubble } from './AppToast'

interface ExitHintToastProps {
  visible: boolean
}

export function ExitHintToast({ visible }: ExitHintToastProps) {
  if (!visible) return null

  return (
    <ToastBubble>
      <p className="text-sm text-white/90 text-center whitespace-nowrap">再按一次退出应用</p>
    </ToastBubble>
  )
}
