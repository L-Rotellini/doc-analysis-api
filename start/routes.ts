/*
|--------------------------------------------------------------------------
| Routes file
|--------------------------------------------------------------------------
|
| The routes file is used for defining the HTTP routes.
|
*/

import { readFile } from 'node:fs/promises'
import app from '@adonisjs/core/services/app'
import router from '@adonisjs/core/services/router'
const AnalysisRequestsController = () => import('#controllers/analysis_requests_controller')

const indexHtmlPath = app.makePath('public/index.html')

// Page de demo : formulaire + liste auto-rafraichie qui montre le flux async en direct.
router.get('/', async ({ response }) => {
  const html = await readFile(indexHtmlPath, 'utf-8')
  return response.type('text/html').send(html)
})

// Health check pour les tests / les sondes externes.
router.get('/health', async () => 'It works!')

router.get('/requests', [AnalysisRequestsController, 'index'])
router.post('/requests', [AnalysisRequestsController, 'store'])
