import { ipcMain } from 'electron'
import { and, desc, asc, eq, inArray, like, or, count, type SQL } from 'drizzle-orm'
import { getDb } from '../db/client'
import {
  clients,
  clientVisits,
  verificationRecords,
  checklistEvaluations,
  gsrDocuments
} from '../db/schema'
import { ensureClientFolders } from '../storage/paths'
import { logAudit } from '../audit'
import type {
  ClientWithProgress,
  CreateClientInput,
  ListClientsQuery,
  UpdateClientInput,
  ClientStatus,
  RecentClient
} from '../../shared/ipc-types'

/**
 * First-pass "suggested status" heuristic (§3 — a hint only, never
 * overwrites the user's manual status). Currently based on open
 * verification records and unresolved checklist gaps, since those are the
 * subsystems built so far; extend this as documents/evidence subsystems
 * come online in later phases.
 */
function suggestStatus(pendingActionCount: number, stage: string): ClientStatus {
  if (stage === 'finalization' && pendingActionCount === 0) return 'green'
  if (pendingActionCount > 2) return 'red'
  if (pendingActionCount > 0) return 'yellow'
  return 'yellow'
}

function withProgress(
  row: typeof clients.$inferSelect,
  pendingActionCount: number
): ClientWithProgress {
  return {
    ...row,
    pendingActionCount,
    suggestedStatus: suggestStatus(pendingActionCount, row.currentStage)
  }
}

async function getPendingActionCounts(clientIds: string[]): Promise<Map<string, number>> {
  const db = getDb()
  const result = new Map<string, number>()
  if (clientIds.length === 0) return result

  const pendingVerifications = await db
    .select({ clientId: verificationRecords.clientId, n: count() })
    .from(verificationRecords)
    .where(
      and(
        inArray(verificationRecords.clientId, clientIds),
        eq(verificationRecords.status, 'pending')
      )
    )
    .groupBy(verificationRecords.clientId)

  for (const row of pendingVerifications) {
    result.set(row.clientId, (result.get(row.clientId) ?? 0) + row.n)
  }

  const gaps = await db
    .select({ clientId: gsrDocuments.clientId, n: count() })
    .from(checklistEvaluations)
    .innerJoin(gsrDocuments, eq(checklistEvaluations.gsrDocumentId, gsrDocuments.id))
    .where(and(inArray(gsrDocuments.clientId, clientIds), eq(checklistEvaluations.status, 'gap')))
    .groupBy(gsrDocuments.clientId)

  for (const row of gaps) {
    result.set(row.clientId, (result.get(row.clientId) ?? 0) + row.n)
  }

  return result
}

export function registerClientHandlers(): void {
  ipcMain.handle('clients:list', async (_e, query: ListClientsQuery = {}) => {
    const db = getDb()
    const conditions: SQL[] = []

    if (query.search) {
      const searchCondition = or(
        like(clients.fullName, `%${query.search}%`),
        like(clients.statusNote, `%${query.search}%`)
      )
      if (searchCondition) conditions.push(searchCondition)
    }
    if (query.statusFilter?.length) {
      conditions.push(inArray(clients.status, query.statusFilter))
    }
    if (query.stageFilter?.length) {
      conditions.push(inArray(clients.currentStage, query.stageFilter))
    }
    if (!query.includeArchived) {
      conditions.push(eq(clients.archived, false))
    }

    const sortField = query.sortField ?? 'updatedAt'
    const sortCol =
      sortField === 'fullName'
        ? clients.fullName
        : sortField === 'targetIntakeDate'
          ? clients.targetIntakeDate
          : sortField === 'status'
            ? clients.status
            : clients.updatedAt
    const direction = query.sortDirection === 'asc' ? asc : desc

    const rows = await db
      .select()
      .from(clients)
      .where(conditions.length ? and(...conditions) : undefined)
      .orderBy(direction(sortCol))

    const counts = await getPendingActionCounts(rows.map((r) => r.id))
    return rows.map((r) => withProgress(r, counts.get(r.id) ?? 0))
  })

  ipcMain.handle('clients:get', async (_e, id: string) => {
    const db = getDb()
    const [row] = await db.select().from(clients).where(eq(clients.id, id))
    if (!row) return null
    const counts = await getPendingActionCounts([id])
    return withProgress(row, counts.get(id) ?? 0)
  })

  ipcMain.handle('clients:create', async (_e, input: CreateClientInput) => {
    const db = getDb()
    const [row] = await db
      .insert(clients)
      .values({ fullName: input.fullName.trim(), targetIntakeDate: input.targetIntakeDate ?? null })
      .returning()
    ensureClientFolders(row.id)
    logAudit({ clientId: row.id, entityType: 'clients', entityId: row.id, action: 'create' })
    return withProgress(row, 0)
  })

  ipcMain.handle('clients:update', async (_e, input: UpdateClientInput) => {
    const db = getDb()
    const { id, ...changes } = input
    const [before] = await db.select().from(clients).where(eq(clients.id, id))
    if (!before) throw new Error(`Client ${id} not found`)

    const [row] = await db
      .update(clients)
      .set({ ...changes, updatedAt: new Date().toISOString() })
      .where(eq(clients.id, id))
      .returning()

    logAudit({
      clientId: id,
      entityType: 'clients',
      entityId: id,
      action: 'update',
      detail: JSON.stringify({ before, after: row })
    })

    const counts = await getPendingActionCounts([id])
    return withProgress(row, counts.get(id) ?? 0)
  })

  ipcMain.handle('clients:delete', async (_e, id: string) => {
    const db = getDb()
    await db.delete(clients).where(eq(clients.id, id))
    logAudit({ clientId: id, entityType: 'clients', entityId: id, action: 'delete' })
    return { ok: true }
  })

  ipcMain.handle('clients:recordVisit', async (_e, clientId: string) => {
    const db = getDb()
    const now = new Date().toISOString()
    await db
      .insert(clientVisits)
      .values({ clientId, lastViewedAt: now })
      .onConflictDoUpdate({ target: clientVisits.clientId, set: { lastViewedAt: now } })
    return { ok: true }
  })

  ipcMain.handle('clients:recentlyViewed', async (_e, limit = 8): Promise<RecentClient[]> => {
    const db = getDb()
    const rows = await db
      .select({
        clientId: clientVisits.clientId,
        fullName: clients.fullName,
        lastViewedAt: clientVisits.lastViewedAt,
        archived: clients.archived
      })
      .from(clientVisits)
      .innerJoin(clients, eq(clientVisits.clientId, clients.id))
      .where(eq(clients.archived, false))
      .orderBy(desc(clientVisits.lastViewedAt))
      .limit(limit)
    return rows.map(({ clientId, fullName, lastViewedAt }) => ({
      clientId,
      fullName,
      lastViewedAt
    }))
  })
}
