# Architecture

## Vue d'ensemble

```
Navigateur ──HTTPS──► Cloudflare ──► Traefik ──► conteneur bingo (Hono, :3000)
   │                                               ├── /            client Vue (fichiers statiques)
   │                                               ├── /api/*       REST (création, liste, rejoindre)
   └──────────────── WebSocket (wss) ─────────────►└── /api/rooms/:code/ws   temps réel
                                                         │
                                                         ▼
                                                   PostgreSQL (shared_postgres, base « bingo »)
```

## Serveur : architecture hexagonale

```
server/src/
  domain/          règles pures, aucune dépendance technique
                   grid.ts (tirage, cocher), room.ts (annonces), dictionary.ts (validation),
                   names.ts, codes.ts, random.ts, errors.ts
  application/     cas d'usage + ports (interfaces)
                   room.service.ts, dictionary.service.ts, ports.ts, views.ts, keyed-mutex.ts
  infrastructure/  adaptateurs des ports
                   postgres/ (repositories, migrate, seed), memory/ (tests, mode sans base),
                   realtime/connection-hub.ts (WebSocket), security/ (scrypt, jetons), system/
  interface/       entrées : http/ (routes Hono, erreurs, rate limit), ws/room-connection.ts,
                   schemas.ts (Zod)
  container.ts     racine de composition : le seul endroit qui choisit les adaptateurs
  instrumentation.ts  OpenTelemetry (@Voikyrioh/observability), premier import
  index.ts         démarrage, balayage périodique des salons, arrêt propre (flush des spans)
```

Sens des dépendances : `interface → application → domain`, `infrastructure → application`.
Le domaine et les cas d'usage se testent sans réseau ni base (horloge, hasard et identifiants
injectés). Les repositories mémoire et Postgres passent **le même test de contrat**.

## Temps réel

1. `POST /api/rooms` ou `POST /api/rooms/:code/join` renvoie un **jeton** (256 bits, seul son
   SHA-256 est stocké). Le client le garde en `localStorage` par salon : recharger la page
   remet le joueur à sa place avec sa grille.
2. Le client ouvre `wss://…/api/rooms/:code/ws` et envoie `{type:'auth', token}` en premier
   message (jamais dans l'URL, qui finit dans les journaux des proxys). Sans auth en 5 s : fermé.
3. Le serveur répond par un `snapshot` (salon, participants et grilles, 100 derniers messages)
   puis pousse des événements idempotents (`participant:progress`, `announce`, `message`…).
   Les événements reçus avant le snapshot sont rejoués après.
4. Le client envoie un `ping` toutes les 25 s (Cloudflare coupe une WebSocket inactive après
   ~100 s) et se reconnecte avec backoff ; les codes de fermeture 4001–4006 sont définitifs.

Le protocole complet est typé dans `shared/src/protocol.ts`.

Les mutations d'un salon passent par un verrou par salon (`KeyedMutex`) : pas de course sur la
dernière place libre ni sur le rang des cartons pleins. Le serveur est **mono-instance**.

## Client

```
web/src/
  api/          http.ts (fetch typé), room-socket.ts (WebSocket, heartbeat, reconnexion)
  lib/          room-state.ts (réducteur pur des événements), confetti.ts, sound.ts,
                identity.ts (jetons par salon), dictionary-draft.ts…
  composables/  useRoom (état + effets), useCelebration, useToasts
  components/   ui/ (bouton, champ, interrupteur, segmenté, modale, icônes) + composants métier
  pages/        accueil, salons, créer/solo, salon, dictionnaire
```

Accessibilité : grille au clavier (tabindex mobile, flèches), `aria-pressed` sur chaque case,
annonces en région `aria-live`, chat en `role="log"`, modales `<dialog>` natives, contrastes AA,
`prefers-reduced-motion` respecté (pas de confettis ni d'animations), thème sombre automatique.

Traductions : `@Voikyrioh/vue-translate` charge `/locales/<locale>` (fichiers de
`web/public/locales/`, servis en JSON par le serveur) ; `i18n/useI18n.ts` y ajoute les
pluriels (`Intl.PluralRules`), la traduction des erreurs et le changement de langue. Rien
n'est affiché avant le chargement du fichier de la langue (pas de clés brutes à l'écran).
Le serveur ne formule aucune phrase : `ApiError` et les messages du fil portent une clé et des
paramètres (`shared/src/protocol.ts`).

Règles métier : `docs/business-rules.md`.
