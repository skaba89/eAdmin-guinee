# PRA/PCA — eAdmin Guinée

Ce document définit les objectifs et contrôles de reprise pour une production nationale. Les valeurs ci-dessous sont des **objectifs d'architecture**, pas des garanties acquises. Elles ne deviennent opposables qu'après validation de l'infrastructure cible et exercices de reprise réussis.

## 1. Classification et objectifs

| Périmètre | Criticité | RPO cible | RTO cible |
|---|---:|---:|---:|
| Authentification, autorisations, GED, demandes citoyennes | Critique | <= 15 min | <= 60 min |
| Courriers, parapheur interne, OCR/recherche | Haute | <= 30 min | <= 2 h |
| Reporting et analytique | Moyenne | <= 24 h | <= 4 h |

Un RPO de 15 minutes pour PostgreSQL suppose un archivage WAL/PITR effectif. Le `pg_dump` logique fourni dans le dépôt est une seconde ligne de défense et **ne remplace pas** le PITR.

## 2. Architecture de résilience exigée

### PostgreSQL

- cluster HA avec bascule contrôlée et réplication sur domaines de panne distincts ;
- sauvegardes physiques/PITR avec archivage continu des WAL ;
- sauvegarde logique quotidienne vérifiée par checksum ;
- au moins une copie hors site / autre zone de panne ;
- chiffrement au repos et en transit ;
- restauration testée sur une base isolée avant toute réouverture de trafic.

### Redis

- Redis HA/managed avec réplication ;
- chiffrement réseau et authentification ;
- persistance adaptée aux états de sécurité utilisés par la plateforme ;
- perte du cache considérée comme incident de sécurité si elle affecte listes de révocation ou sessions.

### Stockage objet

- versioning activé ;
- réplication multi-zone ou multi-site ;
- politiques d'immutabilité/Object Lock pour les catégories réglementaires lorsque l'environnement le permet ;
- inventaire et contrôle périodique des objets ;
- sauvegarde/réplication indépendante des métadonnées PostgreSQL.

### Secrets et clés

- secrets de production hors Git et hors manifests Kubernetes ;
- KMS/HSM ou coffre de secrets approuvé ;
- rotation documentée ;
- procédure de récupération des clés testée séparément du PRA applicatif.

## 3. Sauvegarde logique PostgreSQL

Le script `scripts/ops/backup-postgres.sh` :

1. exige une URL dédiée `PG_BACKUP_URL` ;
2. produit un dump custom `pg_dump` ;
3. refuse de promouvoir un fichier que `pg_restore --list` ne peut pas lire ;
4. génère SHA-256 et métadonnées ;
5. peut pousser la copie vers un stockage hors hôte via `MC_BACKUP_TARGET` ;
6. applique une rétention locale configurable.

La copie hors site doit être surveillée indépendamment du serveur source.

## 4. Restauration

`restore-postgres.sh` est volontairement fail-closed. Il exige :

- un fichier dump présent ;
- son fichier `.sha256` ;
- une cible `RESTORE_DATABASE_URL` ;
- `ALLOW_DESTRUCTIVE_RESTORE=YES_I_UNDERSTAND`.

La procédure opérationnelle complète est :

1. déclarer l'incident et geler les écritures si nécessaire ;
2. déterminer le point de reprise autorisé ;
3. restaurer dans un environnement isolé ;
4. vérifier checksum et structure de l'archive ;
5. appliquer/contrôler la version Alembic ;
6. exécuter les tests d'intégrité : utilisateurs, tenants, demandes, GED, versions, audit, parapheur ;
7. vérifier la cohérence entre métadonnées GED et objets ;
8. vérifier la capacité d'authentification/MFA et les politiques RLS ;
9. faire valider la reprise par l'exploitation et la sécurité ;
10. seulement ensuite, réouvrir progressivement le trafic.

## 5. Exercices obligatoires

- **mensuel** : restauration automatique d'une sauvegarde logique dans une base isolée et contrôle d'une donnée témoin ;
- **trimestriel** : exercice PRA complet incluant perte du nœud/zone primaire, restauration PostgreSQL, accès objet et réouverture contrôlée ;
- **semestriel** : exercice avec indisponibilité d'un fournisseur ou site principal lorsque l'architecture multi-site existe ;
- après chaque évolution majeure de schéma ou d'infrastructure : test de restauration ciblé.

Chaque exercice doit conserver : date, version applicative, backup utilisé, RPO constaté, RTO constaté, anomalies, responsable, actions correctives et preuve de validation.

## 6. Critères de succès

Un exercice est réussi seulement si :

- toutes les étapes sont reproductibles à partir de procédures versionnées ;
- les données restaurées passent les contrôles d'intégrité ;
- l'accès multi-tenant/RLS reste isolé ;
- les documents et leurs hashes restent cohérents ;
- aucun secret n'est restauré depuis Git ;
- le RPO et le RTO mesurés respectent les objectifs de l'environnement ;
- les alertes et journaux d'incident sont conservés.

## 7. Runbooks d'alerte

Les identifiants utilisés dans `monitoring/alerts/eadmin.rules.yml` correspondent aux familles suivantes :

- `RB-API-*` : disponibilité, erreurs 5xx et latence ;
- `RB-DB-*` : PostgreSQL/PITR ;
- `RB-CACHE-*` : Redis ;
- `RB-INFRA-*` : capacité système ;
- `RB-SEC-*` : authentification et rate limiting.

Avant la production nationale, chaque runbook doit être relié au système ITSM/SOC retenu et à une astreinte réelle.
