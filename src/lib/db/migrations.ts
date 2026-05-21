import { DatabaseSync } from 'node:sqlite'

const MIGRATION_001 = `
CREATE TABLE IF NOT EXISTS schema_migrations (
  version     INTEGER PRIMARY KEY,
  applied_at  TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS wines (
  id                TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  producer          TEXT NOT NULL,
  cuvee             TEXT NOT NULL,
  appellation       TEXT,
  region            TEXT,
  country           TEXT NOT NULL DEFAULT 'France',
  vintage           INTEGER,
  format            TEXT NOT NULL DEFAULT '75cl',
  color             TEXT NOT NULL,
  grapes            TEXT,
  apogee_start_year INTEGER,
  apogee_end_year   INTEGER,
  apogee_source     TEXT DEFAULT 'manual',
  notes_general     TEXT,
  created_at        TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at        TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_wines_producer    ON wines(producer);
CREATE INDEX IF NOT EXISTS idx_wines_appellation ON wines(appellation);
CREATE INDEX IF NOT EXISTS idx_wines_region      ON wines(region);
CREATE INDEX IF NOT EXISTS idx_wines_vintage     ON wines(vintage);
CREATE INDEX IF NOT EXISTS idx_wines_color       ON wines(color);

CREATE VIRTUAL TABLE IF NOT EXISTS wines_fts USING fts5(
  id UNINDEXED,
  producer,
  cuvee,
  appellation,
  region,
  notes_general,
  content='wines',
  content_rowid='rowid'
);

CREATE TABLE IF NOT EXISTS lots (
  id                 TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  wine_id            TEXT NOT NULL REFERENCES wines(id) ON DELETE CASCADE,
  quantity_initial   INTEGER NOT NULL CHECK (quantity_initial > 0),
  quantity_remaining INTEGER NOT NULL CHECK (quantity_remaining >= 0),
  unit_price         REAL,
  currency           TEXT NOT NULL DEFAULT 'EUR',
  purchase_date      TEXT,
  source             TEXT,
  cellar_location    TEXT NOT NULL DEFAULT 'Montreuil',
  notes              TEXT,
  created_at         TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at         TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_lots_wine_id         ON lots(wine_id);
CREATE INDEX IF NOT EXISTS idx_lots_cellar_location ON lots(cellar_location);
CREATE INDEX IF NOT EXISTS idx_lots_quantity        ON lots(quantity_remaining);

CREATE TABLE IF NOT EXISTS consumptions (
  id                  TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  lot_id              TEXT NOT NULL REFERENCES lots(id) ON DELETE CASCADE,
  date                TEXT NOT NULL DEFAULT (date('now')),
  rating_20           REAL CHECK (rating_20 IS NULL OR (rating_20 >= 0 AND rating_20 <= 20)),
  rating_external_100 REAL CHECK (rating_external_100 IS NULL OR (rating_external_100 >= 0 AND rating_external_100 <= 100)),
  food_paired         TEXT,
  pairing_success     TEXT CHECK (pairing_success IN ('réussi', 'moyen', 'raté', NULL)),
  context             TEXT,
  tasting_notes       TEXT,
  created_at          TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_consumptions_lot_id ON consumptions(lot_id);
CREATE INDEX IF NOT EXISTS idx_consumptions_date   ON consumptions(date);

CREATE TABLE IF NOT EXISTS wishlist_items (
  id           TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  producer     TEXT,
  cuvee        TEXT,
  appellation  TEXT,
  vintage      INTEGER,
  target_price REAL,
  source_seen  TEXT,
  reason       TEXT,
  priority     TEXT DEFAULT 'moyenne' CHECK (priority IN ('haute', 'moyenne', 'basse')),
  notes        TEXT,
  created_at   TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_wishlist_priority ON wishlist_items(priority);

CREATE TABLE IF NOT EXISTS target_profile (
  id         INTEGER PRIMARY KEY CHECK (id = 1),
  profile    TEXT NOT NULL DEFAULT '{}',
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);
INSERT OR IGNORE INTO target_profile (id, profile) VALUES (1, '{}');

CREATE TABLE IF NOT EXISTS label_photos (
  id         TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  wine_id    TEXT NOT NULL REFERENCES wines(id) ON DELETE CASCADE,
  path       TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_label_photos_wine_id ON label_photos(wine_id);

CREATE TRIGGER IF NOT EXISTS wines_fts_insert AFTER INSERT ON wines BEGIN
  INSERT INTO wines_fts(id, producer, cuvee, appellation, region, notes_general)
  VALUES (new.id, new.producer, new.cuvee, new.appellation, new.region, new.notes_general);
END;

CREATE TRIGGER IF NOT EXISTS wines_fts_update AFTER UPDATE ON wines BEGIN
  DELETE FROM wines_fts WHERE id = old.id;
  INSERT INTO wines_fts(id, producer, cuvee, appellation, region, notes_general)
  VALUES (new.id, new.producer, new.cuvee, new.appellation, new.region, new.notes_general);
END;

CREATE TRIGGER IF NOT EXISTS wines_fts_delete AFTER DELETE ON wines BEGIN
  DELETE FROM wines_fts WHERE id = old.id;
END;

INSERT OR IGNORE INTO schema_migrations (version) VALUES (1);
`

const MIGRATIONS: { version: number; sql: string }[] = [{ version: 1, sql: MIGRATION_001 }]

export function runMigrations(db: DatabaseSync): void {
  db.exec(`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      version     INTEGER PRIMARY KEY,
      applied_at  TEXT NOT NULL DEFAULT (datetime('now'))
    );
  `)

  const applied = db
    .prepare('SELECT version FROM schema_migrations')
    .all()
    .map((r) => (r as { version: number }).version)

  for (const migration of MIGRATIONS) {
    if (applied.includes(migration.version)) continue

    try {
      db.exec('BEGIN')
      db.exec(migration.sql)
      db.exec('COMMIT')
    } catch (err) {
      db.exec('ROLLBACK')
      throw new Error(`Migration ${migration.version} failed: ${String(err)}`)
    }
  }
}
