import type { CustomFields } from '@shared/ipc-types'
import { Button } from '../ui/Button'

/**
 * Editor for the "add custom field" extensibility described in spec §5 —
 * a simple label/value list on top of a section's fixed schema.
 */
export function CustomFieldsEditor({
  value,
  onChange,
  heading = 'Custom fields',
  hint = 'Nothing not covered by the fields above? Add one.',
  addLabel = '+ Add field'
}: {
  value: CustomFields
  onChange: (next: CustomFields) => void
  heading?: string
  hint?: string
  addLabel?: string
}): React.JSX.Element {
  const entries = Object.entries(value)

  function updateEntry(index: number, label: string, val: string): void {
    const next: CustomFields = {}
    entries.forEach(([k, v], i) => {
      if (i === index) next[label] = val
      else next[k] = v
    })
    onChange(next)
  }

  function removeEntry(index: number): void {
    const next: CustomFields = {}
    entries.forEach(([k, v], i) => {
      if (i !== index) next[k] = v
    })
    onChange(next)
  }

  function addEntry(): void {
    let label = 'New field'
    let n = 1
    while (label in value) {
      n += 1
      label = `New field ${n}`
    }
    onChange({ ...value, [label]: '' })
  }

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium text-[var(--md-on-surface-variant)]">{heading}</span>
        <button
          type="button"
          className="app-no-drag text-xs font-medium text-[var(--md-primary)] hover:underline"
          onClick={addEntry}
        >
          {addLabel}
        </button>
      </div>
      {entries.length === 0 && (
        <p className="text-xs text-[var(--md-on-surface-variant)]">{hint}</p>
      )}
      {entries.map(([label, val], i) => (
        <div key={i} className="flex gap-2">
          <input
            className="app-no-drag w-2/5 rounded-lg border border-[var(--md-outline-variant)] bg-[var(--md-surface)] px-2.5 py-1.5 text-xs"
            value={label}
            placeholder="Field name"
            onChange={(e) => updateEntry(i, e.target.value, val)}
          />
          <input
            className="app-no-drag flex-1 rounded-lg border border-[var(--md-outline-variant)] bg-[var(--md-surface)] px-2.5 py-1.5 text-xs"
            value={val}
            placeholder="Value"
            onChange={(e) => updateEntry(i, label, e.target.value)}
          />
          <Button
            type="button"
            variant="text"
            className="!px-2 !py-1 text-xs"
            onClick={() => removeEntry(i)}
            aria-label={`Remove ${label}`}
          >
            ✕
          </Button>
        </div>
      ))}
    </div>
  )
}
