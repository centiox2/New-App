import { useCallback, useEffect, useState } from 'react'
import { Navigate, NavLink, useNavigate, useParams } from 'react-router-dom'
import type { ClientStatus, ClientWithProgress, WorkflowStage } from '@shared/ipc-types'
import { StatusBadge } from '../components/ui/StatusBadge'
import { STAGE_LABELS, STAGE_ORDER, formatDate } from '../lib/format'
import { InformationStage } from './InformationStage'
import { DocumentsStage } from './DocumentsStage'
import { VerificationStage } from './VerificationStage'
import { EvidenceStage } from './EvidenceStage'
import { GsrWritingStage } from './GsrWritingStage'
import { ReviewStage } from './ReviewStage'
import { FinalizationStage } from './FinalizationStage'
import { QuickSwitcher } from '../components/search/QuickSwitcher'
import { GraphView } from '../components/graph/GraphView'
import { ClientTabs } from '../components/layout/ClientTabs'
import {
  clearLastSession,
  loadLastSession,
  loadTabs,
  removeTab,
  saveLastSession,
  saveTabs,
  upsertTab,
  type ClientTab
} from '../lib/session'

const STATUS_OPTIONS: ClientStatus[] = ['red', 'yellow', 'green']

export function ClientWorkspace(): React.JSX.Element {
  const { clientId, stage } = useParams<{ clientId: string; stage?: WorkflowStage }>()
  const navigate = useNavigate()
  const [client, setClient] = useState<ClientWithProgress | null>(null)
  const [loading, setLoading] = useState(true)
  const [showGraph, setShowGraph] = useState(false)
  const [tabs, setTabs] = useState<ClientTab[]>(() => loadTabs())

  const refresh = useCallback(async () => {
    if (!clientId) return
    setLoading(true)
    try {
      const row = await window.api.clients.get(clientId)
      setClient(row)
    } finally {
      setLoading(false)
    }
  }, [clientId])

  useEffect(() => {
    // Data fetch on mount / clientId change — intentional, not a derived-state sync.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    refresh()
    if (clientId) window.api.clients.recordVisit(clientId)
  }, [refresh, clientId])

  // Keep the open-tabs strip in sync — add the current client the first time
  // it is opened, refresh its display name afterwards.

  useEffect(() => {
    if (!client) return
    const next = upsertTab(loadTabs(), { clientId: client.id, fullName: client.fullName })
    saveTabs(next)
    // Deliberate effect-to-external-store sync (localStorage-backed tab strip).
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setTabs(next)
  }, [client])

  // Remember where you were, so the dashboard can offer "continue".
  useEffect(() => {
    if (clientId && stage) saveLastSession({ clientId, stage })
  }, [clientId, stage])

  // If the client no longer exists (deleted while its tab was open), drop the
  // dead tab and any stale resume shortcut pointing at it.
  useEffect(() => {
    if (loading || client || !clientId) return
    const next = removeTab(loadTabs(), clientId)
    saveTabs(next)
    // Clean up the tab strip when a client no longer exists.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setTabs(next)
    const session = loadLastSession()
    if (session?.clientId === clientId) clearLastSession()
  }, [loading, client, clientId])

  // Workspace shortcuts: 1-7 jump to a stage, G toggles the graph view.
  // Ignored while typing in a field (never clashes with data entry).
  useEffect(() => {
    const onKey = (e: KeyboardEvent): void => {
      const target = e.target as HTMLElement | null
      if (target && target.closest('input, textarea, select, [contenteditable="true"]')) return
      if (e.metaKey || e.ctrlKey || e.altKey) return
      if (e.key === 'g' || e.key === 'G') {
        setShowGraph((v) => !v)
        return
      }
      const index = Number(e.key)
      if (index >= 1 && index <= STAGE_ORDER.length) {
        e.preventDefault()
        navigate(`/clients/${clientId}/${STAGE_ORDER[index - 1]}`)
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [clientId, navigate])

  if (!clientId) return <Navigate to="/" replace />

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center text-sm opacity-60">Loading…</div>
    )
  }

  if (!client) {
    return (
      <div className="flex h-screen flex-col items-center justify-center gap-4">
        <p className="text-sm text-[var(--md-on-surface-variant)]">Client not found.</p>
        <button
          className="text-sm text-[var(--md-primary)] underline"
          onClick={() => navigate('/')}
        >
          Back to dashboard
        </button>
      </div>
    )
  }

  if (!stage) {
    return <Navigate to={`/clients/${clientId}/information`} replace />
  }

  async function updateStatus(status: ClientStatus): Promise<void> {
    if (!client) return
    const updated = await window.api.clients.update({ id: client.id, status })
    setClient(updated)
  }

  async function updateStage(currentStage: WorkflowStage): Promise<void> {
    if (!client) return
    const updated = await window.api.clients.update({ id: client.id, currentStage })
    setClient(updated)
  }

  function handleSelectTab(tabId: string): void {
    if (tabId === clientId) return
    navigate(`/clients/${tabId}`)
  }

  function handleCloseTab(tabId: string): void {
    const next = removeTab(loadTabs(), tabId)
    saveTabs(next)
    setTabs(next)
    // Closing the tab you're currently looking at returns to the dashboard.
    if (tabId === clientId) navigate('/')
  }

  return (
    <div className="flex h-screen flex-col" style={{ backgroundColor: 'var(--md-surface)' }}>
      <ClientTabs
        tabs={tabs}
        activeClientId={clientId}
        onSelect={handleSelectTab}
        onClose={handleCloseTab}
      />
      <div className="flex min-h-0 flex-1">
        <aside
          className="flex w-64 flex-shrink-0 flex-col gap-1 border-r border-[var(--md-outline-variant)] p-4"
          style={{ backgroundColor: 'var(--md-surface-container)' }}
        >
          <button
            className="app-drag-region mb-4 flex items-center gap-1.5 self-start text-sm text-[var(--md-on-surface-variant)] hover:text-[var(--md-on-surface)]"
            onClick={() => navigate('/')}
          >
            ← All clients
          </button>

          <div className="mb-4">
            <h2 className="text-base font-semibold">{client.fullName}</h2>
            <div className="mt-2 flex flex-wrap gap-1">
              {STATUS_OPTIONS.map((s) => (
                <button
                  key={s}
                  onClick={() => updateStatus(s)}
                  className={`rounded-full transition-opacity ${client.status === s ? '' : 'opacity-40 hover:opacity-70'}`}
                >
                  <StatusBadge status={s} compact />
                </button>
              ))}
            </div>
            <p className="mt-2 text-xs text-[var(--md-on-surface-variant)]">
              Target intake: {formatDate(client.targetIntakeDate)}
            </p>
          </div>

          <nav className="flex flex-col gap-1">
            {STAGE_ORDER.map((s, i) => (
              <NavLink
                key={s}
                to={`/clients/${clientId}/${s}`}
                className={({ isActive }) =>
                  `flex items-center gap-2 rounded-lg px-3 py-2 text-sm transition-colors ${
                    isActive
                      ? 'bg-[var(--md-primary-container)] text-[var(--md-on-primary-container)] font-medium'
                      : 'text-[var(--md-on-surface-variant)] hover:bg-[var(--md-surface-container-high)]'
                  }`
                }
              >
                <span className="text-xs opacity-60">{i + 1}</span>
                {STAGE_LABELS[s]}
              </NavLink>
            ))}
          </nav>

          <p className="mt-2 text-[10px] text-[var(--md-on-surface-variant)]">
            Ctrl/Cmd+K search · 1–7 stages · G graph · ? help
          </p>
          <button
            className="app-no-drag mt-1 self-start text-[10px] text-[var(--md-primary)] hover:underline"
            onClick={() => setShowGraph(true)}
          >
            🕸 Graph view
          </button>

          <div className="mt-auto pt-4">
            <label className="text-xs text-[var(--md-on-surface-variant)]">
              Current stage (overall)
            </label>
            <select
              className="mt-1 w-full rounded-lg border border-[var(--md-outline-variant)] bg-[var(--md-surface)] px-2 py-1.5 text-xs"
              value={client.currentStage}
              onChange={(e) => updateStage(e.target.value as WorkflowStage)}
            >
              {STAGE_ORDER.map((s) => (
                <option key={s} value={s}>
                  {STAGE_LABELS[s]}
                </option>
              ))}
            </select>
          </div>
        </aside>

        <main className="flex-1 overflow-y-auto p-8">
          {stage === 'information' ? (
            <InformationStage clientId={clientId} />
          ) : stage === 'documents' ? (
            <DocumentsStage clientId={clientId} />
          ) : stage === 'verification' ? (
            <VerificationStage clientId={clientId} />
          ) : stage === 'evidence' ? (
            <EvidenceStage clientId={clientId} />
          ) : stage === 'writing' ? (
            <GsrWritingStage clientId={clientId} />
          ) : stage === 'review' ? (
            <ReviewStage clientId={clientId} />
          ) : (
            <FinalizationStage clientId={clientId} />
          )}
        </main>
      </div>

      <QuickSwitcher clientId={clientId} />
      {showGraph && <GraphView clientId={clientId} onClose={() => setShowGraph(false)} />}
    </div>
  )
}
