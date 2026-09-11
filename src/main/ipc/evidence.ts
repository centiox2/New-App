import { ipcMain, dialog, BrowserWindow } from 'electron'
import { basename, extname } from 'path'
import { eq, desc } from 'drizzle-orm'
import { getDb } from '../db/client'
import { evidenceItems, documents } from '../db/schema'
import { storeDocumentFile } from '../storage/documentFiles'
import { logAudit } from '../audit'
import type { CreateEvidenceInput, UpdateEvidenceInput } from '../../shared/ipc-types'

export function registerEvidenceHandlers(): void {
  ipcMain.handle('evidence:list', async (_e, clientId: string) => {
    const db = getDb()
    return db
      .select()
      .from(evidenceItems)
      .where(eq(evidenceItems.clientId, clientId))
      .orderBy(desc(evidenceItems.createdAt))
  })

  ipcMain.handle('evidence:create', async (_e, input: CreateEvidenceInput) => {
    const db = getDb()
    const [row] = await db.insert(evidenceItems).values(input).returning()
    logAudit({
      clientId: input.clientId,
      entityType: 'evidence_items',
      entityId: row.id,
      action: 'create'
    })
    return row
  })

  ipcMain.handle('evidence:update', async (_e, input: UpdateEvidenceInput) => {
    const db = getDb()
    const { id, ...changes } = input
    const [row] = await db
      .update(evidenceItems)
      .set({ ...changes, updatedAt: new Date().toISOString() })
      .where(eq(evidenceItems.id, id))
      .returning()
    logAudit({
      clientId: row.clientId,
      entityType: 'evidence_items',
      entityId: id,
      action: 'update'
    })
    return row
  })

  ipcMain.handle('evidence:delete', async (_e, id: string) => {
    const db = getDb()
    await db.delete(evidenceItems).where(eq(evidenceItems.id, id))
    logAudit({ entityType: 'evidence_items', entityId: id, action: 'delete' })
    return { ok: true }
  })

  ipcMain.handle('evidence:attachFile', async (_e, evidenceId: string) => {
    const db = getDb()
    const [evidence] = await db.select().from(evidenceItems).where(eq(evidenceItems.id, evidenceId))
    if (!evidence) throw new Error(`Evidence item ${evidenceId} not found`)

    const win = BrowserWindow.getFocusedWindow()
    const options: Electron.OpenDialogOptions = {
      properties: ['openFile'],
      filters: [
        { name: 'Documents & Images', extensions: ['pdf', 'png', 'jpg', 'jpeg'] },
        { name: 'All Files', extensions: ['*'] }
      ]
    }
    const result = win
      ? await dialog.showOpenDialog(win, options)
      : await dialog.showOpenDialog(options)
    if (result.canceled || result.filePaths.length === 0) return evidence

    const sourcePath = result.filePaths[0]
    const ext = extname(sourcePath)
    const storedName = storeDocumentFile(evidence.clientId, sourcePath)

    const [doc] = await db
      .insert(documents)
      .values({
        clientId: evidence.clientId,
        category: 'evidence_research',
        label: basename(sourcePath, ext),
        filePath: storedName
      })
      .returning()

    const [updated] = await db
      .update(evidenceItems)
      .set({ documentId: doc.id, updatedAt: new Date().toISOString() })
      .where(eq(evidenceItems.id, evidenceId))
      .returning()
    return updated
  })

  ipcMain.handle('evidence:removeFile', async (_e, evidenceId: string) => {
    const db = getDb()
    const [updated] = await db
      .update(evidenceItems)
      .set({ documentId: null, updatedAt: new Date().toISOString() })
      .where(eq(evidenceItems.id, evidenceId))
      .returning()
    return updated
  })
}
