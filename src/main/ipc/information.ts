/**
 * Generic CRUD registration for the "information section" tables in
 * schema.ts (§5) — they all share the same shape (id, a parent foreign
 * key, optional JSON fields, timestamps), so one factory drives all of
 * them instead of seven near-identical handler blocks.
 *
 * The public contract renderer code actually depends on is the fully
 * typed `window.api.information.*` surface in preload/index.ts and
 * shared/ipc-types.ts — this file is internal plumbing and leans on
 * drizzle's runtime column lookup (table[fieldName]) rather than fighting
 * its generic types for a one-off factory.
 */
import { ipcMain } from 'electron'
import { eq, asc } from 'drizzle-orm'
import type { SQLiteColumn, SQLiteTable } from 'drizzle-orm/sqlite-core'
import { getDb } from '../db/client'
import { logAudit } from '../audit'
import {
  personalProfiles,
  educationEntries,
  englishTestScores,
  australianStudyEntries,
  employmentEntries,
  immigrationHistoryEntries,
  sponsors,
  incomeSources
} from '../db/schema'

type AnyRow = Record<string, unknown>
// Drizzle's SQLiteTable type has no string index signature, so a table
// looked up dynamically by field name (table[parentField]) can't be typed
// precisely without fighting its generics for this one-off factory — see
// file header. `any` is intentional and contained to this module.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyTable = SQLiteTable & Record<string, any>

interface CrudConfig {
  channel: string
  table: AnyTable
  parentField: string
  entityType: string
  jsonFields?: string[]
}

function deserialize(row: AnyRow, jsonFields: string[]): AnyRow {
  const out = { ...row }
  for (const f of jsonFields) {
    if (typeof out[f] === 'string') {
      try {
        out[f] = JSON.parse(out[f] as string)
      } catch {
        // leave as raw string if it wasn't valid JSON (shouldn't happen — we always wrote via serialize)
      }
    }
  }
  return out
}

function serialize(data: AnyRow, jsonFields: string[]): AnyRow {
  const out = { ...data }
  for (const f of jsonFields) {
    if (f in out) out[f] = out[f] == null ? null : JSON.stringify(out[f])
  }
  return out
}

function registerCrud(config: CrudConfig): void {
  const { channel, table, parentField, entityType } = config
  const jsonFields = config.jsonFields ?? []
  const parentCol = table[parentField] as SQLiteColumn

  ipcMain.handle(`${channel}:list`, async (_e, parentId: string) => {
    const db = getDb()
    const rows = await db
      .select()
      .from(table)
      .where(eq(parentCol, parentId))
      .orderBy(asc(table.createdAt))
    return rows.map((r: AnyRow) => deserialize(r, jsonFields))
  })

  ipcMain.handle(`${channel}:create`, async (_e, args: { parentId: string; data: AnyRow }) => {
    const db = getDb()
    const values = { ...serialize(args.data, jsonFields), [parentField]: args.parentId }
    const [row] = await db.insert(table).values(values).returning()
    logAudit({ entityType, entityId: (row as AnyRow).id as string, action: 'create' })
    return deserialize(row as AnyRow, jsonFields)
  })

  ipcMain.handle(`${channel}:update`, async (_e, args: { id: string; data: AnyRow }) => {
    const db = getDb()
    const values = { ...serialize(args.data, jsonFields), updatedAt: new Date().toISOString() }
    const [row] = await db.update(table).set(values).where(eq(table.id, args.id)).returning()
    logAudit({ entityType, entityId: args.id, action: 'update', detail: JSON.stringify(args.data) })
    return deserialize(row as AnyRow, jsonFields)
  })

  ipcMain.handle(`${channel}:delete`, async (_e, id: string) => {
    const db = getDb()
    await db.delete(table).where(eq(table.id, id))
    logAudit({ entityType, entityId: id, action: 'delete' })
    return { ok: true }
  })
}

export function registerInformationHandlers(): void {
  registerCrud({
    channel: 'information:education',
    table: educationEntries,
    parentField: 'clientId',
    entityType: 'education_entries',
    jsonFields: ['gradeBreakdown', 'customFields']
  })
  registerCrud({
    channel: 'information:englishTest',
    table: englishTestScores,
    parentField: 'clientId',
    entityType: 'english_test_scores',
    jsonFields: ['componentScores', 'customFields']
  })
  registerCrud({
    channel: 'information:australianStudy',
    table: australianStudyEntries,
    parentField: 'clientId',
    entityType: 'australian_study_entries',
    jsonFields: ['customFields']
  })
  registerCrud({
    channel: 'information:employment',
    table: employmentEntries,
    parentField: 'clientId',
    entityType: 'employment_entries',
    jsonFields: ['customFields']
  })
  registerCrud({
    channel: 'information:immigration',
    table: immigrationHistoryEntries,
    parentField: 'clientId',
    entityType: 'immigration_history_entries',
    jsonFields: ['customFields']
  })
  registerCrud({
    channel: 'information:sponsor',
    table: sponsors,
    parentField: 'clientId',
    entityType: 'sponsors',
    jsonFields: ['customFields']
  })
  registerCrud({
    channel: 'information:incomeSource',
    table: incomeSources,
    parentField: 'sponsorId',
    entityType: 'income_sources',
    jsonFields: ['customFields']
  })

  // Personal profile is a singleton per client (get-or-create), not a list.
  ipcMain.handle('information:personal:get', async (_e, clientId: string) => {
    const db = getDb()
    const [row] = await db
      .select()
      .from(personalProfiles)
      .where(eq(personalProfiles.clientId, clientId))
    if (row) return deserialize(row, ['customFields'])
    const [created] = await db.insert(personalProfiles).values({ clientId }).returning()
    return deserialize(created, ['customFields'])
  })

  ipcMain.handle(
    'information:personal:update',
    async (_e, args: { clientId: string; data: AnyRow }) => {
      const db = getDb()
      const values = {
        ...serialize(args.data, ['customFields']),
        updatedAt: new Date().toISOString()
      }
      const [existing] = await db
        .select()
        .from(personalProfiles)
        .where(eq(personalProfiles.clientId, args.clientId))
      let row: AnyRow
      if (existing) {
        ;[row] = await db
          .update(personalProfiles)
          .set(values)
          .where(eq(personalProfiles.clientId, args.clientId))
          .returning()
      } else {
        ;[row] = await db
          .insert(personalProfiles)
          .values({ ...values, clientId: args.clientId })
          .returning()
      }
      logAudit({
        clientId: args.clientId,
        entityType: 'personal_profiles',
        entityId: row.id as string,
        action: 'update'
      })
      return deserialize(row, ['customFields'])
    }
  )
}
