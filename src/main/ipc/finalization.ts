import { ipcMain, shell } from 'electron'
import { writeFileSync, readFileSync, existsSync, mkdirSync } from 'fs'
import { join, extname } from 'path'
import { eq, asc, and } from 'drizzle-orm'
import { Document, Packer, Paragraph, HeadingLevel, TextRun } from 'docx'
import { PDFDocument, StandardFonts, rgb, type PDFFont, type PDFPage } from 'pdf-lib'
import { getDb } from '../db/client'
import { clients, gsrDocuments, gsrSections, documents } from '../db/schema'
import { getClientFolder } from '../storage/paths'
import { absoluteDocumentPath } from '../storage/documentFiles'
import { logAudit } from '../audit'
import type { ExportResult, GsrDocumentStatus, MergeResult } from '../../shared/ipc-types'

function sanitizeFilename(name: string): string {
  return name.replace(/[\\/:*?"<>|]/g, '_').trim() || 'Untitled'
}

function getExportsFolder(clientId: string): string {
  const folder = getClientFolder(clientId, 'exports')
  mkdirSync(folder, { recursive: true })
  return folder
}

async function loadGsrContent(
  clientId: string
): Promise<{ clientName: string; sections: { title: string; content: string }[] }> {
  const db = getDb()
  const [client] = await db.select().from(clients).where(eq(clients.id, clientId))
  const [doc] = await db.select().from(gsrDocuments).where(eq(gsrDocuments.clientId, clientId))
  if (!doc) return { clientName: client?.fullName ?? 'Client', sections: [] }

  const sections = await db
    .select()
    .from(gsrSections)
    .where(eq(gsrSections.gsrDocumentId, doc.id))
    .orderBy(asc(gsrSections.orderIndex))

  return {
    clientName: client?.fullName ?? 'Client',
    sections: sections.map((s) => ({ title: s.title, content: s.contentHtml ?? '' }))
  }
}

async function buildWordDocument(clientId: string): Promise<Buffer> {
  const { clientName, sections } = await loadGsrContent(clientId)

  const children: Paragraph[] = [
    new Paragraph({
      heading: HeadingLevel.TITLE,
      children: [new TextRun('Genuine Student Requirement Statement')]
    }),
    new Paragraph({ children: [new TextRun({ text: clientName, bold: true })] }),
    new Paragraph({ text: '' })
  ]

  for (const section of sections) {
    children.push(new Paragraph({ heading: HeadingLevel.HEADING_1, text: section.title }))
    const paragraphs = section.content.split(/\n+/).filter((p) => p.trim().length > 0)
    if (paragraphs.length === 0) {
      children.push(
        new Paragraph({ children: [new TextRun({ text: '[Not yet written]', italics: true })] })
      )
    } else {
      for (const p of paragraphs) children.push(new Paragraph({ text: p }))
    }
    children.push(new Paragraph({ text: '' }))
  }

  const doc = new Document({ sections: [{ children }] })
  return Packer.toBuffer(doc)
}

function wrapText(text: string, font: PDFFont, size: number, maxWidth: number): string[] {
  const words = text.split(/\s+/)
  const lines: string[] = []
  let current = ''
  for (const word of words) {
    const candidate = current ? `${current} ${word}` : word
    if (font.widthOfTextAtSize(candidate, size) > maxWidth && current) {
      lines.push(current)
      current = word
    } else {
      current = candidate
    }
  }
  if (current) lines.push(current)
  return lines
}

async function buildPdfDocument(clientId: string): Promise<Buffer> {
  const { clientName, sections } = await loadGsrContent(clientId)

  const pdf = await PDFDocument.create()
  const font = await pdf.embedFont(StandardFonts.Helvetica)
  const boldFont = await pdf.embedFont(StandardFonts.HelveticaBold)

  const pageWidth = 595.28
  const pageHeight = 841.89
  const margin = 56
  const maxWidth = pageWidth - margin * 2
  const bodySize = 11
  const lineHeight = 15

  let page: PDFPage = pdf.addPage([pageWidth, pageHeight])
  let y = pageHeight - margin

  function ensureSpace(needed: number): void {
    if (y - needed < margin) {
      page = pdf.addPage([pageWidth, pageHeight])
      y = pageHeight - margin
    }
  }

  function drawLine(text: string, size: number, useFont: PDFFont, gapAfter = 0): void {
    ensureSpace(lineHeight)
    page.drawText(text, { x: margin, y, size, font: useFont, color: rgb(0.1, 0.1, 0.12) })
    y -= lineHeight + gapAfter
  }

  drawLine('Genuine Student Requirement Statement', 18, boldFont, 6)
  drawLine(clientName, 13, font, 16)

  for (const section of sections) {
    ensureSpace(lineHeight * 2)
    drawLine(section.title, 14, boldFont, 6)

    const paragraphs = section.content.split(/\n+/).filter((p) => p.trim().length > 0)
    if (paragraphs.length === 0) {
      drawLine('[Not yet written]', bodySize, font, 10)
      continue
    }
    for (const p of paragraphs) {
      for (const line of wrapText(p, font, bodySize, maxWidth)) drawLine(line, bodySize, font)
      y -= 6
    }
  }

  return Buffer.from(await pdf.save())
}

export function registerFinalizationHandlers(): void {
  ipcMain.handle(
    'finalization:getStatus',
    async (_e, clientId: string): Promise<GsrDocumentStatus> => {
      const db = getDb()
      const [doc] = await db.select().from(gsrDocuments).where(eq(gsrDocuments.clientId, clientId))
      return doc?.status ?? 'drafting'
    }
  )

  ipcMain.handle(
    'finalization:setStatus',
    async (_e, args: { clientId: string; status: GsrDocumentStatus }) => {
      const db = getDb()
      const [doc] = await db
        .select()
        .from(gsrDocuments)
        .where(eq(gsrDocuments.clientId, args.clientId))
      if (!doc) throw new Error('No GSR document found for this client yet')
      const [updated] = await db
        .update(gsrDocuments)
        .set({ status: args.status, updatedAt: new Date().toISOString() })
        .where(eq(gsrDocuments.id, doc.id))
        .returning()
      logAudit({
        clientId: args.clientId,
        entityType: 'gsr_documents',
        entityId: doc.id,
        action: 'update',
        detail: JSON.stringify({ status: args.status })
      })
      return updated.status
    }
  )

  ipcMain.handle('finalization:exportWord', async (_e, clientId: string): Promise<ExportResult> => {
    const db = getDb()
    const [client] = await db.select().from(clients).where(eq(clients.id, clientId))
    const buffer = await buildWordDocument(clientId)
    const filename = `${sanitizeFilename(client?.fullName ?? 'Client')} - GSR.docx`
    const outPath = join(getExportsFolder(clientId), filename)
    writeFileSync(outPath, buffer)
    logAudit({
      clientId,
      entityType: 'gsr_documents',
      entityId: clientId,
      action: 'update',
      detail: 'export_word'
    })
    return { path: outPath, filename }
  })

  ipcMain.handle('finalization:exportPdf', async (_e, clientId: string): Promise<ExportResult> => {
    const db = getDb()
    const [client] = await db.select().from(clients).where(eq(clients.id, clientId))
    const buffer = await buildPdfDocument(clientId)
    const filename = `${sanitizeFilename(client?.fullName ?? 'Client')} - GSR.pdf`
    const outPath = join(getExportsFolder(clientId), filename)
    writeFileSync(outPath, buffer)
    logAudit({
      clientId,
      entityType: 'gsr_documents',
      entityId: clientId,
      action: 'update',
      detail: 'export_pdf'
    })
    return { path: outPath, filename }
  })

  ipcMain.handle(
    'finalization:mergeEvidencePack',
    async (_e, clientId: string): Promise<MergeResult> => {
      const db = getDb()
      const [client] = await db.select().from(clients).where(eq(clients.id, clientId))
      const docRows = await db
        .select()
        .from(documents)
        .where(and(eq(documents.clientId, clientId), eq(documents.isCurrentVersion, true)))
        .orderBy(asc(documents.category), asc(documents.label))

      const merged = await PDFDocument.create()
      let mergedCount = 0
      let skippedCount = 0

      for (const row of docRows) {
        const abs = absoluteDocumentPath(clientId, row.filePath)
        if (extname(abs).toLowerCase() !== '.pdf' || !existsSync(abs)) {
          skippedCount++
          continue
        }
        try {
          const bytes = readFileSync(abs)
          const source = await PDFDocument.load(bytes)
          const pages = await merged.copyPages(source, source.getPageIndices())
          pages.forEach((p) => merged.addPage(p))
          mergedCount++
        } catch {
          skippedCount++
        }
      }

      if (mergedCount === 0) {
        throw new Error(
          skippedCount > 0
            ? `No mergeable PDFs found — ${skippedCount} document(s) were skipped because they're not PDFs.`
            : 'No documents to merge yet — add some on the Documents tab first.'
        )
      }

      const filename = `${sanitizeFilename(client?.fullName ?? 'Client')} - Evidence Pack.pdf`
      const outPath = join(getExportsFolder(clientId), filename)
      writeFileSync(outPath, await merged.save())

      logAudit({
        clientId,
        entityType: 'document_merges',
        entityId: clientId,
        action: 'create',
        detail: JSON.stringify({ mergedCount, skippedCount })
      })
      return { path: outPath, filename, mergedCount, skippedCount }
    }
  )

  ipcMain.handle('finalization:openExportsFolder', async (_e, clientId: string) => {
    await shell.openPath(getExportsFolder(clientId))
    return { ok: true }
  })

  ipcMain.handle('finalization:revealFile', async (_e, path: string) => {
    shell.showItemInFolder(path)
    return { ok: true }
  })
}
