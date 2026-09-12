import type { ClientWithProgress } from '@shared/ipc-types'
import { StatusBadge } from './ui/StatusBadge'
import { STAGE_LABELS, formatDate, formatRelativeDate } from '../lib/format'

export function ClientCard({
  client,
  onOpen,
  onDelete,
  onTogglePin,
  onToggleArchive
}: {
  client: ClientWithProgress
  onOpen: () => void
  onDelete: () => void
  onTogglePin?: () => void
  onToggleArchive?: () => void
}): React.JSX.Element {
  const statusMismatch = client.status !== client.suggestedStatus

  return (
    <div
      className="group flex cursor-pointer flex-col gap-3 rounded-2xl p-5 transition-shadow hover:shadow-lg"
      style={{ backgroundColor: 'var(--md-surface-container)', boxShadow: 'var(--md-elevation-1)' }}
      onClick={onOpen}
    >
      <div className="flex items-start justify-between gap-2">
        <div>
          <h3 className="text-base font-semibold text-[var(--md-on-surface)]">{client.fullName}</h3>
          <p className="text-xs text-[var(--md-on-surface-variant)]">
            {STAGE_LABELS[client.currentStage]}
          </p>
        </div>
        <div className="flex flex-shrink-0 items-center gap-0.5">
          {onTogglePin && (
            <button
              className={`app-no-drag rounded-full p-1.5 text-xs transition-opacity hover:bg-[var(--md-surface-container-high)] ${
                client.pinned ? 'opacity-100' : 'opacity-0 group-hover:opacity-60'
              }`}
              onClick={(e) => {
                e.stopPropagation()
                onTogglePin()
              }}
              aria-label={client.pinned ? `Unpin ${client.fullName}` : `Pin ${client.fullName}`}
              title={client.pinned ? 'Unpin' : 'Pin'}
            >
              {client.pinned ? '📌' : '📍'}
            </button>
          )}
          {onToggleArchive && (
            <button
              className="app-no-drag rounded-full p-1.5 text-xs text-[var(--md-on-surface-variant)] opacity-0 transition-opacity hover:bg-[var(--md-surface-container-high)] group-hover:opacity-60"
              onClick={(e) => {
                e.stopPropagation()
                onToggleArchive()
              }}
              aria-label={
                client.archived ? `Unarchive ${client.fullName}` : `Archive ${client.fullName}`
              }
              title={client.archived ? 'Unarchive' : 'Archive'}
            >
              {client.archived ? '📤' : '📥'}
            </button>
          )}
          <button
            className="app-no-drag rounded-full p-1.5 text-xs text-[var(--md-on-surface-variant)] opacity-0 transition-opacity hover:bg-[var(--md-error-container)] hover:text-[var(--md-error)] group-hover:opacity-100"
            onClick={(e) => {
              e.stopPropagation()
              onDelete()
            }}
            aria-label={`Delete ${client.fullName}`}
            title="Delete client"
          >
            ✕
          </button>
        </div>
      </div>

      <div className="flex items-center gap-2">
        <StatusBadge status={client.status} />
        {statusMismatch && (
          <span
            className="text-xs text-[var(--md-on-surface-variant)]"
            title={`Suggested: ${client.suggestedStatus}`}
          >
            (suggested: {client.suggestedStatus})
          </span>
        )}
      </div>

      <div className="mt-1 flex flex-col gap-1 text-xs text-[var(--md-on-surface-variant)]">
        <span>
          {client.pendingActionCount} pending action{client.pendingActionCount === 1 ? '' : 's'}
        </span>
        <span>Updated {formatRelativeDate(client.updatedAt)}</span>
        <span>Target intake: {formatDate(client.targetIntakeDate)}</span>
      </div>
    </div>
  )
}
