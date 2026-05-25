/*
|--------------------------------------------------------------------------
| Instance Kysely (point d'acces unique a la base)
|--------------------------------------------------------------------------
|
| On cree un pool de connexions PostgreSQL (via le driver `pg`), on l'emballe
| dans le dialecte Postgres de Kysely, puis on expose une instance `db` typee
| avec notre interface `Database`. Tout le reste du code importe ce `db`.
|
*/

import { Kysely, PostgresDialect } from 'kysely'
import { Pool } from 'pg'
import env from '#start/env'
import type { Database } from '#database/types'

const dialect = new PostgresDialect({
  pool: new Pool({
    host: env.get('DB_HOST'),
    port: env.get('DB_PORT'),
    user: env.get('DB_USER'),
    password: env.get('DB_PASSWORD'),
    database: env.get('DB_DATABASE'),
  }),
})

export const db = new Kysely<Database>({ dialect })
