import type pg from 'pg'
import { FEATURED_DICTIONARIES, FUNNY_NAMES } from '../seed-data'

/**
 * Upserts the curated content of seed-data.ts. Runs at every boot after the
 * migrations: editing seed-data.ts and deploying updates the featured
 * dictionaries. User content is never touched.
 */
export async function seed(pool: pg.Pool): Promise<void> {
	const client = await pool.connect()
	try {
		await client.query('BEGIN')
		for (const d of FEATURED_DICTIONARIES) {
			await client.query(
				`INSERT INTO dictionaries (id, code, title, description, entries, free_space, is_public, featured)
				 VALUES ($1, $2, $3, $4, $5, $6, true, true)
				 ON CONFLICT (id) DO UPDATE SET
					code = EXCLUDED.code, title = EXCLUDED.title, description = EXCLUDED.description,
					entries = EXCLUDED.entries, free_space = EXCLUDED.free_space,
					is_public = true, featured = true`,
				[d.id, d.code, d.title, d.description, JSON.stringify(d.entries), d.freeSpace],
			)
		}
		await client.query(
			`INSERT INTO funny_names (name) SELECT unnest($1::text[]) ON CONFLICT DO NOTHING`,
			[FUNNY_NAMES],
		)
		// Names reserved for a featured dictionary: the list of seed-data.ts is
		// the reference, a name removed from it disappears at the next boot.
		for (const d of FEATURED_DICTIONARIES) {
			const names = d.funnyNames ?? []
			await client.query(
				'DELETE FROM funny_names WHERE dictionary_id = $1 AND NOT (name = ANY($2::text[]))',
				[d.id, names],
			)
			await client.query(
				`INSERT INTO funny_names (name, dictionary_id) SELECT unnest($2::text[]), $1
				 ON CONFLICT DO NOTHING`,
				[d.id, names],
			)
		}
		await client.query('COMMIT')
	} catch (error) {
		await client.query('ROLLBACK')
		throw error
	} finally {
		client.release()
	}
}
