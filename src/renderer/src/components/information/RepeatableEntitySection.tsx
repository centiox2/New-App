import { useCallback, useEffect, useState } from 'react'
import type { CustomFields } from '@shared/ipc-types'
import { Button } from '../ui/Button'
import { EmptyState } from '../ui/EmptyState'
import { CustomFieldsEditor } from './CustomFieldsEditor'

export interface FieldConfig {
  key: string
  label: string
  type: 'text' | 'date' | 'textarea' | 'select'
  options?: { value: string; label: string }[]
  fullWidth?: boolean
}

export interface KeyValueFieldConfig {
  key: string
  heading: string
  hint?: string
  addLabel?: string
}

type Entry = { id: string; customFields?: CustomFields | null; requiresVerification?: boolean }

/** Field values are looked up dynamically by titleField/subtitleField key. */
function asRecord(entry: Entry): Record<string, unknown> {
  return entry as unknown as Record<string, unknown>
}

interface EntityApi<T> {
  list: (parentId: string) => Promise<T[]>
  create: (parentId: string, data: Partial<T>) => Promise<T>
  update: (id: string, data: Partial<T>) => Promise<T>
  delete: (id: string) => Promise<{ ok: true }>
}

export function RepeatableEntitySection<T extends Entry>({
  title,
  description,
  parentId,
  fields,
  keyValueFields = [],
  hasVerification = false,
  titleField,
  subtitleField,
  emptyLabel,
  addLabel,
  api
}: {
  title: string
  description?: string
  parentId: string
  fields: FieldConfig[]
  keyValueFields?: KeyValueFieldConfig[]
  hasVerification?: boolean
  titleField: string
  subtitleField?: string
  emptyLabel: string
  addLabel: string
  api: EntityApi<T>
}): React.JSX.Element {
  const [items, setItems] = useState<T[]>([])
  const [loading, setLoading] = useState(true)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [draft, setDraft] = useState<Record<string, unknown>>({})
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null)

  const refresh = useCallback(async () => {
    setLoading(true)
    try {
      const rows = await api.list(parentId)
      setItems(rows)
    } finally {
      setLoading(false)
    }
  }, [api, parentId])

  useEffect(() => {
    // Data fetch on mount / parent change — intentional, not a derived-state sync.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    refresh()
    setEditingId(null)
  }, [refresh])

  function startEdit(item: T): void {
    setDraft({ ...item, customFields: item.customFields ?? {} })
    setEditingId(item.id)
  }

  function startAdd(): void {
    const blank: Record<string, unknown> = { customFields: {} }
    for (const kv of keyValueFields) blank[kv.key] = {}
    if (hasVerification) blank.requiresVerification = false
    setDraft(blank)
    setEditingId('new')
  }

  async function save(): Promise<void> {
    if (editingId === 'new') {
      const created = await api.create(parentId, draft as Partial<T>)
      setItems((prev) => [...prev, created])
    } else if (editingId) {
      const updated = await api.update(editingId, draft as Partial<T>)
      setItems((prev) => prev.map((it) => (it.id === editingId ? updated : it)))
    }
    setEditingId(null)
  }

  async function remove(id: string): Promise<void> {
    await api.delete(id)
    setItems((prev) => prev.filter((it) => it.id !== id))
    setConfirmDeleteId(null)
  }

  return (
    <section className="flex flex-col gap-4">
      <div>
        <h2 className="text-base font-semibold">{title}</h2>
        {description && (
          <p className="mt-0.5 text-xs text-[var(--md-on-surface-variant)]">{description}</p>
        )}
      </div>

      <div className="flex flex-col gap-3">
        {loading ? (
          <p className="text-sm text-[var(--md-on-surface-variant)]">Loading…</p>
        ) : items.length === 0 && editingId !== 'new' ? (
          <EmptyState
            title={emptyLabel}
            action={
              <Button variant="tonal" onClick={startAdd}>
                {addLabel}
              </Button>
            }
          />
        ) : (
          items.map((item) =>
            editingId === item.id ? (
              <EntryForm
                key={item.id}
                fields={fields}
                keyValueFields={keyValueFields}
                hasVerification={hasVerification}
                draft={draft}
                setDraft={setDraft}
                onCancel={() => setEditingId(null)}
                onSave={save}
              />
            ) : (
              <div
                key={item.id}
                className="flex items-start justify-between gap-3 rounded-xl border border-[var(--md-outline-variant)] bg-[var(--md-surface-container)] px-4 py-3"
              >
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <p className="truncate text-sm font-medium">
                      {(asRecord(item)[titleField] as string) || '(untitled)'}
                    </p>
                    {hasVerification && item.requiresVerification && (
                      <span className="flex-shrink-0 rounded-full bg-[var(--status-yellow-bg)] px-2 py-0.5 text-[10px] font-semibold text-[var(--status-yellow)]">
                        Needs verification
                      </span>
                    )}
                  </div>
                  {subtitleField && asRecord(item)[subtitleField] != null && (
                    <p className="truncate text-xs text-[var(--md-on-surface-variant)]">
                      {String(asRecord(item)[subtitleField])}
                    </p>
                  )}
                </div>
                <div className="flex flex-shrink-0 gap-1">
                  {confirmDeleteId === item.id ? (
                    <>
                      <Button
                        variant="danger"
                        className="!px-2.5 !py-1 text-xs"
                        onClick={() => remove(item.id)}
                      >
                        Confirm delete
                      </Button>
                      <Button
                        variant="text"
                        className="!px-2.5 !py-1 text-xs"
                        onClick={() => setConfirmDeleteId(null)}
                      >
                        Cancel
                      </Button>
                    </>
                  ) : (
                    <>
                      <Button
                        variant="text"
                        className="!px-2.5 !py-1 text-xs"
                        onClick={() => startEdit(item)}
                      >
                        Edit
                      </Button>
                      <Button
                        variant="text"
                        className="!px-2.5 !py-1 text-xs text-[var(--md-error)]"
                        onClick={() => setConfirmDeleteId(item.id)}
                      >
                        Delete
                      </Button>
                    </>
                  )}
                </div>
              </div>
            )
          )
        )}

        {editingId === 'new' && (
          <EntryForm
            fields={fields}
            keyValueFields={keyValueFields}
            hasVerification={hasVerification}
            draft={draft}
            setDraft={setDraft}
            onCancel={() => setEditingId(null)}
            onSave={save}
          />
        )}

        {items.length > 0 && editingId === null && (
          <Button variant="tonal" className="self-start" onClick={startAdd}>
            {addLabel}
          </Button>
        )}
      </div>
    </section>
  )
}

function EntryForm({
  fields,
  keyValueFields,
  hasVerification,
  draft,
  setDraft,
  onCancel,
  onSave
}: {
  fields: FieldConfig[]
  keyValueFields: KeyValueFieldConfig[]
  hasVerification: boolean
  draft: Record<string, unknown>
  setDraft: (updater: (prev: Record<string, unknown>) => Record<string, unknown>) => void
  onCancel: () => void
  onSave: () => void | Promise<void>
}): React.JSX.Element {
  function setField(key: string, value: unknown): void {
    setDraft((prev) => ({ ...prev, [key]: value }))
  }

  return (
    <div className="flex flex-col gap-3 rounded-xl border border-[var(--md-primary)] bg-[var(--md-surface-container)] p-4">
      <div className="grid grid-cols-2 gap-3">
        {fields.map((f) => (
          <div key={f.key} className={`flex flex-col gap-1 ${f.fullWidth ? 'col-span-2' : ''}`}>
            <label className="text-xs font-medium text-[var(--md-on-surface-variant)]">
              {f.label}
            </label>
            {f.type === 'textarea' ? (
              <textarea
                className="app-no-drag min-h-[64px] rounded-lg border border-[var(--md-outline-variant)] bg-[var(--md-surface)] px-2.5 py-1.5 text-sm"
                value={(draft[f.key] as string) ?? ''}
                onChange={(e) => setField(f.key, e.target.value)}
              />
            ) : f.type === 'select' ? (
              <select
                className="app-no-drag rounded-lg border border-[var(--md-outline-variant)] bg-[var(--md-surface)] px-2.5 py-1.5 text-sm"
                value={(draft[f.key] as string) ?? ''}
                onChange={(e) => setField(f.key, e.target.value)}
              >
                <option value="">—</option>
                {(f.options ?? []).map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </select>
            ) : (
              <input
                type={f.type}
                className="app-no-drag rounded-lg border border-[var(--md-outline-variant)] bg-[var(--md-surface)] px-2.5 py-1.5 text-sm"
                value={(draft[f.key] as string) ?? ''}
                onChange={(e) => setField(f.key, e.target.value)}
              />
            )}
          </div>
        ))}
      </div>

      {keyValueFields.map((kv) => (
        <CustomFieldsEditor
          key={kv.key}
          heading={kv.heading}
          hint={kv.hint}
          addLabel={kv.addLabel}
          value={(draft[kv.key] as CustomFields) ?? {}}
          onChange={(next) => setField(kv.key, next)}
        />
      ))}

      <CustomFieldsEditor
        value={(draft.customFields as CustomFields) ?? {}}
        onChange={(next) => setField('customFields', next)}
      />

      {hasVerification && (
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={Boolean(draft.requiresVerification)}
            onChange={(e) => setField('requiresVerification', e.target.checked)}
          />
          This information needs verification
        </label>
      )}

      <div className="flex justify-end gap-2 pt-1">
        <Button variant="text" onClick={onCancel}>
          Cancel
        </Button>
        <Button onClick={onSave}>Save</Button>
      </div>
    </div>
  )
}
