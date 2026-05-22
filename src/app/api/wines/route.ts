import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { getDb } from '@/lib/db/client'
import { requireAuth } from '@/lib/auth/require-auth'
import type { WineWithStock } from '@/lib/types'

const createWineSchema = z.object({
  producer: z.string().min(1),
  cuvee: z.string().min(1),
  color: z.enum(['rouge', 'blanc', 'rosé', 'effervescent', 'vin doux']),
  appellation: z.string().optional().nullable(),
  region: z.string().optional().nullable(),
  country: z.string().default('France'),
  vintage: z.number().int().min(1800).max(2100).optional().nullable(),
  format: z.string().default('75cl'),
  grapes: z.string().optional().nullable(),
  apogee_start_year: z.number().int().optional().nullable(),
  apogee_end_year: z.number().int().optional().nullable(),
  notes_general: z.string().optional().nullable(),
  lot: z
    .object({
      quantity_initial: z.number().int().min(1),
      unit_price: z.number().optional().nullable(),
      currency: z.string().default('EUR'),
      purchase_date: z.string().optional().nullable(),
      source: z.string().optional().nullable(),
      cellar_location: z.string().default('Montreuil'),
      notes: z.string().optional().nullable(),
    })
    .optional(),
})

export async function GET(req: NextRequest) {
  const unauth = await requireAuth()
  if (unauth) return unauth

  const { searchParams } = new URL(req.url)
  const q = searchParams.get('q')?.trim()
  const color = searchParams.get('color')
  const region = searchParams.get('region')
  const location = searchParams.get('location')
  const inStock = searchParams.get('in_stock') === '1'

  const db = getDb()

  let ids: Set<string> | null = null

  if (q) {
    const ftsRows = db
      .prepare(`SELECT id FROM wines_fts WHERE wines_fts MATCH ? ORDER BY rank LIMIT 200`)
      .all(`${q}*`) as { id: string }[]
    ids = new Set(ftsRows.map((r) => r.id))
    if (ids.size === 0) {
      return NextResponse.json([])
    }
  }

  const conditions: string[] = []
  const params: (string | number | null)[] = []

  if (ids) {
    conditions.push(`w.id IN (${[...ids].map(() => '?').join(',')})`)
    params.push(...ids)
  }
  if (color) {
    conditions.push('w.color = ?')
    params.push(color)
  }
  if (region) {
    conditions.push('w.region = ?')
    params.push(region)
  }
  if (location) {
    conditions.push(
      'EXISTS (SELECT 1 FROM lots l2 WHERE l2.wine_id = w.id AND l2.cellar_location = ? AND l2.quantity_remaining > 0)'
    )
    params.push(location)
  }
  if (inStock) {
    conditions.push(
      'EXISTS (SELECT 1 FROM lots l2 WHERE l2.wine_id = w.id AND l2.quantity_remaining > 0)'
    )
  }

  const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : ''

  const wines = db
    .prepare(
      `SELECT w.id, w.producer, w.cuvee, w.appellation, w.region, w.country,
              w.vintage, w.format, w.color, w.apogee_start_year, w.apogee_end_year,
              w.apogee_source, w.notes_general, w.created_at, w.updated_at,
              COALESCE(SUM(l.quantity_remaining), 0) as stock
       FROM wines w
       LEFT JOIN lots l ON l.wine_id = w.id
       ${where}
       GROUP BY w.id
       ORDER BY w.producer COLLATE NOCASE, w.cuvee COLLATE NOCASE`
    )
    .all(...params) as unknown as WineWithStock[]

  return NextResponse.json(wines)
}

export async function POST(req: NextRequest) {
  const unauth = await requireAuth()
  if (unauth) return unauth

  const body = createWineSchema.safeParse(await req.json())
  if (!body.success) {
    return NextResponse.json({ error: body.error.flatten() }, { status: 400 })
  }

  const db = getDb()
  const d = body.data

  db.exec('BEGIN')
  try {
    db.prepare(
      `INSERT INTO wines (producer, cuvee, color, appellation, region, country,
        vintage, format, grapes, apogee_start_year, apogee_end_year, notes_general)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    ).run(
      d.producer,
      d.cuvee,
      d.color,
      d.appellation ?? null,
      d.region ?? null,
      d.country,
      d.vintage ?? null,
      d.format,
      d.grapes ?? null,
      d.apogee_start_year ?? null,
      d.apogee_end_year ?? null,
      d.notes_general ?? null
    )

    const wine = db.prepare(`SELECT * FROM wines WHERE rowid = last_insert_rowid()`).get() as {
      id: string
    }

    if (d.lot) {
      const lot = d.lot
      db.prepare(
        `INSERT INTO lots (wine_id, quantity_initial, quantity_remaining,
          unit_price, currency, purchase_date, source, cellar_location, notes)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
      ).run(
        wine.id,
        lot.quantity_initial,
        lot.quantity_initial,
        lot.unit_price ?? null,
        lot.currency,
        lot.purchase_date ?? null,
        lot.source ?? null,
        lot.cellar_location,
        lot.notes ?? null
      )
    }

    db.exec('COMMIT')
    return NextResponse.json(wine, { status: 201 })
  } catch (err) {
    db.exec('ROLLBACK')
    throw err
  }
}
