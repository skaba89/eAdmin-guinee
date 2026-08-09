# Politique faible débit et hors connexion — eAdmin Guinée

## Objectif

La plateforme doit rester utile sur un réseau mobile instable sans transformer le navigateur en copie locale de la base administrative.

## Données autorisées hors connexion

Le service worker peut conserver :

- le shell applicatif public ;
- les bundles statiques versionnés ;
- les logos et assets publics explicitement autorisés ;
- le catalogue public des services administratifs déjà consulté.

Le service worker ne doit jamais conserver :

- une requête portant `Authorization` ;
- une réponse d'API privée `/api/v1/*` autre que l'endpoint public explicitement listé ;
- documents GED, courriers, signatures, incidents SOC, habilitations IAM, pièces jointes ou profils utilisateurs ;
- cookies, tokens, secrets, OTP ou données de session ;
- images arbitraires uniquement sur la base de leur extension de fichier.

## Soumissions citoyennes et reconnexion

Une création de démarche peut porter `Idempotency-Key`. Le navigateur génère une clé stable pour l'empreinte SHA-256 du payload et ne conserve dans `sessionStorage` que :

- l'empreinte du payload ;
- une clé aléatoire d'idempotence ;
- l'heure de création.

Le payload métier et ses éventuelles PII ne sont pas stockés par le mécanisme d'idempotence.

Le backend réserve la clé dans Redis, l'isole par utilisateur authentifié et empreinte le corps de la requête. Une réutilisation avec un autre corps est rejetée. Une réponse JSON 2xx bornée peut être rejouée sans exécuter une deuxième mutation.

Ce mécanisme protège les retries réseau ordinaires. Une garantie transactionnelle exactement-une-fois face à un crash entre commit PostgreSQL et écriture Redis nécessiterait une clé d'idempotence persistée dans la même transaction métier ; cette évolution doit être réalisée avant de revendiquer une sémantique « exactly once » absolue.

## PII et brouillons offline

Ce premier lot ne persiste **aucun brouillon PII** dans IndexedDB/localStorage. Une future fonction de brouillon offline devra faire l'objet d'un design séparé avec chiffrement local, TTL, purge, consentement utilisateur et analyse de menace sur les appareils partagés.

## Faible bande passante

Les optimisations à conserver :

- cache des assets statiques versionnés ;
- stale-while-revalidate uniquement sur le catalogue public ;
- Network First pour la navigation avec fallback sur le shell ;
- pagination côté API pour les données métier ;
- uploads sécurisés séparés du service worker ;
- aucune synchronisation automatique de signature, habilitation ou opération de sécurité.

## Recette réseau

La recette nationale doit inclure :

1. bascule 4G → offline pendant une consultation publique ;
2. rechargement de l'application sans réseau ;
3. retour réseau après une tentative de création de démarche ;
4. double clic sur une soumission avec la même clé ;
5. même clé avec un payload différent ;
6. deux utilisateurs utilisant la même clé ;
7. vérification DevTools qu'aucune API authentifiée n'est présente dans Cache Storage ;
8. purge et mise à jour d'une ancienne version du service worker ;
9. réseau lent/forte latence et pertes de paquets ;
10. contrôle sur Android entrée de gamme et navigateur mobile récent.
