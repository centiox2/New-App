import type { ReactNode } from 'react'

export function EmptyState({
  title,
  description,
  action
}: {
  title: string
  description?: string
  action?: ReactNode
}): React.JSX.Element {
  return (
    <div className="flex flex-col items-center justify-center gap-3 rounded-2xl border border-dashed border-[var(--md-outline-variant)] px-8 py-16 text-center">
      <p className="text-base font-medium text-[var(--md-on-surface)]">{title}</p>
      {description && (
        <p className="max-w-sm text-sm text-[var(--md-on-surface-variant)]">{description}</p>
      )}
      {action}
    </div>
  )
}
