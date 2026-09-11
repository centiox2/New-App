import { useState } from 'react'
import type { EvidenceItem, GsrStatementWithEvidence } from '@shared/ipc-types'
import { Button } from '../ui/Button'

export function GsrStatementList({
  statements,
  availableEvidence,
  onAdd,
  onUpdate,
  onDelete,
  onLinkEvidence,
  onUnlinkEvidence
}: {
  statements: GsrStatementWithEvidence[]
  availableEvidence: EvidenceItem[]
  onAdd: (text: string) => void
  onUpdate: (id: string, text: string) => void
  onDelete: (id: string) => void
  onLinkEvidence: (statementId: string, evidenceItemId: string) => void
  onUnlinkEvidence: (statementId: string, linkId: string) => void
}): React.JSX.Element {
  const [newText, setNewText] = useState('')
  const [pickerFor, setPickerFor] = useState<string | null>(null)

  function submitAdd(): void {
    if (!newText.trim()) return
    onAdd(newText.trim())
    setNewText('')
  }

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium">Key statements</span>
        <span className="text-xs text-[var(--md-on-surface-variant)]">
          Claims worth tracking evidence against
        </span>
      </div>

      {statements.length === 0 && (
        <p className="text-xs text-[var(--md-on-surface-variant)]">
          No key statements yet — add a factual claim from this section to link the evidence that
          supports it.
        </p>
      )}

      {statements.map((s) => {
        const linkedIds = new Set(s.evidence.map((e) => e.evidence.id))
        const linkable = availableEvidence.filter((e) => !linkedIds.has(e.id))
        return (
          <div key={s.id} className="rounded-lg border border-[var(--md-outline-variant)] p-3">
            <div className="flex items-start justify-between gap-2">
              <StatementText text={s.text} onSave={(text) => onUpdate(s.id, text)} />
              <button
                className="app-no-drag flex-shrink-0 text-xs text-[var(--md-error)] hover:underline"
                onClick={() => onDelete(s.id)}
              >
                Delete
              </button>
            </div>

            <div className="mt-2 flex flex-wrap items-center gap-1.5">
              {s.evidence.map(({ linkId, evidence }) => (
                <span
                  key={linkId}
                  className="flex items-center gap-1 rounded-full bg-[var(--md-secondary-container)] px-2.5 py-1 text-[11px] text-[var(--md-on-secondary-container)]"
                >
                  {evidence.title}
                  <button
                    className="app-no-drag opacity-70 hover:opacity-100"
                    onClick={() => onUnlinkEvidence(s.id, linkId)}
                    aria-label={`Unlink ${evidence.title}`}
                  >
                    ✕
                  </button>
                </span>
              ))}

              {pickerFor === s.id ? (
                <select
                  autoFocus
                  className="app-no-drag rounded-full border border-[var(--md-outline-variant)] bg-[var(--md-surface)] px-2 py-1 text-[11px]"
                  onChange={(e) => {
                    if (e.target.value) onLinkEvidence(s.id, e.target.value)
                    setPickerFor(null)
                  }}
                  onBlur={() => setPickerFor(null)}
                  defaultValue=""
                >
                  <option value="" disabled>
                    Select evidence…
                  </option>
                  {linkable.map((e) => (
                    <option key={e.id} value={e.id}>
                      {e.title}
                    </option>
                  ))}
                </select>
              ) : (
                <button
                  className="app-no-drag rounded-full border border-dashed border-[var(--md-outline-variant)] px-2.5 py-1 text-[11px] text-[var(--md-on-surface-variant)] hover:border-[var(--md-primary)] hover:text-[var(--md-primary)]"
                  onClick={() => setPickerFor(s.id)}
                  disabled={linkable.length === 0}
                >
                  + Link evidence
                </button>
              )}
            </div>
          </div>
        )
      })}

      <div className="flex gap-2">
        <input
          className="app-no-drag flex-1 rounded-lg border border-[var(--md-outline-variant)] bg-[var(--md-surface)] px-3 py-2 text-sm"
          placeholder="Add a key statement/claim…"
          value={newText}
          onChange={(e) => setNewText(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && submitAdd()}
        />
        <Button variant="tonal" onClick={submitAdd}>
          Add
        </Button>
      </div>
    </div>
  )
}

function StatementText({
  text,
  onSave
}: {
  text: string
  onSave: (text: string) => void
}): React.JSX.Element {
  const [editing, setEditing] = useState(false)
  const [value, setValue] = useState(text)

  if (editing) {
    return (
      <input
        autoFocus
        className="app-no-drag flex-1 rounded-lg border border-[var(--md-primary)] bg-[var(--md-surface)] px-2 py-1 text-sm"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onBlur={() => {
          setEditing(false)
          if (value.trim() && value !== text) onSave(value.trim())
        }}
        onKeyDown={(e) => e.key === 'Enter' && e.currentTarget.blur()}
      />
    )
  }
  return (
    <button
      className="app-no-drag flex-1 text-left text-sm hover:underline"
      onClick={() => setEditing(true)}
      title="Click to edit"
    >
      {text}
    </button>
  )
}
