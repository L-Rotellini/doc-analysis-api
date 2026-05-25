import type { HttpContext } from '@adonisjs/core/http'
import { db } from '#database/db'
import { enqueueAnalysis } from '#queues/analysis_queue'

export default class AnalysisRequestsController {
  /**
   * POST /requests
   * Enregistre une demande (status `pending`), depose un job d'analyse,
   * et repond immediatement (202). Le worker passera la ligne a `analyzed`.
   */
  async store({ request, response }: HttpContext) {
    const documentName = request.input('documentName')

    if (!documentName || typeof documentName !== 'string') {
      return response.badRequest({ error: 'documentName est requis (string)' })
    }

    // Kysely infere le type de `created` a partir de l'interface Database :
    // selectionner une mauvaise colonne ou un mauvais type echouerait a la compilation.
    const created = await db
      .insertInto('analysis_requests')
      .values({ document_name: documentName })
      .returningAll()
      .executeTakeFirstOrThrow()

    // On depose le job APRES l'insert : on transmet l'id pour que le worker
    // sache quelle ligne mettre a jour.
    await enqueueAnalysis({ requestId: created.id, documentName: created.document_name })

    // 202 Accepted = "c'est pris en compte, le traitement suivra".
    return response.accepted(created)
  }

  /**
   * GET /requests
   * Liste les demandes, les plus recentes d'abord.
   */
  async index({}: HttpContext) {
    return db.selectFrom('analysis_requests').selectAll().orderBy('created_at', 'desc').execute()
  }
}
