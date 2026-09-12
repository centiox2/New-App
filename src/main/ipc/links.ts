import { ipcMain } from 'electron'
import { eq, and } from 'drizzle-orm'
import { getDb } from '../db/client'
import {
  documents,
  documentInformationLinks,
  documentDocumentLinks,
  verificationRecords,
  verificationDocuments,
  evidenceItems,
  gsrStatements,
  gsrStatementEvidenceLinks,
  checklistDocuments,
  personalProfiles,
  educationEntries,
  englishTestScores,
  australianStudyEntries,
  employmentEntries,
  immigrationHistoryEntries,
  sponsors,
  incomeSources
} from '../db/schema'
import type {
  BacklinkItem,
  DocumentInformationLink,
  InformationEntityOption,
  InformationEntityType
} from '../../shared/ipc-types'

/** Every information-section table a document (or anything else) can be linked to. */
const INFO_TABLES = {
  personal_profiles: personalProfiles,
  education_entries: educationEntries,
  english_test_scores: englishTestScores,
  australian_study_entries: australianStudyEntries,
  employment_entries: employmentEntries,
  immigration_history_entries: immigrationHistoryEntries,
  sponsors: sponsors,
  income_sources: incomeSources
} as const

function isInfoEntityType(value: string): value is InformationEntityType {
  return value in INFO_TABLES
}

/** label/subtitle for one information-entity row — mirrors verification.ts's per-type labels. */
function labelFor(
  entityType: InformationEntityType,
  row: Record<string, unknown>
): {
  label: string
  subtitle: string | null
} {
  switch (entityType) {
    case 'personal_profiles':
      return { label: 'Personal profile', subtitle: null }
    case 'education_entries':
      return {
        label: (row.institution as string) || '(untitled education entry)',
        subtitle: (row.course as string) || null
      }
    case 'english_test_scores':
      return {
        label: row.overallScore
          ? `English test — overall ${row.overallScore}`
          : 'English test score',
        subtitle: (row.testDate as string) || null
      }
    case 'australian_study_entries':
      return {
        label: (row.institutionProvider as string) || '(untitled study entry)',
        subtitle: (row.course as string) || null
      }
    case 'employment_entries':
      return {
        label: (row.employer as string) || '(untitled employment entry)',
        subtitle: (row.jobTitle as string) || null
      }
    case 'immigration_history_entries':
      return {
        label: (row.description as string) || '(untitled immigration entry)',
        subtitle: (row.dateFrom as string) || null
      }
    case 'sponsors':
      return {
        label: (row.name as string) || '(unnamed sponsor)',
        subtitle: (row.relationshipToClient as string) || null
      }
    case 'income_sources':
      return {
        label: (row.description as string) || `${row.type} income/asset source`,
        subtitle: (row.amount as string) || null
      }
  }
}

async function resolveInfoEntity(
  entityType: InformationEntityType,
  entityId: string
): Promise<{ label: string; subtitle: string | null } | null> {
  const db = getDb()
  const table = INFO_TABLES[entityType]
  const [row] = await db.select().from(table).where(eq(table.id, entityId))
  if (!row) return null
  return labelFor(entityType, row as unknown as Record<string, unknown>)
}

export function registerLinkHandlers(): void {
  ipcMain.handle(
    'links:listInformationOptions',
    async (
      _e,
      args: { clientId: string; entityType: InformationEntityType }
    ): Promise<InformationEntityOption[]> => {
      const db = getDb()
      const { clientId, entityType } = args

      if (entityType === 'income_sources') {
        const clientSponsors = await db
          .select()
          .from(sponsors)
          .where(eq(sponsors.clientId, clientId))
        const options: InformationEntityOption[] = []
        for (const sponsor of clientSponsors) {
          const rows = await db
            .select()
            .from(incomeSources)
            .where(eq(incomeSources.sponsorId, sponsor.id))
          for (const row of rows) {
            const { label, subtitle } = labelFor(
              'income_sources',
              row as unknown as Record<string, unknown>
            )
            options.push({
              entityId: row.id,
              label,
              subtitle: subtitle
                ? `${subtitle} — sponsor: ${sponsor.name}`
                : `Sponsor: ${sponsor.name}`
            })
          }
        }
        return options
      }

      const table = INFO_TABLES[entityType]
      const rows = await db.select().from(table).where(eq(table.clientId, clientId))
      return rows.map((row) => {
        const { label, subtitle } = labelFor(entityType, row as unknown as Record<string, unknown>)
        return { entityId: row.id, label, subtitle }
      })
    }
  )

  ipcMain.handle(
    'links:listForDocument',
    async (_e, documentId: string): Promise<DocumentInformationLink[]> => {
      const db = getDb()
      const rows = await db
        .select()
        .from(documentInformationLinks)
        .where(eq(documentInformationLinks.documentId, documentId))

      const result: DocumentInformationLink[] = []
      for (const row of rows) {
        if (!isInfoEntityType(row.entityType)) continue
        const resolved = await resolveInfoEntity(row.entityType, row.entityId)
        if (!resolved) continue
        result.push({
          linkId: row.id,
          entityType: row.entityType,
          entityId: row.entityId,
          label: resolved.label,
          subtitle: resolved.subtitle
        })
      }
      return result
    }
  )

  ipcMain.handle(
    'links:linkDocumentToInformation',
    async (
      _e,
      args: { documentId: string; entityType: InformationEntityType; entityId: string }
    ): Promise<DocumentInformationLink> => {
      const db = getDb()
      const [row] = await db.insert(documentInformationLinks).values(args).returning()
      const resolved = await resolveInfoEntity(args.entityType, args.entityId)
      return {
        linkId: row.id,
        entityType: args.entityType,
        entityId: args.entityId,
        label: resolved?.label ?? '(unknown)',
        subtitle: resolved?.subtitle ?? null
      }
    }
  )

  ipcMain.handle('links:unlinkDocumentInformation', async (_e, linkId: string) => {
    const db = getDb()
    await db.delete(documentInformationLinks).where(eq(documentInformationLinks.id, linkId))
    return { ok: true }
  })

  ipcMain.handle(
    'links:backlinksForEntity',
    async (_e, args: { entityType: string; entityId: string }): Promise<BacklinkItem[]> => {
      const db = getDb()
      const { entityType, entityId } = args
      const result: BacklinkItem[] = []

      if (entityType === 'documents') {
        const documentId = entityId

        const relOut = await db
          .select()
          .from(documentDocumentLinks)
          .where(eq(documentDocumentLinks.documentId, documentId))
        const relIn = await db
          .select()
          .from(documentDocumentLinks)
          .where(eq(documentDocumentLinks.relatedDocumentId, documentId))
        for (const link of [...relOut, ...relIn]) {
          const otherId = link.documentId === documentId ? link.relatedDocumentId : link.documentId
          const [doc] = await db.select().from(documents).where(eq(documents.id, otherId))
          if (doc) {
            result.push({
              linkId: link.id,
              kind: 'document',
              targetId: doc.id,
              label: doc.label,
              subtitle: link.relationshipNote,
              stage: 'documents'
            })
          }
        }

        const linkedVerification = await db
          .select()
          .from(verificationDocuments)
          .where(eq(verificationDocuments.documentId, documentId))
        for (const vd of linkedVerification) {
          const [rec] = await db
            .select()
            .from(verificationRecords)
            .where(eq(verificationRecords.id, vd.verificationRecordId))
          if (rec) {
            result.push({
              linkId: vd.id,
              kind: 'verification_record',
              targetId: rec.id,
              label: rec.whatIsBeingVerified,
              subtitle: null,
              stage: 'verification'
            })
          }
        }

        const attachedEvidence = await db
          .select()
          .from(evidenceItems)
          .where(eq(evidenceItems.documentId, documentId))
        for (const ev of attachedEvidence) {
          result.push({
            linkId: ev.id,
            kind: 'evidence_item',
            targetId: ev.id,
            label: ev.title,
            subtitle: null,
            stage: 'evidence'
          })
        }

        const infoLinks = await db
          .select()
          .from(documentInformationLinks)
          .where(eq(documentInformationLinks.documentId, documentId))
        for (const il of infoLinks) {
          if (!isInfoEntityType(il.entityType)) continue
          const resolved = await resolveInfoEntity(il.entityType, il.entityId)
          if (resolved) {
            result.push({
              linkId: il.id,
              kind: 'information',
              targetId: il.entityId,
              entityType: il.entityType,
              label: resolved.label,
              subtitle: resolved.subtitle,
              stage: 'information'
            })
          }
        }

        const checklistUses = await db
          .select()
          .from(checklistDocuments)
          .where(eq(checklistDocuments.sourceDocumentId, documentId))
        for (const cl of checklistUses) {
          result.push({
            linkId: cl.id,
            kind: 'checklist',
            targetId: cl.id,
            label: 'GSR checklist',
            subtitle: null,
            stage: 'review'
          })
        }
      } else if (entityType === 'evidence_items') {
        const statementLinks = await db
          .select()
          .from(gsrStatementEvidenceLinks)
          .where(eq(gsrStatementEvidenceLinks.evidenceItemId, entityId))
        for (const link of statementLinks) {
          const [stmt] = await db
            .select()
            .from(gsrStatements)
            .where(eq(gsrStatements.id, link.gsrStatementId))
          if (stmt) {
            result.push({
              linkId: link.id,
              kind: 'gsr_statement',
              targetId: stmt.id,
              label: stmt.text.length > 80 ? `${stmt.text.slice(0, 80)}…` : stmt.text,
              subtitle: null,
              stage: 'writing'
            })
          }
        }
      } else if (isInfoEntityType(entityType)) {
        const docLinks = await db
          .select()
          .from(documentInformationLinks)
          .where(
            and(
              eq(documentInformationLinks.entityType, entityType),
              eq(documentInformationLinks.entityId, entityId)
            )
          )
        for (const dl of docLinks) {
          const [doc] = await db.select().from(documents).where(eq(documents.id, dl.documentId))
          if (doc) {
            result.push({
              linkId: dl.id,
              kind: 'document',
              targetId: doc.id,
              label: doc.label,
              subtitle: null,
              stage: 'documents'
            })
          }
        }

        const vrecs = await db
          .select()
          .from(verificationRecords)
          .where(
            and(
              eq(verificationRecords.subjectEntityType, entityType),
              eq(verificationRecords.subjectEntityId, entityId)
            )
          )
        for (const vr of vrecs) {
          result.push({
            linkId: vr.id,
            kind: 'verification_record',
            targetId: vr.id,
            label: vr.whatIsBeingVerified,
            subtitle: null,
            stage: 'verification'
          })
        }
      }

      return result
    }
  )
}
