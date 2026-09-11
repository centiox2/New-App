import type { VerificationStatus } from '@shared/ipc-types'
import { VERIFICATION_STATUS_COLORS, VERIFICATION_STATUS_LABELS } from '../../lib/format'

export function VerificationStatusBadge({
  status
}: {
  status: VerificationStatus | null
}): React.JSX.Element {
  if (!status) {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full bg-[var(--md-surface-container-high)] px-2.5 py-1 text-xs font-semibold text-[var(--md-on-surface-variant)]">
        Not started
      </span>
    )
  }
  const { fg, bg } = VERIFICATION_STATUS_COLORS[status]
  return (
    <span
      className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold"
      style={{ color: fg, backgroundColor: bg }}
    >
      <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: fg }} />
      {VERIFICATION_STATUS_LABELS[status]}
    </span>
  )
}
