import Database from 'better-sqlite3'
import { drizzle, type BetterSQLite3Database } from 'drizzle-orm/better-sqlite3'
import { getDatabasePath } from '../storage/paths'
import { MIGRATIONS } from './migrations'
import * as schema from './schema'

let db: BetterSQLite3Database<typeof schema> | null = null

export function getDb(): BetterSQLite3Database<typeof schema> {
  if (!db) {
    throw new Error('Database not initialized — call initDb() during app startup first.')
  }
  return db
}

function runMigrations(sqlite: Database.Database): void {
  const currentVersion = sqlite.pragma('user_version', { simple: true }) as number
  for (const migration of MIGRATIONS.sort((a, b) => a.version - b.version)) {
    if (migration.version <= currentVersion) continue
    const applyMigration = sqlite.transaction(() => {
      sqlite.exec(migration.sql)
      sqlite.pragma(`user_version = ${migration.version}`)
    })
    applyMigration()
  }
}

/** Opens the local SQLite file and applies any pending migrations. Call once on app startup. */
export function initDb(): BetterSQLite3Database<typeof schema> {
  const sqlite = new Database(getDatabasePath())
  sqlite.pragma('journal_mode = WAL')
  sqlite.pragma('foreign_keys = ON')

  runMigrations(sqlite)

  db = drizzle(sqlite, { schema })
  return db
}
