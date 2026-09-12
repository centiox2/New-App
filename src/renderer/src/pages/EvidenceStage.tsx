import { useCallback, useEffect, useMemo, useState } from 'react'
import type { DocumentRecord, EvidenceItem } from '@shared/ipc-types'
import { Button } from '../components/ui/Button'
import { EmptyState } from '../components/ui/EmptyState'
import { TextField } from '../components/ui/TextField'
import { EvidenceCard } from '../components/evidence/EvidenceCard'

export function EvidenceStage({ clientId }: { clientId: string }): React.JSX.Element {
  const [items, setItems] = useState<EvidenceItem[]>([])
  const [documents, setDocuments] = useState<DocumentRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [adding, setAdding] = useState(false)
  const [newTitle, setNewTitle] = useState('')

  const refresh = useCallback(async () => {
    setLoading(true)
    try {
      const [rows, docs] = await Promise.all([
        window.api.evidence.list(clientId),
        window.api.documents.list(clientId)
      ])
      setItems(rows)
      setDocuments(docs)
    } finally {
      setLoading(false)
    }
  }, [clientId])

  const documentsById = useMemo(() => new Map(documents.map((d) => [d.id, d])), [documents])

  const refreshDocuments = useCallback(async () => {
    setDocuments(await window.api.documents.list(clientId))
  }, [clientId])

  useEffect(() => {
    // Data fetch on mount / client change — intentional, not a derived-state sync.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    refresh()
  }, [refresh])

  async function createEvidence(): Promise<void> {
    if (!newTitle.trim()) return
    const created = await window.api.evidence.create({ clientId, title: newTitle.trim() })
    setItems((prev) => [created, ...prev])
    setNewTitle('')
    setAdding(false)
  }

  return (
    <div className="flex h-full max-w-3xl flex-col gap-5 overflow-y-auto pb-8">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-base font-semibold">Evidence &amp; Research</h2>
          <p className="mt-0.5 text-xs text-[var(--md-on-surface-variant)]">
            News, reports, and official sources supporting the GSR — each recorded with what it
            proves so it can be linked to a statement when writing.
          </p>
        </div>
        {!adding && <Button onClick={() => setAdding(true)}>+ Add evidence</Button>}
      </div>

      {adding && (
        <div className="flex items-end gap-2 rounded-xl border border-[var(--md-primary)] bg-[var(--md-surface-container)] p-4">
          <div className="flex-1">
            <TextField
              label="Title"
              autoFocus
              value={newTitle}
              onChange={(e) => setNewTitle(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && createEvidence()}
            />
          </div>
          <Button
            variant="text"
            onClick={() => {
              setAdding(false)
              setNewTitle('')
            }}
          >
            Cancel
          </Button>
          <Button onClick={createEvidence}>Add</Button>
        </div>
      )}

      {loading ? (
        <p className="text-sm text-[var(--md-on-surface-variant)]">Loading…</p>
      ) : items.length === 0 && !adding ? (
        <EmptyState
          title="No evidence added yet"
          description="Add news articles, reports, or official sources and record what each one proves."
          action={<Button onClick={() => setAdding(true)}>+ Add evidence</Button>}
        />
      ) : (
        <div className="flex flex-col gap-3">
          {items.map((item) => (
            <EvidenceCard
              key={item.id}
              item={item}
              document={item.documentId ? documentsById.get(item.documentId) : undefined}
              onUpdated={(updated) => {
                setItems((prev) => prev.map((i) => (i.id === updated.id ? updated : i)))
                // Attach/remove may have created or freed a document row — resync the map.
                refreshDocuments()
              }}
              onDeleted={(id) => setItems((prev) => prev.filter((i) => i.id !== id))}
            />
          ))}
        </div>
      )}
    </div>
  )
}
