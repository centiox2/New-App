import { ipcMain, dialog, BrowserWindow } from 'electron'
import { basename, extname } from 'path'
import { eq, and, inArray } from 'drizzle-orm'
import { getDb } from '../db/client'
import {
  documents,
  checklistDocuments,
  verificationRecords,
  educationEntries,
  englishTestScores,
  employmentEntries,
  incomeSources,
  sponsors,
  evidenceItems,
  gsrDocuments,
  gsrSections,
  gsrStatements,
  gsrStatementEvidenceLinks
} from '../db/schema'
import { storeDocumentFile } from '../storage/documentFiles'
import { logAudit } from '../audit'
import type { ReviewSummary, UnsupportedStatement } from '../../shared/ipc-types'

async function computeVerificationCounts(clientId: string): Promise<ReviewSummary['verification']> {
  const db = getDb()

  const records = await db
    .select()
    .from(verificationRecords)
    .where(eq(verificationRecords.clientId, clientId))
  const latestBySubject = new Map<string, (typeof records)[number]>()
  for (const r of records) {
    const key = `${r.subjectEntityType}:${r.subjectEntityId}`
    const existing = latestBySubject.get(key)
    if (!existing || r.createdAt > existing.createdAt) latestBySubject.set(key, r)
  }

  const flaggedKeys: string[] = []

  const education = await db
    .select({ id: educationEntries.id })
    .from(educationEntries)
    .where(
      and(eq(educationEntries.clientId, clientId), eq(educationEntries.requiresVerification, true))
    )
  education.forEach((e) => flaggedKeys.push(`education_entries:${e.id}`))

  const englishTests = await db
    .select({ id: englishTestScores.id })
    .from(englishTestScores)
    .where(
      and(
        eq(englishTestScores.clientId, clientId),
        eq(englishTestScores.requiresVerification, true)
      )
    )
  englishTests.forEach((e) => flaggedKeys.push(`english_test_scores:${e.id}`))

  const employment = await db
    .select({ id: employmentEntries.id })
    .from(employmentEntries)
    .where(
      and(
        eq(employmentEntries.clientId, clientId),
        eq(employmentEntries.requiresVerification, true)
      )
    )
  employment.forEach((e) => flaggedKeys.push(`employment_entries:${e.id}`))

  const clientSponsors = await db
    .select({ id: sponsors.id })
    .from(sponsors)
    .where(eq(sponsors.clientId, clientId))
  if (clientSponsors.length > 0) {
    const income = await db
      .select({ id: incomeSources.id })
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
    income.forEach((e) => flaggedKeys.push(`income_sources:${e.id}`))
  }

  const counts = {
    flaggedCount: flaggedKeys.length,
    notStartedCount: 0,
    pendingCount: 0,
    verifiedCount: 0,
    couldNotVerifyCount: 0
  }
  for (const key of flaggedKeys) {
    const record = latestBySubject.get(key)
    if (!record) counts.notStartedCount++
    else if (record.status === 'pending') counts.pendingCount++
    else if (record.status === 'verified') counts.verifiedCount++
    else if (record.status === 'could_not_verify') counts.couldNotVerifyCount++
  }
  return counts
}

async function computeGsrSummary(clientId: string): Promise<ReviewSummary['gsr']> {
  const db = getDb()
  const [doc] = await db.select().from(gsrDocuments).where(eq(gsrDocuments.clientId, clientId))
  if (!doc) {
    return { sectionCount: 0, emptySectionTitles: [], statementCount: 0, unsupportedStatements: [] }
  }

  const sections = await db.select().from(gsrSections).where(eq(gsrSections.gsrDocumentId, doc.id))
  const emptySectionTitles = sections.filter((s) => !s.contentHtml?.trim()).map((s) => s.title)

  const sectionById = new Map(sections.map((s) => [s.id, s]))
  const statements =
    sections.length > 0
      ? await db
          .select()
          .from(gsrStatements)
          .where(
            inArray(
              gsrStatements.gsrSectionId,
              sections.map((s) => s.id)
            )
          )
      : []

  const unsupportedStatements: UnsupportedStatement[] = []
  for (const statement of statements) {
    const [link] = await db
      .select({ id: gsrStatementEvidenceLinks.id })
      .from(gsrStatementEvidenceLinks)
      .where(eq(gsrStatementEvidenceLinks.gsrStatementId, statement.id))
    if (!link) {
      unsupportedStatements.push({
        id: statement.id,
        text: statement.text,
        sectionTitle: sectionById.get(statement.gsrSectionId)?.title ?? '(unknown section)'
      })
    }
  }

  return {
    sectionCount: sections.length,
    emptySectionTitles,
    statementCount: statements.length,
    unsupportedStatements
  }
}

export function registerReviewHandlers(): void {
  ipcMain.handle('review:getSummary', async (_e, clientId: string): Promise<ReviewSummary> => {
    const db = getDb()
    const docs = await db
      .select({ id: documents.id })
      .from(documents)
      .where(and(eq(documents.clientId, clientId), eq(documents.isCurrentVersion, true)))
    const evidence = await db
      .select({ id: evidenceItems.id })
      .from(evidenceItems)
      .where(eq(evidenceItems.clientId, clientId))

    const [verification, gsr] = await Promise.all([
      computeVerificationCounts(clientId),
      computeGsrSummary(clientId)
    ])

    return {
      documentsCount: docs.length,
      verification,
      evidenceCount: evidence.length,
      gsr
    }
  })

  ipcMain.handle('checklist:get', async (_e, clientId: string) => {
    const db = getDb()
    const [row] = await db
      .select()
      .from(checklistDocuments)
      .where(eq(checklistDocuments.clientId, clientId))
    if (!row) return null
    const [document] = await db
      .select()
      .from(documents)
      .where(eq(documents.id, row.sourceDocumentId))
    return { ...row, document }
  })

  ipcMain.handle('checklist:upload', async (_e, clientId: string) => {
    const win = BrowserWindow.getFocusedWindow()
    const options: Electron.OpenDialogOptions = {
      properties: ['openFile'],
      filters: [{ name: 'PDF', extensions: ['pdf'] }]
    }
    const result = win
      ? await dialog.showOpenDialog(win, options)
      : await dialog.showOpenDialog(options)
    if (result.canceled || result.filePaths.length === 0) return null

    const db = getDb()
    const sourcePath = result.filePaths[0]
    const ext = extname(sourcePath)
    const storedName = storeDocumentFile(clientId, sourcePath)

    const [document] = await db
      .insert(documents)
      .values({
        clientId,
        category: 'other',
        customCategory: 'GSR Checklist',
        label: basename(sourcePath, ext),
        filePath: storedName
      })
      .returning()

    // Replace any existing checklist for this client — one active checklist at a time.
    await db.delete(checklistDocuments).where(eq(checklistDocuments.clientId, clientId))
    const [row] = await db
      .insert(checklistDocuments)
      .values({ clientId, sourceDocumentId: document.id })
      .returning()

    logAudit({ clientId, entityType: 'checklist_documents', entityId: row.id, action: 'create' })
    return { ...row, document }
  })

  ipcMain.handle('checklist:remove', async (_e, id: string) => {
    const db = getDb()
    const [row] = await db.select().from(checklistDocuments).where(eq(checklistDocuments.id, id))
    if (row) {
      await db.delete(checklistDocuments).where(eq(checklistDocuments.id, id))
      await db.delete(documents).where(eq(documents.id, row.sourceDocumentId))
    }
    return { ok: true }
  })
}
