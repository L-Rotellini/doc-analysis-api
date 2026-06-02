# doc-analysis-api

API de démonstration qui simule une **demande d'analyse de document** avec un
traitement **asynchrone** : l'API accuse réception immédiatement, puis un worker
en arrière-plan réalise l'analyse et met à jour le statut en base.

Projet d'apprentissage construit pour explorer **AdonisJS, Kysely, BullMQ et Redis**.

---

## 🎯 Le problème résolu

Une analyse de document est une opération longue. Si l'API la traitait pendant la
requête HTTP, le client resterait bloqué et l'API ne tiendrait pas la charge.

La solution : **découpler** la réception de la demande de son traitement.

```
                         ┌─────────────────────────────────────────────┐
                         │                  PostgreSQL                   │
                         │  analysis_requests (id, status, analyzed_at)  │
                         └─────────────────────────────────────────────┘
                              ▲  (1) INSERT pending        ▲ (4) UPDATE analyzed
                              │                            │
   POST /requests       ┌────┴───────┐               ┌────┴────────┐
  ───────────────────►  │  AdonisJS  │               │   Worker    │
  { documentName }      │   (API)    │               │  (BullMQ)   │
                        └────┬───────┘               └────▲────────┘
        ◄───────────────     │ (2) ajoute un job          │ (3) consomme le job
         202 Accepted        │                            │
         (status: pending)   ▼                            │
                         ┌──────────────────────────────────────────┐
                         │                  Redis                     │
                         │            file de jobs "analysis"         │
                         └──────────────────────────────────────────┘
```

1. L'API **insère** la demande (`status: pending`) via Kysely.
2. Elle **dépose un job** dans la file BullMQ (stockée dans Redis) et répond `202`.
3. Le **worker** (process séparé) consomme le job.
4. Il simule l'analyse (2 s) puis **met à jour** la ligne en `status: analyzed`.

---

## 🧱 Stack & choix techniques

| Techno | Rôle | Pourquoi ce choix |
|--------|------|-------------------|
| **AdonisJS 6** | Framework HTTP (kit `slim`) | Framework back *opinionated* : structure, CLI `ace`, validation d'env au boot. |
| **PostgreSQL** | Stockage durable des demandes | Base relationnelle robuste et standard. |
| **Kysely** | Query builder typé | Le contrôle du SQL + la sécurité des types TypeScript, sans la couche d'abstraction d'un ORM. |
| **Redis** | Store en mémoire | Tampon partagé ultra-rapide entre l'API (producteur) et le worker (consommateur). |
| **BullMQ** | File de jobs (sur Redis) | Découple le travail lourd, gère retries, persistance et scalabilité des workers. |
| **Docker Compose** | Infra locale | Lance Postgres + Redis en une commande, isolé et reproductible. |

---

## 🚀 Démarrage

### Prérequis
- Node.js ≥ 20.6
- Docker (pour Postgres + Redis)

### Installation
```bash
npm install
cp .env.example .env        # ajuster si besoin
docker compose up -d        # démarre Postgres (5432) + Redis (6379)
node ace db:migrate         # crée la table analysis_requests
```

### Lancer l'application
Deux process, dans deux terminaux :
```bash
# Terminal 1 — le worker (traitement en arrière-plan)
node ace worker:start

# Terminal 2 — le serveur HTTP
npm run dev                 # http://localhost:3333
```

### Tester le flux

**Option 1 — Console visuelle (recommandée) :** ouvrir <http://localhost:3333/> dans le navigateur.
La page affiche un **pipeline live à 4 nœuds** (API → File Redis → Worker → PostgreSQL),
des compteurs animés, et une liste de cartes qui **flashent en vert** au passage
`pending → analyzed`. Le statut du worker (en ligne / en pause / hors ligne) est lu
en direct depuis BullMQ via `getWorkers()`, et un bouton **Pause** appelle
`analysisQueue.pause()` pour démontrer la primitive de maintenance.

> La console oppose volontairement deux sources de vérité — la *liste* lit l'état métier
> persisté en base (`pending` / `analyzed`), tandis que le *pipeline* lit l'état d'exécution
> de BullMQ (`getJobCounts` + `getWorkers`). L'état « en cours » d'une carte est dérivé
> côté client à partir de `stats.active` (BullMQ ne dit pas *quelle* ligne est traitée).

**Option 2 — En ligne de commande :**
```bash
# Crée une demande -> répond 202 avec status "pending"
curl -X POST http://localhost:3333/requests \
  -H "Content-Type: application/json" \
  -d '{"documentName":"contrat.pdf"}'

# ~2 s plus tard, le worker a fait son travail :
curl http://localhost:3333/requests   # status passé à "analyzed"

# État live de la file BullMQ :
curl http://localhost:3333/queue/stats
# { "waiting": 0, "active": 0, "completed": 1, "workersOnline": true, "paused": false }
```

---

## 📡 API

| Méthode | Chemin | Description |
|---------|--------|-------------|
| `GET`  | `/`              | Console de démo (pipeline live + formulaire + liste). |
| `GET`  | `/health`        | Health check (`It works!`). |
| `GET`  | `/requests`      | Liste les demandes (plus récentes d'abord). |
| `POST` | `/requests`      | Crée une demande, dépose un job BullMQ et répond `202`. Body : `{ "documentName": string }`. |
| `GET`  | `/queue/stats`   | État live de la file : `{ waiting, active, completed, workersOnline, paused }`. |
| `POST` | `/queue/pause`   | Met la file en pause via `analysisQueue.pause()` (le worker reste connecté). |
| `POST` | `/queue/resume`  | Reprend la distribution des jobs. |

---

## 📂 Structure

```
app/
  controllers/   analysis_requests_controller.ts   # routes /requests
  queues/        connection.ts, analysis_queue.ts  # file BullMQ (producteur)
database/
  db.ts          # instance Kysely connectée à Postgres
  types.ts       # interface Database (schéma typé vu par Kysely)
commands/
  db_migrate.ts    # node ace db:migrate  — crée les tables
  worker_start.ts  # node ace worker:start — worker BullMQ (consommateur)
  queue_demo.ts    # node ace queue:demo   — dépose un job de test
public/
  index.html     # page de démo (formulaire + liste auto-rafraîchie)
start/
  routes.ts      # routes HTTP
  env.ts         # validation/typage des variables d'environnement
docker-compose.yml   # Postgres + Redis
```

---

## 💡 Points techniques notables

- **Découplage producteur / consommateur** : `Queue` (API) et `Worker` vivent dans des
  process distincts et ne communiquent que via Redis — on peut scaler les workers
  indépendamment du serveur HTTP.
- **Typage de bout en bout** : Kysely type les requêtes à partir de l'interface
  `Database` (`database/types.ts`). Une mauvaise colonne échoue à la compilation.
- **Validation d'environnement au boot** : `start/env.ts` fait échouer le démarrage si
  une variable est manquante ou mal typée (*fail fast*).
- **Durabilité** : si le worker est arrêté, les jobs s'accumulent dans Redis et sont
  traités à son redémarrage.
- **Connexion worker bloquante** : `maxRetriesPerRequest: null` est requis côté BullMQ
  pour que la connexion Redis en attente de jobs n'expire pas.

---

## 🔭 Pistes d'amélioration

- Validation du payload avec **VineJS** (validateur intégré à AdonisJS).
- Gestion des échecs : `attempts` + `backoff` sur les jobs, dead-letter queue.
- Notification de fin (WebSocket / webhook) plutôt que du polling.
- Tests (Japa, déjà configuré dans le kit).
- Vraies migrations versionnées (ex. via le `Migrator` de Kysely).
