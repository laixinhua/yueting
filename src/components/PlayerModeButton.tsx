import type { ReactNode } from 'react'

interface PlayerModeButtonProps {
  label: string
  onClick: () => void
  ariaLabel: string
  children: ReactNode
}

export function PlayerModeButton({ label, onClick, ariaLabel, children }: PlayerModeButtonProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={ariaLabel}
      className="flex flex-col items-center justify-center gap-0.5 min-w-[52px] py-1 rounded-lg text-white/50 hover:text-white/80 hover:bg-white/5 transition-colors"
    >
      <span className="flex items-center justify-center w-9 h-9">{children}</span>
      <span className="text-[10px] font-medium leading-none">{label}</span>
    </button>
  )
}
