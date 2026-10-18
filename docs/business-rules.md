# Règles métier

| Id | Règle | Où |
|---|---|---|
| BR-01 | Une grille est tirée au hasard (aléa cryptographique) dans le dictionnaire du salon ; deux joueurs n'ont (presque) jamais la même. | `domain/grid.ts` |
| BR-02 | Une grille N×N demande N² expressions distinctes, N²−1 avec case gratuite (grilles impaires seulement). La case gratuite est cochée d'office et ne se décoche pas. | `shared/limits.ts`, `domain/grid.ts` |
| BR-03 | Lignes, colonnes et diagonales complètes sont annoncées à tout le salon **une seule fois** par joueur ; le carton plein une fois, avec son rang (1er, 2e…). Une seule annonce par coup : carton plein > diagonale > ligne. | `domain/room.ts` |
| BR-04 | 50 joueurs et 50 spectateurs au plus par salon. Une partie solo n'accepte personne d'autre. | `room.service.ts` |
| BR-05 | Le mot de passe, s'il existe, est demandé aux joueurs **et** aux spectateurs. Stocké en scrypt. | `room.service.ts`, `scrypt-password-hasher.ts` |
| BR-06 | Pseudo unique dans le salon (casse et accents ignorés), 30 caractères au plus ; vide = nom marrant tiré en base, d'abord parmi les noms réservés au dictionnaire du salon (ex. le discours), sinon dans la liste générale. | `domain/names.ts`, `application/funny-names.ts` |
| BR-07 | Seul l'hôte exclut. S'il quitte le salon, le plus ancien joueur (sinon spectateur) devient hôte ; si plus personne, le salon ferme. | `room.service.ts` |
| BR-08 | Un salon ferme après 2 jours sans activité, ou 15 min sans aucune connexion. Il est supprimé (participants, messages) 7 jours après sa fermeture. | `room.service.ts#sweep` |
| BR-09 | Dictionnaire : titre 3–60 caractères, 8 à 200 expressions de 80 caractères au plus, doublons retirés. Public = listé pour tous ; sinon accessible par son lien seulement. | `domain/dictionary.ts` |
| BR-10 | Chat : 300 caractères, 8 messages par 10 s et par personne. Écritures HTTP : 30 par minute et par adresse. Aucune adresse IP, aucun jeton ni mot de passe dans les journaux. | `room.service.ts`, `rate-limit.ts`, `logger.ts` |
