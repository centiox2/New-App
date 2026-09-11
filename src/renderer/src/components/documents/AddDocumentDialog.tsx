import { useState } from 'react'
import type { CreateDocumentInput, DocumentCategory, PickedFile } from '@shared/ipc-types'
import { Dialog } from '../ui/Dialog'
import { TextField } from '../ui/TextField'
import { Button } from '../ui/Button'
import { DOCUMENT_CATEGORY_LABELS, DOCUMENT_CATEGORY_ORDER } from '../../lib/format'

export function AddDocumentDialog({
  open,
  clientId,
  defaultCategory,
  onClose,
  onCreated
}: {
  open: boolean
  clientId: string
  defaultCategory?: DocumentCategory
  onClose: () => void
  onCreated: (doc: Awaited<ReturnType<typeof window.api.documents.create>>) => void
}): React.JSX.Element {
  const [picked, setPicked] = useState<PickedFile | null>(null)
  const [label, setLabel] = useState('')
  const [category, setCategory] = useState<DocumentCategory>(defaultCategory ?? 'other')
  const [customCategory, setCustomCategory] = useState('')
  const [notes, setNotes] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  function reset(): void {
    setPicked(null)
    setLabel('')
    setCategory(defaultCategory ?? 'other')
    setCustomCategory('')
    setNotes('')
    setError(null)
  }

  async function handlePick(): Promise<void> {
    const file = await window.api.documents.pickFile()
    if (!file) return
    setPicked(file)
    if (!label) setLabel(file.suggestedLabel)
  }

  async function handleSubmit(): Promise<void> {
    if (!picked) {
      setError('Choose a file first.')
      return
    }
    if (!label.trim()) {
      setError('Label is required.')
      return
    }
    setSubmitting(true)
    try {
      const input: CreateDocumentInput = {
        clientId,
        category,
        customCategory: category === 'other' ? customCategory || null : null,
        label: label.trim(),
        notes: notes || null,
        sourcePath: picked.sourcePath
      }
      const doc = await window.api.documents.create(input)
      onCreated(doc)
      reset()
      onClose()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to add document.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Dialog
      open={open}
      onClose={() => {
        reset()
        onClose()
      }}
      title="Add document"
      footer={
        <>
          <Button variant="text" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={submitting}>
            Add document
          </Button>
        </>
      }
    >
      <div className="flex flex-col gap-4">
        <div className="flex items-center gap-3">
          <Button type="button" variant="outlined" onClick={handlePick}>
            Choose file…
          </Button>
          <span className="truncate text-xs text-[var(--md-on-surface-variant)]">
            {picked ? picked.sourcePath.split(/[/\\]/).pop() : 'No file chosen'}
          </span>
        </div>

        <TextField label="Label" value={label} onChange={(e) => setLabel(e.target.value)} />

        <div className="flex flex-col gap-1.5">
          <label className="text-sm font-medium text-[var(--md-on-surface-variant)]">
            Category
          </label>
          <select
            className="app-no-drag rounded-lg border border-[var(--md-outline-variant)] bg-[var(--md-surface)] px-3 py-2 text-sm"
            value={category}
            onChange={(e) => setCategory(e.target.value as DocumentCategory)}
          >
            {DOCUMENT_CATEGORY_ORDER.map((c) => (
              <option key={c} value={c}>
                {DOCUMENT_CATEGORY_LABELS[c]}
              </option>
            ))}
          </select>
        </div>

        {category === 'other' && (
          <TextField
            label="Custom category label"
            value={customCategory}
            onChange={(e) => setCustomCategory(e.target.value)}
          />
        )}

        <div className="flex flex-col gap-1.5">
          <label className="text-sm font-medium text-[var(--md-on-surface-variant)]">
            Notes / context
          </label>
          <textarea
            className="app-no-drag min-h-[64px] rounded-lg border border-[var(--md-outline-variant)] bg-[var(--md-surface)] px-3 py-2 text-sm"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
          />
        </div>

        {error && <p className="text-sm text-[var(--md-error)]">{error}</p>}
      </div>
    </Dialog>
  )
}
