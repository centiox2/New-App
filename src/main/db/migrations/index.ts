/**
 * Migration SQL is bundled at build time via Vite's `?raw` import (rather
 * than read from disk at runtime), so it works identically in `npm run
 * dev` and in the packaged app without any asset-copying step.
 *
 * `npm run db:generate` (drizzle-kit) produces new numbered .sql files in
 * this folder as the schema evolves — add each one here in order.
 */
import m0000 from './0000_normal_black_bolt.sql?raw'
import m0001 from './0001_nosy_may_parker.sql?raw'
import m0002 from './0002_narrow_maestro.sql?raw'

export interface Migration {
  version: number
  sql: string
}

export const MIGRATIONS: Migration[] = [
  { version: 1, sql: m0000 },
  { version: 2, sql: m0001 },
  { version: 3, sql: m0002 }
]
