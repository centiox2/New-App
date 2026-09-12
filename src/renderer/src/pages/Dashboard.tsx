import { useCallback, useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import type {
  ClientStatus,
  ClientSortField,
  ClientWithProgress,
  RecentClient,
  WorkflowStage
} from '@shared/ipc-types'
import { Button } from '../components/ui/Button'
import { EmptyState } from '../components/ui/EmptyState'
import { ClientCard } from '../components/ClientCard'
import { AddClientDialog } from '../components/AddClientDialog'
import { DeleteClientDialog } from '../components/DeleteClientDialog'
import { IntakeCalendarModal } from '../components/IntakeCalendarModal'
import { GlobalQuickSwitcher } from '../components/search/GlobalQuickSwitcher'
import { STAGE_LABELS, formatRelativeDate } from '../lib/format'

const STATUS_FILTERS: { value: ClientStatus; label: string }[] = [
  { value: 'red', label: 'Action Required' },
  { value: 'yellow', label: 'In Progress' },
  { value: 'green', label: 'Ready / Complete' }
]

const SORT_OPTIONS: { value: ClientSortField; label: string }[] = [
  { value: 'updatedAt', label: 'Last updated' },
  { value: 'fullName', label: 'Name' },
  { value: 'targetIntakeDate', label: 'Target intake date' },
  { value: 'status', label: 'Status' }
]

function StatTile({ label, value }: { label: string; value: number }): React.JSX.Element {
  return (
    <div className="flex flex-col gap-0.5 rounded-xl border border-[var(--md-outline-variant)] bg-[var(--md-surface-container)] px-4 py-3">
      <span className="text-2xl font-semibold tabular-nums">{value}</span>
      <span className="text-xs text-[var(--md-on-surface-variant)]">{label}</span>
    </div>
  )
}

export function Dashboard(): React.JSX.Element {
  const navigate = useNavigate()
  const [clients, setClients] = useState<ClientWithProgress[]>([])
  const [allActiveClients, setAllActiveClients] = useState<ClientWithProgress[]>([])
  const [recentClients, setRecentClients] = useState<RecentClient[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<ClientStatus[]>([])
  const [sortField, setSortField] = useState<ClientSortField>('updatedAt')
  const [view, setView] = useState<'active' | 'archived'>('active')
  const [addOpen, setAddOpen] = useState(false)
  const [calendarOpen, setCalendarOpen] = useState(false)
  const [pendingDelete, setPendingDelete] = useState<ClientWithProgress | null>(null)

  const refresh = useCallback(async () => {
    setLoading(true)
    try {
      const [rows, unfiltered, recent] = await Promise.all([
        window.api.clients.list({
          search: search || undefined,
          statusFilter: statusFilter.length ? statusFilter : undefined,
          sortField,
          sortDirection: sortField === 'fullName' ? 'asc' : 'desc',
          includeArchived: view === 'archived'
        }),
        window.api.clients.list({ includeArchived: false }),
        window.api.clients.recentlyViewed(8)
      ])
      setClients(view === 'archived' ? rows.filter((c) => c.archived) : rows)
      setAllActiveClients(unfiltered)
      setRecentClients(recent)
    } finally {
      setLoading(false)
    }
  }, [search, statusFilter, sortField, view])

  useEffect(() => {
    const timeout = setTimeout(refresh, search ? 200 : 0)
    return () => clearTimeout(timeout)
  }, [refresh, search])

  const needsAttentionCount = useMemo(
    () => allActiveClients.filter((c) => c.status === 'red').length,
    [allActiveClients]
  )

  const pinnedClients = useMemo(() => allActiveClients.filter((c) => c.pinned), [allActiveClients])

  const stageCounts = useMemo(() => {
    const counts: Partial<Record<WorkflowStage, number>> = {}
    for (const c of allActiveClients) counts[c.currentStage] = (counts[c.currentStage] ?? 0) + 1
    return counts
  }, [allActiveClients])

  const totalPendingActions = useMemo(
    () => allActiveClients.reduce((sum, c) => sum + c.pendingActionCount, 0),
    [allActiveClients]
  )

  const isFiltering = Boolean(search || statusFilter.length) || view === 'archived'

  function toggleStatusFilter(status: ClientStatus): void {
    setStatusFilter((prev) =>
      prev.includes(status) ? prev.filter((s) => s !== status) : [...prev, status]
    )
  }

  async function handleCreate(input: {
    fullName: string
    targetIntakeDate: string | null
  }): Promise<void> {
    await window.api.clients.create(input)
    await refresh()
  }

  async function handleDelete(): Promise<void> {
    if (!pendingDelete) return
    await window.api.clients.delete(pendingDelete.id)
    await refresh()
  }

  async function togglePin(client: ClientWithProgress): Promise<void> {
    await window.api.clients.update({ id: client.id, pinned: !client.pinned })
    await refresh()
  }

  async function toggleArchive(client: ClientWithProgress): Promise<void> {
    await window.api.clients.update({ id: client.id, archived: !client.archived })
    await refresh()
  }

  return (
    <div
      className="app-drag-region flex h-screen flex-col"
      style={{ backgroundColor: 'var(--md-surface)' }}
    >
      <header className="app-no-drag flex flex-col gap-4 border-b border-[var(--md-outline-variant)] px-8 py-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-semibold">Clients</h1>
            <p className="text-sm text-[var(--md-on-surface-variant)]">
              {allActiveClients.length} total{' '}
              {needsAttentionCount > 0 && (
                <span className="text-[var(--status-red)]">
                  · {needsAttentionCount} need{needsAttentionCount === 1 ? 's' : ''} attention
                </span>
              )}
              {' · Ctrl/Cmd+K to search everyone'}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="tonal" onClick={() => setCalendarOpen(true)}>
              📅 Calendar
            </Button>
            <Button onClick={() => setAddOpen(true)}>+ Add client</Button>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <StatTile label="Active cases" value={allActiveClients.length} />
          <StatTile label="Pending actions" value={totalPendingActions} />
          <StatTile label={`In ${STAGE_LABELS.writing}`} value={stageCounts.writing ?? 0} />
          <StatTile label={STAGE_LABELS.finalization} value={stageCounts.finalization ?? 0} />
        </div>

        <div className="flex items-center gap-1.5">
          <button
            onClick={() => setView('active')}
            className={`app-no-drag rounded-full px-3.5 py-1.5 text-xs font-medium transition-colors ${
              view === 'active'
                ? 'bg-[var(--md-primary-container)] text-[var(--md-on-primary-container)]'
                : 'text-[var(--md-on-surface-variant)] hover:bg-[var(--md-surface-container-high)]'
            }`}
          >
            Active
          </button>
          <button
            onClick={() => setView('archived')}
            className={`app-no-drag rounded-full px-3.5 py-1.5 text-xs font-medium transition-colors ${
              view === 'archived'
                ? 'bg-[var(--md-primary-container)] text-[var(--md-on-primary-container)]'
                : 'text-[var(--md-on-surface-variant)] hover:bg-[var(--md-surface-container-high)]'
            }`}
          >
            Archived
          </button>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <input
            className="app-no-drag min-w-[220px] flex-1 rounded-full border border-[var(--md-outline-variant)] bg-[var(--md-surface)] px-4 py-2 text-sm outline-none focus:border-[var(--md-primary)]"
            placeholder="Search clients…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />

          <div className="flex items-center gap-1.5">
            {STATUS_FILTERS.map((f) => (
              <button
                key={f.value}
                onClick={() => toggleStatusFilter(f.value)}
                className={`app-no-drag rounded-full border px-3 py-1.5 text-xs font-medium transition-colors ${
                  statusFilter.includes(f.value)
                    ? 'border-[var(--md-primary)] bg-[var(--md-primary-container)] text-[var(--md-on-primary-container)]'
                    : 'border-[var(--md-outline-variant)] text-[var(--md-on-surface-variant)]'
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>

          <select
            className="app-no-drag rounded-full border border-[var(--md-outline-variant)] bg-[var(--md-surface)] px-3 py-2 text-xs"
            value={sortField}
            onChange={(e) => setSortField(e.target.value as ClientSortField)}
          >
            {SORT_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                Sort: {opt.label}
              </option>
            ))}
          </select>
        </div>
      </header>

      <main className="flex-1 overflow-y-auto px-8 py-6">
        {!isFiltering && pinnedClients.length > 0 && (
          <section className="mb-6">
            <h2 className="mb-2 text-xs font-semibold uppercase tracking-wide text-[var(--md-on-surface-variant)]">
              📌 Pinned
            </h2>
            <div className="flex flex-wrap gap-2">
              {pinnedClients.map((c) => (
                <button
                  key={c.id}
                  onClick={() => navigate(`/clients/${c.id}`)}
                  className="app-no-drag rounded-full border border-[var(--md-outline-variant)] bg-[var(--md-surface-container)] px-3.5 py-1.5 text-xs font-medium hover:border-[var(--md-primary)]"
                >
                  {c.fullName}
                </button>
              ))}
            </div>
          </section>
        )}

        {!isFiltering && recentClients.length > 0 && (
          <section className="mb-6">
            <h2 className="mb-2 text-xs font-semibold uppercase tracking-wide text-[var(--md-on-surface-variant)]">
              Recently viewed
            </h2>
            <div className="flex flex-wrap gap-2">
              {recentClients.map((c) => (
                <button
                  key={c.clientId}
                  onClick={() => navigate(`/clients/${c.clientId}`)}
                  className="app-no-drag rounded-full border border-[var(--md-outline-variant)] bg-[var(--md-surface-container)] px-3.5 py-1.5 text-xs hover:border-[var(--md-primary)]"
                  title={formatRelativeDate(c.lastViewedAt)}
                >
                  {c.fullName}
                </button>
              ))}
            </div>
          </section>
        )}

        {loading ? (
          <p className="text-sm text-[var(--md-on-surface-variant)]">Loading…</p>
        ) : clients.length === 0 ? (
          <EmptyState
            title={
              view === 'archived'
                ? 'No archived clients'
                : search || statusFilter.length
                  ? 'No clients match your filters'
                  : 'No clients yet'
            }
            description={
              view === 'archived'
                ? 'Archived cases will show up here.'
                : search || statusFilter.length
                  ? 'Try a different search term or clear the status filters.'
                  : 'Add your first client to start their GSR case.'
            }
            action={
              view === 'active' &&
              !search &&
              !statusFilter.length && <Button onClick={() => setAddOpen(true)}>+ Add client</Button>
            }
          />
        ) : (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {clients.map((client) => (
              <ClientCard
                key={client.id}
                client={client}
                onOpen={() => navigate(`/clients/${client.id}`)}
                onDelete={() => setPendingDelete(client)}
                onTogglePin={() => togglePin(client)}
                onToggleArchive={() => toggleArchive(client)}
              />
            ))}
          </div>
        )}
      </main>

      <AddClientDialog open={addOpen} onClose={() => setAddOpen(false)} onCreate={handleCreate} />
      <DeleteClientDialog
        client={pendingDelete}
        onClose={() => setPendingDelete(null)}
        onConfirm={handleDelete}
      />
      {calendarOpen && (
        <IntakeCalendarModal clients={allActiveClients} onClose={() => setCalendarOpen(false)} />
      )}
      <GlobalQuickSwitcher onNewClient={() => setAddOpen(true)} />
    </div>
  )
}
