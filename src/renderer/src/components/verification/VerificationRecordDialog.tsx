import { useCallback, useEffect, useState } from 'react'
import type { DocumentRecord, VerificationRecord, VerificationStatus } from '@shared/ipc-types'
import { Dialog } from '../ui/Dialog'
import { TextField } from '../ui/TextField'
import { Button } from '../ui/Button'
import { formatDate } from '../../lib/format'

const STATUS_OPTIONS: { value: VerificationStatus; label: string }[] = [
  { value: 'not_required', label: 'Not Required' },
  { value: 'pending', label: 'Pending' },
  { value: 'verified', label: 'Verified' },
  { value: 'could_not_verify', label: 'Could Not Verify' }
]

interface Subject {
  entityType: string
  entityId: string
  whatIsBeingVerified: string
}

export function VerificationRecordDialog({
  open,
  clientId,
  record,
  subject,
  onClose,
  onSaved,
  onDeleted
}: {
  open: boolean
  clientId: string
  /** Set when editing an existing record. */
  record: VerificationRecord | null
  /** Set when creating a new record tied to a flagged information entry. */
  subject: Subject | null
  onClose: () => void
  onSaved: (record: VerificationRecord) => void
  onDeleted?: (id: string) => void
}): React.JSX.Element {
  const [draft, setDraft] = useState<Partial<VerificationRecord>>({})
  const [saving, setSaving] = useState(false)
  const [linkedDocs, setLinkedDocs] = useState<{ document: DocumentRecord; linkId: string }[]>([])
  const [attaching, setAttaching] = useState(false)

  const loadLinkedDocs = useCallback(async (recordId: string) => {
    const rows = await window.api.verification.listDocuments(recordId)
    setLinkedDocs(rows)
  }, [])

  useEffect(() => {
    if (!open) return
    if (record) {
      // Populating the draft from the opened record, and fetching its
      // correspondence — intentional on-open sync, not derived state.
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setDraft(record)
      loadLinkedDocs(record.id)
    } else if (subject) {
      setDraft({
        subjectEntityType: subject.entityType,
        subjectEntityId: subject.entityId,
        whatIsBeingVerified: subject.whatIsBeingVerified,
        status: 'pending'
      })
      setLinkedDocs([])
    }
  }, [open, record, subject, loadLinkedDocs])

  function setField<K extends keyof VerificationRecord>(
    key: K,
    value: VerificationRecord[K]
  ): void {
    setDraft((prev) => ({ ...prev, [key]: value }))
  }

  async function save(): Promise<void> {
    setSaving(true)
    try {
      let saved: VerificationRecord
      if (record) {
        saved = await window.api.verification.update({ id: record.id, ...draft })
      } else {
        saved = await window.api.verification.create({
          clientId,
          subjectEntityType: draft.subjectEntityType!,
          subjectEntityId: draft.subjectEntityId!,
          whatIsBeingVerified: draft.whatIsBeingVerified ?? '',
          reason: draft.reason,
          contactName: draft.contactName,
          contactDetails: draft.contactDetails,
          method: draft.method,
          dateContacted: draft.dateContacted,
          status: draft.status,
          response: draft.response,
          dateVerified: draft.dateVerified,
          notes: draft.notes
        })
      }
      onSaved(saved)
      onClose()
    } finally {
      setSaving(false)
    }
  }

  async function remove(): Promise<void> {
    if (!record) return
    await window.api.verification.delete(record.id)
    onDeleted?.(record.id)
    onClose()
  }

  async function attachDocument(): Promise<void> {
    if (!record) return
    setAttaching(true)
    try {
      const picked = await window.api.documents.pickFile()
      if (!picked) return
      const doc = await window.api.documents.create({
        clientId,
        category: 'verification_correspondence',
        label: picked.suggestedLabel,
        sourcePath: picked.sourcePath
      })
      await window.api.verification.linkDocument({
        verificationRecordId: record.id,
        documentId: doc.id
      })
      await loadLinkedDocs(record.id)
    } finally {
      setAttaching(false)
    }
  }

  async function unlink(linkId: string): Promise<void> {
    await window.api.verification.unlinkDocument(linkId)
    if (record) await loadLinkedDocs(record.id)
  }

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title={record ? 'Verification record' : 'Start verification'}
      footer={
        <>
          {record && (
            <Button variant="text" className="mr-auto text-[var(--md-error)]" onClick={remove}>
              Delete
            </Button>
          )}
          <Button variant="text" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={save} disabled={saving}>
            Save
          </Button>
        </>
      }
    >
      <div className="flex max-h-[60vh] flex-col gap-4 overflow-y-auto pr-1">
        <TextField
          label="What is being verified"
          value={draft.whatIsBeingVerified ?? ''}
          onChange={(e) => setField('whatIsBeingVerified', e.target.value)}
        />
        <div className="flex flex-col gap-1.5">
          <label className="text-sm font-medium text-[var(--md-on-surface-variant)]">
            Why it needs verification
          </label>
          <textarea
            className="app-no-drag min-h-[56px] rounded-lg border border-[var(--md-outline-variant)] bg-[var(--md-surface)] px-3 py-2 text-sm"
            value={draft.reason ?? ''}
            onChange={(e) => setField('reason', e.target.value)}
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <TextField
            label="Who to contact"
            value={draft.contactName ?? ''}
            onChange={(e) => setField('contactName', e.target.value)}
          />
          <TextField
            label="Contact details"
            value={draft.contactDetails ?? ''}
            onChange={(e) => setField('contactDetails', e.target.value)}
          />
          <TextField
            label="Method"
            placeholder="Email, phone, in person…"
            value={draft.method ?? ''}
            onChange={(e) => setField('method', e.target.value)}
          />
          <TextField
            label="Date contacted"
            type="date"
            value={draft.dateContacted ?? ''}
            onChange={(e) => setField('dateContacted', e.target.value)}
          />
        </div>

        <div className="flex flex-col gap-1.5">
          <label className="text-sm font-medium text-[var(--md-on-surface-variant)]">Status</label>
          <select
            className="app-no-drag rounded-lg border border-[var(--md-outline-variant)] bg-[var(--md-surface)] px-3 py-2 text-sm"
            value={draft.status ?? 'pending'}
            onChange={(e) => setField('status', e.target.value as VerificationStatus)}
          >
            {STATUS_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        </div>

        <div className="flex flex-col gap-1.5">
          <label className="text-sm font-medium text-[var(--md-on-surface-variant)]">
            Response
          </label>
          <textarea
            className="app-no-drag min-h-[56px] rounded-lg border border-[var(--md-outline-variant)] bg-[var(--md-surface)] px-3 py-2 text-sm"
            value={draft.response ?? ''}
            onChange={(e) => setField('response', e.target.value)}
          />
        </div>

        <TextField
          label="Date verified"
          type="date"
          value={draft.dateVerified ?? ''}
          onChange={(e) => setField('dateVerified', e.target.value)}
        />

        <div className="flex flex-col gap-1.5">
          <label className="text-sm font-medium text-[var(--md-on-surface-variant)]">Notes</label>
          <textarea
            className="app-no-drag min-h-[56px] rounded-lg border border-[var(--md-outline-variant)] bg-[var(--md-surface)] px-3 py-2 text-sm"
            value={draft.notes ?? ''}
            onChange={(e) => setField('notes', e.target.value)}
          />
        </div>

        {record && (
          <div className="flex flex-col gap-2 border-t border-[var(--md-outline-variant)] pt-3">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Correspondence & evidence</span>
              <Button
                variant="text"
                className="text-xs"
                onClick={attachDocument}
                disabled={attaching}
              >
                + Attach file
              </Button>
            </div>
            {linkedDocs.length === 0 ? (
              <p className="text-xs text-[var(--md-on-surface-variant)]">
                No correspondence attached yet — attach the email thread, voucher, or other
                evidence.
              </p>
            ) : (
              <div className="flex flex-col gap-1.5">
                {linkedDocs.map(({ document, linkId }) => (
                  <div
                    key={linkId}
                    className="flex items-center justify-between rounded-lg border border-[var(--md-outline-variant)] px-3 py-2 text-xs"
                  >
                    <button
                      className="app-no-drag truncate text-left hover:underline"
                      onClick={() => window.api.documents.open(document.id)}
                    >
                      {document.label}
                    </button>
                    <div className="flex flex-shrink-0 items-center gap-2 text-[var(--md-on-surface-variant)]">
                      <span>{formatDate(document.createdAt)}</span>
                      <button
                        className="app-no-drag hover:text-[var(--md-error)]"
                        onClick={() => unlink(linkId)}
                      >
                        Unlink
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </Dialog>
  )
}
