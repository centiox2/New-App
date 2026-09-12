import { useCallback, useEffect, useState } from 'react'
import type { CustomFields, IncomeSource, Sponsor } from '@shared/ipc-types'
import { Button } from '../ui/Button'
import { EmptyState } from '../ui/EmptyState'
import { CustomFieldsEditor } from './CustomFieldsEditor'
import { RepeatableEntitySection } from './RepeatableEntitySection'
import { BacklinksPanel } from '../links/BacklinksPanel'

const INCOME_TYPE_OPTIONS = [
  { value: 'salary', label: 'Salary' },
  { value: 'business', label: 'Business' },
  { value: 'property', label: 'Property' },
  { value: 'other', label: 'Other' }
]

/**
 * §5 Financial/Sponsor — multiple sponsors per client, each with multiple
 * income/asset sources (confirmed). Not built on RepeatableEntitySection
 * directly because each sponsor card also nests its own income-sources
 * sub-list.
 */
export function SponsorsSection({ clientId }: { clientId: string }): React.JSX.Element {
  const [sponsors, setSponsors] = useState<Sponsor[]>([])
  const [loading, setLoading] = useState(true)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [draft, setDraft] = useState<Partial<Sponsor>>({})
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null)

  const refresh = useCallback(async () => {
    setLoading(true)
    try {
      const rows = await window.api.information.sponsor.list(clientId)
      setSponsors(rows)
    } finally {
      setLoading(false)
    }
  }, [clientId])

  useEffect(() => {
    // Data fetch on mount / client change — intentional, not a derived-state sync.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    refresh()
  }, [refresh])

  function startAdd(): void {
    setDraft({ customFields: {} })
    setEditingId('new')
  }
  function startEdit(s: Sponsor): void {
    setDraft({ ...s, customFields: s.customFields ?? {} })
    setEditingId(s.id)
  }
  async function save(): Promise<void> {
    if (editingId === 'new') {
      const created = await window.api.information.sponsor.create(clientId, draft)
      setSponsors((prev) => [...prev, created])
    } else if (editingId) {
      const updated = await window.api.information.sponsor.update(editingId, draft)
      setSponsors((prev) => prev.map((s) => (s.id === editingId ? updated : s)))
    }
    setEditingId(null)
  }
  async function remove(id: string): Promise<void> {
    await window.api.information.sponsor.delete(id)
    setSponsors((prev) => prev.filter((s) => s.id !== id))
    setConfirmDeleteId(null)
  }

  return (
    <section className="flex flex-col gap-4">
      <div>
        <h2 className="text-base font-semibold">Financial / Sponsor</h2>
        <p className="mt-0.5 text-xs text-[var(--md-on-surface-variant)]">
          A case can have more than one sponsor — each with their own income and asset sources,
          documents, and verification.
        </p>
      </div>

      {loading ? (
        <p className="text-sm text-[var(--md-on-surface-variant)]">Loading…</p>
      ) : sponsors.length === 0 && editingId !== 'new' ? (
        <EmptyState
          title="No sponsors added yet"
          action={
            <Button variant="tonal" onClick={startAdd}>
              + Add sponsor
            </Button>
          }
        />
      ) : (
        <div className="flex flex-col gap-4">
          {sponsors.map((s) =>
            editingId === s.id ? (
              <SponsorForm
                key={s.id}
                draft={draft}
                setDraft={setDraft}
                onCancel={() => setEditingId(null)}
                onSave={save}
              />
            ) : (
              <div
                key={s.id}
                className="rounded-xl border border-[var(--md-outline-variant)] bg-[var(--md-surface-container)] p-4"
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-sm font-medium">{s.name}</p>
                    {s.relationshipToClient && (
                      <p className="text-xs text-[var(--md-on-surface-variant)]">
                        {s.relationshipToClient}
                      </p>
                    )}
                  </div>
                  <div className="flex flex-shrink-0 gap-1">
                    {confirmDeleteId === s.id ? (
                      <>
                        <Button
                          variant="danger"
                          className="!px-2.5 !py-1 text-xs"
                          onClick={() => remove(s.id)}
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
                          onClick={() => startEdit(s)}
                        >
                          Edit
                        </Button>
                        <Button
                          variant="text"
                          className="!px-2.5 !py-1 text-xs text-[var(--md-error)]"
                          onClick={() => setConfirmDeleteId(s.id)}
                        >
                          Delete
                        </Button>
                      </>
                    )}
                  </div>
                </div>

                <div className="mt-3">
                  <BacklinksPanel clientId={clientId} entityType="sponsors" entityId={s.id} />
                </div>

                <div className="mt-4 border-l-2 border-[var(--md-outline-variant)] pl-4">
                  <RepeatableEntitySection<IncomeSource>
                    title="Income & asset sources"
                    parentId={s.id}
                    clientId={clientId}
                    entityType="income_sources"
                    hasVerification
                    titleField="description"
                    subtitleField="amount"
                    emptyLabel="No income or asset sources added yet"
                    addLabel="+ Add income/asset source"
                    fields={[
                      { key: 'type', label: 'Type', type: 'select', options: INCOME_TYPE_OPTIONS },
                      { key: 'description', label: 'Description', type: 'text', fullWidth: true },
                      { key: 'amount', label: 'Amount', type: 'text' }
                    ]}
                    api={window.api.information.incomeSource}
                  />
                </div>
              </div>
            )
          )}

          {editingId === 'new' && (
            <SponsorForm
              draft={draft}
              setDraft={setDraft}
              onCancel={() => setEditingId(null)}
              onSave={save}
            />
          )}

          {sponsors.length > 0 && editingId === null && (
            <Button variant="tonal" className="self-start" onClick={startAdd}>
              + Add sponsor
            </Button>
          )}
        </div>
      )}
    </section>
  )
}

function SponsorForm({
  draft,
  setDraft,
  onCancel,
  onSave
}: {
  draft: Partial<Sponsor>
  setDraft: (updater: (prev: Partial<Sponsor>) => Partial<Sponsor>) => void
  onCancel: () => void
  onSave: () => void | Promise<void>
}): React.JSX.Element {
  return (
    <div className="flex flex-col gap-3 rounded-xl border border-[var(--md-primary)] bg-[var(--md-surface-container)] p-4">
      <div className="grid grid-cols-2 gap-3">
        <div className="flex flex-col gap-1">
          <label className="text-xs font-medium text-[var(--md-on-surface-variant)]">Name</label>
          <input
            className="app-no-drag rounded-lg border border-[var(--md-outline-variant)] bg-[var(--md-surface)] px-2.5 py-1.5 text-sm"
            value={draft.name ?? ''}
            onChange={(e) => setDraft((p) => ({ ...p, name: e.target.value }))}
          />
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-xs font-medium text-[var(--md-on-surface-variant)]">
            Relationship to client
          </label>
          <input
            className="app-no-drag rounded-lg border border-[var(--md-outline-variant)] bg-[var(--md-surface)] px-2.5 py-1.5 text-sm"
            value={draft.relationshipToClient ?? ''}
            onChange={(e) => setDraft((p) => ({ ...p, relationshipToClient: e.target.value }))}
          />
        </div>
        <div className="col-span-2 flex flex-col gap-1">
          <label className="text-xs font-medium text-[var(--md-on-surface-variant)]">
            Contact information
          </label>
          <input
            className="app-no-drag rounded-lg border border-[var(--md-outline-variant)] bg-[var(--md-surface)] px-2.5 py-1.5 text-sm"
            value={draft.contactInfo ?? ''}
            onChange={(e) => setDraft((p) => ({ ...p, contactInfo: e.target.value }))}
          />
        </div>
      </div>

      <CustomFieldsEditor
        value={draft.customFields ?? {}}
        onChange={(next: CustomFields) => setDraft((p) => ({ ...p, customFields: next }))}
      />

      <div className="flex justify-end gap-2 pt-1">
        <Button variant="text" onClick={onCancel}>
          Cancel
        </Button>
        <Button onClick={onSave}>Save</Button>
      </div>
    </div>
  )
}
