import { useCallback, useEffect, useState } from 'react'
import type {
  DocumentInformationLink,
  InformationEntityOption,
  InformationEntityType
} from '@shared/ipc-types'
import { Button } from '../ui/Button'

const ENTITY_TYPE_OPTIONS: { value: InformationEntityType; label: string }[] = [
  { value: 'personal_profiles', label: 'Personal profile' },
  { value: 'education_entries', label: 'Education' },
  { value: 'english_test_scores', label: 'English test' },
  { value: 'australian_study_entries', label: 'Australian study' },
  { value: 'employment_entries', label: 'Employment' },
  { value: 'immigration_history_entries', label: 'Immigration history' },
  { value: 'sponsors', label: 'Sponsor' },
  { value: 'income_sources', label: 'Income / asset source' }
]

/**
 * Document-to-information linking UI (schema already supported this via
 * document_information_links — this is the first UI for it). Lets a
 * document be tied to the specific information entries it evidences, e.g.
 * a payslip linked to one employment entry rather than just filed under
 * "Employment" documents.
 */
export function LinkedInformationSection({
  clientId,
  documentId
}: {
  clientId: string
  documentId: string
}): React.JSX.Element {
  const [links, setLinks] = useState<DocumentInformationLink[]>([])
  const [loading, setLoading] = useState(true)
  const [adding, setAdding] = useState(false)
  const [entityType, setEntityType] = useState<InformationEntityType>('education_entries')
  const [options, setOptions] = useState<InformationEntityOption[]>([])
  const [optionsLoading, setOptionsLoading] = useState(false)
  const [selectedEntityId, setSelectedEntityId] = useState('')

  const refresh = useCallback(async () => {
    setLoading(true)
    try {
      setLinks(await window.api.links.listForDocument(documentId))
    } finally {
      setLoading(false)
    }
  }, [documentId])

  useEffect(() => {
    // Data fetch on mount / doc change — intentional, not a derived-state sync.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    refresh()
  }, [refresh])

  useEffect(() => {
    if (!adding) return
    let cancelled = false
    // Data fetch on opening the picker / entity-type change — intentional, not a derived-state sync.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setOptionsLoading(true)
    setSelectedEntityId('')
    window.api.links
      .listInformationOptions(clientId, entityType)
      .then((rows) => {
        if (!cancelled) setOptions(rows)
      })
      .finally(() => {
        if (!cancelled) setOptionsLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [adding, clientId, entityType])

  async function addLink(): Promise<void> {
    if (!selectedEntityId) return
    const created = await window.api.links.linkDocumentToInformation({
      documentId,
      entityType,
      entityId: selectedEntityId
    })
    setLinks((prev) => [...prev, created])
    setAdding(false)
  }

  async function removeLink(linkId: string): Promise<void> {
    await window.api.links.unlinkDocumentInformation(linkId)
    setLinks((prev) => prev.filter((l) => l.linkId !== linkId))
  }

  if (loading) return <p className="text-xs text-[var(--md-on-surface-variant)]">Loading links…</p>

  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex items-center justify-between">
        <p className="text-xs font-medium text-[var(--md-on-surface-variant)]">
          Linked information ({links.length})
        </p>
        {!adding && (
          <button
            className="app-no-drag text-xs text-[var(--md-primary)] hover:underline"
            onClick={() => setAdding(true)}
          >
            + Link to information
          </button>
        )}
      </div>

      {links.length === 0 && !adding && (
        <p className="text-xs text-[var(--md-on-surface-variant)]">
          Not linked to a specific information entry yet.
        </p>
      )}

      {links.length > 0 && (
        <div className="flex flex-col gap-1">
          {links.map((link) => (
            <div
              key={link.linkId}
              className="flex items-center justify-between gap-2 rounded-lg border border-[var(--md-outline-variant)] px-2.5 py-1.5 text-xs"
            >
              <span className="min-w-0 truncate">
                {link.label}
                {link.subtitle && (
                  <span className="text-[var(--md-on-surface-variant)]"> — {link.subtitle}</span>
                )}
              </span>
              <button
                className="app-no-drag flex-shrink-0 hover:text-[var(--md-error)]"
                onClick={() => removeLink(link.linkId)}
              >
                Unlink
              </button>
            </div>
          ))}
        </div>
      )}

      {adding && (
        <div className="flex flex-col gap-2 rounded-lg border border-[var(--md-primary)] p-2.5">
          <select
            className="app-no-drag rounded-lg border border-[var(--md-outline-variant)] bg-[var(--md-surface)] px-2 py-1.5 text-xs"
            value={entityType}
            onChange={(e) => setEntityType(e.target.value as InformationEntityType)}
          >
            {ENTITY_TYPE_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
          <select
            className="app-no-drag rounded-lg border border-[var(--md-outline-variant)] bg-[var(--md-surface)] px-2 py-1.5 text-xs"
            value={selectedEntityId}
            onChange={(e) => setSelectedEntityId(e.target.value)}
            disabled={optionsLoading}
          >
            <option value="">
              {optionsLoading
                ? 'Loading…'
                : options.length === 0
                  ? 'No entries found'
                  : 'Select entry…'}
            </option>
            {options.map((o) => (
              <option key={o.entityId} value={o.entityId}>
                {o.label}
                {o.subtitle ? ` — ${o.subtitle}` : ''}
              </option>
            ))}
          </select>
          <div className="flex justify-end gap-2">
            <Button
              variant="text"
              className="!px-2.5 !py-1 text-xs"
              onClick={() => setAdding(false)}
            >
              Cancel
            </Button>
            <Button
              className="!px-2.5 !py-1 text-xs"
              onClick={addLink}
              disabled={!selectedEntityId}
            >
              Link
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}
