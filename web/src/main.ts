import { createApp } from 'vue'
import App from './App.vue'
import { installI18n } from './i18n/setup'
import { router } from './router'
import './styles/base.css'

const app = createApp(App)
installI18n(app)
app.use(router).mount('#app')
