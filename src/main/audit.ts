import { getDb } from './db/client'
import { auditLog } from './db/schema'

interface AuditEntry {
  clientId?: string | null
  entityType: string
  entityId: string
  action: 'create' | 'update' | 'delete'
  detail?: string
}

/** Fire-and-forget audit trail write (§18). Never blocks or throws into callers. */
export function logAudit(entry: AuditEntry): void {
  try {
    getDb().insert(auditLog).values(entry).run()
  } catch (err) {
    console.error('Failed to write audit log entry', err)
  }
}
