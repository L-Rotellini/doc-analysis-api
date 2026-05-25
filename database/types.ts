/*
|--------------------------------------------------------------------------
| Types de la base de donnees (le "schema" vu par Kysely)
|--------------------------------------------------------------------------
|
| Kysely n'inspecte PAS la base : c'est cette interface qui lui donne
| l'autocompletion et la verification de types. Elle doit donc rester
| alignee avec la vraie structure des tables (voir commands/db_migrate.ts).
|
| - Generated<T> : colonne remplie par la base (id auto, default now()).
|   => optionnelle a l'insertion, presente a la lecture.
| - ColumnType<Select, Insert, Update> : types differents selon l'operation.
|
*/

import type { Generated, ColumnType } from 'kysely'

export type AnalysisStatus = 'pending' | 'analyzed'

export interface AnalysisRequestsTable {
  id: Generated<number>
  document_name: string
  status: ColumnType<AnalysisStatus, AnalysisStatus | undefined, AnalysisStatus>
  created_at: Generated<Date>
  analyzed_at: ColumnType<Date | null, Date | null | undefined, Date | null>
}

/**
 * Le type global de la base : une cle par table.
 * C'est ce type qu'on passe a `new Kysely<Database>()`.
 */
export interface Database {
  analysis_requests: AnalysisRequestsTable
}
