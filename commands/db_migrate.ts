import { BaseCommand } from '@adonisjs/core/ace'
import type { CommandOptions } from '@adonisjs/core/types/ace'

/**
 * Commande `node ace db:migrate`.
 * Cree la table `analysis_requests` via le schema builder de Kysely.
 * Idempotente grace a `ifNotExists()` : on peut la relancer sans erreur.
 */
export default class DbMigrate extends BaseCommand {
  static commandName = 'db:migrate'
  static description = 'Cree les tables de la base via Kysely'

  static options: CommandOptions = {}

  async run() {
    const { sql } = await import('kysely')
    const { db } = await import('#database/db')

    await db.schema
      .createTable('analysis_requests')
      .ifNotExists()
      .addColumn('id', 'serial', (col) => col.primaryKey())
      .addColumn('document_name', 'text', (col) => col.notNull())
      .addColumn('status', 'text', (col) => col.notNull().defaultTo('pending'))
      .addColumn('created_at', 'timestamptz', (col) => col.notNull().defaultTo(sql`now()`))
      .addColumn('analyzed_at', 'timestamptz')
      .execute()

    this.logger.success('Table "analysis_requests" prete')
    await db.destroy()
  }
}
