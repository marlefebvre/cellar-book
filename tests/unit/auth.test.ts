import { describe, it, expect } from 'vitest'
import { verifyPassword } from '@/lib/auth/password'
import bcrypt from 'bcryptjs'

describe('verifyPassword', () => {
  it('retourne true pour le bon mot de passe', async () => {
    const hash = await bcrypt.hash('monmotdepasse', 10)
    const result = await verifyPassword('monmotdepasse', hash)
    expect(result).toBe(true)
  })

  it('retourne false pour un mauvais mot de passe', async () => {
    const hash = await bcrypt.hash('monmotdepasse', 10)
    const result = await verifyPassword('mauvais', hash)
    expect(result).toBe(false)
  })
})
