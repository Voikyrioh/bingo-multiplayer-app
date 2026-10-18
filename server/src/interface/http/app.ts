import { serveStatic } from '@hono/node-server/serve-static'
import { createNodeWebSocket } from '@hono/node-ws'
import { Hono } from 'hono'
import type { DictionaryService } from '../../application/dictionary.service'
import type { NameRepository } from '../../application/ports'
import type { RoomService } from '../../application/room.service'
import type { ConnectionHub } from '../../infrastructure/realtime/connection-hub'
import { RoomConnection } from '../ws/room-connection'
import { apiRoutes } from './api.routes'
import { errorBody, onError, onNotFound } from './errors'

export interface AppDeps {
	rooms: RoomService
	dictionaries: DictionaryService
	names: NameRepository
	hub: ConnectionHub
	/** Allowed Origin of WebSocket upgrades; null = any (development). */
	publicOrigin: string | null
	/** Built web client to serve, null = API only. */
	staticDir: string | null
}

/**
 * HTTP + WebSocket entry point. One origin serves the client, the API (/api)
 * and the sockets (/api/rooms/:code/ws): no CORS, one container.
 */
export function createApp(deps: AppDeps) {
	const app = new Hono()
	const { injectWebSocket, upgradeWebSocket } = createNodeWebSocket({ app })

	app.onError(onError)
	app.notFound((c) =>
		c.req.path.startsWith('/api/') ? onNotFound(c) : c.text('Page introuvable', 404),
	)

	app.get(
		'/api/rooms/:code/ws',
		async (c, next) => {
			const origin = c.req.header('origin')
			if (deps.publicOrigin && origin !== deps.publicOrigin) {
				return c.json(errorBody('forbidden', 'Origine refusée.'), 403)
			}
			await next()
		},
		upgradeWebSocket((c) => {
			let connection: RoomConnection | null = null
			return {
				onOpen(_event, ws) {
					connection = new RoomConnection(c.req.param('code') ?? '', ws, {
						rooms: deps.rooms,
						hub: deps.hub,
					})
					connection.open()
				},
				onMessage(event) {
					const data = typeof event.data === 'string' ? event.data : String(event.data)
					void connection?.receive(data)
				},
				onClose() {
					connection?.close()
				},
			}
		}),
	)

	app.route('/api', apiRoutes(deps))

	if (deps.staticDir) {
		const root = deps.staticDir
		app.use('*', async (c, next) => {
			await next()
			if (c.req.path.startsWith('/api/')) return
			c.header(
				'Content-Security-Policy',
				[
					"default-src 'self'",
					`connect-src 'self' ${deps.publicOrigin?.replace(/^http/, 'ws') ?? 'ws: wss:'}`,
					"img-src 'self' data:",
					"base-uri 'none'",
					"form-action 'self'",
					"frame-ancestors 'none'",
				].join('; '),
			)
			c.header('Referrer-Policy', 'no-referrer')
			c.header('X-Content-Type-Options', 'nosniff')
			c.header(
				'Cache-Control',
				c.req.path.startsWith('/assets/') ? 'public, max-age=31536000, immutable' : 'no-cache',
			)
		})
		app.get('*', serveStatic({ root }))
		// Client side routes (/r/ABC123, /creer...) all load the single page.
		app.get('*', (c, next) =>
			c.req.path.startsWith('/api/') ? next() : serveStatic({ root, path: 'index.html' })(c, next),
		)
	}

	return { app, injectWebSocket }
}
