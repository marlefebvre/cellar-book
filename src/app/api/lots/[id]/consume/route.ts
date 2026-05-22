import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { getDb } from '@/lib/db/client'
import { requireAuth } from '@/lib/auth/require-auth'
import type { Lot, Consumption } from '@/lib/types'

const consumeSchema = z.object({
  rating_20: z.number().min(0).max(20).nullable().optional(),
  rating_external_100: z.number().min(0).max(100).nullable().optional(),
  food_paired: z.string().optional().nullable(),
  pairing_success: z.enum(['réussi', 'moyen', 'raté']).nullable().optional(),
  context: z.string().optional().nullable(),
  tasting_notes: z.string().optional().nullable(),
})

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const unauth = await requireAuth()
  if (unauth) return unauth

  const { id } = await params
  const body = consumeSchema.safeParse(await req.json())
  if (!body.success) {
    return NextResponse.json({ error: body.error.flatten() }, { status: 400 })
  }

  const db = getDb()
  const lot = db.prepare(`SELECT * FROM lots WHERE id = ?`).get(id) as unknown as Lot | undefined
  if (!lot) return NextResponse.json({ error: 'Lot introuvable' }, { status: 404 })
  if (lot.quantity_remaining <= 0) {
    return NextResponse.json(
      { error: 'Plus de bouteilles disponibles dans ce lot' },
      { status: 409 }
    )
  }

  const d = body.data

  db.exec('BEGIN')
  try {
    db.prepare(
      `UPDATE lots SET quantity_remaining = quantity_remaining - 1, updated_at = datetime('now') WHERE id = ?`
    ).run(id)

    db.prepare(
      `INSERT INTO consumptions (lot_id, rating_20, rating_external_100,
        food_paired, pairing_success, context, tasting_notes)
       VALUES (?, ?, ?, ?, ?, ?, ?)`
    ).run(
      id,
      d.rating_20 ?? null,
      d.rating_external_100 ?? null,
      d.food_paired ?? null,
      d.pairing_success ?? null,
      d.context ?? null,
      d.tasting_notes ?? null
    )

    const consumption = db
      .prepare(`SELECT * FROM consumptions WHERE rowid = last_insert_rowid()`)
      .get() as unknown as Consumption

    db.exec('COMMIT')
    return NextResponse.json(consumption, { status: 201 })
  } catch (err) {
    db.exec('ROLLBACK')
    throw err
  }
}
