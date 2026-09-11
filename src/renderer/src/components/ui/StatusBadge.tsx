import type { ClientStatus } from '@shared/ipc-types'

const LABELS: Record<ClientStatus, string> = {
  red: 'Action Required',
  yellow: 'In Progress',
  green: 'Ready / Complete'
}

const COLORS: Record<ClientStatus, { fg: string; bg: string }> = {
  red: { fg: 'var(--status-red)', bg: 'var(--status-red-bg)' },
  yellow: { fg: 'var(--status-yellow)', bg: 'var(--status-yellow-bg)' },
  green: { fg: 'var(--status-green)', bg: 'var(--status-green-bg)' }
}

export function StatusBadge({
  status,
  compact = false
}: {
  status: ClientStatus
  compact?: boolean
}): React.JSX.Element {
  const { fg, bg } = COLORS[status]
  return (
    <span
      className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold"
      style={{ color: fg, backgroundColor: bg }}
    >
      <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: fg }} />
      {compact ? LABELS[status].split(' ')[0] : LABELS[status]}
    </span>
  )
}
