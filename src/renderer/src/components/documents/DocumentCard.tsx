import { useState } from 'react'
import type { DocumentCategory, DocumentRecord } from '@shared/ipc-types'
import { Button } from '../ui/Button'
import {
  DOCUMENT_CATEGORY_LABELS,
  DOCUMENT_CATEGORY_ORDER,
  formatRelativeDate,
  isPdfFilePath
} from '../../lib/format'
import { PdfViewerModal } from '../pdf/PdfViewerModal'
import { LinkedInformationSection } from './LinkedInformationSection'
import { BacklinksPanel } from '../links/BacklinksPanel'

export function DocumentCard({
  doc,
  onUpdated,
  onReplaced,
  onDeleted
}: {
  doc: DocumentRecord
  onUpdated: (doc: DocumentRecord) => void
  onReplaced: (doc: DocumentRecord) => void
  onDeleted: (id: string) => void
}): React.JSX.Element {
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState({
    label: doc.label,
    category: doc.category,
    customCategory: doc.customCategory ?? '',
    notes: doc.notes ?? ''
  })
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [busy, setBusy] = useState(false)
  const [viewing, setViewing] = useState(false)
  const [showRelated, setShowRelated] = useState(false)
  const isPdf = isPdfFilePath(doc.filePath)

  async function save(): Promise<void> {
    setBusy(true)
    try {
      const updated = await window.api.documents.update({
        id: doc.id,
        label: draft.label.trim(),
        category: draft.category,
        customCategory: draft.category === 'other' ? draft.customCategory || null : null,
        notes: draft.notes || null
      })
      onUpdated(updated)
      setEditing(false)
    } finally {
      setBusy(false)
    }
  }

  async function open(): Promise<void> {
    try {
      await window.api.documents.open(doc.id)
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Could not open file.')
    }
  }

  async function replace(): Promise<void> {
    const picked = await window.api.documents.pickFile()
    if (!picked) return
    setBusy(true)
    try {
      const updated = await window.api.documents.replace({
        id: doc.id,
        sourcePath: picked.sourcePath
      })
      onReplaced(updated)
    } finally {
      setBusy(false)
    }
  }

  async function remove(): Promise<void> {
    setBusy(true)
    try {
      await window.api.documents.delete(doc.id)
      onDeleted(doc.id)
    } finally {
      setBusy(false)
    }
  }

  if (editing) {
    return (
      <div className="flex flex-col gap-3 rounded-xl border border-[var(--md-primary)] bg-[var(--md-surface-container)] p-4">
        <div className="grid grid-cols-2 gap-3">
          <div className="col-span-2 flex flex-col gap-1">
            <label className="text-xs font-medium text-[var(--md-on-surface-variant)]">Label</label>
            <input
              className="app-no-drag rounded-lg border border-[var(--md-outline-variant)] bg-[var(--md-surface)] px-2.5 py-1.5 text-sm"
              value={draft.label}
              onChange={(e) => setDraft((d) => ({ ...d, label: e.target.value }))}
            />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-xs font-medium text-[var(--md-on-surface-variant)]">
              Category
            </label>
            <select
              className="app-no-drag rounded-lg border border-[var(--md-outline-variant)] bg-[var(--md-surface)] px-2.5 py-1.5 text-sm"
              value={draft.category}
              onChange={(e) =>
                setDraft((d) => ({ ...d, category: e.target.value as DocumentCategory }))
              }
            >
              {DOCUMENT_CATEGORY_ORDER.map((c) => (
                <option key={c} value={c}>
                  {DOCUMENT_CATEGORY_LABELS[c]}
                </option>
              ))}
            </select>
          </div>
          {draft.category === 'other' && (
            <div className="flex flex-col gap-1">
              <label className="text-xs font-medium text-[var(--md-on-surface-variant)]">
                Custom category
              </label>
              <input
                className="app-no-drag rounded-lg border border-[var(--md-outline-variant)] bg-[var(--md-surface)] px-2.5 py-1.5 text-sm"
                value={draft.customCategory}
                onChange={(e) => setDraft((d) => ({ ...d, customCategory: e.target.value }))}
              />
            </div>
          )}
          <div className="col-span-2 flex flex-col gap-1">
            <label className="text-xs font-medium text-[var(--md-on-surface-variant)]">
              Notes / context
            </label>
            <textarea
              className="app-no-drag min-h-[56px] rounded-lg border border-[var(--md-outline-variant)] bg-[var(--md-surface)] px-2.5 py-1.5 text-sm"
              value={draft.notes}
              onChange={(e) => setDraft((d) => ({ ...d, notes: e.target.value }))}
            />
          </div>
        </div>
        <div className="flex justify-end gap-2">
          <Button variant="text" onClick={() => setEditing(false)} disabled={busy}>
            Cancel
          </Button>
          <Button onClick={save} disabled={busy}>
            Save
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-3 rounded-xl border border-[var(--md-outline-variant)] bg-[var(--md-surface-container)] px-4 py-3">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <p className="truncate text-sm font-medium">{doc.label}</p>
            <span className="flex-shrink-0 rounded-full bg-[var(--md-secondary-container)] px-2 py-0.5 text-[10px] font-semibold text-[var(--md-on-secondary-container)]">
              {doc.category === 'other' && doc.customCategory
                ? doc.customCategory
                : DOCUMENT_CATEGORY_LABELS[doc.category]}
            </span>
            {doc.replacesDocumentId && (
              <span className="flex-shrink-0 text-[10px] text-[var(--md-on-surface-variant)]">
                replaces a previous version
              </span>
            )}
          </div>
          {doc.notes && (
            <p className="mt-1 truncate text-xs text-[var(--md-on-surface-variant)]">{doc.notes}</p>
          )}
          <p className="mt-1 text-xs text-[var(--md-on-surface-variant)]">
            Added {formatRelativeDate(doc.createdAt)}
          </p>
        </div>
        <div className="flex flex-shrink-0 flex-wrap justify-end gap-1">
          {confirmDelete ? (
            <>
              <Button
                variant="danger"
                className="!px-2.5 !py-1 text-xs"
                onClick={remove}
                disabled={busy}
              >
                Confirm delete
              </Button>
              <Button
                variant="text"
                className="!px-2.5 !py-1 text-xs"
                onClick={() => setConfirmDelete(false)}
              >
                Cancel
              </Button>
            </>
          ) : (
            <>
              {isPdf ? (
                <>
                  <Button
                    variant="text"
                    className="!px-2.5 !py-1 text-xs"
                    onClick={() => setViewing(true)}
                  >
                    View
                  </Button>
                  <Button variant="text" className="!px-2.5 !py-1 text-xs" onClick={open}>
                    Open externally
                  </Button>
                </>
              ) : (
                <Button variant="text" className="!px-2.5 !py-1 text-xs" onClick={open}>
                  Open
                </Button>
              )}
              <Button
                variant="text"
                className="!px-2.5 !py-1 text-xs"
                onClick={() => setEditing(true)}
              >
                Edit
              </Button>
              <Button
                variant="text"
                className="!px-2.5 !py-1 text-xs"
                onClick={replace}
                disabled={busy}
              >
                Replace
              </Button>
              <Button
                variant="text"
                className="!px-2.5 !py-1 text-xs text-[var(--md-error)]"
                onClick={() => setConfirmDelete(true)}
              >
                Delete
              </Button>
              <Button
                variant="text"
                className="!px-2.5 !py-1 text-xs"
                onClick={() => setShowRelated((v) => !v)}
              >
                {showRelated ? 'Hide links' : 'Links'}
              </Button>
            </>
          )}
        </div>
      </div>

      {showRelated && !confirmDelete && (
        <div className="flex flex-col gap-3 border-t border-[var(--md-outline-variant)] pt-3">
          <LinkedInformationSection clientId={doc.clientId} documentId={doc.id} />
          <BacklinksPanel
            clientId={doc.clientId}
            entityType="documents"
            entityId={doc.id}
            excludeKinds={['information']}
            emptyHint="No verification, evidence, checklist, or other-document links yet."
          />
        </div>
      )}

      {viewing && (
        <PdfViewerModal documentId={doc.id} label={doc.label} onClose={() => setViewing(false)} />
      )}
    </div>
  )
}
