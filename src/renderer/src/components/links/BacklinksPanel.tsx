import { useCallback, useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import type { BacklinkItem } from '@shared/ipc-types'
import { STAGE_LABELS } from '../../lib/format'

const KIND_LABELS: Record<BacklinkItem['kind'], string> = {
  document: 'Document',
  information: 'Information',
  verification_record: 'Verification',
  evidence_item: 'Evidence',
  gsr_statement: 'GSR statement',
  checklist: 'Checklist'
}

/**
 * Obsidian-inspired backlinks: every other node in the case that references
 * this one, resolved via `links:backlinksForEntity` across every
 * link/relationship table in the schema. Read-only — click an item to jump
 * to the stage it lives on.
 */
export function BacklinksPanel({
  clientId,
  entityType,
  entityId,
  excludeKinds = [],
  emptyHint
}: {
  clientId: string
  entityType: string
  entityId: string
  excludeKinds?: BacklinkItem['kind'][]
  /** Shown when there are no backlinks — omit to render nothing in that case. */
  emptyHint?: string
}): React.JSX.Element | null {
  const navigate = useNavigate()
  const [items, setItems] = useState<BacklinkItem[]>([])
  const [loading, setLoading] = useState(true)

  const refresh = useCallback(async () => {
    setLoading(true)
    try {
      const rows = await window.api.links.backlinksForEntity({ entityType, entityId })
      setItems(rows)
    } finally {
      setLoading(false)
    }
  }, [entityType, entityId])

  useEffect(() => {
    // Data fetch on mount / entity change — intentional, not a derived-state sync.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    refresh()
  }, [refresh])

  // Filtered at render time (not in the fetch) so a fresh `excludeKinds` array
  // literal on every parent render doesn't need to be an effect dependency.
  const visibleItems = items.filter((r) => !excludeKinds.includes(r.kind))

  if (loading) return null
  if (visibleItems.length === 0) {
    return emptyHint ? (
      <p className="text-xs text-[var(--md-on-surface-variant)]">{emptyHint}</p>
    ) : null
  }

  return (
    <div className="flex flex-col gap-1.5">
      <p className="text-xs font-medium text-[var(--md-on-surface-variant)]">
        Linked &amp; related ({visibleItems.length})
      </p>
      <div className="flex flex-col gap-1">
        {visibleItems.map((item) => (
          <button
            key={`${item.kind}:${item.linkId}`}
            onClick={() => navigate(`/clients/${clientId}/${item.stage}`)}
            className="app-no-drag flex items-center justify-between gap-2 rounded-lg border border-[var(--md-outline-variant)] px-2.5 py-1.5 text-left text-xs hover:border-[var(--md-primary)]"
          >
            <span className="min-w-0 truncate">
              <span className="text-[var(--md-on-surface-variant)]">
                {KIND_LABELS[item.kind]}:{' '}
              </span>
              {item.label}
            </span>
            <span className="flex-shrink-0 text-[10px] text-[var(--md-on-surface-variant)]">
              {STAGE_LABELS[item.stage]}
            </span>
          </button>
        ))}
      </div>
    </div>
  )
}
