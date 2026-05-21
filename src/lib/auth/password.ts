import { compare } from 'bcryptjs'

export async function verifyPassword(plain: string, hash: string): Promise<boolean> {
  return compare(plain, hash)
}
