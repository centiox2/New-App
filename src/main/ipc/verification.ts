import { ipcMain } from 'electron'
import { eq, and, desc, inArray } from 'drizzle-orm'
import { getDb } from '../db/client'
import {
  verificationRecords,
  verificationDocuments,
  documents,
  educationEntries,
  englishTestScores,
  employmentEntries,
  incomeSources,
  sponsors
} from '../db/schema'
import { logAudit } from '../audit'
import type {
  CreateVerificationRecordInput,
  UpdateVerificationRecordInput,
  VerifiableItem
} from '../../shared/ipc-types'

async function latestRecordsBySubject(
  clientId: string
): Promise<Map<string, (typeof verificationRecords.$inferSelect)[]>> {
  const db = getDb()
  const rows = await db
    .select()
    .from(verificationRecords)
    .where(eq(verificationRecords.clientId, clientId))
    .orderBy(desc(verificationRecords.createdAt))

  const bySubject = new Map<string, (typeof verificationRecords.$inferSelect)[]>()
  for (const row of rows) {
    const key = `${row.subjectEntityType}:${row.subjectEntityId}`
    const list = bySubject.get(key) ?? []
    list.push(row)
    bySubject.set(key, list)
  }
  return bySubject
}

export function registerVerificationHandlers(): void {
  ipcMain.handle('verification:itemsNeedingVerification', async (_e, clientId: string) => {
    const db = getDb()
    const bySubject = await latestRecordsBySubject(clientId)
    const items: VerifiableItem[] = []

    const education = await db
      .select()
      .from(educationEntries)
      .where(
        and(
          eq(educationEntries.clientId, clientId),
          eq(educationEntries.requiresVerification, true)
        )
      )
    for (const e of education) {
      items.push({
        entityType: 'education_entries',
        entityId: e.id,
        label: e.institution || '(untitled education entry)',
        subtitle: e.course,
        verificationRecord: bySubject.get(`education_entries:${e.id}`)?.[0] ?? null
      })
    }

    const englishTests = await db
      .select()
      .from(englishTestScores)
      .where(
        and(
          eq(englishTestScores.clientId, clientId),
          eq(englishTestScores.requiresVerification, true)
        )
      )
    for (const t of englishTests) {
      items.push({
        entityType: 'english_test_scores',
        entityId: t.id,
        label: t.overallScore ? `English test — overall ${t.overallScore}` : 'English test score',
        subtitle: t.testDate,
        verificationRecord: bySubject.get(`english_test_scores:${t.id}`)?.[0] ?? null
      })
    }

    const employment = await db
      .select()
      .from(employmentEntries)
      .where(
        and(
          eq(employmentEntries.clientId, clientId),
          eq(employmentEntries.requiresVerification, true)
        )
      )
    for (const e of employment) {
      items.push({
        entityType: 'employment_entries',
        entityId: e.id,
        label: e.employer || '(untitled employment entry)',
        subtitle: e.jobTitle,
        verificationRecord: bySubject.get(`employment_entries:${e.id}`)?.[0] ?? null
      })
    }

    const clientSponsors = await db.select().from(sponsors).where(eq(sponsors.clientId, clientId))
    if (clientSponsors.length > 0) {
      const income = await db
        .select()
        .from(incomeSources)
        .where(
          and(
            inArray(
              incomeSources.sponsorId,
              clientSponsors.map((s) => s.id)
            ),
            eq(incomeSources.requiresVerification, true)
          )
        )
      const sponsorById = new Map(clientSponsors.map((s) => [s.id, s]))
      for (const inc of income) {
        const sponsor = sponsorById.get(inc.sponsorId)
        items.push({
          entityType: 'income_sources',
          entityId: inc.id,
          label: inc.description || `${inc.type} income/asset source`,
          subtitle: sponsor ? `Sponsor: ${sponsor.name}` : null,
          verificationRecord: bySubject.get(`income_sources:${inc.id}`)?.[0] ?? null
        })
      }
    }

    return items
  })

  ipcMain.handle('verification:list', async (_e, clientId: string) => {
    const db = getDb()
    return db
      .select()
      .from(verificationRecords)
      .where(eq(verificationRecords.clientId, clientId))
      .orderBy(desc(verificationRecords.createdAt))
  })

  ipcMain.handle('verification:create', async (_e, input: CreateVerificationRecordInput) => {
    const db = getDb()
    const [row] = await db
      .insert(verificationRecords)
      .values({ ...input, status: input.status ?? 'pending' })
      .returning()
    logAudit({
      clientId: input.clientId,
      entityType: 'verification_records',
      entityId: row.id,
      action: 'create'
    })
    return row
  })

  ipcMain.handle('verification:update', async (_e, input: UpdateVerificationRecordInput) => {
    const db = getDb()
    const { id, ...changes } = input
    const [row] = await db
      .update(verificationRecords)
      .set({ ...changes, updatedAt: new Date().toISOString() })
      .where(eq(verificationRecords.id, id))
      .returning()
    logAudit({
      clientId: row.clientId,
      entityType: 'verification_records',
      entityId: id,
      action: 'update'
    })
    return row
  })

  ipcMain.handle('verification:delete', async (_e, id: string) => {
    const db = getDb()
    await db.delete(verificationRecords).where(eq(verificationRecords.id, id))
    logAudit({ entityType: 'verification_records', entityId: id, action: 'delete' })
    return { ok: true }
  })

  ipcMain.handle('verification:listDocuments', async (_e, verificationRecordId: string) => {
    const db = getDb()
    return db
      .select({ document: documents, linkId: verificationDocuments.id })
      .from(verificationDocuments)
      .innerJoin(documents, eq(verificationDocuments.documentId, documents.id))
      .where(eq(verificationDocuments.verificationRecordId, verificationRecordId))
  })

  ipcMain.handle(
    'verification:linkDocument',
    async (_e, args: { verificationRecordId: string; documentId: string }) => {
      const db = getDb()
      const [row] = await db.insert(verificationDocuments).values(args).returning()
      return row
    }
  )

  ipcMain.handle('verification:unlinkDocument', async (_e, linkId: string) => {
    const db = getDb()
    await db.delete(verificationDocuments).where(eq(verificationDocuments.id, linkId))
    return { ok: true }
  })
}
