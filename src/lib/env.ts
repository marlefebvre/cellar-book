import { z } from 'zod'

const envSchema = z.object({
  // Optionnel en dev — requis uniquement pour les fonctionnalités IA (Phase 2)
  ANTHROPIC_API_KEY: z.string().default(''),
  DB_PATH: z.string().min(1),
  LABELS_DIR: z.string().min(1),
  SESSION_SECRET: z.string().min(32),
  APP_PASSWORD_HASH: z.string().startsWith('$2'),
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
})

export type Env = z.infer<typeof envSchema>

let _env: Env | null = null

function getEnv(): Env {
  if (!_env) {
    _env = envSchema.parse(process.env)
  }
  return _env
}

// Proxy pour conserver l'API `env.X` tout en évaluant lazily
export const env: Env = new Proxy({} as Env, {
  get(_, key: string) {
    return getEnv()[key as keyof Env]
  },
})
