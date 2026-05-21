import { DatabaseSync } from 'node:sqlite'
import { runMigrations } from './migrations'
import { env } from '../env'

let _db: DatabaseSync | null = null

export function getDb(): DatabaseSync {
  if (!_db) {
    _db = new DatabaseSync(env.DB_PATH)
    _db.exec('PRAGMA journal_mode = WAL')
    _db.exec('PRAGMA foreign_keys = ON')
    runMigrations(_db)
  }
  return _db
}
