'use client'

import { useState, type FormEvent } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

const COLORS = ['rouge', 'blanc', 'rosé', 'effervescent', 'vin doux'] as const
const FORMATS = ['75cl', 'demi (37.5cl)', 'magnum (1.5L)', 'jéroboam (3L)', 'autre']
const LOCATIONS = ['Montreuil', 'Vézelay']

export default function NouveauVinPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Wine fields
  const [producer, setProducer] = useState('')
  const [cuvee, setCuvee] = useState('')
  const [color, setColor] = useState<(typeof COLORS)[number]>('rouge')
  const [appellation, setAppellation] = useState('')
  const [region, setRegion] = useState('')
  const [country, setCountry] = useState('France')
  const [vintage, setVintage] = useState('')
  const [format, setFormat] = useState('75cl')
  const [grapes, setGrapes] = useState('')
  const [apogeeStart, setApogeeStart] = useState('')
  const [apogeeEnd, setApogeeEnd] = useState('')
  const [notes, setNotes] = useState('')

  // Lot fields
  const [addLot, setAddLot] = useState(true)
  const [quantity, setQuantity] = useState('1')
  const [unitPrice, setUnitPrice] = useState('')
  const [purchaseDate, setPurchaseDate] = useState('')
  const [source, setSource] = useState('')
  const [location, setLocation] = useState('Montreuil')
  const [lotNotes, setLotNotes] = useState('')

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    if (!producer.trim() || !cuvee.trim()) {
      setError('Domaine et cuvée sont obligatoires.')
      return
    }
    setError(null)
    setLoading(true)

    try {
      const body = {
        producer: producer.trim(),
        cuvee: cuvee.trim(),
        color,
        appellation: appellation.trim() || null,
        region: region.trim() || null,
        country: country.trim() || 'France',
        vintage: vintage ? parseInt(vintage) : null,
        format,
        grapes: grapes.trim() || null,
        apogee_start_year: apogeeStart ? parseInt(apogeeStart) : null,
        apogee_end_year: apogeeEnd ? parseInt(apogeeEnd) : null,
        notes_general: notes.trim() || null,
        lot: addLot
          ? {
              quantity_initial: parseInt(quantity) || 1,
              unit_price: unitPrice ? parseFloat(unitPrice.replace(',', '.')) : null,
              currency: 'EUR',
              purchase_date: purchaseDate || null,
              source: source.trim() || null,
              cellar_location: location,
              notes: lotNotes.trim() || null,
            }
          : undefined,
      }

      const res = await fetch('/api/wines', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })

      if (res.ok) {
        const wine = (await res.json()) as { id: string }
        router.push(`/cave/${wine.id}`)
        router.refresh()
      } else {
        const data = (await res.json()) as { error?: string }
        setError(typeof data.error === 'string' ? data.error : 'Erreur lors de la création.')
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
        <Link href="/cave" className="text-zinc-500 hover:text-zinc-300 text-sm">
          ← Cave
        </Link>
        <h1 className="font-semibold">Nouveau vin</h1>
      </header>

      <form onSubmit={handleSubmit} className="px-4 py-6 max-w-2xl mx-auto space-y-8">
        {/* Identité */}
        <section className="space-y-4">
          <h2 className="text-xs font-medium text-zinc-500 uppercase tracking-wider">Identité</h2>

          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2">
              <label className="block text-sm text-zinc-400 mb-1">Domaine / Maison *</label>
              <input
                type="text"
                value={producer}
                onChange={(e) => setProducer(e.target.value)}
                required
                autoFocus
                placeholder="ex. Domaine Leflaive"
                className="w-full rounded-md border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-zinc-100 placeholder-zinc-600 focus:border-zinc-500 focus:outline-none"
              />
            </div>

            <div className="col-span-2">
              <label className="block text-sm text-zinc-400 mb-1">Cuvée *</label>
              <input
                type="text"
                value={cuvee}
                onChange={(e) => setCuvee(e.target.value)}
                required
                placeholder="ex. Puligny-Montrachet"
                className="w-full rounded-md border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-zinc-100 placeholder-zinc-600 focus:border-zinc-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-sm text-zinc-400 mb-1">Couleur *</label>
              <select
                value={color}
                onChange={(e) => setColor(e.target.value as (typeof COLORS)[number])}
                className="w-full rounded-md border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-zinc-100 focus:outline-none"
              >
                {COLORS.map((c) => (
                  <option key={c} value={c}>
                    {c.charAt(0).toUpperCase() + c.slice(1)}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm text-zinc-400 mb-1">Millésime</label>
              <input
                type="number"
                value={vintage}
                onChange={(e) => setVintage(e.target.value)}
                placeholder="ex. 2019"
                min="1800"
                max="2100"
                className="w-full rounded-md border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-zinc-100 placeholder-zinc-600 focus:border-zinc-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-sm text-zinc-400 mb-1">Appellation</label>
              <input
                type="text"
                value={appellation}
                onChange={(e) => setAppellation(e.target.value)}
                placeholder="ex. Côte-Rôtie"
                className="w-full rounded-md border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-zinc-100 placeholder-zinc-600 focus:border-zinc-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-sm text-zinc-400 mb-1">Région</label>
              <input
                type="text"
                value={region}
                onChange={(e) => setRegion(e.target.value)}
                placeholder="ex. Rhône Nord"
                className="w-full rounded-md border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-zinc-100 placeholder-zinc-600 focus:border-zinc-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-sm text-zinc-400 mb-1">Pays</label>
              <input
                type="text"
                value={country}
                onChange={(e) => setCountry(e.target.value)}
                className="w-full rounded-md border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-zinc-100 focus:border-zinc-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-sm text-zinc-400 mb-1">Format</label>
              <select
                value={format}
                onChange={(e) => setFormat(e.target.value)}
                className="w-full rounded-md border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-zinc-100 focus:outline-none"
              >
                {FORMATS.map((f) => (
                  <option key={f} value={f}>
                    {f}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-sm text-zinc-400 mb-1">Cépages</label>
            <input
              type="text"
              value={grapes}
              onChange={(e) => setGrapes(e.target.value)}
              placeholder="ex. Syrah, Viognier"
              className="w-full rounded-md border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-zinc-100 placeholder-zinc-600 focus:border-zinc-500 focus:outline-none"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm text-zinc-400 mb-1">Apogée de</label>
              <input
                type="number"
                value={apogeeStart}
                onChange={(e) => setApogeeStart(e.target.value)}
                placeholder="ex. 2026"
                min="2000"
                max="2060"
                className="w-full rounded-md border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-zinc-100 placeholder-zinc-600 focus:border-zinc-500 focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-sm text-zinc-400 mb-1">Apogée à</label>
              <input
                type="number"
                value={apogeeEnd}
                onChange={(e) => setApogeeEnd(e.target.value)}
                placeholder="ex. 2035"
                min="2000"
                max="2060"
                className="w-full rounded-md border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-zinc-100 placeholder-zinc-600 focus:border-zinc-500 focus:outline-none"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm text-zinc-400 mb-1">Notes générales</label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
              placeholder="Description du vin, du producteur, du millésime…"
              className="w-full rounded-md border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-zinc-100 placeholder-zinc-600 focus:border-zinc-500 focus:outline-none resize-none"
            />
          </div>
        </section>

        {/* Lot initial */}
        <section className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xs font-medium text-zinc-500 uppercase tracking-wider">
              Lot initial
            </h2>
            <button
              type="button"
              onClick={() => setAddLot(!addLot)}
              className="text-xs text-zinc-500 hover:text-zinc-300"
            >
              {addLot ? "Sans lot pour l'instant" : '+ Ajouter un lot'}
            </button>
          </div>

          {addLot && (
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm text-zinc-400 mb-1">Quantité *</label>
                <input
                  type="number"
                  value={quantity}
                  onChange={(e) => setQuantity(e.target.value)}
                  min="1"
                  required={addLot}
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
                <label className="block text-sm text-zinc-400 mb-1">Notes du lot</label>
                <input
                  type="text"
                  value={lotNotes}
                  onChange={(e) => setLotNotes(e.target.value)}
                  placeholder="ex. Emballage abîmé, bouchon suspect…"
                  className="w-full rounded-md border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-zinc-100 placeholder-zinc-600 focus:border-zinc-500 focus:outline-none"
                />
              </div>
            </div>
          )}
        </section>

        {error && <p className="text-sm text-red-400">{error}</p>}

        <button
          type="submit"
          disabled={loading}
          className="w-full rounded-md bg-zinc-100 px-3 py-2.5 text-sm font-medium text-zinc-900 hover:bg-zinc-200 disabled:opacity-50 transition-colors"
        >
          {loading ? 'Enregistrement…' : 'Ajouter à la cave'}
        </button>
      </form>
    </div>
  )
}
