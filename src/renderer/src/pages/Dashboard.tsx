import { useCallback, useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import type { ClientStatus, ClientSortField, ClientWithProgress } from '@shared/ipc-types'
import { Button } from '../components/ui/Button'
import { EmptyState } from '../components/ui/EmptyState'
import { ClientCard } from '../components/ClientCard'
import { AddClientDialog } from '../components/AddClientDialog'
import { DeleteClientDialog } from '../components/DeleteClientDialog'

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

export function Dashboard(): React.JSX.Element {
  const navigate = useNavigate()
  const [clients, setClients] = useState<ClientWithProgress[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<ClientStatus[]>([])
  const [sortField, setSortField] = useState<ClientSortField>('updatedAt')
  const [addOpen, setAddOpen] = useState(false)
  const [pendingDelete, setPendingDelete] = useState<ClientWithProgress | null>(null)

  const refresh = useCallback(async () => {
    setLoading(true)
    try {
      const rows = await window.api.clients.list({
        search: search || undefined,
        statusFilter: statusFilter.length ? statusFilter : undefined,
        sortField,
        sortDirection: sortField === 'fullName' ? 'asc' : 'desc'
      })
      setClients(rows)
    } finally {
      setLoading(false)
    }
  }, [search, statusFilter, sortField])

  useEffect(() => {
    const timeout = setTimeout(refresh, search ? 200 : 0)
    return () => clearTimeout(timeout)
  }, [refresh, search])

  const needsAttentionCount = useMemo(
    () => clients.filter((c) => c.status === 'red').length,
    [clients]
  )

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
              {clients.length} total{' '}
              {needsAttentionCount > 0 && (
                <span className="text-[var(--status-red)]">
                  · {needsAttentionCount} need{needsAttentionCount === 1 ? 's' : ''} attention
                </span>
              )}
            </p>
          </div>
          <Button onClick={() => setAddOpen(true)}>+ Add client</Button>
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
        {loading ? (
          <p className="text-sm text-[var(--md-on-surface-variant)]">Loading…</p>
        ) : clients.length === 0 ? (
          <EmptyState
            title={
              search || statusFilter.length ? 'No clients match your filters' : 'No clients yet'
            }
            description={
              search || statusFilter.length
                ? 'Try a different search term or clear the status filters.'
                : 'Add your first client to start their GSR case.'
            }
            action={
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
    </div>
  )
}
