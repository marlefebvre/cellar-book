import { use } from 'react'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { getDb } from '@/lib/db/client'
import type { Wine, Lot, ConsumptionWithWine } from '@/lib/types'
import { ConsumeButton } from './ConsumeButton'
import { DeleteWineButton } from './DeleteWineButton'

const COLOR_BADGE: Record<string, string> = {
  rouge: 'bg-red-900/40 text-red-300 border-red-800',
  blanc: 'bg-amber-900/40 text-amber-300 border-amber-800',
  rosé: 'bg-pink-900/40 text-pink-300 border-pink-800',
  effervescent: 'bg-blue-900/40 text-blue-300 border-blue-800',
  'vin doux': 'bg-purple-900/40 text-purple-300 border-purple-800',
}

function formatDate(d: string | null): string {
  if (!d) return '—'
  return new Date(d).toLocaleDateString('fr-FR', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  })
}

function formatPrice(price: number | null, currency: string): string {
  if (price === null) return '—'
  return new Intl.NumberFormat('fr-FR', { style: 'currency', currency }).format(price)
}

export default function WineDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)

  const db = getDb()

  const wine = db.prepare(`SELECT * FROM wines WHERE id = ?`).get(id) as unknown as Wine | undefined
  if (!wine) notFound()

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

  const totalStock = lots.reduce((s, l) => s + l.quantity_remaining, 0)
  const avgPrice =
    lots.length > 0
      ? lots
          .filter((l) => l.unit_price !== null)
          .reduce((s, l) => s + (l.unit_price ?? 0) * l.quantity_initial, 0) /
          lots.filter((l) => l.unit_price !== null).reduce((s, l) => s + l.quantity_initial, 0) ||
        null
      : null

  // Best lot to consume (oldest purchase date, quantity > 0)
  const bestLot = lots.find((l) => l.quantity_remaining > 0)

  const now = new Date().getFullYear()
  let apogeeLabel = ''
  let apogeeClass = 'text-zinc-500'
  if (wine.apogee_start_year || wine.apogee_end_year) {
    if (wine.apogee_end_year && now > wine.apogee_end_year) {
      apogeeLabel = 'Apogée passée'
      apogeeClass = 'text-zinc-500'
    } else if (wine.apogee_start_year && now < wine.apogee_start_year) {
      apogeeLabel = `Apogée dès ${wine.apogee_start_year}`
      apogeeClass = 'text-blue-400'
    } else {
      apogeeLabel = `À apogée${wine.apogee_end_year ? ` jusqu'en ${wine.apogee_end_year}` : ''}`
      apogeeClass = 'text-emerald-400'
    }
  }

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 pb-12">
      {/* Header */}
      <header className="border-b border-zinc-800 px-4 py-3 flex items-center justify-between sticky top-0 bg-zinc-950 z-10">
        <Link href="/cave" className="text-zinc-500 hover:text-zinc-300 text-sm">
          ← Cave
        </Link>
        <div className="flex items-center gap-2">
          <Link
            href={`/cave/${wine.id}/modifier`}
            className="text-sm text-zinc-400 hover:text-zinc-200 px-2 py-1 rounded"
          >
            Modifier
          </Link>
          <DeleteWineButton wineId={wine.id} />
        </div>
      </header>

      <div className="px-4 py-6 space-y-6 max-w-2xl mx-auto">
        {/* Identity */}
        <div>
          <div className="flex items-start justify-between gap-3">
            <div>
              <h1 className="text-xl font-semibold">{wine.producer}</h1>
              <p className="text-zinc-400 mt-0.5">{wine.cuvee}</p>
            </div>
            <span
              className={`text-xs px-2 py-1 rounded border flex-shrink-0 ${COLOR_BADGE[wine.color] ?? 'bg-zinc-800 text-zinc-400 border-zinc-700'}`}
            >
              {wine.color}
            </span>
          </div>

          <div className="mt-3 flex flex-wrap gap-2 text-sm text-zinc-500">
            {wine.vintage && <span>{wine.vintage}</span>}
            {wine.vintage && wine.appellation && <span>·</span>}
            {wine.appellation && <span>{wine.appellation}</span>}
            {wine.region && <span className="text-zinc-600">— {wine.region}</span>}
          </div>

          {apogeeLabel && (
            <p className={`mt-2 text-sm ${apogeeClass}`}>
              {apogeeLabel}
              {wine.apogee_start_year && wine.apogee_end_year && (
                <span className="text-zinc-600 ml-1">
                  ({wine.apogee_start_year}–{wine.apogee_end_year})
                </span>
              )}
            </p>
          )}

          {wine.notes_general && (
            <p className="mt-3 text-sm text-zinc-400 leading-relaxed">{wine.notes_general}</p>
          )}
        </div>

        {/* Stock summary */}
        <div className="grid grid-cols-3 gap-3">
          <div className="bg-zinc-900 rounded-lg p-3 text-center">
            <div className="text-2xl font-bold tabular-nums">{totalStock}</div>
            <div className="text-xs text-zinc-500 mt-0.5">bouteilles</div>
          </div>
          <div className="bg-zinc-900 rounded-lg p-3 text-center">
            <div className="text-2xl font-bold tabular-nums">{lots.length}</div>
            <div className="text-xs text-zinc-500 mt-0.5">lot{lots.length > 1 ? 's' : ''}</div>
          </div>
          <div className="bg-zinc-900 rounded-lg p-3 text-center">
            <div className="text-lg font-bold tabular-nums">
              {avgPrice !== null ? formatPrice(avgPrice, 'EUR') : '—'}
            </div>
            <div className="text-xs text-zinc-500 mt-0.5">prix moy.</div>
          </div>
        </div>

        {/* Quick consume */}
        {bestLot && (
          <div className="bg-zinc-900 rounded-lg p-4 flex items-center justify-between gap-3">
            <div>
              <p className="text-sm font-medium">J&apos;ouvre une bouteille</p>
              <p className="text-xs text-zinc-500 mt-0.5">
                Lot {bestLot.cellar_location} · {bestLot.quantity_remaining} restante
                {bestLot.quantity_remaining > 1 ? 's' : ''}
              </p>
            </div>
            <ConsumeButton lotId={bestLot.id} />
          </div>
        )}

        {/* Lots */}
        <section>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-medium text-zinc-400 uppercase tracking-wider">Lots</h2>
            <Link
              href={`/cave/${wine.id}/lot`}
              className="text-xs text-zinc-500 hover:text-zinc-300"
            >
              + Ajouter un lot
            </Link>
          </div>
          <div className="space-y-2">
            {lots.map((lot) => (
              <div key={lot.id} className="bg-zinc-900 rounded-lg p-3 text-sm">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="font-medium">{lot.cellar_location}</span>
                    {lot.purchase_date && (
                      <span className="text-zinc-500">{formatDate(lot.purchase_date)}</span>
                    )}
                    {lot.source && <span className="text-zinc-600 text-xs">{lot.source}</span>}
                  </div>
                  <div className="flex items-center gap-3">
                    {lot.unit_price !== null && (
                      <span className="text-zinc-400">
                        {formatPrice(lot.unit_price, lot.currency)}
                      </span>
                    )}
                    <span
                      className={`font-semibold tabular-nums ${lot.quantity_remaining === 0 ? 'text-zinc-600' : 'text-zinc-100'}`}
                    >
                      {lot.quantity_remaining}/{lot.quantity_initial}
                    </span>
                  </div>
                </div>
                {lot.notes && <p className="text-zinc-500 text-xs mt-1">{lot.notes}</p>}
              </div>
            ))}
          </div>
        </section>

        {/* Consumptions */}
        {consumptions.length > 0 && (
          <section>
            <h2 className="text-sm font-medium text-zinc-400 uppercase tracking-wider mb-3">
              Dégustations ({consumptions.length})
            </h2>
            <div className="space-y-2">
              {consumptions.map((c) => (
                <div key={c.id} className="bg-zinc-900 rounded-lg p-3 text-sm">
                  <div className="flex items-center justify-between">
                    <span className="text-zinc-400">{formatDate(c.date)}</span>
                    <div className="flex items-center gap-2">
                      {c.rating_20 !== null && (
                        <span className="font-medium">{c.rating_20}/20</span>
                      )}
                      {c.pairing_success && (
                        <span
                          className={`text-xs px-1.5 py-0.5 rounded ${
                            c.pairing_success === 'réussi'
                              ? 'bg-emerald-900/40 text-emerald-400'
                              : c.pairing_success === 'moyen'
                                ? 'bg-amber-900/40 text-amber-400'
                                : 'bg-red-900/40 text-red-400'
                          }`}
                        >
                          {c.pairing_success}
                        </span>
                      )}
                    </div>
                  </div>
                  {c.food_paired && (
                    <p className="text-zinc-500 text-xs mt-1">Avec : {c.food_paired}</p>
                  )}
                  {c.tasting_notes && (
                    <p className="text-zinc-400 text-xs mt-1 leading-relaxed">{c.tasting_notes}</p>
                  )}
                </div>
              ))}
            </div>
          </section>
        )}
      </div>
    </div>
  )
}
