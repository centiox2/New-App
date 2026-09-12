import { useState } from 'react'
import type { DocumentRecord, EntityTag, EvidenceItem } from '@shared/ipc-types'
import { Button } from '../ui/Button'
import { formatRelativeDate, isPdfFilePath } from '../../lib/format'
import { PdfViewerModal } from '../pdf/PdfViewerModal'
import { BacklinksPanel } from '../links/BacklinksPanel'
import { TagEditor } from '../tags/TagEditor'

export function EvidenceCard({
  item,
  document,
  tags = [],
  onTagsChanged,
  onUpdated,
  onDeleted
}: {
  item: EvidenceItem
  /** The attached file's document row, when `item.documentId` is set — used to detect PDFs. */
  document?: DocumentRecord
  tags?: EntityTag[]
  onTagsChanged?: (tags: EntityTag[]) => void
  onUpdated: (item: EvidenceItem) => void
  onDeleted: (id: string) => void
}): React.JSX.Element {
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState({
    title: item.title,
    source: item.source ?? '',
    url: item.url ?? '',
    publicationInfo: item.publicationInfo ?? '',
    excerpt: item.excerpt ?? '',
    provesWhat: item.provesWhat ?? '',
    notes: item.notes ?? ''
  })
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [busy, setBusy] = useState(false)
  const [viewing, setViewing] = useState(false)
  const isPdf = document ? isPdfFilePath(document.filePath) : false

  async function save(): Promise<void> {
    setBusy(true)
    try {
      const updated = await window.api.evidence.update({ id: item.id, ...draft })
      onUpdated(updated)
      setEditing(false)
    } finally {
      setBusy(false)
    }
  }

  async function attachFile(): Promise<void> {
    setBusy(true)
    try {
      const updated = await window.api.evidence.attachFile(item.id)
      onUpdated(updated)
    } finally {
      setBusy(false)
    }
  }

  async function removeFile(): Promise<void> {
    setBusy(true)
    try {
      const updated = await window.api.evidence.removeFile(item.id)
      onUpdated(updated)
    } finally {
      setBusy(false)
    }
  }

  async function openFile(): Promise<void> {
    if (item.documentId) await window.api.documents.open(item.documentId)
  }

  async function remove(): Promise<void> {
    setBusy(true)
    try {
      await window.api.evidence.delete(item.id)
      onDeleted(item.id)
    } finally {
      setBusy(false)
    }
  }

  if (editing) {
    return (
      <div className="flex flex-col gap-3 rounded-xl border border-[var(--md-primary)] bg-[var(--md-surface-container)] p-4">
        <div className="grid grid-cols-2 gap-3">
          <div className="col-span-2 flex flex-col gap-1">
            <label className="text-xs font-medium text-[var(--md-on-surface-variant)]">Title</label>
            <input
              className="app-no-drag rounded-lg border border-[var(--md-outline-variant)] bg-[var(--md-surface)] px-2.5 py-1.5 text-sm"
              value={draft.title}
              onChange={(e) => setDraft((d) => ({ ...d, title: e.target.value }))}
            />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-xs font-medium text-[var(--md-on-surface-variant)]">
              Source
            </label>
            <input
              className="app-no-drag rounded-lg border border-[var(--md-outline-variant)] bg-[var(--md-surface)] px-2.5 py-1.5 text-sm"
              value={draft.source}
              onChange={(e) => setDraft((d) => ({ ...d, source: e.target.value }))}
            />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-xs font-medium text-[var(--md-on-surface-variant)]">URL</label>
            <input
              className="app-no-drag rounded-lg border border-[var(--md-outline-variant)] bg-[var(--md-surface)] px-2.5 py-1.5 text-sm"
              value={draft.url}
              onChange={(e) => setDraft((d) => ({ ...d, url: e.target.value }))}
            />
          </div>
          <div className="col-span-2 flex flex-col gap-1">
            <label className="text-xs font-medium text-[var(--md-on-surface-variant)]">
              Publication information
            </label>
            <input
              className="app-no-drag rounded-lg border border-[var(--md-outline-variant)] bg-[var(--md-surface)] px-2.5 py-1.5 text-sm"
              value={draft.publicationInfo}
              onChange={(e) => setDraft((d) => ({ ...d, publicationInfo: e.target.value }))}
            />
          </div>
          <div className="col-span-2 flex flex-col gap-1">
            <label className="text-xs font-medium text-[var(--md-on-surface-variant)]">
              Relevant excerpt
            </label>
            <textarea
              className="app-no-drag min-h-[56px] rounded-lg border border-[var(--md-outline-variant)] bg-[var(--md-surface)] px-2.5 py-1.5 text-sm"
              value={draft.excerpt}
              onChange={(e) => setDraft((d) => ({ ...d, excerpt: e.target.value }))}
            />
          </div>
          <div className="col-span-2 flex flex-col gap-1">
            <label className="text-xs font-medium text-[var(--md-on-surface-variant)]">
              What this proves
            </label>
            <textarea
              className="app-no-drag min-h-[56px] rounded-lg border border-[var(--md-outline-variant)] bg-[var(--md-surface)] px-2.5 py-1.5 text-sm"
              value={draft.provesWhat}
              onChange={(e) => setDraft((d) => ({ ...d, provesWhat: e.target.value }))}
            />
          </div>
          <div className="col-span-2 flex flex-col gap-1">
            <label className="text-xs font-medium text-[var(--md-on-surface-variant)]">Notes</label>
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
    <div className="flex flex-col gap-2 rounded-xl border border-[var(--md-outline-variant)] bg-[var(--md-surface-container)] px-4 py-3">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate text-sm font-medium">{item.title}</p>
          <p className="truncate text-xs text-[var(--md-on-surface-variant)]">
            {[item.source, item.publicationInfo].filter(Boolean).join(' · ') || 'No source noted'}
          </p>
        </div>
        <div className="flex flex-shrink-0 gap-1">
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
              <Button
                variant="text"
                className="!px-2.5 !py-1 text-xs"
                onClick={() => setEditing(true)}
              >
                Edit
              </Button>
              <Button
                variant="text"
                className="!px-2.5 !py-1 text-xs text-[var(--md-error)]"
                onClick={() => setConfirmDelete(true)}
              >
                Delete
              </Button>
            </>
          )}
        </div>
      </div>

      {item.url && (
        <a
          href={item.url}
          target="_blank"
          rel="noreferrer"
          className="truncate text-xs text-[var(--md-primary)] hover:underline"
        >
          {item.url}
        </a>
      )}
      {item.excerpt && (
        <p className="text-xs italic text-[var(--md-on-surface-variant)]">“{item.excerpt}”</p>
      )}
      {item.provesWhat && (
        <p className="text-xs">
          <span className="font-medium">Proves: </span>
          {item.provesWhat}
        </p>
      )}
      {item.notes && <p className="text-xs text-[var(--md-on-surface-variant)]">{item.notes}</p>}

      {onTagsChanged && (
        <TagEditor
          clientId={item.clientId}
          entityType="evidence_items"
          entityId={item.id}
          tags={tags}
          onChange={onTagsChanged}
        />
      )}

      <div className="flex items-center gap-2 pt-1">
        {item.documentId ? (
          <>
            {isPdf ? (
              <Button
                variant="text"
                className="!px-2.5 !py-1 text-xs"
                onClick={() => setViewing(true)}
              >
                View attached PDF
              </Button>
            ) : (
              <Button variant="text" className="!px-2.5 !py-1 text-xs" onClick={openFile}>
                Open attached file
              </Button>
            )}
            <Button
              variant="text"
              className="!px-2.5 !py-1 text-xs"
              onClick={removeFile}
              disabled={busy}
            >
              Remove file
            </Button>
          </>
        ) : (
          <Button
            variant="text"
            className="!px-2.5 !py-1 text-xs"
            onClick={attachFile}
            disabled={busy}
          >
            + Attach screenshot/PDF
          </Button>
        )}
        <span className="ml-auto text-[10px] text-[var(--md-on-surface-variant)]">
          Added {formatRelativeDate(item.createdAt)}
        </span>
      </div>

      <BacklinksPanel clientId={item.clientId} entityType="evidence_items" entityId={item.id} />
      {viewing && item.documentId && (
        <PdfViewerModal
          documentId={item.documentId}
          label={item.title}
          onClose={() => setViewing(false)}
        />
      )}
    </div>
  )
}
