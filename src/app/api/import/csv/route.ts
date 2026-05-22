import { NextRequest, NextResponse } from 'next/server'
import { getDb } from '@/lib/db/client'
import { requireAuth } from '@/lib/auth/require-auth'

interface CsvRow {
  producer: string
  cuvee: string
  color: string
  appellation?: string
  region?: string
  country?: string
  vintage?: string
  format?: string
  quantity?: string
  unit_price?: string
  purchase_date?: string
  source?: string
  cellar_location?: string
  notes?: string
  // Champs Vivino (ignorés ou mappés)
  vivino_id?: string
  vintage_id?: string
  currency?: string
  my_rating?: string
  community_rating?: string
  community_count?: string
}

function parseCsv(text: string): CsvRow[] {
  const lines = text.replace(/\r\n/g, '\n').replace(/\r/g, '\n').split('\n')
  if (lines.length < 2) return []

  const headers = lines[0]!.split(';').map((h) => h.trim().replace(/^"|"$/g, ''))

  return lines
    .slice(1)
    .filter((l) => l.trim())
    .map((line) => {
      const values = line.split(';').map((v) => v.trim().replace(/^"|"$/g, ''))
      const row: Record<string, string> = {}
      headers.forEach((h, i) => {
        row[h] = values[i] ?? ''
      })
      return row as unknown as CsvRow
    })
}

export async function POST(req: NextRequest) {
  const unauth = await requireAuth()
  if (unauth) return unauth

  const formData = await req.formData()
  const file = formData.get('file')

  if (!file || typeof file === 'string') {
    return NextResponse.json({ error: 'Fichier CSV requis' }, { status: 400 })
  }

  const text = await file.text()
  const rows = parseCsv(text)

  if (rows.length === 0) {
    return NextResponse.json({ error: 'CSV vide ou mal formaté' }, { status: 400 })
  }

  const db = getDb()
  const results = { imported: 0, errors: [] as { row: number; message: string }[] }

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i]!

    if (!row.producer?.trim() || !row.cuvee?.trim()) {
      results.errors.push({ row: i + 2, message: 'producer et cuvee requis' })
      continue
    }

    const color = row.color?.trim() || 'rouge'
    const validColors = ['rouge', 'blanc', 'rosé', 'effervescent', 'vin doux']
    if (!validColors.includes(color)) {
      results.errors.push({ row: i + 2, message: `Couleur invalide: ${color}` })
      continue
    }

    const vintage = row.vintage ? parseInt(row.vintage) : null
    const quantity = row.quantity ? parseInt(row.quantity) : 1
    const unitPrice = row.unit_price ? parseFloat(row.unit_price.replace(',', '.')) : null
    const currency = row.currency?.trim() || 'EUR'

    // Notes générales : on ajoute vivino_id en métadonnée si présent
    const vivinoMeta = row.vivino_id?.trim()
      ? `[vivino:${row.vivino_id.trim()}${row.vintage_id?.trim() ? `/v${row.vintage_id.trim()}` : ''}]`
      : null
    const notesGeneral = [row.notes?.trim() || null, vivinoMeta].filter(Boolean).join(' ') || null

    db.exec('BEGIN')
    try {
      db.prepare(
        `INSERT INTO wines (producer, cuvee, color, appellation, region, country, vintage, format, notes_general)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
      ).run(
        row.producer.trim(),
        row.cuvee.trim(),
        color,
        row.appellation?.trim() || null,
        row.region?.trim() || null,
        row.country?.trim() || 'France',
        isNaN(vintage as number) ? null : vintage,
        row.format?.trim() || '75cl',
        notesGeneral
      )

      const wine = db.prepare(`SELECT id FROM wines WHERE rowid = last_insert_rowid()`).get() as {
        id: string
      }

      db.prepare(
        `INSERT INTO lots (wine_id, quantity_initial, quantity_remaining,
          unit_price, currency, purchase_date, source, cellar_location, notes)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
      ).run(
        wine.id,
        quantity,
        quantity,
        unitPrice,
        currency,
        row.purchase_date?.trim() || null,
        row.source?.trim() || null,
        row.cellar_location?.trim() || 'Montreuil',
        null
      )

      db.exec('COMMIT')
      results.imported++
    } catch (err) {
      db.exec('ROLLBACK')
      results.errors.push({ row: i + 2, message: String(err) })
    }
  }

  return NextResponse.json(results)
}
