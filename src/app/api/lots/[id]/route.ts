import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { getDb } from '@/lib/db/client'
import { requireAuth } from '@/lib/auth/require-auth'
import type { Lot } from '@/lib/types'

const updateLotSchema = z.object({
  quantity_remaining: z.number().int().min(0).optional(),
  unit_price: z.number().nullable().optional(),
  currency: z.string().optional(),
  purchase_date: z.string().nullable().optional(),
  source: z.string().nullable().optional(),
  cellar_location: z.string().optional(),
  notes: z.string().nullable().optional(),
})

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const unauth = await requireAuth()
  if (unauth) return unauth

  const { id } = await params
  const body = updateLotSchema.safeParse(await req.json())
  if (!body.success) {
    return NextResponse.json({ error: body.error.flatten() }, { status: 400 })
  }

  const db = getDb()
  const lot = db.prepare(`SELECT id FROM lots WHERE id = ?`).get(id)
  if (!lot) return NextResponse.json({ error: 'Introuvable' }, { status: 404 })

  const d = body.data
  const entries = Object.entries(d).filter(([, v]) => v !== undefined)
  const fields = entries.map(([k]) => `${k} = ?`)
  const values = entries.map(([, v]) => v as string | number | null)

  if (fields.length === 0) {
    return NextResponse.json({ error: 'Aucun champ à modifier' }, { status: 400 })
  }

  db.prepare(`UPDATE lots SET ${fields.join(', ')}, updated_at = datetime('now') WHERE id = ?`).run(
    ...values,
    id
  )

  const updated = db.prepare(`SELECT * FROM lots WHERE id = ?`).get(id) as unknown as Lot
  return NextResponse.json(updated)
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const unauth = await requireAuth()
  if (unauth) return unauth

  const { id } = await params
  const db = getDb()

  const lot = db.prepare(`SELECT id FROM lots WHERE id = ?`).get(id)
  if (!lot) return NextResponse.json({ error: 'Introuvable' }, { status: 404 })

  db.prepare(`DELETE FROM lots WHERE id = ?`).run(id)
  return NextResponse.json({ ok: true })
}
