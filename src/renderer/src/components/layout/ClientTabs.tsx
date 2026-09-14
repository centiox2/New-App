import type { ClientTab } from '../../lib/session'

interface ClientTabsProps {
  tabs: ClientTab[]
  /** clientId of the currently open workspace, or null on the dashboard. */
  activeClientId: string | null
  onSelect: (clientId: string) => void
  onClose: (clientId: string) => void
}

/**
 * Browser-tab-style strip of open clients. Persisted across app restarts
 * (see lib/session.ts) so a consultant can keep a set of in-flight cases
 * one click away. Middle-click (or the ×) closes a tab.
 */
export function ClientTabs({
  tabs,
  activeClientId,
  onSelect,
  onClose
}: ClientTabsProps): React.JSX.Element | null {
  if (tabs.length === 0) return null

  return (
    <div
      className="app-no-drag flex items-center gap-1.5 overflow-x-auto border-b border-[var(--md-outline-variant)] px-3 py-1.5"
      style={{ backgroundColor: 'var(--md-surface-container)' }}
    >
      {tabs.map((tab) => {
        const active = tab.clientId === activeClientId
        return (
          <div
            key={tab.clientId}
            role="button"
            tabIndex={0}
            title={tab.fullName}
            onClick={() => onSelect(tab.clientId)}
            onAuxClick={(e) => {
              if (e.button === 1) {
                e.preventDefault()
                onClose(tab.clientId)
              }
            }}
            onKeyDown={(e) => {
              if (e.key === 'Enter') onSelect(tab.clientId)
            }}
            className={`group flex max-w-[180px] cursor-pointer select-none items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs transition-colors ${
              active
                ? 'border-transparent bg-[var(--md-primary-container)] font-medium text-[var(--md-on-primary-container)]'
                : 'border-[var(--md-outline-variant)] text-[var(--md-on-surface-variant)] hover:bg-[var(--md-surface-container-high)]'
            }`}
          >
            <span className="truncate">{tab.fullName}</span>
            <button
              onClick={(e) => {
                e.stopPropagation()
                onClose(tab.clientId)
              }}
              aria-label={`Close ${tab.fullName}`}
              className="flex h-4 w-4 flex-shrink-0 items-center justify-center rounded-full text-[10px] opacity-40 transition-opacity hover:bg-black/10 hover:opacity-100"
            >
              ✕
            </button>
          </div>
        )
      })}
    </div>
  )
}
