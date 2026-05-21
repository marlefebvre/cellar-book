import { getIronSession, type SessionOptions } from 'iron-session'
import { cookies } from 'next/headers'

export interface SessionData {
  user?: { authenticated: true }
}

export const sessionOptions: SessionOptions = {
  cookieName: 'cellar-session',
  password: process.env.SESSION_SECRET!,
  cookieOptions: {
    secure: process.env.NODE_ENV === 'production' && process.env.FORCE_HTTPS === 'true',
    httpOnly: true,
    sameSite: 'lax',
    maxAge: 60 * 60 * 24 * 365,
  },
}

export async function getSession() {
  const cookieStore = await cookies()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return getIronSession<SessionData>(cookieStore as any, sessionOptions)
}
