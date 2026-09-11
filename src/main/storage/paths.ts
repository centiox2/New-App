/**
 * Local file-storage layout (SPECIFICATION.md §16).
 *
 * Everything lives under Electron's per-OS `userData` directory so the
 * location is standard and discoverable (shown in Settings for manual
 * backup, per the user's "I'll handle backups myself" choice — §18).
 *
 * Layout:
 *   <userData>/gsr-case-manager.sqlite3       (all structured data)
 *   <userData>/ClientData/<clientId>/documents/
 *   <userData>/ClientData/<clientId>/evidence/
 *   <userData>/ClientData/<clientId>/gsr_drafts/
 *   <userData>/ClientData/<clientId>/exports/
 *
 * The database stores each document's path *relative* to the client's
 * folder (see `documents.filePath` in schema.ts) so the whole `ClientData`
 * tree stays portable if the user copies it elsewhere for backup.
 */
import { app } from 'electron'
import { join } from 'path'
import { mkdirSync } from 'fs'

export function getAppDataRoot(): string {
  return app.getPath('userData')
}

export function getDatabasePath(): string {
  return join(getAppDataRoot(), 'gsr-case-manager.sqlite3')
}

export function getClientDataRoot(): string {
  return join(getAppDataRoot(), 'ClientData')
}

export const CLIENT_SUBFOLDERS = ['documents', 'evidence', 'gsr_drafts', 'exports'] as const
export type ClientSubfolder = (typeof CLIENT_SUBFOLDERS)[number]

export function getClientFolder(clientId: string, subfolder?: ClientSubfolder): string {
  const base = join(getClientDataRoot(), clientId)
  return subfolder ? join(base, subfolder) : base
}

/** Creates the full folder tree for a newly created client. */
export function ensureClientFolders(clientId: string): void {
  for (const sub of CLIENT_SUBFOLDERS) {
    mkdirSync(getClientFolder(clientId, sub), { recursive: true })
  }
}
