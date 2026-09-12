import { ipcMain } from 'electron'
import { and, eq } from 'drizzle-orm'
import { getDb } from '../db/client'
import { entityTags } from '../db/schema'
import type { EntityTag, TaggableEntityType } from '../../shared/ipc-types'

export function registerTagHandlers(): void {
  ipcMain.handle(
    'tags:listForClientEntityType',
    async (
      _e,
      args: { clientId: string; entityType: TaggableEntityType }
    ): Promise<EntityTag[]> => {
      const db = getDb()
      const rows = await db
        .select()
        .from(entityTags)
        .where(
          and(eq(entityTags.clientId, args.clientId), eq(entityTags.entityType, args.entityType))
        )
      return rows.map((r) => ({ tagId: r.id, entityId: r.entityId, label: r.label }))
    }
  )

  ipcMain.handle(
    'tags:add',
    async (
      _e,
      args: { clientId: string; entityType: TaggableEntityType; entityId: string; label: string }
    ): Promise<EntityTag> => {
      const db = getDb()
      const label = args.label.trim()
      const existing = await db
        .select()
        .from(entityTags)
        .where(
          and(
            eq(entityTags.entityType, args.entityType),
            eq(entityTags.entityId, args.entityId),
            eq(entityTags.label, label)
          )
        )
      if (existing[0]) return { tagId: existing[0].id, entityId: existing[0].entityId, label }

      const [row] = await db
        .insert(entityTags)
        .values({
          clientId: args.clientId,
          entityType: args.entityType,
          entityId: args.entityId,
          label
        })
        .returning()
      return { tagId: row.id, entityId: row.entityId, label: row.label }
    }
  )

  ipcMain.handle('tags:remove', async (_e, tagId: string) => {
    const db = getDb()
    await db.delete(entityTags).where(eq(entityTags.id, tagId))
    return { ok: true }
  })
}
