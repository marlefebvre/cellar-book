import { describe, it, expect, beforeEach } from 'vitest'
import { DatabaseSync } from 'node:sqlite'
import { runMigrations } from '@/lib/db/migrations'

describe('runMigrations', () => {
  let db: DatabaseSync

  beforeEach(() => {
    db = new DatabaseSync(':memory:')
    db.exec('PRAGMA foreign_keys = ON')
  })

  it('crée toutes les tables sans erreur', () => {
    expect(() => runMigrations(db)).not.toThrow()

    const tables = db
      .prepare("SELECT name FROM sqlite_master WHERE type='table' ORDER BY name")
      .all()
      .map((r) => (r as { name: string }).name)

    expect(tables).toContain('wines')
    expect(tables).toContain('lots')
    expect(tables).toContain('consumptions')
    expect(tables).toContain('wishlist_items')
    expect(tables).toContain('target_profile')
    expect(tables).toContain('label_photos')
    expect(tables).toContain('schema_migrations')
  })

  it('est idempotente — double exécution sans erreur', () => {
    runMigrations(db)
    expect(() => runMigrations(db)).not.toThrow()
  })

  it('insère le profil cible par défaut', () => {
    runMigrations(db)
    const profile = db.prepare('SELECT * FROM target_profile WHERE id = 1').get() as
      | { profile: string }
      | undefined
    expect(profile).toBeDefined()
    expect(JSON.parse(profile!.profile)).toEqual({})
  })
})
