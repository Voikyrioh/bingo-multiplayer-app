// MUST be the first import: OpenTelemetry patches modules before the app imports them.
// (A side-effect import also stops the import sorter from moving it.)
import './instrumentation'
import { Logger } from '@Voikyrioh/observability'
import { serve } from '@hono/node-server'
import { loadConfig } from './config'
import { createContainer } from './container'
import { observability } from './instrumentation'
import { createApp } from './interface/http/app'

const SWEEP_INTERVAL_MS = 60_000

const config = loadConfig()
const container = await createContainer(config)
const { app, injectWebSocket } = createApp({
	...container,
	publicOrigin: config.env === 'production' ? config.publicOrigin : null,
	staticDir: config.staticDir,
})

const server = serve({ fetch: app.fetch, hostname: config.host, port: config.port }, (info) =>
	Logger.info(
		{
			storage: config.storage.kind,
			static: config.staticDir ?? 'none',
			tracing: observability.enabled,
		},
		`Bingo listening on http://${info.address}:${info.port}`,
	),
)
injectWebSocket(server)

// Closes inactive (2 days) and empty rooms, purges old closed ones.
const sweeper = setInterval(() => {
	container.rooms
		.sweep()
		.then((result) => {
			if (result.closed || result.purged) Logger.info(result, 'Rooms swept')
		})
		.catch((error) => Logger.error({ err: error }, 'Sweep failed'))
}, SWEEP_INTERVAL_MS)

function stop() {
	clearInterval(sweeper)
	container.hub.closeAll()
	server.close(async () => {
		await container.dispose()
		Logger.info('Server stopped')
		// Pending spans are flushed to SigNoz before exiting.
		await observability.shutdown().catch(() => undefined)
		process.exit(0)
	})
}
process.on('SIGINT', stop)
process.on('SIGTERM', stop)
