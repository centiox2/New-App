import { useCallback, useEffect, useState } from 'react'
import type { ChecklistDocument, ReviewSummary } from '@shared/ipc-types'
import { Button } from '../components/ui/Button'
import { PdfViewerModal } from '../components/pdf/PdfViewerModal'
import { isPdfFilePath } from '../lib/format'

function StatTile({
  label,
  value,
  tone = 'neutral'
}: {
  label: string
  value: number
  tone?: 'neutral' | 'red' | 'yellow' | 'green'
}): React.JSX.Element {
  const toneVar =
    tone === 'red'
      ? 'var(--status-red)'
      : tone === 'yellow'
        ? 'var(--status-yellow)'
        : tone === 'green'
          ? 'var(--status-green)'
          : 'var(--md-on-surface)'
  return (
    <div className="flex flex-col gap-0.5 rounded-xl border border-[var(--md-outline-variant)] bg-[var(--md-surface-container)] px-4 py-3">
      <span className="text-2xl font-semibold tabular-nums" style={{ color: toneVar }}>
        {value}
      </span>
      <span className="text-xs text-[var(--md-on-surface-variant)]">{label}</span>
    </div>
  )
}

export function ReviewStage({ clientId }: { clientId: string }): React.JSX.Element {
  const [summary, setSummary] = useState<ReviewSummary | null>(null)
  const [checklist, setChecklist] = useState<ChecklistDocument | null>(null)
  const [loading, setLoading] = useState(true)
  const [uploading, setUploading] = useState(false)
  const [viewingChecklist, setViewingChecklist] = useState(false)

  const refresh = useCallback(async () => {
    setLoading(true)
    try {
      const [summaryRow, checklistRow] = await Promise.all([
        window.api.review.getSummary(clientId),
        window.api.checklist.get(clientId)
      ])
      setSummary(summaryRow)
      setChecklist(checklistRow)
    } finally {
      setLoading(false)
    }
  }, [clientId])

  useEffect(() => {
    // Data fetch on mount / client change — intentional, not a derived-state sync.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    refresh()
  }, [refresh])

  async function uploadChecklist(): Promise<void> {
    setUploading(true)
    try {
      const row = await window.api.checklist.upload(clientId)
      if (row) setChecklist(row)
    } finally {
      setUploading(false)
    }
  }

  async function removeChecklist(): Promise<void> {
    if (!checklist) return
    await window.api.checklist.remove(checklist.id)
    setChecklist(null)
  }

  if (loading || !summary) {
    return <p className="text-sm text-[var(--md-on-surface-variant)]">Loading…</p>
  }

  const v = summary.verification

  return (
    <div className="flex h-full max-w-3xl flex-col gap-8 overflow-y-auto pb-8">
      <section className="flex flex-col gap-3">
        <div>
          <h2 className="text-base font-semibold">Case completeness</h2>
          <p className="mt-0.5 text-xs text-[var(--md-on-surface-variant)]">
            A live snapshot — not a substitute for reading the case, but a quick check for gaps
            before finalizing.
          </p>
        </div>

        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <StatTile label="Documents" value={summary.documentsCount} />
          <StatTile label="Evidence items" value={summary.evidenceCount} />
          <StatTile label="GSR sections" value={summary.gsr.sectionCount} />
          <StatTile label="Key statements" value={summary.gsr.statementCount} />
        </div>

        <h3 className="mt-2 text-sm font-medium">Verification</h3>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <StatTile label="Flagged" value={v.flaggedCount} />
          <StatTile
            label="Not started"
            value={v.notStartedCount}
            tone={v.notStartedCount > 0 ? 'red' : 'neutral'}
          />
          <StatTile
            label="Pending"
            value={v.pendingCount}
            tone={v.pendingCount > 0 ? 'yellow' : 'neutral'}
          />
          <StatTile label="Verified" value={v.verifiedCount} tone="green" />
        </div>
        {v.couldNotVerifyCount > 0 && (
          <p className="text-xs text-[var(--status-red)]">
            {v.couldNotVerifyCount} item{v.couldNotVerifyCount === 1 ? '' : 's'} could not be
            verified — review on the Verification tab.
          </p>
        )}

        {summary.gsr.emptySectionTitles.length > 0 && (
          <div className="rounded-lg bg-[var(--status-yellow-bg)] px-3 py-2 text-xs text-[var(--status-yellow)]">
            <strong>Empty sections:</strong> {summary.gsr.emptySectionTitles.join(', ')}
          </div>
        )}

        {summary.gsr.unsupportedStatements.length > 0 && (
          <div className="flex flex-col gap-1.5 rounded-lg bg-[var(--status-red-bg)] px-3 py-2 text-xs text-[var(--status-red)]">
            <strong>
              {summary.gsr.unsupportedStatements.length} unsupported statement
              {summary.gsr.unsupportedStatements.length === 1 ? '' : 's'} (no evidence linked):
            </strong>
            <ul className="list-disc pl-4">
              {summary.gsr.unsupportedStatements.map((s) => (
                <li key={s.id}>
                  {s.text} <span className="opacity-70">— {s.sectionTitle}</span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </section>

      <section className="flex flex-col gap-3">
        <div>
          <h2 className="text-base font-semibold">GSR checklist</h2>
          <p className="mt-0.5 text-xs text-[var(--md-on-surface-variant)]">
            Upload your checklist so it&apos;s ready here — AI-based compliance scoring against it
            will appear once an AI provider is configured in Settings.
          </p>
        </div>

        {checklist ? (
          <div className="flex items-center justify-between rounded-xl border border-[var(--md-outline-variant)] bg-[var(--md-surface-container)] px-4 py-3">
            <div className="min-w-0">
              <p className="truncate text-sm font-medium">{checklist.document.label}</p>
              <p className="text-xs text-[var(--md-on-surface-variant)]">
                Compliance scoring not yet available — no AI provider configured
              </p>
            </div>
            <div className="flex flex-shrink-0 gap-1">
              <Button
                variant="text"
                className="!px-2.5 !py-1 text-xs"
                onClick={() =>
                  isPdfFilePath(checklist.document.filePath)
                    ? setViewingChecklist(true)
                    : window.api.documents.open(checklist.sourceDocumentId)
                }
              >
                Open
              </Button>
              <Button
                variant="text"
                className="!px-2.5 !py-1 text-xs text-[var(--md-error)]"
                onClick={removeChecklist}
              >
                Remove
              </Button>
            </div>
          </div>
        ) : (
          <Button
            variant="tonal"
            className="self-start"
            onClick={uploadChecklist}
            disabled={uploading}
          >
            {uploading ? 'Uploading…' : '+ Upload checklist (PDF)'}
          </Button>
        )}
      </section>
      {viewingChecklist && checklist && (
        <PdfViewerModal
          documentId={checklist.sourceDocumentId}
          label={checklist.document.label}
          onClose={() => setViewingChecklist(false)}
        />
      )}
    </div>
  )
}
