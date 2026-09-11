import { ipcMain, dialog, shell, BrowserWindow } from 'electron'
import { randomUUID } from 'crypto'
import { copyFileSync, existsSync, unlinkSync } from 'fs'
import { basename, extname, join } from 'path'
import { eq, and, desc } from 'drizzle-orm'
import { getDb } from '../db/client'
import { documents } from '../db/schema'
import { getClientFolder } from '../storage/paths'
import { logAudit } from '../audit'
import type {
  CreateDocumentInput,
  PickedFile,
  ReplaceDocumentInput,
  UpdateDocumentInput
} from '../../shared/ipc-types'

/** Copies a source file into the client's documents folder under a collision-proof name. */
function storeFile(clientId: string, sourcePath: string): string {
  const ext = extname(sourcePath)
  const storedName = `${randomUUID()}${ext}`
  const destAbsolute = join(getClientFolder(clientId, 'documents'), storedName)
  copyFileSync(sourcePath, destAbsolute)
  return storedName // stored relative to the client's documents folder
}

function absolutePathFor(clientId: string, relativeFilePath: string): string {
  return join(getClientFolder(clientId, 'documents'), relativeFilePath)
}

export function registerDocumentHandlers(): void {
  ipcMain.handle('documents:list', async (_e, clientId: string) => {
    const db = getDb()
    return db
      .select()
      .from(documents)
      .where(and(eq(documents.clientId, clientId), eq(documents.isCurrentVersion, true)))
      .orderBy(desc(documents.createdAt))
  })

  ipcMain.handle('documents:pickFile', async (): Promise<PickedFile | null> => {
    const win = BrowserWindow.getFocusedWindow()
    const options: Electron.OpenDialogOptions = {
      properties: ['openFile'],
      filters: [
        { name: 'Documents', extensions: ['pdf', 'doc', 'docx', 'png', 'jpg', 'jpeg', 'txt'] },
        { name: 'All Files', extensions: ['*'] }
      ]
    }
    const result = win
      ? await dialog.showOpenDialog(win, options)
      : await dialog.showOpenDialog(options)
    if (result.canceled || result.filePaths.length === 0) return null
    const sourcePath = result.filePaths[0]
    const ext = extname(sourcePath)
    const suggestedLabel = basename(sourcePath, ext)
    return { sourcePath, suggestedLabel, extension: ext }
  })

  ipcMain.handle('documents:create', async (_e, input: CreateDocumentInput) => {
    const db = getDb()
    const storedRelativePath = storeFile(input.clientId, input.sourcePath)
    const [row] = await db
      .insert(documents)
      .values({
        clientId: input.clientId,
        category: input.category,
        customCategory: input.customCategory ?? null,
        label: input.label,
        filePath: storedRelativePath,
        notes: input.notes ?? null
      })
      .returning()
    logAudit({
      clientId: input.clientId,
      entityType: 'documents',
      entityId: row.id,
      action: 'create'
    })
    return row
  })

  ipcMain.handle('documents:update', async (_e, input: UpdateDocumentInput) => {
    const db = getDb()
    const { id, ...changes } = input
    const [row] = await db
      .update(documents)
      .set({ ...changes, updatedAt: new Date().toISOString() })
      .where(eq(documents.id, id))
      .returning()
    logAudit({ clientId: row.clientId, entityType: 'documents', entityId: id, action: 'update' })
    return row
  })

  ipcMain.handle('documents:replace', async (_e, input: ReplaceDocumentInput) => {
    const db = getDb()
    const [existing] = await db.select().from(documents).where(eq(documents.id, input.id))
    if (!existing) throw new Error(`Document ${input.id} not found`)

    const storedRelativePath = storeFile(existing.clientId, input.sourcePath)
    const [newRow] = await db
      .insert(documents)
      .values({
        clientId: existing.clientId,
        category: existing.category,
        customCategory: existing.customCategory,
        label: existing.label,
        filePath: storedRelativePath,
        notes: existing.notes,
        replacesDocumentId: existing.id,
        isCurrentVersion: true
      })
      .returning()

    await db.update(documents).set({ isCurrentVersion: false }).where(eq(documents.id, existing.id))

    logAudit({
      clientId: existing.clientId,
      entityType: 'documents',
      entityId: newRow.id,
      action: 'update',
      detail: JSON.stringify({ replaces: existing.id })
    })
    return newRow
  })

  ipcMain.handle('documents:delete', async (_e, id: string) => {
    const db = getDb()
    const [row] = await db.select().from(documents).where(eq(documents.id, id))
    if (row) {
      const abs = absolutePathFor(row.clientId, row.filePath)
      try {
        if (existsSync(abs)) unlinkSync(abs)
      } catch (err) {
        console.error('Failed to remove document file from disk', err)
      }
    }
    await db.delete(documents).where(eq(documents.id, id))
    if (row)
      logAudit({ clientId: row.clientId, entityType: 'documents', entityId: id, action: 'delete' })
    return { ok: true }
  })

  ipcMain.handle('documents:open', async (_e, id: string) => {
    const db = getDb()
    const [row] = await db.select().from(documents).where(eq(documents.id, id))
    if (!row) throw new Error(`Document ${id} not found`)
    const abs = absolutePathFor(row.clientId, row.filePath)
    const result = await shell.openPath(abs)
    if (result) throw new Error(result)
    return { ok: true }
  })
}
