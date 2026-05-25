# doc-analysis-api

Mini-API d'apprentissage qui simule une demande d'analyse de document : une route reçoit
un nom de document, l'enregistre en base, puis un worker traite la demande en arrière-plan.

## Stack

- **AdonisJS 6** (starter kit `slim`) — framework back Node.js / TypeScript, point d'entrée HTTP.
- **PostgreSQL + Kysely** — base de données (conteneur Docker) et query builder typé.
- **BullMQ + Redis** — file de jobs (conteneur Docker) pour traiter l'analyse en arrière-plan.

## Structure

```
app/                Code applicatif (controllers, middleware...)
  controllers/      analysis_requests_controller.ts (routes /requests)
  queues/           File BullMQ : connection.ts, analysis_queue.ts (producteur)
database/           Couche Kysely
  db.ts             Instance Kysely connectée à Postgres
  types.ts          Interface `Database` (le schéma typé vu par Kysely)
commands/           Commandes ace : db_migrate, worker:start (consommateur), queue:demo
config/             Configuration (app, logger...)
start/              Bootstrap : routes.ts, kernel.ts, env.ts (validation .env)
bin/                Points d'entrée (server.js, console.js, test.js)
adonisrc.ts         Manifeste AdonisJS
docker-compose.yml  Services locaux (Postgres + Redis)
.env                Variables locales (port, connexion DB/Redis...)
```

## Flux complet

1. `POST /requests` insère la demande (`pending`) via Kysely, dépose un job BullMQ avec son `id`, et répond **202** sans attendre.
2. Le **worker** (`node ace worker:start`, process séparé) récupère le job depuis Redis, simule l'analyse (2s), puis passe la ligne à `status = analyzed` + `analyzed_at`.

> Pour voir le flux : lancer `docker compose up -d`, `node ace db:migrate`, puis **deux terminaux** : `node ace worker:start` et `npm run dev`.

## Commandes

```bash
docker compose up -d   # Démarre Postgres (5432) + Redis (6379)
docker compose down    # Arrête (ajouter -v pour effacer les données)
node ace db:migrate    # Crée la table analysis_requests (Kysely)
node ace worker:start  # Démarre le worker BullMQ (process séparé)
npm run dev            # Serveur de dev (HMR), port 3333
npm run build          # Build de production (-> build/)
npm run typecheck      # Vérification TypeScript
npm run lint           # ESLint
```

## Base de données

- **Table `analysis_requests`** : `id`, `document_name`, `status` (`pending` | `analyzed`, défaut `pending`), `created_at`, `analyzed_at`.
- Schéma typé déclaré dans `database/types.ts` (Kysely n'inspecte pas la base, il se fie à ce type).

## Routes

| Méthode | Chemin       | Description                                    |
|---------|--------------|------------------------------------------------|
| GET     | `/`          | Renvoie `It works!`                            |
| GET     | `/requests`  | Liste les demandes d'analyse (récentes d'abord)|
| POST    | `/requests`  | Crée une demande (202) + déclenche l'analyse — body `{ documentName }` |
