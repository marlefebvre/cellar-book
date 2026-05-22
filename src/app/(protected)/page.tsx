import Link from 'next/link'
import { getDb } from '@/lib/db/client'

export default function DashboardPage() {
  const db = getDb()

  const totalStock = (
    db.prepare(`SELECT COALESCE(SUM(quantity_remaining), 0) as total FROM lots`).get() as {
      total: number
    }
  ).total

  const wineCount = (db.prepare(`SELECT COUNT(*) as count FROM wines`).get() as { count: number })
    .count

  const now = new Date().getFullYear()
  const inApogee = (
    db
      .prepare(
        `SELECT COUNT(DISTINCT w.id) as count
         FROM wines w
         JOIN lots l ON l.wine_id = w.id
         WHERE l.quantity_remaining > 0
           AND w.apogee_start_year <= ?
           AND w.apogee_end_year >= ?`
      )
      .get(now, now) as { count: number }
  ).count

  const recentConsumptions = db
    .prepare(
      `SELECT c.date, c.rating_20, w.producer, w.cuvee, w.vintage
       FROM consumptions c
       JOIN lots l ON c.lot_id = l.id
       JOIN wines w ON l.wine_id = w.id
       ORDER BY c.date DESC, c.created_at DESC
       LIMIT 5`
    )
    .all() as {
    date: string
    rating_20: number | null
    producer: string
    cuvee: string
    vintage: number | null
  }[]

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100">
      <header className="border-b border-zinc-800 px-6 py-4 flex items-center justify-between">
        <h1 className="text-lg font-semibold tracking-tight">Cellar Book</h1>
        <form action="/api/auth/logout" method="POST">
          <button
            type="submit"
            className="text-sm text-zinc-500 hover:text-zinc-300 transition-colors"
          >
            Déconnexion
          </button>
        </form>
      </header>

      <main className="px-4 py-6 max-w-2xl mx-auto space-y-8">
        {/* Stats */}
        <div className="grid grid-cols-3 gap-3">
          <div className="bg-zinc-900 rounded-lg p-4 text-center">
            <div className="text-3xl font-bold tabular-nums">{totalStock}</div>
            <div className="text-xs text-zinc-500 mt-1">bouteilles</div>
          </div>
          <div className="bg-zinc-900 rounded-lg p-4 text-center">
            <div className="text-3xl font-bold tabular-nums">{wineCount}</div>
            <div className="text-xs text-zinc-500 mt-1">références</div>
          </div>
          <div className="bg-zinc-900 rounded-lg p-4 text-center">
            <div className="text-3xl font-bold tabular-nums text-emerald-400">{inApogee}</div>
            <div className="text-xs text-zinc-500 mt-1">à apogée</div>
          </div>
        </div>

        {/* Nav cards */}
        <div className="grid grid-cols-1 gap-3">
          <Link
            href="/cave"
            className="flex items-center gap-4 bg-zinc-900 hover:bg-zinc-800 rounded-lg p-4 transition-colors"
          >
            <span className="text-2xl">📦</span>
            <div>
              <p className="font-medium">Cave</p>
              <p className="text-xs text-zinc-500">Catalogue, recherche, filtres</p>
            </div>
            <span className="ml-auto text-zinc-600">→</span>
          </Link>

          <Link
            href="/cave/nouveau"
            className="flex items-center gap-4 bg-zinc-900 hover:bg-zinc-800 rounded-lg p-4 transition-colors"
          >
            <span className="text-2xl">➕</span>
            <div>
              <p className="font-medium">Ajouter un vin</p>
              <p className="text-xs text-zinc-500">Saisie manuelle</p>
            </div>
            <span className="ml-auto text-zinc-600">→</span>
          </Link>

          <Link
            href="/import"
            className="flex items-center gap-4 bg-zinc-900 hover:bg-zinc-800 rounded-lg p-4 transition-colors"
          >
            <span className="text-2xl">📥</span>
            <div>
              <p className="font-medium">Import CSV</p>
              <p className="text-xs text-zinc-500">Importer depuis un fichier</p>
            </div>
            <span className="ml-auto text-zinc-600">→</span>
          </Link>
        </div>

        {/* Recent consumptions */}
        {recentConsumptions.length > 0 && (
          <section>
            <h2 className="text-xs font-medium text-zinc-500 uppercase tracking-wider mb-3">
              Dernières dégustations
            </h2>
            <div className="space-y-2">
              {recentConsumptions.map((c, i) => (
                <div
                  key={i}
                  className="flex items-center justify-between py-2 border-b border-zinc-800/50"
                >
                  <div>
                    <p className="text-sm text-zinc-200">
                      {c.producer} · {c.cuvee}
                      {c.vintage && <span className="text-zinc-500 ml-1">{c.vintage}</span>}
                    </p>
                    <p className="text-xs text-zinc-500">
                      {new Date(c.date).toLocaleDateString('fr-FR')}
                    </p>
                  </div>
                  {c.rating_20 !== null && (
                    <span className="text-sm font-medium tabular-nums">{c.rating_20}/20</span>
                  )}
                </div>
              ))}
            </div>
          </section>
        )}
      </main>
    </div>
  )
}
