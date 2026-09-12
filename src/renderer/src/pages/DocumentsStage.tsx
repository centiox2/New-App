import { useCallback, useEffect, useMemo, useState } from 'react'
import type { DocumentCategory, DocumentRecord, EntityTag } from '@shared/ipc-types'
import { Button } from '../components/ui/Button'
import { EmptyState } from '../components/ui/EmptyState'
import { AddDocumentDialog } from '../components/documents/AddDocumentDialog'
import { DocumentCard } from '../components/documents/DocumentCard'
import { TagFilterBar } from '../components/tags/TagFilterBar'
import { DOCUMENT_CATEGORY_LABELS, DOCUMENT_CATEGORY_ORDER } from '../lib/format'

export function DocumentsStage({ clientId }: { clientId: string }): React.JSX.Element {
  const [docs, setDocs] = useState<DocumentRecord[]>([])
  const [tags, setTags] = useState<EntityTag[]>([])
  const [loading, setLoading] = useState(true)
  const [activeCategory, setActiveCategory] = useState<DocumentCategory | 'all'>('all')
  const [activeTags, setActiveTags] = useState<string[]>([])
  const [addOpen, setAddOpen] = useState(false)
  const [selectMode, setSelectMode] = useState(false)
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [bulkCategory, setBulkCategory] = useState<DocumentCategory>('other')
  const [confirmBulkDelete, setConfirmBulkDelete] = useState(false)
  const [bulkBusy, setBulkBusy] = useState(false)

  const refresh = useCallback(async () => {
    setLoading(true)
    try {
      const [rows, tagRows] = await Promise.all([
        window.api.documents.list(clientId),
        window.api.tags.listForClientEntityType(clientId, 'documents')
      ])
      setDocs(rows)
      setTags(tagRows)
    } finally {
      setLoading(false)
    }
  }, [clientId])

  useEffect(() => {
    // Data fetch on mount / client change — intentional, not a derived-state sync.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    refresh()
  }, [refresh])

  const tagsByDoc = useMemo(() => {
    const map = new Map<string, EntityTag[]>()
    for (const t of tags) map.set(t.entityId, [...(map.get(t.entityId) ?? []), t])
    return map
  }, [tags])

  const distinctTagLabels = useMemo(
    () => Array.from(new Set(tags.map((t) => t.label))).sort(),
    [tags]
  )

  const counts = useMemo(() => {
    const c: Partial<Record<DocumentCategory, number>> = {}
    for (const d of docs) c[d.category] = (c[d.category] ?? 0) + 1
    return c
  }, [docs])

  const filtered = docs
    .filter((d) => activeCategory === 'all' || d.category === activeCategory)
    .filter(
      (d) =>
        activeTags.length === 0 ||
        activeTags.every((label) => tagsByDoc.get(d.id)?.some((t) => t.label === label))
    )

  function toggleTagFilter(label: string): void {
    setActiveTags((prev) =>
      prev.includes(label) ? prev.filter((l) => l !== label) : [...prev, label]
    )
  }

  function toggleSelected(id: string): void {
    setSelected((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  function exitSelectMode(): void {
    setSelectMode(false)
    setSelected(new Set())
    setConfirmBulkDelete(false)
  }

  async function applyBulkCategory(): Promise<void> {
    setBulkBusy(true)
    try {
      await Promise.all(
        Array.from(selected).map((id) =>
          window.api.documents.update({ id, category: bulkCategory })
        )
      )
      await refresh()
      exitSelectMode()
    } finally {
      setBulkBusy(false)
    }
  }

  async function applyBulkDelete(): Promise<void> {
    setBulkBusy(true)
    try {
      await Promise.all(Array.from(selected).map((id) => window.api.documents.delete(id)))
      await refresh()
      exitSelectMode()
    } finally {
      setBulkBusy(false)
    }
  }

  return (
    <div className="flex h-full flex-col gap-5">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-base font-semibold">Documents</h2>
          <p className="mt-0.5 text-xs text-[var(--md-on-surface-variant)]">
            {docs.length} document{docs.length === 1 ? '' : 's'}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {selectMode ? (
            <Button variant="text" onClick={exitSelectMode}>
              Cancel
            </Button>
          ) : (
            <Button variant="text" onClick={() => setSelectMode(true)}>
              Select
            </Button>
          )}
          <Button onClick={() => setAddOpen(true)}>+ Add document</Button>
        </div>
      </div>

      {selectMode && (
        <div className="flex flex-wrap items-center gap-2 rounded-xl border border-[var(--md-primary)] bg-[var(--md-primary-container)]/20 px-4 py-2.5">
          <span className="text-xs font-medium">{selected.size} selected</span>
          <select
            className="app-no-drag rounded-lg border border-[var(--md-outline-variant)] bg-[var(--md-surface)] px-2 py-1.5 text-xs"
            value={bulkCategory}
            onChange={(e) => setBulkCategory(e.target.value as DocumentCategory)}
          >
            {DOCUMENT_CATEGORY_ORDER.map((c) => (
              <option key={c} value={c}>
                {DOCUMENT_CATEGORY_LABELS[c]}
              </option>
            ))}
          </select>
          <Button
            variant="tonal"
            className="!px-2.5 !py-1 text-xs"
            onClick={applyBulkCategory}
            disabled={selected.size === 0 || bulkBusy}
          >
            Set category
          </Button>
          {confirmBulkDelete ? (
            <>
              <Button
                variant="danger"
                className="!px-2.5 !py-1 text-xs"
                onClick={applyBulkDelete}
                disabled={bulkBusy}
              >
                Confirm delete {selected.size}
              </Button>
              <Button
                variant="text"
                className="!px-2.5 !py-1 text-xs"
                onClick={() => setConfirmBulkDelete(false)}
              >
                Cancel
              </Button>
            </>
          ) : (
            <Button
              variant="text"
              className="!px-2.5 !py-1 text-xs text-[var(--md-error)]"
              onClick={() => setConfirmBulkDelete(true)}
              disabled={selected.size === 0}
            >
              Delete selected
            </Button>
          )}
        </div>
      )}

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

      <TagFilterBar labels={distinctTagLabels} active={activeTags} onToggle={toggleTagFilter} />

      <div className="max-w-3xl flex-1 overflow-y-auto pb-8">
        {loading ? (
          <p className="text-sm text-[var(--md-on-surface-variant)]">Loading…</p>
        ) : filtered.length === 0 ? (
          <EmptyState
            title={docs.length === 0 ? 'No documents yet' : 'No documents match'}
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
                tags={tagsByDoc.get(doc.id) ?? []}
                onTagsChanged={(next) =>
                  setTags((prev) => [...prev.filter((t) => t.entityId !== doc.id), ...next])
                }
                selectMode={selectMode}
                selected={selected.has(doc.id)}
                onToggleSelected={() => toggleSelected(doc.id)}
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
