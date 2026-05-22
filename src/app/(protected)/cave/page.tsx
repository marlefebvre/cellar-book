import Link from 'next/link'
import { getDb } from '@/lib/db/client'
import type { WineWithStock } from '@/lib/types'
import { CaveFilters } from './CaveFilters'

const COLOR_BADGE: Record<string, string> = {
  rouge: 'bg-red-900/40 text-red-300 border-red-800',
  blanc: 'bg-amber-900/40 text-amber-300 border-amber-800',
  rosé: 'bg-pink-900/40 text-pink-300 border-pink-800',
  effervescent: 'bg-blue-900/40 text-blue-300 border-blue-800',
  'vin doux': 'bg-purple-900/40 text-purple-300 border-purple-800',
}

function apogeeStatus(
  start: number | null,
  end: number | null
): { label: string; className: string } | null {
  if (!start && !end) return null
  const now = new Date().getFullYear()
  if (end && now > end) return { label: 'passé', className: 'text-zinc-500' }
  if (start && now < start) return { label: `dès ${start}`, className: 'text-blue-400' }
  return { label: '✓ apogée', className: 'text-emerald-400' }
}

export default function CavePage() {
  const db = getDb()

  const wines = db
    .prepare(
      `SELECT w.id, w.producer, w.cuvee, w.appellation, w.region, w.country,
              w.vintage, w.format, w.color, w.apogee_start_year, w.apogee_end_year,
              w.notes_general, w.created_at, w.updated_at,
              COALESCE(SUM(l.quantity_remaining), 0) as stock
       FROM wines w
       LEFT JOIN lots l ON l.wine_id = w.id
       GROUP BY w.id
       ORDER BY w.producer COLLATE NOCASE, w.cuvee COLLATE NOCASE`
    )
    .all() as unknown as WineWithStock[]

  const totalStock = wines.reduce((s, w) => s + w.stock, 0)
  const inApogee = wines.filter((w) => {
    const now = new Date().getFullYear()
    return (
      w.stock > 0 &&
      w.apogee_start_year &&
      w.apogee_end_year &&
      now >= w.apogee_start_year &&
      now <= w.apogee_end_year
    )
  }).length

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100">
      {/* Header */}
      <header className="border-b border-zinc-800 px-4 py-3 flex items-center justify-between sticky top-0 bg-zinc-950 z-10">
        <div className="flex items-center gap-3">
          <Link href="/" className="text-zinc-500 hover:text-zinc-300 text-sm">
            ←
          </Link>
          <h1 className="font-semibold">Cave</h1>
          <span className="text-xs text-zinc-500">{totalStock} bouteilles</span>
        </div>
        <Link
          href="/cave/nouveau"
          className="text-sm bg-zinc-100 text-zinc-900 px-3 py-1.5 rounded-md font-medium hover:bg-zinc-200 transition-colors"
        >
          + Ajouter
        </Link>
      </header>

      {/* Stats */}
      <div className="px-4 py-3 flex gap-4 text-sm border-b border-zinc-800/50">
        <div className="text-zinc-400">
          <span className="text-zinc-100 font-medium">
            {wines.filter((w) => w.stock > 0).length}
          </span>{' '}
          vins en stock
        </div>
        <div className="text-zinc-400">
          <span className="text-emerald-400 font-medium">{inApogee}</span> à apogée
        </div>
      </div>

      {/* Client filters + list */}
      <CaveFilters wines={wines} colorBadge={COLOR_BADGE} apogeeStatus={apogeeStatus} />
    </div>
  )
}
