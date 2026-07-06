interface SectionHeaderProps {
  title: string
  action?: string
  onAction?: () => void
}

export function SectionHeader({ title, action, onAction }: SectionHeaderProps) {
  return (
    <div className="flex items-center justify-between px-4 mb-3">
      <h2 className="text-lg font-bold text-white">{title}</h2>
      {action ? (
        <button type="button" onClick={onAction} className="text-sm font-medium text-white/50 hover:text-white active:scale-95 transition-all">
          {action}
        </button>
      ) : null}
    </div>
  )
}
