# Bingo Live

Bingo multijoueur en temps réel : on crée un salon, on partage le lien, chacun reçoit **sa
propre grille** tirée du **même dictionnaire** d'expressions, et tout le salon voit les
lignes, diagonales et cartons pleins en direct (annonces, confettis, son, chat).

Production : <https://bingo.voikyrioh.fr> (fiche infra `apps/bingo.yml` du repo `infra-as-code`).

## Fonctionnalités

- Grilles 3×3, 4×4 ou 5×5, case gratuite au centre en option, tirées au hasard côté serveur.
- Détection des lignes, colonnes, diagonales et du carton plein (serveur = seule autorité).
- Salons jusqu'à **50 joueurs** (+ 50 spectateurs), avec ou sans mot de passe, visibles ou non
  dans la liste publique, rejoignables par lien ou par code à 6 caractères.
- Pseudo libre ou **nom marrant** tiré d'une table en base ; un dictionnaire peut avoir ses
  propres noms (le discours a les siens), la liste générale sert de secours.
- Grilles des autres visibles (lecture seule), classement en direct, **chat** à droite.
- L'hôte choisit ou écrit le dictionnaire, peut **exclure** quelqu'un ; s'il part, le rôle passe
  au joueur suivant.
- **Mode solo** : on joue seul, et on peut partager son dictionnaire (`/d/<code>`).
- **Spectateurs** (mot de passe exigé s'il y en a un).
- **24 langues européennes** pour l'interface (choix mémorisé, sinon langue du navigateur),
  textes adaptés à chaque langue plutôt que traduits mot à mot. Les dictionnaires ne sont
  jamais traduits : chacun porte sa langue, et les listes de salons et de dictionnaires se
  filtrent par langue.
- Fermeture automatique : salon sans activité depuis **2 jours**, ou sans personne de connecté
  depuis 15 min (marge pour les rechargements et les redéploiements). Purge 7 jours après.

## Stack

| Partie | Choix | Pourquoi |
|---|---|---|
| Serveur | Node 22, TypeScript, **Hono** + `@hono/node-server` + `@hono/node-ws` | Hono demandé, adaptateur WebSocket officiel (bas niveau, sur `ws`) |
| Base | **PostgreSQL** via `pg` (SQL écrit à la main) | ressource partagée déjà provisionnée par l'infra |
| Validation | `zod` | entrées HTTP, messages WebSocket, configuration |
| Front | **Vue 3.5** + `vue-router`, Vite | aucun design system : tous les composants sont faits main |
| Traductions | `@Voikyrioh/vue-translate` (GitHub Packages, privé) | paquet maison ; pluriels via `Intl.PluralRules`, dates via `Intl` |
| Polices | `@fontsource-variable/fredoka`, `nunito` | servies en local (CSP stricte, pas de Google Fonts) |
| Tests | Vitest, `@vue/test-utils`, `happy-dom` | un seul lanceur pour serveur, front et code partagé |
| Lint/format | Biome | même outil que les autres projets |

Pas de lib de confettis, de sons, de toasts, de modale ni d'icônes : confettis sur `<canvas>`,
sons synthétisés avec Web Audio, modale sur `<dialog>` natif, icônes SVG inline.

## Structure

```
shared/   règles du bingo (lignes, progression), limites, protocole REST/WebSocket (TS pur)
server/   API Hono + WebSocket, architecture hexagonale (voir ARCHITECTURE.md)
web/      client Vue
```

## Développement

`@Voikyrioh/vue-translate` vient de GitHub Packages (privé) : `.npmrc` lit un jeton
`read:packages` dans `GITHUB_TOKEN`.

```bash
export GITHUB_TOKEN=ghp_xxx                       # PAT classic, scope read:packages
npm install
docker compose -f compose.dev.yml up -d          # Postgres local (facultatif)

# Terminal 1 : serveur (STORAGE=memory par défaut en dev, pas besoin de Postgres)
npm run dev -w server
# ou avec Postgres :
STORAGE=postgres DATABASE_URL=postgres://bingo_user:bingo@127.0.0.1:5432/bingo npm run dev -w server

# Terminal 2 : client sur http://localhost:5173 (proxy /api et WebSocket vers :3000)
npm run dev -w web
```

Vérifications (identiques à la CI) :

```bash
npm run lint && npm run typecheck && npm test && npm run build
# Tests du contrat Postgres des repositories :
TEST_DATABASE_URL=postgres://bingo_user:bingo@127.0.0.1:5432/bingo_test npm test -w server
```

## Variables d'environnement (serveur)

Validées au démarrage par `server/src/config.ts`. Exemple : `.env.example`.

| Variable | Rôle |
|---|---|
| `NODE_ENV`, `HOSTNAME`, `PORT` | serveur (défauts `development`, `127.0.0.1`, `3000`) |
| `STORAGE` | `postgres` (défaut) ou `memory` |
| `DATABASE_URL` | posé par `provision-app.yml` dans Vault (`secret/apps/bingo`) |
| `PUBLIC_ORIGIN` | `https://bingo.voikyrioh.fr`, obligatoire en production (origine autorisée des WebSockets, CSP) |
| `STATIC_DIR` | client buildé à servir (`/app/public` dans l'image) |
| `MIGRATIONS_DIR` | dossier des migrations SQL (`/app/migrations` dans l'image) |
| `LOG_LEVEL` | `debug`, `info`, `warn`, `error` |

## Langues

- **Interface** : un fichier par langue dans `web/public/locales/<locale>` (JSON plat, sans
  extension, chargé par `vue-translate` à l'adresse `/locales/<locale>`). La référence est
  `fr-FR` ; la liste des langues est dans `shared/src/languages.ts`.
- **Serveur** : il n'envoie jamais de phrase. Les erreurs (`{ code, key, params }`) et les
  messages du fil (arrivées, départs, annonces : `key` + `params`) sont traduits par chaque
  client dans sa langue (`error.<key>`, `feed.<key>`).
- **Pluriels** : clés `.one`, `.few`, `.many`, `.other`… choisies avec `Intl.PluralRules`
  (`useI18n().tc`). Chaque langue fournit les formes dont elle a besoin.
- **Dictionnaires** : jamais traduits. Chacun a une langue (`language`, choisie à la
  création) ; `GET /api/dictionaries?language=de` et `GET /api/rooms?language=de` filtrent.
- **Contrôles** (tests du front) : chaque fichier a les clés du français, les mêmes
  variables `{…}`, les formes de pluriel de sa langue ; chaque clé utilisée par le code, et
  chaque clé envoyée par le serveur, existe.

Ajouter une langue : l'ajouter à `LANGUAGES` (`shared/src/languages.ts`), créer
`web/public/locales/<locale>` à partir de `fr-FR`, puis `npm test -w web`. Modifier un texte :
modifier `fr-FR` puis la même clé dans les autres langues.

## Base de données

Migrations SQL dans `server/migrations/`, appliquées **au démarrage** (verrou consultatif
Postgres, table `schema_migrations`), puis upsert des dictionnaires vedettes et des noms
marrants depuis `server/src/infrastructure/seed-data.ts` (champ `funnyNames` d'un dictionnaire
pour ses noms réservés). Ajouter ou modifier un dictionnaire vedette ou ses noms = modifier ce
fichier et redéployer.

## Déploiement

L'image est construite par le `Dockerfile` à la racine, via les workflows partagés de
[`voikyrioh/workflows`](https://github.com/Voikyrioh/workflows) :

| Workflow (ce repo) | Appelle | Résultat |
|---|---|---|
| `ci.yml` (push, PR) | — | lint, typecheck, tests (Postgres), build, image construite sans push |
| `deploy.yml` (manuel) | `deploy-app.yml` | image `ghcr.io/voikyrioh/bingo:<sha>` + `latest`, `.env` depuis Vault, `docker compose up` sur le serveur |
| `release.yml` (manuel) | `ci-release.yml` | tag `vX.Y.Z`, image `ghcr.io/voikyrioh/bingo:vX.Y.Z` + `latest`, release GitHub |

0. Accès au paquet privé `@Voikyrioh/vue-translate`, au choix :
   - GitHub → paquet `vue-translate` → *Package settings* → *Manage Actions access* → ajouter
     `bingo-multiplayer-app` (lecture) : le jeton automatique des workflows suffit, et aussi
     pour sa dépendance `@Voikyrioh/observable` ;
   - ou un secret de dépôt `NPM_TOKEN` (PAT classic `read:packages`), prioritaire s'il existe.
   Sans l'un des deux, `npm ci` échoue en 401/403 dans la CI et dans le build de l'image.
1. Infra (une fois) : fiche `apps/bingo.yml` du repo `infra-as-code`, `tofu apply` pour le DNS,
   puis workflow `provision-app.yml` (`app_name=bingo`) : base Postgres, secrets Vault,
   compose Traefik et secrets GitHub de ce repo. Détail : runbook `docs/runbooks/mettre-en-ligne-bingo.md`
   du repo infra.
2. Déployer le commit courant : `gh workflow run deploy.yml --repo voikyrioh/bingo-multiplayer-app`.
3. Ou, pour une version numérotée : workflow **Release**, puis `deploy-version.yml` du repo infra
   (`app_name=bingo`, `version=vX.Y.Z`).

Un seul conteneur sert le client, l'API (`/api`) et les WebSockets (`/api/rooms/:code/ws`) :
même origine, donc pas de CORS. Le serveur garde l'état des connexions en mémoire : **une
seule instance** (pas de réplicas sans ajouter un bus type Redis pub/sub).
