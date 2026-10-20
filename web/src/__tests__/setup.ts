import { config } from '@vue/test-utils'
import { testI18n } from './test-i18n'

// Every mounted component gets the French catalog by default.
config.global.plugins = [testI18n()]
