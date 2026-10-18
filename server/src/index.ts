import { serve } from '@hono/node-server'
import { loadConfig } from './config'
import { createContainer } from './container'
import { createApp } from './interface/http/app'
import { logger, setLogLevel } from './logger'

const SWEEP_INTERVAL_MS = 60_000

const config = loadConfig()
setLogLevel(config.logLevel)
const container = await createContainer(config)
const { app, injectWebSocket } = createApp({
	...container,
	publicOrigin: config.env === 'production' ? config.publicOrigin : null,
	staticDir: config.staticDir,
})

const server = serve({ fetch: app.fetch, hostname: config.host, port: config.port }, (info) =>
	logger.info(`Bingo listening on http://${info.address}:${info.port}`, {
		storage: config.storage.kind,
		static: config.staticDir ?? 'none',
	}),
)
injectWebSocket(server)

// Closes inactive (2 days) and empty rooms, purges old closed ones.
const sweeper = setInterval(() => {
	container.rooms
		.sweep()
		.then((result) => {
			if (result.closed || result.purged) logger.info('Rooms swept', result)
		})
		.catch((error) => logger.error('Sweep failed', { error: (error as Error).message }))
}, SWEEP_INTERVAL_MS)

function stop() {
	clearInterval(sweeper)
	container.hub.closeAll()
	server.close(async () => {
		await container.dispose()
		logger.info('Server stopped')
		process.exit(0)
	})
}
process.on('SIGINT', stop)
process.on('SIGTERM', stop)
