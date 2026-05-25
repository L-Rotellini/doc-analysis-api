/*
|--------------------------------------------------------------------------
| Connexion Redis partagee par BullMQ
|--------------------------------------------------------------------------
|
| La file (producteur) et le worker (consommateur) utilisent la meme config
| de connexion. `maxRetriesPerRequest: null` est REQUIS par BullMQ : le worker
| ouvre une connexion bloquante qui attend les jobs, elle ne doit pas expirer.
|
*/

import env from '#start/env'
import type { ConnectionOptions } from 'bullmq'

export const redisConnection: ConnectionOptions = {
  host: env.get('REDIS_HOST'),
  port: env.get('REDIS_PORT'),
  maxRetriesPerRequest: null,
}
