import { z } from 'zod'

/**
 * Environment variables, validated once at boot: a bad value stops the
 * process immediately instead of failing at the first request.
 */
const schema = z
	.object({
		NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
		HOSTNAME: z.string().min(1).default('127.0.0.1'),
		PORT: z.coerce.number().int().min(1).max(65535).default(3000),
		// 'postgres' in production; 'memory' to try the app without a database.
		STORAGE: z.enum(['postgres', 'memory']).default('postgres'),
		// Provided by provision-app.yml (Vault, secret/apps/bingo).
		DATABASE_URL: z.string().min(1).optional(),
		PG_POOL_MAX: z.coerce.number().int().min(1).max(50).default(10),
		// Public origin, e.g. https://bingo.voikyrioh.fr. WebSocket upgrades from
		// another origin are refused (production only).
		PUBLIC_ORIGIN: z.url().optional(),
		// Built web client. Empty = API only (development, the Vite server serves the client).
		STATIC_DIR: z.string().default(''),
		MIGRATIONS_DIR: z.string().default('migrations'),
		LOG_LEVEL: z.enum(['debug', 'info', 'warn', 'error']).default('info'),
	})
	.superRefine((env, ctx) => {
		if (env.STORAGE === 'postgres' && !env.DATABASE_URL) {
			ctx.addIssue({
				code: 'custom',
				path: ['DATABASE_URL'],
				message: 'Required with STORAGE=postgres',
			})
		}
		if (env.NODE_ENV === 'production' && !env.PUBLIC_ORIGIN) {
			ctx.addIssue({ code: 'custom', path: ['PUBLIC_ORIGIN'], message: 'Required in production' })
		}
	})

export type Config = {
	env: 'development' | 'production' | 'test'
	host: string
	port: number
	storage: { kind: 'postgres'; url: string; poolMax: number } | { kind: 'memory' }
	publicOrigin: string | null
	staticDir: string | null
	migrationsDir: string
	logLevel: 'debug' | 'info' | 'warn' | 'error'
}

export function loadConfig(source: NodeJS.ProcessEnv = process.env): Config {
	const env = schema.parse(source)
	return {
		env: env.NODE_ENV,
		host: env.HOSTNAME,
		port: env.PORT,
		storage:
			env.STORAGE === 'postgres'
				? { kind: 'postgres', url: env.DATABASE_URL as string, poolMax: env.PG_POOL_MAX }
				: { kind: 'memory' },
		publicOrigin: env.PUBLIC_ORIGIN ? new URL(env.PUBLIC_ORIGIN).origin : null,
		staticDir: env.STATIC_DIR || null,
		migrationsDir: env.MIGRATIONS_DIR,
		logLevel: env.LOG_LEVEL,
	}
}
