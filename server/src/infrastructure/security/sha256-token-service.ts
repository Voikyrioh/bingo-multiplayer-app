import { createHash, randomBytes } from 'node:crypto'
import type { TokenService } from '../../application/ports'

/**
 * Participant tokens: 256 random bits, only their SHA-256 is stored. A fast
 * hash is enough here because the token itself has full entropy (unlike a
 * password, it cannot be brute forced from its hash).
 */
export const sha256TokenService: TokenService = {
	issue() {
		const token = randomBytes(32).toString('base64url')
		return { token, hash: sha256(token) }
	},
	hash: sha256,
}

function sha256(token: string): string {
	return createHash('sha256').update(token).digest('hex')
}
