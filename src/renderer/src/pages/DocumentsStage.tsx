import { useCallback, useEffect, useMemo, useState } from 'react'
import type { DocumentCategory, DocumentRecord } from '@shared/ipc-types'
import { Button } from '../components/ui/Button'
import { EmptyState } from '../components/ui/EmptyState'
import { AddDocumentDialog } from '../components/documents/AddDocumentDialog'
import { DocumentCard } from '../components/documents/DocumentCard'
import { DOCUMENT_CATEGORY_LABELS, DOCUMENT_CATEGORY_ORDER } from '../lib/format'

export function DocumentsStage({ clientId }: { clientId: string }): React.JSX.Element {
  const [docs, setDocs] = useState<DocumentRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [activeCategory, setActiveCategory] = useState<DocumentCategory | 'all'>('all')
  const [addOpen, setAddOpen] = useState(false)

  const refresh = useCallback(async () => {
    setLoading(true)
    try {
      const rows = await window.api.documents.list(clientId)
      setDocs(rows)
    } finally {
      setLoading(false)
    }
  }, [clientId])

  useEffect(() => {
    // Data fetch on mount / client change — intentional, not a derived-state sync.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    refresh()
  }, [refresh])

  const counts = useMemo(() => {
    const c: Partial<Record<DocumentCategory, number>> = {}
    for (const d of docs) c[d.category] = (c[d.category] ?? 0) + 1
    return c
  }, [docs])

  const filtered =
    activeCategory === 'all' ? docs : docs.filter((d) => d.category === activeCategory)

  return (
    <div className="flex h-full flex-col gap-5">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-base font-semibold">Documents</h2>
          <p className="mt-0.5 text-xs text-[var(--md-on-surface-variant)]">
            {docs.length} document{docs.length === 1 ? '' : 's'}
          </p>
        </div>
        <Button onClick={() => setAddOpen(true)}>+ Add document</Button>
      </div>

      <div className="flex flex-wrap gap-1 border-b border-[var(--md-outline-variant)] pb-2">
        <button
          onClick={() => setActiveCategory('all')}
          className={`app-no-drag rounded-full px-3.5 py-1.5 text-xs font-medium transition-colors ${
            activeCategory === 'all'
              ? 'bg-[var(--md-primary-container)] text-[var(--md-on-primary-container)]'
              : 'text-[var(--md-on-surface-variant)] hover:bg-[var(--md-surface-container-high)]'
          }`}
        >
          All ({docs.length})
        </button>
        {DOCUMENT_CATEGORY_ORDER.filter((c) => counts[c]).map((c) => (
          <button
            key={c}
            onClick={() => setActiveCategory(c)}
            className={`app-no-drag rounded-full px-3.5 py-1.5 text-xs font-medium transition-colors ${
              activeCategory === c
                ? 'bg-[var(--md-primary-container)] text-[var(--md-on-primary-container)]'
                : 'text-[var(--md-on-surface-variant)] hover:bg-[var(--md-surface-container-high)]'
            }`}
          >
            {DOCUMENT_CATEGORY_LABELS[c]} ({counts[c]})
          </button>
        ))}
      </div>

      <div className="max-w-3xl flex-1 overflow-y-auto pb-8">
        {loading ? (
          <p className="text-sm text-[var(--md-on-surface-variant)]">Loading…</p>
        ) : filtered.length === 0 ? (
          <EmptyState
            title={docs.length === 0 ? 'No documents yet' : 'No documents in this category'}
            description={
              docs.length === 0
                ? 'Upload identity, education, employment, financial, and other supporting documents here.'
                : undefined
            }
            action={
              docs.length === 0 && (
                <Button variant="tonal" onClick={() => setAddOpen(true)}>
                  + Add document
                </Button>
              )
            }
          />
        ) : (
          <div className="flex flex-col gap-3">
            {filtered.map((doc) => (
              <DocumentCard
                key={doc.id}
                doc={doc}
                onUpdated={(updated) =>
                  setDocs((prev) => prev.map((d) => (d.id === updated.id ? updated : d)))
                }
                onReplaced={(updated) =>
                  setDocs((prev) => [updated, ...prev.filter((d) => d.id !== doc.id)])
                }
                onDeleted={(id) => setDocs((prev) => prev.filter((d) => d.id !== id))}
              />
            ))}
          </div>
        )}
      </div>

      <AddDocumentDialog
        open={addOpen}
        clientId={clientId}
        defaultCategory={activeCategory === 'all' ? undefined : activeCategory}
        onClose={() => setAddOpen(false)}
        onCreated={(doc) => setDocs((prev) => [doc, ...prev])}
      />
    </div>
  )
}
