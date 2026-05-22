'use client'

import { useState, type ChangeEvent } from 'react'
import Link from 'next/link'

interface ImportResult {
  imported: number
  errors: { row: number; message: string }[]
}

export default function ImportPage() {
  const [file, setFile] = useState<File | null>(null)
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<ImportResult | null>(null)
  const [error, setError] = useState<string | null>(null)

  function handleFile(e: ChangeEvent<HTMLInputElement>) {
    setFile(e.target.files?.[0] ?? null)
    setResult(null)
    setError(null)
  }

  async function handleImport() {
    if (!file) return
    setLoading(true)
    setError(null)
    setResult(null)

    try {
      const formData = new FormData()
      formData.append('file', file)

      const res = await fetch('/api/import/csv', { method: 'POST', body: formData })
      const data = (await res.json()) as ImportResult | { error: string }

      if (!res.ok) {
        setError((data as { error: string }).error ?? "Erreur lors de l'import.")
      } else {
        setResult(data as ImportResult)
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
        <Link href="/" className="text-zinc-500 hover:text-zinc-300 text-sm">
          ←
        </Link>
        <h1 className="font-semibold">Import CSV</h1>
      </header>

      <div className="px-4 py-6 max-w-2xl mx-auto space-y-6">
        {/* Format help */}
        <div className="bg-zinc-900 rounded-lg p-4 space-y-2">
          <p className="text-sm font-medium text-zinc-300">Format attendu (CSV, séparateur ;)</p>
          <p className="text-xs text-zinc-500 font-mono leading-relaxed break-all">
            producer;cuvee;color;appellation;region;country;vintage;format;quantity;unit_price;purchase_date;source;cellar_location;notes;vivino_id;vintage_id;currency;my_rating;community_rating;community_count
          </p>
          <div className="text-xs text-zinc-600 space-y-1 mt-2">
            <p>
              • <span className="text-zinc-400">producer</span> et{' '}
              <span className="text-zinc-400">cuvee</span> sont obligatoires
            </p>
            <p>
              • <span className="text-zinc-400">color</span> : rouge, blanc, rosé, effervescent, vin
              doux
            </p>
            <p>
              • <span className="text-zinc-400">cellar_location</span> : Montreuil (défaut) ou
              Vézelay
            </p>
            <p>
              • <span className="text-zinc-400">unit_price</span> : séparateur décimal . ou ,
            </p>
            <p>
              • <span className="text-zinc-400">currency</span> : EUR, USD… (défaut EUR)
            </p>
            <p>
              • <span className="text-zinc-400">vivino_id / vintage_id</span> : conservés en
              métadonnée
            </p>
            <p>
              •{' '}
              <span className="text-zinc-400">my_rating / community_rating / community_count</span>{' '}
              : acceptés, non importés
            </p>
          </div>
        </div>

        {/* File input */}
        <div className="space-y-3">
          <label className="block">
            <span className="text-sm text-zinc-400">Fichier CSV</span>
            <input
              type="file"
              accept=".csv,.txt"
              onChange={handleFile}
              className="mt-1 block w-full text-sm text-zinc-400 file:mr-3 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-medium file:bg-zinc-800 file:text-zinc-200 hover:file:bg-zinc-700 cursor-pointer"
            />
          </label>

          {file && (
            <p className="text-xs text-zinc-500">
              {file.name} · {(file.size / 1024).toFixed(1)} Ko
            </p>
          )}

          <button
            onClick={handleImport}
            disabled={!file || loading}
            className="w-full rounded-md bg-zinc-100 px-3 py-2.5 text-sm font-medium text-zinc-900 hover:bg-zinc-200 disabled:opacity-50 transition-colors"
          >
            {loading ? 'Import en cours…' : 'Importer'}
          </button>
        </div>

        {error && (
          <div className="bg-red-900/20 border border-red-800 rounded-lg px-4 py-3 text-sm text-red-400">
            {error}
          </div>
        )}

        {result && (
          <div className="space-y-3">
            <div
              className={`rounded-lg px-4 py-3 text-sm ${
                result.errors.length === 0
                  ? 'bg-emerald-900/20 border border-emerald-800 text-emerald-400'
                  : 'bg-amber-900/20 border border-amber-800 text-amber-400'
              }`}
            >
              {result.imported} vin{result.imported > 1 ? 's' : ''} importé
              {result.imported > 1 ? 's' : ''}.
              {result.errors.length > 0 &&
                ` ${result.errors.length} erreur${result.errors.length > 1 ? 's' : ''}.`}
            </div>

            {result.errors.length > 0 && (
              <div className="bg-zinc-900 rounded-lg p-3 space-y-1">
                {result.errors.map((err, i) => (
                  <p key={i} className="text-xs text-red-400">
                    Ligne {err.row} : {err.message}
                  </p>
                ))}
              </div>
            )}

            {result.imported > 0 && (
              <Link
                href="/cave"
                className="block text-center text-sm text-zinc-300 underline underline-offset-2"
              >
                Voir la cave →
              </Link>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
