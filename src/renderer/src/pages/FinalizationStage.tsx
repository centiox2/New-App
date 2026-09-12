import { useCallback, useEffect, useState } from 'react'
import type { ExportResult, GsrDocumentStatus, MergeResult } from '@shared/ipc-types'
import { Button } from '../components/ui/Button'

const STATUS_OPTIONS: { value: GsrDocumentStatus; label: string }[] = [
  { value: 'drafting', label: 'Drafting' },
  { value: 'in_review', label: 'In Review' },
  { value: 'finalized', label: 'Finalized' }
]

function ResultBanner({
  result,
  onDismiss
}: {
  result: ExportResult | MergeResult
  onDismiss: () => void
}): React.JSX.Element {
  const merge = result as MergeResult
  return (
    <div className="flex items-center justify-between gap-3 rounded-xl border border-[var(--md-primary)] bg-[var(--md-primary-container)] px-4 py-3 text-sm text-[var(--md-on-primary-container)]">
      <div>
        <p className="font-medium">Saved {result.filename}</p>
        {typeof merge.mergedCount === 'number' && (
          <p className="text-xs opacity-90">
            {merge.mergedCount} PDF{merge.mergedCount === 1 ? '' : 's'} merged
            {merge.skippedCount > 0
              ? `, ${merge.skippedCount} skipped (not a PDF, or missing)`
              : ''}
          </p>
        )}
      </div>
      <div className="flex flex-shrink-0 gap-2">
        <Button
          variant="text"
          className="!px-2.5 !py-1 text-xs"
          onClick={() => window.api.finalization.revealFile(result.path)}
        >
          Show file
        </Button>
        <Button variant="text" className="!px-2.5 !py-1 text-xs" onClick={onDismiss}>
          Dismiss
        </Button>
      </div>
    </div>
  )
}

export function FinalizationStage({ clientId }: { clientId: string }): React.JSX.Element {
  const [status, setStatus] = useState<GsrDocumentStatus>('drafting')
  const [loading, setLoading] = useState(true)
  const [busyAction, setBusyAction] = useState<string | null>(null)
  const [lastResult, setLastResult] = useState<ExportResult | MergeResult | null>(null)
  const [actionError, setActionError] = useState<string | null>(null)

  const refresh = useCallback(async () => {
    setLoading(true)
    try {
      const s = await window.api.finalization.getStatus(clientId)
      setStatus(s)
    } finally {
      setLoading(false)
    }
  }, [clientId])

  useEffect(() => {
    // Data fetch on mount / client change — intentional, not a derived-state sync.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    refresh()
  }, [refresh])

  async function updateStatus(next: GsrDocumentStatus): Promise<void> {
    const updated = await window.api.finalization.setStatus(clientId, next)
    setStatus(updated)
  }

  async function run(action: string, fn: () => Promise<ExportResult | MergeResult>): Promise<void> {
    setBusyAction(action)
    setActionError(null)
    try {
      const result = await fn()
      setLastResult(result)
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'Something went wrong.')
    } finally {
      setBusyAction(null)
    }
  }

  if (loading) {
    return <p className="text-sm text-[var(--md-on-surface-variant)]">Loading…</p>
  }

  return (
    <div className="flex h-full max-w-2xl flex-col gap-8 overflow-y-auto pb-8">
      <section className="flex flex-col gap-3">
        <div>
          <h2 className="text-base font-semibold">GSR status</h2>
          <p className="mt-0.5 text-xs text-[var(--md-on-surface-variant)]">
            Tracks where the GSR document itself is in its lifecycle.
          </p>
        </div>
        <div className="flex gap-1.5">
          {STATUS_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              onClick={() => updateStatus(opt.value)}
              className={`app-no-drag rounded-full px-3.5 py-1.5 text-xs font-medium transition-colors ${
                status === opt.value
                  ? 'bg-[var(--md-primary-container)] text-[var(--md-on-primary-container)]'
                  : 'border border-[var(--md-outline-variant)] text-[var(--md-on-surface-variant)] hover:bg-[var(--md-surface-container-high)]'
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </section>

      <section className="flex flex-col gap-3">
        <div>
          <h2 className="text-base font-semibold">Export GSR</h2>
          <p className="mt-0.5 text-xs text-[var(--md-on-surface-variant)]">
            Saved into this client&apos;s exports folder, ready to send or print.
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="tonal"
            onClick={() => run('word', () => window.api.finalization.exportWord(clientId))}
            disabled={busyAction !== null}
          >
            {busyAction === 'word' ? 'Exporting…' : 'Export as Word (.docx)'}
          </Button>
          <Button
            variant="tonal"
            onClick={() => run('pdf', () => window.api.finalization.exportPdf(clientId))}
            disabled={busyAction !== null}
          >
            {busyAction === 'pdf' ? 'Exporting…' : 'Export as PDF'}
          </Button>
        </div>
      </section>

      <section className="flex flex-col gap-3">
        <div>
          <h2 className="text-base font-semibold">Evidence pack</h2>
          <p className="mt-0.5 text-xs text-[var(--md-on-surface-variant)]">
            Merges every current PDF document in this case into one file, in category order. Other
            file types (images, Word docs) are skipped — merge those in manually if needed.
          </p>
        </div>
        <Button
          variant="tonal"
          className="self-start"
          onClick={() => run('merge', () => window.api.finalization.mergeEvidencePack(clientId))}
          disabled={busyAction !== null}
        >
          {busyAction === 'merge' ? 'Merging…' : 'Merge into one PDF'}
        </Button>
      </section>

      {actionError && (
        <div className="rounded-xl border border-[var(--status-red)] bg-[var(--status-red-bg)] px-4 py-3 text-sm text-[var(--status-red)]">
          {actionError}
        </div>
      )}

      {lastResult && <ResultBanner result={lastResult} onDismiss={() => setLastResult(null)} />}

      <Button
        variant="text"
        className="self-start text-xs"
        onClick={() => window.api.finalization.openExportsFolder(clientId)}
      >
        Open exports folder
      </Button>
    </div>
  )
}
