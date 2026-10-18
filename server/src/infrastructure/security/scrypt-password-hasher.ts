import { randomBytes, type ScryptOptions, scrypt, timingSafeEqual } from 'node:crypto'
import type { PasswordHasher } from '../../application/ports'

const KEY_LENGTH = 32
const DEFAULTS = { N: 16384, r: 8, p: 1 }

function derive(password: string, salt: Buffer, options: ScryptOptions): Promise<Buffer> {
	return new Promise((resolve, reject) => {
		scrypt(password.normalize('NFC'), salt, KEY_LENGTH, options, (error, key) =>
			error ? reject(error) : resolve(key),
		)
	})
}

/**
 * Room passwords, hashed with scrypt (node:crypto, no dependency).
 * Stored format: scrypt$N$r$p$salt$hash (base64url), so parameters can evolve.
 */
export class ScryptPasswordHasher implements PasswordHasher {
	constructor(private readonly params = DEFAULTS) {}

	async hash(password: string): Promise<string> {
		const salt = randomBytes(16)
		const key = await derive(password, salt, this.params)
		const { N, r, p } = this.params
		return ['scrypt', N, r, p, salt.toString('base64url'), key.toString('base64url')].join('$')
	}

	async verify(password: string, stored: string): Promise<boolean> {
		const [scheme, N, r, p, salt, hash] = stored.split('$')
		if (scheme !== 'scrypt' || !N || !r || !p || !salt || !hash) return false
		const expected = Buffer.from(hash, 'base64url')
		const key = await derive(password, Buffer.from(salt, 'base64url'), {
			N: Number(N),
			r: Number(r),
			p: Number(p),
		})
		return key.length === expected.length && timingSafeEqual(key, expected)
	}
}
