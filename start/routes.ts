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

// Etat temps reel de la file BullMQ (distinct de l'etat metier en base).
// Lecture passe-plat : pas d'invariant, pas de validation, pas de controleur dedie.
router.get('/queue/stats', async () => {
  const { analysisQueue } = await import('#queues/analysis_queue')
  // Note : quand la file est en pause, BullMQ range les nouveaux jobs dans
  // l'etat `paused` (et non `wait`). Cote UX on les fusionne dans "En attente".
  const counts = await analysisQueue.getJobCounts('waiting', 'active', 'completed', 'paused')
  const workers = await analysisQueue.getWorkers()
  const paused = await analysisQueue.isPaused()
  return {
    waiting: counts.waiting + counts.paused,
    active: counts.active,
    completed: counts.completed,
    workersOnline: workers.length > 0,
    paused,
  }
})

// Pause / reprise de la file. Ne tue pas le worker : arrete juste la
// distribution des jobs. Feature native BullMQ, pensee pour maintenance / deploiements.
router.post('/queue/pause', async () => {
  const { analysisQueue } = await import('#queues/analysis_queue')
  await analysisQueue.pause()
  return { paused: true }
})

router.post('/queue/resume', async () => {
  const { analysisQueue } = await import('#queues/analysis_queue')
  await analysisQueue.resume()
  return { paused: false }
})
