import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { getDb } from '@/lib/db/client'
import { requireAuth } from '@/lib/auth/require-auth'
import type { Wine, Lot, ConsumptionWithWine } from '@/lib/types'

const updateWineSchema = z.object({
  producer: z.string().min(1).optional(),
  cuvee: z.string().min(1).optional(),
  color: z.enum(['rouge', 'blanc', 'rosé', 'effervescent', 'vin doux']).optional(),
  appellation: z.string().nullable().optional(),
  region: z.string().nullable().optional(),
  country: z.string().optional(),
  vintage: z.number().int().min(1800).max(2100).nullable().optional(),
  format: z.string().optional(),
  grapes: z.string().nullable().optional(),
  apogee_start_year: z.number().int().nullable().optional(),
  apogee_end_year: z.number().int().nullable().optional(),
  apogee_source: z.string().nullable().optional(),
  notes_general: z.string().nullable().optional(),
})

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const unauth = await requireAuth()
  if (unauth) return unauth

  const { id } = await params
  const db = getDb()

  const wine = db.prepare(`SELECT * FROM wines WHERE id = ?`).get(id) as unknown as Wine | undefined
  if (!wine) return NextResponse.json({ error: 'Introuvable' }, { status: 404 })

  const lots = db
    .prepare(`SELECT * FROM lots WHERE wine_id = ? ORDER BY purchase_date ASC, created_at ASC`)
    .all(id) as unknown as Lot[]

  const consumptions = db
    .prepare(
      `SELECT c.*, l.cellar_location, w.producer, w.cuvee, w.vintage, w.color
       FROM consumptions c
       JOIN lots l ON c.lot_id = l.id
       JOIN wines w ON l.wine_id = w.id
       WHERE l.wine_id = ?
       ORDER BY c.date DESC, c.created_at DESC`
    )
    .all(id) as unknown as ConsumptionWithWine[]

  return NextResponse.json({ wine, lots, consumptions })
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const unauth = await requireAuth()
  if (unauth) return unauth

  const { id } = await params
  const body = updateWineSchema.safeParse(await req.json())
  if (!body.success) {
    return NextResponse.json({ error: body.error.flatten() }, { status: 400 })
  }

  const db = getDb()
  const wine = db.prepare(`SELECT id FROM wines WHERE id = ?`).get(id)
  if (!wine) return NextResponse.json({ error: 'Introuvable' }, { status: 404 })

  const d = body.data
  const entries = Object.entries(d).filter(([, v]) => v !== undefined)
  const fields = entries.map(([k]) => `${k} = ?`)
  const values = entries.map(([, v]) => v as string | number | null)

  if (fields.length === 0) {
    return NextResponse.json({ error: 'Aucun champ à modifier' }, { status: 400 })
  }

  db.prepare(
    `UPDATE wines SET ${fields.join(', ')}, updated_at = datetime('now') WHERE id = ?`
  ).run(...values, id)

  const updated = db.prepare(`SELECT * FROM wines WHERE id = ?`).get(id) as unknown as Wine
  return NextResponse.json(updated)
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const unauth = await requireAuth()
  if (unauth) return unauth

  const { id } = await params
  const db = getDb()

  const wine = db.prepare(`SELECT id FROM wines WHERE id = ?`).get(id)
  if (!wine) return NextResponse.json({ error: 'Introuvable' }, { status: 404 })

  db.prepare(`DELETE FROM wines WHERE id = ?`).run(id)
  return NextResponse.json({ ok: true })
}
