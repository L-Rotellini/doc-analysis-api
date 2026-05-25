/*
|--------------------------------------------------------------------------
| Routes file
|--------------------------------------------------------------------------
|
| The routes file is used for defining the HTTP routes.
|
*/

import router from '@adonisjs/core/services/router'
const AnalysisRequestsController = () => import('#controllers/analysis_requests_controller')

router.get('/', async () => 'It works!')

router.get('/requests', [AnalysisRequestsController, 'index'])
router.post('/requests', [AnalysisRequestsController, 'store'])
