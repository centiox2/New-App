import { useState } from 'react'
import type { EntityTag, TaggableEntityType } from '@shared/ipc-types'

/** Inline add/remove tag chips for one entity — documents, evidence items, or GSR statements. */
export function TagEditor({
  clientId,
  entityType,
  entityId,
  tags,
  onChange
}: {
  clientId: string
  entityType: TaggableEntityType
  entityId: string
  tags: EntityTag[]
  onChange: (tags: EntityTag[]) => void
}): React.JSX.Element {
  const [adding, setAdding] = useState(false)
  const [value, setValue] = useState('')

  async function submit(): Promise<void> {
    const label = value.trim()
    setAdding(false)
    setValue('')
    if (!label || tags.some((t) => t.label === label)) return
    const created = await window.api.tags.add({ clientId, entityType, entityId, label })
    onChange([...tags, created])
  }

  async function remove(tagId: string): Promise<void> {
    await window.api.tags.remove(tagId)
    onChange(tags.filter((t) => t.tagId !== tagId))
  }

  return (
    <div className="flex flex-wrap items-center gap-1">
      {tags.map((t) => (
        <span
          key={t.tagId}
          className="flex items-center gap-1 rounded-full bg-[var(--md-secondary-container)] px-2 py-0.5 text-[10px] text-[var(--md-on-secondary-container)]"
        >
          {t.label}
          <button
            className="app-no-drag opacity-70 hover:opacity-100"
            onClick={() => remove(t.tagId)}
            aria-label={`Remove tag ${t.label}`}
          >
            ✕
          </button>
        </span>
      ))}
      {adding ? (
        <input
          autoFocus
          className="app-no-drag w-24 rounded-full border border-[var(--md-outline-variant)] bg-[var(--md-surface)] px-2 py-0.5 text-[10px]"
          placeholder="Tag…"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && submit()}
          onBlur={submit}
        />
      ) : (
        <button
          className="app-no-drag rounded-full border border-dashed border-[var(--md-outline-variant)] px-2 py-0.5 text-[10px] text-[var(--md-on-surface-variant)] hover:border-[var(--md-primary)] hover:text-[var(--md-primary)]"
          onClick={() => setAdding(true)}
        >
          + tag
        </button>
      )}
    </div>
  )
}
