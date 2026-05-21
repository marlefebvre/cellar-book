import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { getSession } from '@/lib/auth/session'
import { verifyPassword } from '@/lib/auth/password'
import { env } from '@/lib/env'

const loginSchema = z.object({
  password: z.string().min(1),
})

// In-memory rate limiter: 5 attempts per 15 minutes per IP
const attempts = new Map<string, { count: number; resetAt: number }>()

function checkRateLimit(ip: string): boolean {
  const now = Date.now()
  const window = 15 * 60 * 1000
  const entry = attempts.get(ip)

  if (!entry || entry.resetAt < now) {
    attempts.set(ip, { count: 1, resetAt: now + window })
    return true
  }

  if (entry.count >= 5) return false

  entry.count++
  return true
}

export async function POST(req: NextRequest) {
  const ip = req.headers.get('x-forwarded-for') ?? req.headers.get('x-real-ip') ?? 'unknown'

  if (!checkRateLimit(ip)) {
    return NextResponse.json(
      { error: 'Trop de tentatives, réessayez dans 15 minutes.' },
      { status: 429 }
    )
  }

  const body = loginSchema.safeParse(await req.json())
  if (!body.success) {
    return NextResponse.json({ error: 'Requête invalide.' }, { status: 400 })
  }

  const valid = await verifyPassword(body.data.password, env.APP_PASSWORD_HASH)
  if (!valid) {
    return NextResponse.json({ error: 'Mot de passe incorrect.' }, { status: 401 })
  }

  const session = await getSession()
  session.user = { authenticated: true }
  await session.save()

  return NextResponse.json({ ok: true })
}
