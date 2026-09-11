import { useCallback, useEffect, useState } from 'react'
import type { VerifiableItem, VerificationRecord } from '@shared/ipc-types'
import { Button } from '../components/ui/Button'
import { EmptyState } from '../components/ui/EmptyState'
import { VerificationStatusBadge } from '../components/verification/VerificationStatusBadge'
import { VerificationRecordDialog } from '../components/verification/VerificationRecordDialog'

const KNOWN_ENTITY_TYPES = new Set([
  'education_entries',
  'english_test_scores',
  'employment_entries',
  'income_sources'
])

export function VerificationStage({ clientId }: { clientId: string }): React.JSX.Element {
  const [items, setItems] = useState<VerifiableItem[]>([])
  const [records, setRecords] = useState<VerificationRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [dialogState, setDialogState] = useState<{
    record: VerificationRecord | null
    subject: { entityType: string; entityId: string; whatIsBeingVerified: string } | null
  } | null>(null)

  const refresh = useCallback(async () => {
    setLoading(true)
    try {
      const [itemRows, recordRows] = await Promise.all([
        window.api.verification.itemsNeedingVerification(clientId),
        window.api.verification.list(clientId)
      ])
      setItems(itemRows)
      setRecords(recordRows)
    } finally {
      setLoading(false)
    }
  }, [clientId])

  useEffect(() => {
    // Data fetch on mount / client change — intentional, not a derived-state sync.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    refresh()
  }, [refresh])

  const manualRecords = records.filter((r) => !KNOWN_ENTITY_TYPES.has(r.subjectEntityType))

  function openForItem(item: VerifiableItem): void {
    setDialogState({
      record: item.verificationRecord,
      subject: item.verificationRecord
        ? null
        : { entityType: item.entityType, entityId: item.entityId, whatIsBeingVerified: item.label }
    })
  }

  function openForRecord(record: VerificationRecord): void {
    setDialogState({ record, subject: null })
  }

  function openNewManual(): void {
    setDialogState({
      record: null,
      subject: { entityType: 'manual', entityId: crypto.randomUUID(), whatIsBeingVerified: '' }
    })
  }

  function handleSaved(saved: VerificationRecord): void {
    setRecords((prev) => {
      const exists = prev.some((r) => r.id === saved.id)
      return exists ? prev.map((r) => (r.id === saved.id ? saved : r)) : [saved, ...prev]
    })
    setItems((prev) =>
      prev.map((it) =>
        it.entityType === saved.subjectEntityType && it.entityId === saved.subjectEntityId
          ? { ...it, verificationRecord: saved }
          : it
      )
    )
  }

  function handleDeleted(id: string): void {
    setRecords((prev) => prev.filter((r) => r.id !== id))
    setItems((prev) =>
      prev.map((it) =>
        it.verificationRecord?.id === id ? { ...it, verificationRecord: null } : it
      )
    )
  }

  if (loading) {
    return <p className="text-sm text-[var(--md-on-surface-variant)]">Loading…</p>
  }

  return (
    <div className="flex h-full max-w-3xl flex-col gap-8 overflow-y-auto pb-8">
      <section className="flex flex-col gap-3">
        <div>
          <h2 className="text-base font-semibold">Flagged for verification</h2>
          <p className="mt-0.5 text-xs text-[var(--md-on-surface-variant)]">
            Information entries marked &quot;requires verification&quot; on the Client &amp;
            Information tab.
          </p>
        </div>
        {items.length === 0 ? (
          <EmptyState
            title="Nothing flagged yet"
            description="Mark a field as requiring verification on the Client & Information tab and it will appear here."
          />
        ) : (
          <div className="flex flex-col gap-2">
            {items.map((item) => (
              <div
                key={`${item.entityType}:${item.entityId}`}
                className="flex items-center justify-between gap-3 rounded-xl border border-[var(--md-outline-variant)] bg-[var(--md-surface-container)] px-4 py-3"
              >
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium">{item.label}</p>
                  {item.subtitle && (
                    <p className="truncate text-xs text-[var(--md-on-surface-variant)]">
                      {item.subtitle}
                    </p>
                  )}
                </div>
                <div className="flex flex-shrink-0 items-center gap-2">
                  <VerificationStatusBadge status={item.verificationRecord?.status ?? null} />
                  <Button
                    variant="text"
                    className="!px-2.5 !py-1 text-xs"
                    onClick={() => openForItem(item)}
                  >
                    {item.verificationRecord ? 'View' : 'Start'}
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      <section className="flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-base font-semibold">Other verification records</h2>
            <p className="mt-0.5 text-xs text-[var(--md-on-surface-variant)]">
              For things not tied to a specific field — a transaction, a business, a claim.
            </p>
          </div>
          <Button variant="tonal" onClick={openNewManual}>
            + Add verification record
          </Button>
        </div>
        {manualRecords.length === 0 ? (
          <EmptyState title="No standalone verification records yet" />
        ) : (
          <div className="flex flex-col gap-2">
            {manualRecords.map((r) => (
              <div
                key={r.id}
                className="flex items-center justify-between gap-3 rounded-xl border border-[var(--md-outline-variant)] bg-[var(--md-surface-container)] px-4 py-3"
              >
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium">
                    {r.whatIsBeingVerified || '(untitled)'}
                  </p>
                  {r.reason && (
                    <p className="truncate text-xs text-[var(--md-on-surface-variant)]">
                      {r.reason}
                    </p>
                  )}
                </div>
                <div className="flex flex-shrink-0 items-center gap-2">
                  <VerificationStatusBadge status={r.status} />
                  <Button
                    variant="text"
                    className="!px-2.5 !py-1 text-xs"
                    onClick={() => openForRecord(r)}
                  >
                    View
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {dialogState && (
        <VerificationRecordDialog
          open={dialogState !== null}
          clientId={clientId}
          record={dialogState.record}
          subject={dialogState.subject}
          onClose={() => setDialogState(null)}
          onSaved={handleSaved}
          onDeleted={handleDeleted}
        />
      )}
    </div>
  )
}
