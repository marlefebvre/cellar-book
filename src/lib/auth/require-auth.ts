import { NextResponse } from 'next/server'
import { getSession } from './session'

export async function requireAuth(): Promise<NextResponse | null> {
  const session = await getSession()
  if (!session.user?.authenticated) {
    return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
  }
  return null
}
