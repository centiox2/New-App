import { useCallback, useEffect, useState } from 'react'
import type { CustomFields, PersonalProfile } from '@shared/ipc-types'
import { Button } from '../ui/Button'
import { CustomFieldsEditor } from './CustomFieldsEditor'
import { BacklinksPanel } from '../links/BacklinksPanel'

const FIELDS: { key: keyof PersonalProfile; label: string; placeholder?: string }[] = [
  { key: 'contactInfo', label: 'Contact information', placeholder: 'Phone, email, address…' },
  {
    key: 'residenceInfo',
    label: 'Residence information',
    placeholder: 'Current residence details'
  },
  { key: 'nextOfKin', label: 'Next of kin' },
  {
    key: 'familyInfo',
    label: 'Family information',
    placeholder: 'Family background relevant to the GSR'
  }
]

export function PersonalProfileSection({ clientId }: { clientId: string }): React.JSX.Element {
  const [profile, setProfile] = useState<PersonalProfile | null>(null)
  const [draft, setDraft] = useState<Partial<PersonalProfile>>({})
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [savedAt, setSavedAt] = useState<number | null>(null)

  const refresh = useCallback(async () => {
    setLoading(true)
    try {
      const row = await window.api.information.personal.get(clientId)
      setProfile(row)
      setDraft(row)
    } finally {
      setLoading(false)
    }
  }, [clientId])

  useEffect(() => {
    // Data fetch on mount / client change — intentional, not a derived-state sync.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    refresh()
  }, [refresh])

  async function save(): Promise<void> {
    setSaving(true)
    try {
      const updated = await window.api.information.personal.update(clientId, draft)
      setProfile(updated)
      setDraft(updated)
      setSavedAt(Date.now())
    } finally {
      setSaving(false)
    }
  }

  if (loading || !profile) {
    return <p className="text-sm text-[var(--md-on-surface-variant)]">Loading…</p>
  }

  const dirty = JSON.stringify(draft) !== JSON.stringify(profile)

  return (
    <section className="flex flex-col gap-4">
      <div>
        <h2 className="text-base font-semibold">Personal</h2>
        <p className="mt-0.5 text-xs text-[var(--md-on-surface-variant)]">
          Name and status live on the client record in the sidebar — this covers the rest of the
          personal profile.
        </p>
      </div>

      <div className="flex flex-col gap-3 rounded-xl border border-[var(--md-outline-variant)] bg-[var(--md-surface-container)] p-4">
        <div className="grid grid-cols-2 gap-3">
          <div className="flex flex-col gap-1">
            <label className="text-xs font-medium text-[var(--md-on-surface-variant)]">
              Date of birth
            </label>
            <input
              type="date"
              className="app-no-drag rounded-lg border border-[var(--md-outline-variant)] bg-[var(--md-surface)] px-2.5 py-1.5 text-sm"
              value={draft.dateOfBirth ?? ''}
              onChange={(e) => setDraft((prev) => ({ ...prev, dateOfBirth: e.target.value }))}
            />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-xs font-medium text-[var(--md-on-surface-variant)]">
              Passport number
            </label>
            <input
              className="app-no-drag rounded-lg border border-[var(--md-outline-variant)] bg-[var(--md-surface)] px-2.5 py-1.5 text-sm"
              value={draft.passportNumber ?? ''}
              onChange={(e) => setDraft((prev) => ({ ...prev, passportNumber: e.target.value }))}
            />
          </div>
          {FIELDS.map((f) => (
            <div key={f.key as string} className="col-span-2 flex flex-col gap-1">
              <label className="text-xs font-medium text-[var(--md-on-surface-variant)]">
                {f.label}
              </label>
              <textarea
                className="app-no-drag min-h-[56px] rounded-lg border border-[var(--md-outline-variant)] bg-[var(--md-surface)] px-2.5 py-1.5 text-sm"
                placeholder={f.placeholder}
                value={(draft[f.key] as string) ?? ''}
                onChange={(e) => setDraft((prev) => ({ ...prev, [f.key]: e.target.value }))}
              />
            </div>
          ))}
        </div>

        <CustomFieldsEditor
          value={(draft.customFields as CustomFields) ?? {}}
          onChange={(next) => setDraft((prev) => ({ ...prev, customFields: next }))}
        />

        <div className="flex items-center justify-end gap-3 pt-1">
          {savedAt && !dirty && (
            <span className="text-xs text-[var(--md-on-surface-variant)]">Saved</span>
          )}
          <Button onClick={save} disabled={!dirty || saving}>
            {saving ? 'Saving…' : 'Save'}
          </Button>
        </div>
      </div>

      <BacklinksPanel clientId={clientId} entityType="personal_profiles" entityId={profile.id} />
    </section>
  )
}
