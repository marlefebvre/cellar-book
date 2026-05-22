import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { getDb } from '@/lib/db/client'
import { requireAuth } from '@/lib/auth/require-auth'
import type { Lot } from '@/lib/types'

const createLotSchema = z.object({
  quantity_initial: z.number().int().min(1),
  unit_price: z.number().optional().nullable(),
  currency: z.string().default('EUR'),
  purchase_date: z.string().optional().nullable(),
  source: z.string().optional().nullable(),
  cellar_location: z.string().default('Montreuil'),
  notes: z.string().optional().nullable(),
})

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const unauth = await requireAuth()
  if (unauth) return unauth

  const { id } = await params
  const body = createLotSchema.safeParse(await req.json())
  if (!body.success) {
    return NextResponse.json({ error: body.error.flatten() }, { status: 400 })
  }

  const db = getDb()
  const wine = db.prepare(`SELECT id FROM wines WHERE id = ?`).get(id)
  if (!wine) return NextResponse.json({ error: 'Vin introuvable' }, { status: 404 })

  const d = body.data
  db.prepare(
    `INSERT INTO lots (wine_id, quantity_initial, quantity_remaining,
      unit_price, currency, purchase_date, source, cellar_location, notes)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
  ).run(
    id,
    d.quantity_initial,
    d.quantity_initial,
    d.unit_price ?? null,
    d.currency,
    d.purchase_date ?? null,
    d.source ?? null,
    d.cellar_location,
    d.notes ?? null
  )

  const lot = db
    .prepare(`SELECT * FROM lots WHERE rowid = last_insert_rowid()`)
    .get() as unknown as Lot

  return NextResponse.json(lot, { status: 201 })
}
