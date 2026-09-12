import { ipcMain } from 'electron'
import { and, eq, inArray, like, or } from 'drizzle-orm'
import { getDb } from '../db/client'
import {
  educationEntries,
  englishTestScores,
  australianStudyEntries,
  employmentEntries,
  immigrationHistoryEntries,
  sponsors,
  incomeSources,
  documents,
  evidenceItems,
  verificationRecords,
  gsrDocuments,
  gsrSections,
  gsrStatements
} from '../db/schema'
import type { QuickSearchResult } from '../../shared/ipc-types'

const RESULT_LIMIT = 40

export function registerSearchHandlers(): void {
  ipcMain.handle(
    'search:quickSearch',
    async (_e, args: { clientId: string; query: string }): Promise<QuickSearchResult[]> => {
      const { clientId, query } = args
      const q = query.trim()
      if (q.length < 2) return []
      const db = getDb()
      const pattern = `%${q}%`
      const results: QuickSearchResult[] = []

      const education = await db
        .select()
        .from(educationEntries)
        .where(
          and(
            eq(educationEntries.clientId, clientId),
            or(like(educationEntries.institution, pattern), like(educationEntries.course, pattern))
          )
        )
      for (const e of education) {
        results.push({
          kind: 'education_entries',
          id: e.id,
          label: e.institution || '(untitled education entry)',
          subtitle: e.course,
          stage: 'information'
        })
      }

      const englishTests = await db
        .select()
        .from(englishTestScores)
        .where(
          and(
            eq(englishTestScores.clientId, clientId),
            or(
              like(englishTestScores.overallScore, pattern),
              like(englishTestScores.trfReference, pattern)
            )
          )
        )
      for (const t of englishTests) {
        results.push({
          kind: 'english_test_scores',
          id: t.id,
          label: t.overallScore ? `English test — overall ${t.overallScore}` : 'English test score',
          subtitle: t.testDate,
          stage: 'information'
        })
      }

      const australianStudy = await db
        .select()
        .from(australianStudyEntries)
        .where(
          and(
            eq(australianStudyEntries.clientId, clientId),
            or(
              like(australianStudyEntries.institutionProvider, pattern),
              like(australianStudyEntries.course, pattern)
            )
          )
        )
      for (const a of australianStudy) {
        results.push({
          kind: 'australian_study_entries',
          id: a.id,
          label: a.institutionProvider || '(untitled study entry)',
          subtitle: a.course,
          stage: 'information'
        })
      }

      const employment = await db
        .select()
        .from(employmentEntries)
        .where(
          and(
            eq(employmentEntries.clientId, clientId),
            or(like(employmentEntries.employer, pattern), like(employmentEntries.jobTitle, pattern))
          )
        )
      for (const e of employment) {
        results.push({
          kind: 'employment_entries',
          id: e.id,
          label: e.employer || '(untitled employment entry)',
          subtitle: e.jobTitle,
          stage: 'information'
        })
      }

      const immigration = await db
        .select()
        .from(immigrationHistoryEntries)
        .where(
          and(
            eq(immigrationHistoryEntries.clientId, clientId),
            like(immigrationHistoryEntries.description, pattern)
          )
        )
      for (const i of immigration) {
        results.push({
          kind: 'immigration_history_entries',
          id: i.id,
          label: i.description || '(untitled immigration entry)',
          subtitle: i.dateFrom,
          stage: 'information'
        })
      }

      const clientSponsors = await db
        .select()
        .from(sponsors)
        .where(and(eq(sponsors.clientId, clientId), like(sponsors.name, pattern)))
      for (const s of clientSponsors) {
        results.push({
          kind: 'sponsors',
          id: s.id,
          label: s.name,
          subtitle: s.relationshipToClient,
          stage: 'information'
        })
      }

      const allSponsors = await db.select().from(sponsors).where(eq(sponsors.clientId, clientId))
      if (allSponsors.length > 0) {
        const income = await db
          .select()
          .from(incomeSources)
          .where(
            and(
              inArray(
                incomeSources.sponsorId,
                allSponsors.map((s) => s.id)
              ),
              like(incomeSources.description, pattern)
            )
          )
        const sponsorById = new Map(allSponsors.map((s) => [s.id, s]))
        for (const inc of income) {
          const sponsor = sponsorById.get(inc.sponsorId)
          results.push({
            kind: 'income_sources',
            id: inc.id,
            label: inc.description || `${inc.type} income/asset source`,
            subtitle: sponsor ? `Sponsor: ${sponsor.name}` : null,
            stage: 'information'
          })
        }
      }

      const docs = await db
        .select()
        .from(documents)
        .where(
          and(
            eq(documents.clientId, clientId),
            eq(documents.isCurrentVersion, true),
            or(like(documents.label, pattern), like(documents.notes, pattern))
          )
        )
      for (const d of docs) {
        results.push({
          kind: 'documents',
          id: d.id,
          label: d.label,
          subtitle: d.notes,
          stage: 'documents'
        })
      }

      const evidence = await db
        .select()
        .from(evidenceItems)
        .where(
          and(
            eq(evidenceItems.clientId, clientId),
            or(
              like(evidenceItems.title, pattern),
              like(evidenceItems.source, pattern),
              like(evidenceItems.excerpt, pattern),
              like(evidenceItems.provesWhat, pattern)
            )
          )
        )
      for (const ev of evidence) {
        results.push({
          kind: 'evidence_items',
          id: ev.id,
          label: ev.title,
          subtitle: ev.source,
          stage: 'evidence'
        })
      }

      const verification = await db
        .select()
        .from(verificationRecords)
        .where(
          and(
            eq(verificationRecords.clientId, clientId),
            like(verificationRecords.whatIsBeingVerified, pattern)
          )
        )
      for (const v of verification) {
        results.push({
          kind: 'verification_records',
          id: v.id,
          label: v.whatIsBeingVerified,
          subtitle: v.contactName,
          stage: 'verification'
        })
      }

      const [gsrDoc] = await db
        .select()
        .from(gsrDocuments)
        .where(eq(gsrDocuments.clientId, clientId))
      if (gsrDoc) {
        const sections = await db
          .select()
          .from(gsrSections)
          .where(and(eq(gsrSections.gsrDocumentId, gsrDoc.id), like(gsrSections.title, pattern)))
        for (const s of sections) {
          results.push({
            kind: 'gsr_sections',
            id: s.id,
            label: s.title,
            subtitle: 'GSR section',
            stage: 'writing'
          })
        }

        const allSections = await db
          .select()
          .from(gsrSections)
          .where(eq(gsrSections.gsrDocumentId, gsrDoc.id))
        if (allSections.length > 0) {
          const sectionById = new Map(allSections.map((s) => [s.id, s]))
          const statements = await db
            .select()
            .from(gsrStatements)
            .where(
              and(
                inArray(
                  gsrStatements.gsrSectionId,
                  allSections.map((s) => s.id)
                ),
                like(gsrStatements.text, pattern)
              )
            )
          for (const stmt of statements) {
            const section = sectionById.get(stmt.gsrSectionId)
            results.push({
              kind: 'gsr_statements',
              id: stmt.id,
              label: stmt.text.length > 80 ? `${stmt.text.slice(0, 80)}…` : stmt.text,
              subtitle: section ? section.title : null,
              stage: 'writing'
            })
          }
        }
      }

      return results.slice(0, RESULT_LIMIT)
    }
  )
}
