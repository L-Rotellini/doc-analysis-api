import { BaseCommand } from '@adonisjs/core/ace'
import type { CommandOptions } from '@adonisjs/core/types/ace'
import type { AnalysisJobData } from '#queues/analysis_queue'

/**
 * Commande `node ace worker:start`.
 * Demarre le worker BullMQ qui consomme la file "analysis".
 * `staysAlive: true` garde le process en vie pour ecouter les jobs en continu.
 */
export default class WorkerStart extends BaseCommand {
  static commandName = 'worker:start'
  static description = 'Demarre le worker BullMQ qui traite la file analysis'

  static options: CommandOptions = { staysAlive: true }

  async run() {
    const { Worker } = await import('bullmq')
    const { redisConnection } = await import('#queues/connection')
    const { ANALYSIS_QUEUE } = await import('#queues/analysis_queue')
    const { db } = await import('#database/db')

    const worker = new Worker<AnalysisJobData>(
      ANALYSIS_QUEUE,
      async (job) => {
        this.logger.info(`Traitement du job #${job.id} : ${job.data.documentName}`)

        // Simule une analyse longue (2s).
        await new Promise((resolve) => setTimeout(resolve, 2000))

        // Marque la demande comme analysee en base.
        await db
          .updateTable('analysis_requests')
          .set({ status: 'analyzed', analyzed_at: new Date() })
          .where('id', '=', job.data.requestId)
          .execute()

        this.logger.success(`Job #${job.id} termine — demande #${job.data.requestId} analysee`)
      },
      { connection: redisConnection }
    )

    worker.on('failed', (job, err) => {
      this.logger.error(`Job #${job?.id} echoue : ${err.message}`)
    })

    this.logger.info('Worker BullMQ demarre — en attente de jobs...')
  }
}
