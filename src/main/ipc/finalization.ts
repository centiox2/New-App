import { ipcMain, shell } from 'electron'
import { writeFileSync, readFileSync, existsSync, mkdirSync } from 'fs'
import { join, extname } from 'path'
import { eq, asc, and } from 'drizzle-orm'
import { JSDOM } from 'jsdom'
import {
  Document,
  Packer,
  Paragraph,
  HeadingLevel,
  TextRun,
  Table,
  TableRow,
  TableCell,
  WidthType,
  ExternalHyperlink,
  AlignmentType,
  LevelFormat
} from 'docx'
import { PDFDocument, StandardFonts, rgb, type PDFFont, type PDFPage } from 'pdf-lib'
import { getDb } from '../db/client'
import {
  clients,
  gsrDocuments,
  gsrSections,
  documents,
  personalProfiles,
  australianStudyEntries
} from '../db/schema'
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

interface GsrHeaderInfo {
  fullName: string
  dateOfBirth: string | null
  passportNumber: string | null
  course: string | null
  provider: string | null
}

interface GsrExportContent {
  header: GsrHeaderInfo
  sections: { title: string; html: string }[]
}

async function loadGsrContent(clientId: string): Promise<GsrExportContent> {
  const db = getDb()
  const [client] = await db.select().from(clients).where(eq(clients.id, clientId))
  const [profile] = await db
    .select()
    .from(personalProfiles)
    .where(eq(personalProfiles.clientId, clientId))
  const [study] = await db
    .select()
    .from(australianStudyEntries)
    .where(eq(australianStudyEntries.clientId, clientId))

  const header: GsrHeaderInfo = {
    fullName: client?.fullName ?? 'Client',
    dateOfBirth: profile?.dateOfBirth ?? null,
    passportNumber: profile?.passportNumber ?? null,
    course: study?.course ?? null,
    provider: study?.institutionProvider ?? null
  }

  const [doc] = await db.select().from(gsrDocuments).where(eq(gsrDocuments.clientId, clientId))
  if (!doc) return { header, sections: [] }

  const sections = await db
    .select()
    .from(gsrSections)
    .where(eq(gsrSections.gsrDocumentId, doc.id))
    .orderBy(asc(gsrSections.orderIndex))

  return {
    header,
    sections: sections.map((s) => ({ title: s.title, html: s.contentHtml ?? '' }))
  }
}

// --- Word (.docx) rendering --------------------------------------------

interface InlineMarks {
  bold: boolean
  italics: boolean
  underline: boolean
  link?: string
}

/** Walks a text/element node's children into docx TextRuns/ExternalHyperlinks, tracking bold/italic/underline/link marks. */
function inlineToRuns(node: globalThis.Node, marks: InlineMarks): (TextRun | ExternalHyperlink)[] {
  const runs: (TextRun | ExternalHyperlink)[] = []
  for (const child of Array.from(node.childNodes)) {
    if (child.nodeType === 3) {
      const text = child.textContent ?? ''
      if (!text) continue
      const run = new TextRun({
        text,
        bold: marks.bold,
        italics: marks.italics,
        underline: marks.underline ? {} : undefined,
        color: marks.link ? '0563C1' : undefined
      })
      if (marks.link) {
        runs.push(new ExternalHyperlink({ link: marks.link, children: [run] }))
      } else {
        runs.push(run)
      }
    } else if (child.nodeType === 1) {
      const el = child as Element
      const tag = el.tagName.toLowerCase()
      if (tag === 'br') {
        runs.push(new TextRun({ text: '', break: 1 }))
        continue
      }
      const nextMarks: InlineMarks = {
        bold: marks.bold || tag === 'strong' || tag === 'b',
        italics: marks.italics || tag === 'em' || tag === 'i',
        underline: marks.underline || tag === 'u',
        link: tag === 'a' ? (el.getAttribute('href') ?? undefined) : marks.link
      }
      runs.push(...inlineToRuns(el, nextMarks))
    }
  }
  return runs
}

const NO_MARKS: InlineMarks = { bold: false, italics: false, underline: false }
const NUMBERED_LIST_REF = 'gsr-numbered-list'

function tableToDocx(tableEl: Element): Table {
  const rows = Array.from(tableEl.querySelectorAll(':scope > tbody > tr, :scope > tr'))
  const docxRows = rows.map(
    (row) =>
      new TableRow({
        children: Array.from(row.querySelectorAll(':scope > th, :scope > td')).map(
          (cell) =>
            new TableCell({
              width: { size: 100 / Math.max(row.children.length, 1), type: WidthType.PERCENTAGE },
              shading: cell.tagName.toLowerCase() === 'th' ? { fill: 'F0EEF7' } : undefined,
              children: [
                new Paragraph({
                  children: inlineToRuns(cell, {
                    ...NO_MARKS,
                    bold: cell.tagName.toLowerCase() === 'th'
                  })
                })
              ]
            })
        )
      })
  )
  return new Table({ rows: docxRows, width: { size: 100, type: WidthType.PERCENTAGE } })
}

/** Converts one section's parsed HTML body into docx block elements (paragraphs/tables). */
function blocksToDocx(body: Element): (Paragraph | Table)[] {
  const out: (Paragraph | Table)[] = []
  for (const el of Array.from(body.children)) {
    const tag = el.tagName.toLowerCase()
    if (tag === 'h1' || tag === 'h2' || tag === 'h3') {
      const level =
        tag === 'h1'
          ? HeadingLevel.HEADING_1
          : tag === 'h2'
            ? HeadingLevel.HEADING_2
            : HeadingLevel.HEADING_3
      out.push(new Paragraph({ heading: level, children: inlineToRuns(el, NO_MARKS) }))
    } else if (tag === 'p') {
      const runs = inlineToRuns(el, NO_MARKS)
      out.push(new Paragraph({ children: runs.length ? runs : [new TextRun('')] }))
    } else if (tag === 'ul' || tag === 'ol') {
      for (const li of Array.from(el.querySelectorAll(':scope > li'))) {
        out.push(
          new Paragraph({
            bullet: tag === 'ul' ? { level: 0 } : undefined,
            numbering: tag === 'ol' ? { reference: NUMBERED_LIST_REF, level: 0 } : undefined,
            children: inlineToRuns(li, NO_MARKS)
          })
        )
      }
    } else if (tag === 'table') {
      out.push(tableToDocx(el))
      out.push(new Paragraph({ text: '' }))
    } else if (tag === 'blockquote') {
      out.push(
        new Paragraph({
          indent: { left: 360 },
          children: inlineToRuns(el, { ...NO_MARKS, italics: true })
        })
      )
    } else {
      const text = el.textContent?.trim()
      if (text) out.push(new Paragraph({ text }))
    }
  }
  return out
}

function headerParagraphs(header: GsrHeaderInfo): Paragraph[] {
  const fmt = (v: string | null): string => v || '—'
  return [
    new Paragraph({
      heading: HeadingLevel.TITLE,
      children: [new TextRun('Genuine Student Requirement Statement')]
    }),
    new Paragraph({ children: [new TextRun({ text: header.fullName, bold: true, size: 26 })] }),
    new Paragraph({
      children: [
        new TextRun(`Date of birth: ${fmt(header.dateOfBirth)}    `),
        new TextRun(`Passport number: ${fmt(header.passportNumber)}`)
      ]
    }),
    new Paragraph({
      children: [
        new TextRun(`Course: ${fmt(header.course)}    `),
        new TextRun(`Provider: ${fmt(header.provider)}`)
      ]
    }),
    new Paragraph({ text: '' })
  ]
}

async function buildWordDocument(clientId: string): Promise<Buffer> {
  const { header, sections } = await loadGsrContent(clientId)

  const children: (Paragraph | Table)[] = [...headerParagraphs(header)]

  for (const section of sections) {
    children.push(new Paragraph({ heading: HeadingLevel.HEADING_1, text: section.title }))
    const body = new JSDOM(section.html || '').window.document.body
    const blocks = blocksToDocx(body)
    if (blocks.length === 0) {
      children.push(
        new Paragraph({ children: [new TextRun({ text: '[Not yet written]', italics: true })] })
      )
    } else {
      children.push(...blocks)
    }
    children.push(new Paragraph({ text: '' }))
  }

  const doc = new Document({
    numbering: {
      config: [
        {
          reference: NUMBERED_LIST_REF,
          levels: [
            {
              level: 0,
              format: LevelFormat.DECIMAL,
              text: '%1.',
              alignment: AlignmentType.START,
              style: { paragraph: { indent: { left: 360, hanging: 260 } } }
            }
          ]
        }
      ]
    },
    sections: [{ children }]
  })
  return Packer.toBuffer(doc)
}

// --- PDF rendering -------------------------------------------------------

interface StyledWord {
  text: string
  bold: boolean
  italic: boolean
  underline: boolean
  link?: string
  break?: boolean
}

function collectWords(node: globalThis.Node, marks: InlineMarks): StyledWord[] {
  const words: StyledWord[] = []
  for (const child of Array.from(node.childNodes)) {
    if (child.nodeType === 3) {
      const text = child.textContent ?? ''
      for (const w of text.split(/\s+/).filter(Boolean)) {
        words.push({
          text: w,
          bold: marks.bold,
          italic: marks.italics,
          underline: marks.underline,
          link: marks.link
        })
      }
    } else if (child.nodeType === 1) {
      const el = child as Element
      const tag = el.tagName.toLowerCase()
      if (tag === 'br') {
        words.push({ text: '', bold: false, italic: false, underline: false, break: true })
        continue
      }
      const nextMarks: InlineMarks = {
        bold: marks.bold || tag === 'strong' || tag === 'b',
        italics: marks.italics || tag === 'em' || tag === 'i',
        underline: marks.underline || tag === 'u',
        link: tag === 'a' ? (el.getAttribute('href') ?? undefined) : marks.link
      }
      words.push(...collectWords(el, nextMarks))
    }
  }
  return words
}

interface PdfFonts {
  regular: PDFFont
  bold: PDFFont
  italic: PDFFont
  boldItalic: PDFFont
}

class PdfWriter {
  private pdf: PDFDocument
  private fonts: PdfFonts
  private pageWidth = 595.28
  private pageHeight = 841.89
  private margin = 56
  page!: PDFPage
  y = 0

  private constructor(pdf: PDFDocument, fonts: PdfFonts) {
    this.pdf = pdf
    this.fonts = fonts
    this.newPage()
  }

  static async create(): Promise<PdfWriter> {
    const pdf = await PDFDocument.create()
    const fonts: PdfFonts = {
      regular: await pdf.embedFont(StandardFonts.Helvetica),
      bold: await pdf.embedFont(StandardFonts.HelveticaBold),
      italic: await pdf.embedFont(StandardFonts.HelveticaOblique),
      boldItalic: await pdf.embedFont(StandardFonts.HelveticaBoldOblique)
    }
    return new PdfWriter(pdf, fonts)
  }

  get maxWidth(): number {
    return this.pageWidth - this.margin * 2
  }

  newPage(): void {
    this.page = this.pdf.addPage([this.pageWidth, this.pageHeight])
    this.y = this.pageHeight - this.margin
  }

  ensureSpace(needed: number): void {
    if (this.y - needed < this.margin) this.newPage()
  }

  fontFor(bold: boolean, italic: boolean): PDFFont {
    if (bold && italic) return this.fonts.boldItalic
    if (bold) return this.fonts.bold
    if (italic) return this.fonts.italic
    return this.fonts.regular
  }

  /** Draws a plain heading/label line (no mixed styling needed). */
  drawLine(text: string, size: number, bold = false, gapAfter = 6): void {
    const lineHeight = size * 1.35
    this.ensureSpace(lineHeight)
    this.page.drawText(text, {
      x: this.margin,
      y: this.y,
      size,
      font: this.fontFor(bold, false),
      color: rgb(0.1, 0.1, 0.12)
    })
    this.y -= lineHeight + gapAfter
  }

  /** Word-wraps a run of styled words starting at a given left offset, returning nothing (mutates y). */
  drawWords(words: StyledWord[], size: number, leftOffset = 0, gapAfter = 8): void {
    if (words.length === 0) return
    const lineHeight = size * 1.45
    const left = this.margin + leftOffset
    const maxX = this.margin + this.maxWidth
    let x = left
    this.ensureSpace(lineHeight)
    for (const word of words) {
      if (word.break) {
        x = left
        this.y -= lineHeight
        this.ensureSpace(lineHeight)
        continue
      }
      const font = this.fontFor(word.bold, word.italic)
      const withSpace = `${word.text} `
      const width = font.widthOfTextAtSize(withSpace, size)
      if (x + width > maxX && x > left) {
        x = left
        this.y -= lineHeight
        this.ensureSpace(lineHeight)
      }
      const color = word.link ? rgb(0.02, 0.2, 0.6) : rgb(0.1, 0.1, 0.12)
      this.page.drawText(word.text, { x, y: this.y, size, font, color })
      if (word.underline || word.link) {
        const wordWidth = font.widthOfTextAtSize(word.text, size)
        this.page.drawLine({
          start: { x, y: this.y - 1.5 },
          end: { x: x + wordWidth, y: this.y - 1.5 },
          thickness: 0.6,
          color
        })
      }
      x += width
    }
    this.y -= lineHeight + gapAfter
  }

  /** Draws a bullet/number marker at the left margin, without advancing y — the wrapped item text is drawn on the same baseline via drawWords(). */
  drawListMarker(prefix: string): void {
    this.page.drawText(prefix, {
      x: this.margin,
      y: this.y,
      size: 11,
      font: this.fontFor(false, false),
      color: rgb(0.1, 0.1, 0.12)
    })
  }

  drawTable(tableEl: Element): void {
    const rows = Array.from(tableEl.querySelectorAll(':scope > tbody > tr, :scope > tr'))
    if (rows.length === 0) return
    const colCount = Math.max(
      ...rows.map((r) => r.querySelectorAll(':scope > th, :scope > td').length),
      1
    )
    const colWidth = this.maxWidth / colCount
    const cellFontSize = 9
    const cellPad = 5

    for (const row of rows) {
      const cells = Array.from(row.querySelectorAll(':scope > th, :scope > td'))
      const isHeader = cells.some((c) => c.tagName.toLowerCase() === 'th')
      const wrappedCells = cells.map((cell) =>
        wrapStyledWords(
          collectWords(cell, { ...NO_MARKS, bold: isHeader }),
          this.fontFor(isHeader, false),
          cellFontSize,
          colWidth - cellPad * 2
        )
      )
      const rowLines = Math.max(...wrappedCells.map((w) => w.length), 1)
      const rowHeight = rowLines * (cellFontSize * 1.4) + cellPad * 2
      this.ensureSpace(rowHeight)

      const rowTop = this.y
      let cellX = this.margin
      for (let i = 0; i < cells.length; i++) {
        this.page.drawRectangle({
          x: cellX,
          y: rowTop - rowHeight,
          width: colWidth,
          height: rowHeight,
          borderColor: rgb(0.78, 0.78, 0.8),
          borderWidth: 0.6,
          color: isHeader ? rgb(0.94, 0.94, 0.97) : undefined
        })
        let lineY = rowTop - cellPad - cellFontSize
        for (const line of wrappedCells[i]) {
          this.page.drawText(line, {
            x: cellX + cellPad,
            y: lineY,
            size: cellFontSize,
            font: this.fontFor(isHeader, false),
            color: rgb(0.1, 0.1, 0.12)
          })
          lineY -= cellFontSize * 1.4
        }
        cellX += colWidth
      }
      this.y = rowTop - rowHeight
    }
    this.y -= 10
  }

  async save(): Promise<Buffer> {
    return Buffer.from(await this.pdf.save())
  }
}

/** Pre-wraps styled words into plain text lines for table cells (single font per cell, so no per-word style needed). */
function wrapStyledWords(
  words: StyledWord[],
  font: PDFFont,
  size: number,
  maxWidth: number
): string[] {
  const lines: string[] = []
  let current = ''
  for (const word of words) {
    if (word.break) {
      if (current) lines.push(current)
      current = ''
      continue
    }
    const candidate = current ? `${current} ${word.text}` : word.text
    if (font.widthOfTextAtSize(candidate, size) > maxWidth && current) {
      lines.push(current)
      current = word.text
    } else {
      current = candidate
    }
  }
  if (current) lines.push(current)
  return lines.length ? lines : ['']
}

function renderBodyToPdf(writer: PdfWriter, body: Element): void {
  for (const el of Array.from(body.children)) {
    const tag = el.tagName.toLowerCase()
    if (tag === 'h1' || tag === 'h2' || tag === 'h3') {
      const size = tag === 'h1' ? 16 : tag === 'h2' ? 14 : 12.5
      writer.drawWords(collectWords(el, NO_MARKS), size, 0, 8)
    } else if (tag === 'p') {
      writer.drawWords(collectWords(el, NO_MARKS), 11, 0, 8)
    } else if (tag === 'ul' || tag === 'ol') {
      let i = 1
      for (const li of Array.from(el.querySelectorAll(':scope > li'))) {
        const prefix = tag === 'ul' ? '•' : `${i++}.`
        writer.ensureSpace(16)
        writer.drawListMarker(prefix)
        writer.drawWords(collectWords(li, NO_MARKS), 11, 18, 6)
      }
    } else if (tag === 'table') {
      writer.drawTable(el)
    } else if (tag === 'blockquote') {
      writer.drawWords(collectWords(el, { ...NO_MARKS, italics: true }), 11, 14, 8)
    } else {
      const text = el.textContent?.trim()
      if (text) writer.drawWords([{ text, bold: false, italic: false, underline: false }], 11, 0, 8)
    }
  }
}

async function buildPdfDocument(clientId: string): Promise<Buffer> {
  const { header, sections } = await loadGsrContent(clientId)
  const writer = await PdfWriter.create()

  writer.drawLine('Genuine Student Requirement Statement', 18, true, 6)
  writer.drawLine(header.fullName, 13, true, 4)
  const fmt = (v: string | null): string => v || '—'
  writer.drawLine(
    `Date of birth: ${fmt(header.dateOfBirth)}    Passport number: ${fmt(header.passportNumber)}`,
    10,
    false,
    2
  )
  writer.drawLine(
    `Course: ${fmt(header.course)}    Provider: ${fmt(header.provider)}`,
    10,
    false,
    16
  )

  for (const section of sections) {
    writer.ensureSpace(30)
    writer.drawLine(section.title, 14, true, 8)

    const body = new JSDOM(section.html || '').window.document.body
    if (body.children.length === 0) {
      writer.drawLine('[Not yet written]', 11, false, 10)
      continue
    }
    renderBodyToPdf(writer, body)
  }

  return writer.save()
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
