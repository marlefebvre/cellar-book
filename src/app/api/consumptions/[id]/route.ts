import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { getDb } from '@/lib/db/client'
import { requireAuth } from '@/lib/auth/require-auth'
import type { Consumption } from '@/lib/types'

const updateConsumptionSchema = z.object({
  rating_20: z.number().min(0).max(20).nullable().optional(),
  rating_external_100: z.number().min(0).max(100).nullable().optional(),
  food_paired: z.string().nullable().optional(),
  pairing_success: z.enum(['réussi', 'moyen', 'raté']).nullable().optional(),
  context: z.string().nullable().optional(),
  tasting_notes: z.string().nullable().optional(),
})

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const unauth = await requireAuth()
  if (unauth) return unauth

  const { id } = await params
  const body = updateConsumptionSchema.safeParse(await req.json())
  if (!body.success) {
    return NextResponse.json({ error: body.error.flatten() }, { status: 400 })
  }

  const db = getDb()
  const c = db.prepare(`SELECT id FROM consumptions WHERE id = ?`).get(id)
  if (!c) return NextResponse.json({ error: 'Introuvable' }, { status: 404 })

  const d = body.data
  const entries = Object.entries(d).filter(([, v]) => v !== undefined)
  const fields = entries.map(([k]) => `${k} = ?`)
  const values = entries.map(([, v]) => v as string | number | null)

  if (fields.length === 0) {
    return NextResponse.json({ error: 'Aucun champ à modifier' }, { status: 400 })
  }

  db.prepare(`UPDATE consumptions SET ${fields.join(', ')} WHERE id = ?`).run(...values, id)

  const updated = db
    .prepare(`SELECT * FROM consumptions WHERE id = ?`)
    .get(id) as unknown as Consumption
  return NextResponse.json(updated)
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const unauth = await requireAuth()
  if (unauth) return unauth

  const { id } = await params
  const db = getDb()

  const c = db.prepare(`SELECT id, lot_id FROM consumptions WHERE id = ?`).get(id) as
    | { id: string; lot_id: string }
    | undefined
  if (!c) return NextResponse.json({ error: 'Introuvable' }, { status: 404 })

  db.exec('BEGIN')
  try {
    db.prepare(`DELETE FROM consumptions WHERE id = ?`).run(id)
    db.prepare(
      `UPDATE lots SET quantity_remaining = quantity_remaining + 1, updated_at = datetime('now') WHERE id = ?`
    ).run(c.lot_id)
    db.exec('COMMIT')
  } catch (err) {
    db.exec('ROLLBACK')
    throw err
  }

  return NextResponse.json({ ok: true })
}
