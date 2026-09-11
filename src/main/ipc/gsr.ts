import { ipcMain } from 'electron'
import { eq, asc, and } from 'drizzle-orm'
import { getDb } from '../db/client'
import {
  gsrDocuments,
  gsrSections,
  gsrStatements,
  gsrStatementEvidenceLinks,
  gsrDraftVersions,
  evidenceItems
} from '../db/schema'
import { logAudit } from '../audit'

/**
 * Starting section template — a commonly-used GSR structure, not an
 * official Department of Home Affairs form. Sections are fully editable
 * (add/rename/reorder/delete) so this can be adjusted to match the exact
 * question set actually required, per client or in general.
 */
const DEFAULT_SECTIONS = [
  'Personal Circumstances',
  'Financial Capacity',
  'Study Program & Course Progression',
  'Employment & Career Prospects',
  'Immigration History',
  'Ties to Home Country',
  'Conclusion'
]

async function snapshotDocument(gsrDocumentId: string): Promise<void> {
  const db = getDb()
  const sections = await db
    .select()
    .from(gsrSections)
    .where(eq(gsrSections.gsrDocumentId, gsrDocumentId))
    .orderBy(asc(gsrSections.orderIndex))

  const sectionsWithStatements = await Promise.all(
    sections.map(async (section) => {
      const statements = await db
        .select()
        .from(gsrStatements)
        .where(eq(gsrStatements.gsrSectionId, section.id))
        .orderBy(asc(gsrStatements.orderIndex))
      return { ...section, statements }
    })
  )

  await db.insert(gsrDraftVersions).values({
    gsrDocumentId,
    snapshotJson: JSON.stringify(sectionsWithStatements)
  })
}

export function registerGsrHandlers(): void {
  ipcMain.handle('gsr:getOrCreateDocument', async (_e, clientId: string) => {
    const db = getDb()
    const [existing] = await db
      .select()
      .from(gsrDocuments)
      .where(eq(gsrDocuments.clientId, clientId))
    if (existing) return existing

    const [created] = await db.insert(gsrDocuments).values({ clientId }).returning()
    await db.insert(gsrSections).values(
      DEFAULT_SECTIONS.map((title, i) => ({
        gsrDocumentId: created.id,
        title,
        orderIndex: i
      }))
    )
    logAudit({ clientId, entityType: 'gsr_documents', entityId: created.id, action: 'create' })
    return created
  })

  ipcMain.handle('gsr:listSections', async (_e, gsrDocumentId: string) => {
    const db = getDb()
    return db
      .select()
      .from(gsrSections)
      .where(eq(gsrSections.gsrDocumentId, gsrDocumentId))
      .orderBy(asc(gsrSections.orderIndex))
  })

  ipcMain.handle(
    'gsr:createSection',
    async (_e, args: { gsrDocumentId: string; title: string }) => {
      const db = getDb()
      const existing = await db
        .select()
        .from(gsrSections)
        .where(eq(gsrSections.gsrDocumentId, args.gsrDocumentId))
      const [row] = await db
        .insert(gsrSections)
        .values({
          gsrDocumentId: args.gsrDocumentId,
          title: args.title,
          orderIndex: existing.length
        })
        .returning()
      return row
    }
  )

  ipcMain.handle(
    'gsr:updateSection',
    async (_e, args: { id: string; title?: string; contentHtml?: string; orderIndex?: number }) => {
      const db = getDb()
      const { id, ...changes } = args
      const [row] = await db
        .update(gsrSections)
        .set({ ...changes, updatedAt: new Date().toISOString() })
        .where(eq(gsrSections.id, id))
        .returning()
      if ('contentHtml' in changes) await snapshotDocument(row.gsrDocumentId)
      return row
    }
  )

  ipcMain.handle('gsr:deleteSection', async (_e, id: string) => {
    const db = getDb()
    await db.delete(gsrSections).where(eq(gsrSections.id, id))
    return { ok: true }
  })

  ipcMain.handle('gsr:reorderSections', async (_e, orderedIds: string[]) => {
    const db = getDb()
    await Promise.all(
      orderedIds.map((id, i) =>
        db.update(gsrSections).set({ orderIndex: i }).where(eq(gsrSections.id, id))
      )
    )
    return { ok: true }
  })

  ipcMain.handle('gsr:listStatements', async (_e, sectionId: string) => {
    const db = getDb()
    const statements = await db
      .select()
      .from(gsrStatements)
      .where(eq(gsrStatements.gsrSectionId, sectionId))
      .orderBy(asc(gsrStatements.orderIndex))

    return Promise.all(
      statements.map(async (statement) => {
        const links = await db
          .select({ linkId: gsrStatementEvidenceLinks.id, evidence: evidenceItems })
          .from(gsrStatementEvidenceLinks)
          .innerJoin(evidenceItems, eq(gsrStatementEvidenceLinks.evidenceItemId, evidenceItems.id))
          .where(eq(gsrStatementEvidenceLinks.gsrStatementId, statement.id))
        return { ...statement, evidence: links }
      })
    )
  })

  ipcMain.handle('gsr:createStatement', async (_e, args: { sectionId: string; text: string }) => {
    const db = getDb()
    const existing = await db
      .select()
      .from(gsrStatements)
      .where(eq(gsrStatements.gsrSectionId, args.sectionId))
    const [row] = await db
      .insert(gsrStatements)
      .values({ gsrSectionId: args.sectionId, text: args.text, orderIndex: existing.length })
      .returning()
    return { ...row, evidence: [] }
  })

  ipcMain.handle('gsr:updateStatement', async (_e, args: { id: string; text: string }) => {
    const db = getDb()
    const [row] = await db
      .update(gsrStatements)
      .set({ text: args.text, updatedAt: new Date().toISOString() })
      .where(eq(gsrStatements.id, args.id))
      .returning()
    return row
  })

  ipcMain.handle('gsr:deleteStatement', async (_e, id: string) => {
    const db = getDb()
    await db.delete(gsrStatements).where(eq(gsrStatements.id, id))
    return { ok: true }
  })

  ipcMain.handle(
    'gsr:linkEvidence',
    async (_e, args: { statementId: string; evidenceItemId: string }) => {
      const db = getDb()
      const [existingLink] = await db
        .select()
        .from(gsrStatementEvidenceLinks)
        .where(
          and(
            eq(gsrStatementEvidenceLinks.gsrStatementId, args.statementId),
            eq(gsrStatementEvidenceLinks.evidenceItemId, args.evidenceItemId)
          )
        )
      if (existingLink) return existingLink
      const [row] = await db
        .insert(gsrStatementEvidenceLinks)
        .values({ gsrStatementId: args.statementId, evidenceItemId: args.evidenceItemId })
        .returning()
      return row
    }
  )

  ipcMain.handle('gsr:unlinkEvidence', async (_e, linkId: string) => {
    const db = getDb()
    await db.delete(gsrStatementEvidenceLinks).where(eq(gsrStatementEvidenceLinks.id, linkId))
    return { ok: true }
  })
}
