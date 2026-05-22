'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

interface Props {
  lotId: string
}

export function ConsumeButton({ lotId }: Props) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [done, setDone] = useState(false)

  async function handleConsume() {
    if (loading || done) return
    setLoading(true)
    try {
      const res = await fetch(`/api/lots/${lotId}/consume`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      })
      if (res.ok) {
        setDone(true)
        setTimeout(() => {
          router.refresh()
          setDone(false)
        }, 1200)
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <button
      onClick={handleConsume}
      disabled={loading}
      className={`px-4 py-2 rounded-md text-sm font-medium transition-all ${
        done
          ? 'bg-emerald-800 text-emerald-200'
          : 'bg-zinc-700 hover:bg-zinc-600 text-zinc-100 disabled:opacity-50'
      }`}
    >
      {done ? '✓ Ouverte' : loading ? '…' : '🥂 Ouvrir'}
    </button>
  )
}
