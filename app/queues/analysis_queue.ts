/*
|--------------------------------------------------------------------------
| File "analysis" (cote producteur)
|--------------------------------------------------------------------------
|
| Une Queue BullMQ est le point d'entree pour DEPOSER des jobs dans Redis.
| Le worker (cote consommateur) lit cette meme file pour les traiter.
|
*/

import { Queue } from 'bullmq'
import { redisConnection } from '#queues/connection'

/** Nom de la file (doit etre identique cote worker). */
export const ANALYSIS_QUEUE = 'analysis'

/** Donnees transportees par chaque job d'analyse. */
export interface AnalysisJobData {
  requestId: number
  documentName: string
}

export const analysisQueue = new Queue<AnalysisJobData>(ANALYSIS_QUEUE, {
  connection: redisConnection,
})

/** Depose un job d'analyse dans la file. */
export function enqueueAnalysis(data: AnalysisJobData) {
  return analysisQueue.add('analyze', data)
}
