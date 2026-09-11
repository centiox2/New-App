import { ipcMain } from 'electron'
import { randomBytes, scryptSync, timingSafeEqual } from 'crypto'
import { eq } from 'drizzle-orm'
import { getDb } from '../db/client'
import { appSettings } from '../db/schema'
import type { AppLockState, SetupPasswordInput, UnlockInput } from '../../shared/ipc-types'

const SCRYPT_KEYLEN = 64

function hashPassword(password: string, salt: string): string {
  return scryptSync(password, salt, SCRYPT_KEYLEN).toString('hex')
}

async function getSettingsRow(): Promise<typeof appSettings.$inferSelect> {
  const db = getDb()
  const [row] = await db.select().from(appSettings).where(eq(appSettings.id, 1))
  if (row) return row
  const [created] = await db.insert(appSettings).values({ id: 1 }).returning()
  return created
}

export function registerSettingsHandlers(): void {
  ipcMain.handle('settings:lockState', async (): Promise<AppLockState> => {
    const row = await getSettingsRow()
    return { isConfigured: Boolean(row.passwordHash && row.passwordSalt) }
  })

  ipcMain.handle('settings:setupPassword', async (_e, input: SetupPasswordInput) => {
    if (!input.password || input.password.length < 4) {
      throw new Error('Password must be at least 4 characters.')
    }
    const db = getDb()
    const salt = randomBytes(16).toString('hex')
    const hash = hashPassword(input.password, salt)
    await getSettingsRow()
    await db
      .update(appSettings)
      .set({ passwordHash: hash, passwordSalt: salt, updatedAt: new Date().toISOString() })
      .where(eq(appSettings.id, 1))
    return { ok: true }
  })

  ipcMain.handle('settings:unlock', async (_e, input: UnlockInput) => {
    const row = await getSettingsRow()
    if (!row.passwordHash || !row.passwordSalt) {
      return { ok: false, reason: 'not_configured' as const }
    }
    const candidate = Buffer.from(hashPassword(input.password, row.passwordSalt), 'hex')
    const stored = Buffer.from(row.passwordHash, 'hex')
    const matches = candidate.length === stored.length && timingSafeEqual(candidate, stored)
    return { ok: matches, reason: matches ? undefined : ('wrong_password' as const) }
  })

  ipcMain.handle('settings:getBackupFolder', async () => {
    const row = await getSettingsRow()
    return row.backupFolderPath
  })
}
