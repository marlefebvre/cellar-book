'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

export function DeleteWineButton({ wineId }: { wineId: string }) {
  const router = useRouter()
  const [confirming, setConfirming] = useState(false)
  const [loading, setLoading] = useState(false)

  async function handleDelete() {
    setLoading(true)
    try {
      const res = await fetch(`/api/wines/${wineId}`, { method: 'DELETE' })
      if (res.ok) {
        router.push('/cave')
        router.refresh()
      }
    } finally {
      setLoading(false)
    }
  }

  if (confirming) {
    return (
      <div className="flex items-center gap-2">
        <span className="text-xs text-zinc-500">Supprimer ?</span>
        <button
          onClick={handleDelete}
          disabled={loading}
          className="text-xs text-red-400 hover:text-red-300 px-2 py-1 rounded"
        >
          {loading ? '…' : 'Oui'}
        </button>
        <button
          onClick={() => setConfirming(false)}
          className="text-xs text-zinc-500 hover:text-zinc-300 px-2 py-1 rounded"
        >
          Non
        </button>
      </div>
    )
  }

  return (
    <button
      onClick={() => setConfirming(true)}
      className="text-xs text-zinc-600 hover:text-red-400 px-2 py-1 rounded transition-colors"
    >
      Supprimer
    </button>
  )
}
