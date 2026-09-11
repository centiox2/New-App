/**
 * Shared file-copy helpers for anything that creates a `documents` table
 * row (documents.ts, evidence.ts, verification.ts) — every such row's
 * `filePath` is resolved relative to the client's "documents" folder, so
 * all of them must store through here rather than duplicating the path
 * logic per caller.
 */
import { randomUUID } from 'crypto'
import { copyFileSync } from 'fs'
import { extname, join } from 'path'
import { getClientFolder } from './paths'

/** Copies a source file into the client's documents folder under a collision-proof name. */
export function storeDocumentFile(clientId: string, sourcePath: string): string {
  const ext = extname(sourcePath)
  const storedName = `${randomUUID()}${ext}`
  copyFileSync(sourcePath, join(getClientFolder(clientId, 'documents'), storedName))
  return storedName // stored relative to the client's documents folder
}

export function absoluteDocumentPath(clientId: string, relativeFilePath: string): string {
  return join(getClientFolder(clientId, 'documents'), relativeFilePath)
}
