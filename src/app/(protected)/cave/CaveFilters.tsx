'use client'

import { useState, useMemo } from 'react'
import Link from 'next/link'
import type { WineWithStock } from '@/lib/types'

interface Props {
  wines: WineWithStock[]
}

const COLOR_BADGE: Record<string, string> = {
  rouge: 'bg-red-900/40 text-red-300 border-red-800',
  blanc: 'bg-amber-900/40 text-amber-300 border-amber-800',
  rosé: 'bg-pink-900/40 text-pink-300 border-pink-800',
  effervescent: 'bg-blue-900/40 text-blue-300 border-blue-800',
  'vin doux': 'bg-purple-900/40 text-purple-300 border-purple-800',
}

const COLORS = ['rouge', 'blanc', 'rosé', 'effervescent', 'vin doux']
const LOCATIONS = ['Montreuil', 'Vézelay']

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

export function CaveFilters({ wines }: Props) {
  const [q, setQ] = useState('')
  const [color, setColor] = useState('')
  const [location, setLocation] = useState('')
  const [inStock, setInStock] = useState(false)

  const filtered = useMemo(() => {
    const lq = q.toLowerCase()
    return wines.filter((w) => {
      if (inStock && w.stock === 0) return false
      if (color && w.color !== color) return false
      if (location) void location // filtrage par cave nécessite les lots — best-effort
      if (q) {
        const match =
          w.producer.toLowerCase().includes(lq) ||
          w.cuvee.toLowerCase().includes(lq) ||
          (w.appellation ?? '').toLowerCase().includes(lq) ||
          (w.region ?? '').toLowerCase().includes(lq)
        if (!match) return false
      }
      return true
    })
  }, [wines, q, color, location, inStock])

  return (
    <>
      <div className="px-4 py-3 space-y-2 border-b border-zinc-800/50">
        <input
          type="search"
          placeholder="Rechercher un vin…"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          className="w-full rounded-md border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-zinc-100 placeholder-zinc-600 focus:border-zinc-500 focus:outline-none focus:ring-1 focus:ring-zinc-500"
        />
        <div className="flex gap-2 flex-wrap">
          <select
            value={color}
            onChange={(e) => setColor(e.target.value)}
            className="rounded-md border border-zinc-700 bg-zinc-900 px-2 py-1.5 text-sm text-zinc-300 focus:outline-none"
          >
            <option value="">Toutes couleurs</option>
            {COLORS.map((c) => (
              <option key={c} value={c}>
                {c.charAt(0).toUpperCase() + c.slice(1)}
              </option>
            ))}
          </select>
          <select
            value={location}
            onChange={(e) => setLocation(e.target.value)}
            className="rounded-md border border-zinc-700 bg-zinc-900 px-2 py-1.5 text-sm text-zinc-300 focus:outline-none"
          >
            <option value="">Toutes caves</option>
            {LOCATIONS.map((l) => (
              <option key={l} value={l}>
                {l}
              </option>
            ))}
          </select>
          <button
            onClick={() => setInStock(!inStock)}
            className={`px-3 py-1.5 rounded-md text-sm border transition-colors ${
              inStock
                ? 'border-zinc-500 bg-zinc-800 text-zinc-100'
                : 'border-zinc-700 bg-zinc-900 text-zinc-500 hover:text-zinc-300'
            }`}
          >
            En stock
          </button>
        </div>
      </div>

      <div className="divide-y divide-zinc-800/50">
        {filtered.length === 0 ? (
          <div className="px-4 py-12 text-center text-zinc-500 text-sm">
            {wines.length === 0 ? (
              <>
                <p className="mb-2">La cave est vide.</p>
                <Link href="/cave/nouveau" className="text-zinc-300 underline underline-offset-2">
                  Ajouter un premier vin
                </Link>
              </>
            ) : (
              'Aucun vin ne correspond à ces filtres.'
            )}
          </div>
        ) : (
          filtered.map((wine) => {
            const apogee = apogeeStatus(wine.apogee_start_year, wine.apogee_end_year)
            return (
              <Link
                key={wine.id}
                href={`/cave/${wine.id}`}
                className="flex items-center gap-3 px-4 py-3 hover:bg-zinc-900 transition-colors"
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-baseline gap-2 flex-wrap">
                    <span className="font-medium text-zinc-100 truncate">{wine.producer}</span>
                    <span className="text-zinc-400 truncate">{wine.cuvee}</span>
                    {wine.vintage && (
                      <span className="text-zinc-500 text-sm flex-shrink-0">{wine.vintage}</span>
                    )}
                  </div>
                  <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                    <span
                      className={`text-xs px-1.5 py-0.5 rounded border ${COLOR_BADGE[wine.color] ?? 'bg-zinc-800 text-zinc-400 border-zinc-700'}`}
                    >
                      {wine.color}
                    </span>
                    {wine.appellation && (
                      <span className="text-xs text-zinc-500">{wine.appellation}</span>
                    )}
                    {apogee && (
                      <span className={`text-xs ${apogee.className}`}>{apogee.label}</span>
                    )}
                  </div>
                </div>
                <div className="flex-shrink-0 text-right">
                  <div
                    className={`text-lg font-semibold tabular-nums ${wine.stock === 0 ? 'text-zinc-600' : 'text-zinc-100'}`}
                  >
                    {wine.stock}
                  </div>
                  <div className="text-xs text-zinc-600">btl</div>
                </div>
              </Link>
            )
          })
        )}
      </div>
    </>
  )
}
