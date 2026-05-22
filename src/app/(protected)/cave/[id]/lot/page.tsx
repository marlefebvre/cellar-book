'use client'

import { useState, type FormEvent } from 'react'
import { useRouter, useParams } from 'next/navigation'
import Link from 'next/link'

const LOCATIONS = ['Montreuil', 'Vézelay']

export default function AjouterLotPage() {
  const router = useRouter()
  const params = useParams<{ id: string }>()
  const wineId = params.id

  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [quantity, setQuantity] = useState('1')
  const [unitPrice, setUnitPrice] = useState('')
  const [purchaseDate, setPurchaseDate] = useState('')
  const [source, setSource] = useState('')
  const [location, setLocation] = useState('Montreuil')
  const [notes, setNotes] = useState('')

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setError(null)
    setLoading(true)

    try {
      const res = await fetch(`/api/wines/${wineId}/lots`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          quantity_initial: parseInt(quantity) || 1,
          unit_price: unitPrice ? parseFloat(unitPrice.replace(',', '.')) : null,
          purchase_date: purchaseDate || null,
          source: source.trim() || null,
          cellar_location: location,
          notes: notes.trim() || null,
        }),
      })

      if (res.ok) {
        router.push(`/cave/${wineId}`)
        router.refresh()
      } else {
        const data = (await res.json()) as { error?: string }
        setError(typeof data.error === 'string' ? data.error : 'Erreur.')
      }
    } catch {
      setError('Impossible de joindre le serveur.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 pb-12">
      <header className="border-b border-zinc-800 px-4 py-3 flex items-center gap-3 sticky top-0 bg-zinc-950 z-10">
        <Link href={`/cave/${wineId}`} className="text-zinc-500 hover:text-zinc-300 text-sm">
          ←
        </Link>
        <h1 className="font-semibold">Ajouter un lot</h1>
      </header>

      <form onSubmit={handleSubmit} className="px-4 py-6 max-w-lg mx-auto space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-sm text-zinc-400 mb-1">Quantité *</label>
            <input
              type="number"
              value={quantity}
              onChange={(e) => setQuantity(e.target.value)}
              min="1"
              required
              autoFocus
              className="w-full rounded-md border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-zinc-100 focus:border-zinc-500 focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-sm text-zinc-400 mb-1">Prix unitaire (€)</label>
            <input
              type="text"
              value={unitPrice}
              onChange={(e) => setUnitPrice(e.target.value)}
              placeholder="ex. 24.50"
              className="w-full rounded-md border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-zinc-100 placeholder-zinc-600 focus:border-zinc-500 focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-sm text-zinc-400 mb-1">Date d&apos;achat</label>
            <input
              type="date"
              value={purchaseDate}
              onChange={(e) => setPurchaseDate(e.target.value)}
              className="w-full rounded-md border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-zinc-100 focus:border-zinc-500 focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-sm text-zinc-400 mb-1">Cave</label>
            <select
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              className="w-full rounded-md border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-zinc-100 focus:outline-none"
            >
              {LOCATIONS.map((l) => (
                <option key={l} value={l}>
                  {l}
                </option>
              ))}
            </select>
          </div>

          <div className="col-span-2">
            <label className="block text-sm text-zinc-400 mb-1">Source</label>
            <input
              type="text"
              value={source}
              onChange={(e) => setSource(e.target.value)}
              placeholder="ex. Caviste Martin, Domaine direct…"
              className="w-full rounded-md border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-zinc-100 placeholder-zinc-600 focus:border-zinc-500 focus:outline-none"
            />
          </div>

          <div className="col-span-2">
            <label className="block text-sm text-zinc-400 mb-1">Notes</label>
            <input
              type="text"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full rounded-md border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-zinc-100 placeholder-zinc-600 focus:border-zinc-500 focus:outline-none"
            />
          </div>
        </div>

        {error && <p className="text-sm text-red-400">{error}</p>}

        <button
          type="submit"
          disabled={loading}
          className="w-full rounded-md bg-zinc-100 px-3 py-2.5 text-sm font-medium text-zinc-900 hover:bg-zinc-200 disabled:opacity-50 transition-colors"
        >
          {loading ? 'Enregistrement…' : 'Ajouter le lot'}
        </button>
      </form>
    </div>
  )
}
