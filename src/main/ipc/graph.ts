import { ipcMain } from 'electron'
import { eq } from 'drizzle-orm'
import { getDb } from '../db/client'
import {
  clients,
  personalProfiles,
  educationEntries,
  englishTestScores,
  australianStudyEntries,
  employmentEntries,
  immigrationHistoryEntries,
  sponsors,
  incomeSources,
  documents,
  documentInformationLinks,
  documentDocumentLinks,
  verificationRecords,
  verificationDocuments,
  evidenceItems,
  gsrDocuments,
  gsrSections,
  gsrStatements,
  gsrStatementEvidenceLinks
} from '../db/schema'
import type { CaseGraph, GraphEdge, GraphNode, GraphNodeKind } from '../../shared/ipc-types'

function nodeId(kind: GraphNodeKind, entityId: string): string {
  return `${kind}:${entityId}`
}

export function registerGraphHandlers(): void {
  ipcMain.handle('graph:forClient', async (_e, clientId: string): Promise<CaseGraph> => {
    const db = getDb()
    const nodes: GraphNode[] = []
    const edges: GraphEdge[] = []
    /** entityId -> node id, for resolving generic entityType/entityId link rows. */
    const infoNodeByEntityId = new Map<string, string>()

    const [client] = await db.select().from(clients).where(eq(clients.id, clientId))
    if (!client) return { nodes: [], edges: [] }
    nodes.push({
      id: nodeId('client', client.id),
      kind: 'client',
      entityId: client.id,
      label: client.fullName,
      stage: 'information'
    })

    const [profile] = await db
      .select()
      .from(personalProfiles)
      .where(eq(personalProfiles.clientId, clientId))
    if (profile) {
      const id = nodeId('personal_profiles', profile.id)
      nodes.push({
        id,
        kind: 'personal_profiles',
        entityId: profile.id,
        label: 'Personal profile',
        stage: 'information'
      })
      infoNodeByEntityId.set(profile.id, id)
      edges.push({ source: nodeId('client', client.id), target: id })
    }

    const education = await db
      .select()
      .from(educationEntries)
      .where(eq(educationEntries.clientId, clientId))
    for (const e of education) {
      const id = nodeId('education_entries', e.id)
      nodes.push({
        id,
        kind: 'education_entries',
        entityId: e.id,
        label: e.institution || '(untitled education)',
        stage: 'information'
      })
      infoNodeByEntityId.set(e.id, id)
    }

    const englishTests = await db
      .select()
      .from(englishTestScores)
      .where(eq(englishTestScores.clientId, clientId))
    for (const t of englishTests) {
      const id = nodeId('english_test_scores', t.id)
      nodes.push({
        id,
        kind: 'english_test_scores',
        entityId: t.id,
        label: t.overallScore ? `English test ${t.overallScore}` : 'English test',
        stage: 'information'
      })
      infoNodeByEntityId.set(t.id, id)
    }

    const australianStudy = await db
      .select()
      .from(australianStudyEntries)
      .where(eq(australianStudyEntries.clientId, clientId))
    for (const a of australianStudy) {
      const id = nodeId('australian_study_entries', a.id)
      nodes.push({
        id,
        kind: 'australian_study_entries',
        entityId: a.id,
        label: a.institutionProvider || '(untitled study)',
        stage: 'information'
      })
      infoNodeByEntityId.set(a.id, id)
    }

    const employment = await db
      .select()
      .from(employmentEntries)
      .where(eq(employmentEntries.clientId, clientId))
    for (const e of employment) {
      const id = nodeId('employment_entries', e.id)
      nodes.push({
        id,
        kind: 'employment_entries',
        entityId: e.id,
        label: e.employer || '(untitled employer)',
        stage: 'information'
      })
      infoNodeByEntityId.set(e.id, id)
    }

    const immigration = await db
      .select()
      .from(immigrationHistoryEntries)
      .where(eq(immigrationHistoryEntries.clientId, clientId))
    for (const i of immigration) {
      const id = nodeId('immigration_history_entries', i.id)
      nodes.push({
        id,
        kind: 'immigration_history_entries',
        entityId: i.id,
        label: i.description ? i.description.slice(0, 40) : '(untitled entry)',
        stage: 'information'
      })
      infoNodeByEntityId.set(i.id, id)
    }

    const clientSponsors = await db.select().from(sponsors).where(eq(sponsors.clientId, clientId))
    for (const s of clientSponsors) {
      const id = nodeId('sponsors', s.id)
      nodes.push({ id, kind: 'sponsors', entityId: s.id, label: s.name, stage: 'information' })
      infoNodeByEntityId.set(s.id, id)
      edges.push({ source: nodeId('client', client.id), target: id })

      const income = await db.select().from(incomeSources).where(eq(incomeSources.sponsorId, s.id))
      for (const inc of income) {
        const incId = nodeId('income_sources', inc.id)
        nodes.push({
          id: incId,
          kind: 'income_sources',
          entityId: inc.id,
          label: inc.description || `${inc.type} income`,
          stage: 'information'
        })
        infoNodeByEntityId.set(inc.id, incId)
        edges.push({ source: id, target: incId })
      }
    }

    const docs = await db.select().from(documents).where(eq(documents.clientId, clientId))
    for (const d of docs) {
      nodes.push({
        id: nodeId('documents', d.id),
        kind: 'documents',
        entityId: d.id,
        label: d.label,
        stage: 'documents'
      })
    }

    const verification = await db
      .select()
      .from(verificationRecords)
      .where(eq(verificationRecords.clientId, clientId))
    for (const v of verification) {
      const id = nodeId('verification_records', v.id)
      nodes.push({
        id,
        kind: 'verification_records',
        entityId: v.id,
        label: v.whatIsBeingVerified,
        stage: 'verification'
      })
      const subjectNode = infoNodeByEntityId.get(v.subjectEntityId)
      if (subjectNode) edges.push({ source: id, target: subjectNode })
    }

    const evidence = await db
      .select()
      .from(evidenceItems)
      .where(eq(evidenceItems.clientId, clientId))
    for (const ev of evidence) {
      const id = nodeId('evidence_items', ev.id)
      nodes.push({
        id,
        kind: 'evidence_items',
        entityId: ev.id,
        label: ev.title,
        stage: 'evidence'
      })
      if (ev.documentId) edges.push({ source: id, target: nodeId('documents', ev.documentId) })
    }

    const [gsrDoc] = await db.select().from(gsrDocuments).where(eq(gsrDocuments.clientId, clientId))
    if (gsrDoc) {
      const gsrDocNodeId = nodeId('gsr_document', gsrDoc.id)
      nodes.push({
        id: gsrDocNodeId,
        kind: 'gsr_document',
        entityId: gsrDoc.id,
        label: gsrDoc.title,
        stage: 'writing'
      })
      edges.push({ source: nodeId('client', client.id), target: gsrDocNodeId })

      const sections = await db
        .select()
        .from(gsrSections)
        .where(eq(gsrSections.gsrDocumentId, gsrDoc.id))
      for (const s of sections) {
        const sectionNodeId = nodeId('gsr_sections', s.id)
        nodes.push({
          id: sectionNodeId,
          kind: 'gsr_sections',
          entityId: s.id,
          label: s.title,
          stage: 'writing'
        })
        edges.push({ source: gsrDocNodeId, target: sectionNodeId })

        const statements = await db
          .select()
          .from(gsrStatements)
          .where(eq(gsrStatements.gsrSectionId, s.id))
        for (const stmt of statements) {
          const stmtNodeId = nodeId('gsr_statements', stmt.id)
          nodes.push({
            id: stmtNodeId,
            kind: 'gsr_statements',
            entityId: stmt.id,
            label: stmt.text.length > 50 ? `${stmt.text.slice(0, 50)}…` : stmt.text,
            stage: 'writing'
          })
          edges.push({ source: sectionNodeId, target: stmtNodeId })

          const evidenceLinks = await db
            .select()
            .from(gsrStatementEvidenceLinks)
            .where(eq(gsrStatementEvidenceLinks.gsrStatementId, stmt.id))
          for (const link of evidenceLinks) {
            edges.push({
              source: stmtNodeId,
              target: nodeId('evidence_items', link.evidenceItemId)
            })
          }
        }
      }
    }

    for (const d of docs) {
      const links = await db
        .select()
        .from(documentInformationLinks)
        .where(eq(documentInformationLinks.documentId, d.id))
      for (const link of links) {
        const target = infoNodeByEntityId.get(link.entityId)
        if (target) edges.push({ source: nodeId('documents', d.id), target })
      }

      const docLinksOut = await db
        .select()
        .from(documentDocumentLinks)
        .where(eq(documentDocumentLinks.documentId, d.id))
      for (const link of docLinksOut) {
        edges.push({
          source: nodeId('documents', d.id),
          target: nodeId('documents', link.relatedDocumentId)
        })
      }
    }

    for (const v of verification) {
      const linkedDocs = await db
        .select()
        .from(verificationDocuments)
        .where(eq(verificationDocuments.verificationRecordId, v.id))
      for (const link of linkedDocs) {
        edges.push({
          source: nodeId('verification_records', v.id),
          target: nodeId('documents', link.documentId)
        })
      }
    }

    return { nodes, edges }
  })
}
