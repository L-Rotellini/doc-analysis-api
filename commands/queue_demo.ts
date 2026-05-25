import { BaseCommand } from '@adonisjs/core/ace'
import type { CommandOptions } from '@adonisjs/core/types/ace'

/**
 * Commande `node ace queue:demo`.
 * Depose un job de demonstration dans la file, pour verifier que le worker
 * le recupere bien. (Outil de dev — la brique 4 deposera depuis la route HTTP.)
 */
export default class QueueDemo extends BaseCommand {
  static commandName = 'queue:demo'
  static description = 'Ajoute un job de demonstration dans la file analysis'

  static options: CommandOptions = {}

  async run() {
    const { enqueueAnalysis, analysisQueue } = await import('#queues/analysis_queue')

    const job = await enqueueAnalysis({ requestId: 0, documentName: 'demo.pdf' })
    this.logger.success(`Job #${job.id} ajoute a la file "analysis"`)

    await analysisQueue.close()
  }
}
