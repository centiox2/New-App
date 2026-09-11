import { useState } from 'react'
import { Dialog } from './ui/Dialog'
import { TextField } from './ui/TextField'
import { Button } from './ui/Button'
import type { ClientWithProgress } from '@shared/ipc-types'

export function DeleteClientDialog({
  client,
  onClose,
  onConfirm
}: {
  client: ClientWithProgress | null
  onClose: () => void
  onConfirm: () => Promise<void>
}): React.JSX.Element {
  const [confirmText, setConfirmText] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const matches = client !== null && confirmText.trim() === client.fullName

  async function handleConfirm(): Promise<void> {
    setSubmitting(true)
    try {
      await onConfirm()
      setConfirmText('')
      onClose()
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Dialog
      open={client !== null}
      onClose={() => {
        setConfirmText('')
        onClose()
      }}
      title="Delete client"
      footer={
        <>
          <Button variant="text" onClick={onClose}>
            Cancel
          </Button>
          <Button variant="danger" disabled={!matches || submitting} onClick={handleConfirm}>
            Delete permanently
          </Button>
        </>
      }
    >
      <p className="text-sm text-[var(--md-on-surface-variant)]">
        This permanently deletes <strong>{client?.fullName}</strong> and every piece of information,
        document, verification record, evidence item, and GSR draft in their workspace. This cannot
        be undone.
      </p>
      <TextField
        label={`Type "${client?.fullName ?? ''}" to confirm`}
        value={confirmText}
        onChange={(e) => setConfirmText(e.target.value)}
        autoFocus
      />
    </Dialog>
  )
}
