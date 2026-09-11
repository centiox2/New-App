import { useState, type FormEvent } from 'react'
import { Dialog } from './ui/Dialog'
import { TextField } from './ui/TextField'
import { Button } from './ui/Button'

export function AddClientDialog({
  open,
  onClose,
  onCreate
}: {
  open: boolean
  onClose: () => void
  onCreate: (input: { fullName: string; targetIntakeDate: string | null }) => Promise<void>
}): React.JSX.Element {
  const [fullName, setFullName] = useState('')
  const [targetIntakeDate, setTargetIntakeDate] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  function reset(): void {
    setFullName('')
    setTargetIntakeDate('')
    setError(null)
  }

  async function handleSubmit(e: FormEvent): Promise<void> {
    e.preventDefault()
    if (!fullName.trim()) {
      setError('Client name is required.')
      return
    }
    setSubmitting(true)
    try {
      await onCreate({ fullName: fullName.trim(), targetIntakeDate: targetIntakeDate || null })
      reset()
      onClose()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to add client.')
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
      title="Add client"
      footer={
        <>
          <Button variant="text" onClick={onClose} type="button">
            Cancel
          </Button>
          <Button type="submit" form="add-client-form" disabled={submitting}>
            Add client
          </Button>
        </>
      }
    >
      <form id="add-client-form" onSubmit={handleSubmit} className="flex flex-col gap-4">
        <TextField
          label="Full name"
          autoFocus
          value={fullName}
          onChange={(e) => setFullName(e.target.value)}
        />
        <TextField
          label="Target intake date (optional)"
          type="date"
          value={targetIntakeDate}
          onChange={(e) => setTargetIntakeDate(e.target.value)}
        />
        {error && <p className="text-sm text-[var(--md-error)]">{error}</p>}
      </form>
    </Dialog>
  )
}
