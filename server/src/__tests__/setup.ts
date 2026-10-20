import { configureLogger } from '@Voikyrioh/observability'

// Quiet, transport-free logger for tests (no pino-pretty worker).
configureLogger({ pretty: false, level: 'silent' })
