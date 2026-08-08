# eAdmin Guinée — contrat de déploiement Kubernetes national

Ce répertoire contient le socle applicatif stateless pour un environnement de production gouvernemental. Il ne constitue pas, à lui seul, une homologation ni une preuve de haute disponibilité.

## Principes obligatoires

- Le backend et le frontend sont répliqués sur au moins 3 pods et répartis sur plusieurs nœuds.
- Les images `eadmin-backend:release` et `eadmin-frontend:release` sont des références de pipeline : avant déploiement, la CI/CD doit les remplacer par des images signées et référencées par digest immuable.
- Le Secret `eadmin-runtime-secrets` n'est jamais stocké dans Git. Il est injecté par le gestionnaire de secrets de l'environnement (Vault, KMS/Secret Manager ou équivalent approuvé).
- PostgreSQL, Redis et le stockage objet ne sont pas déployés dans ce `base`. En production nationale, ils doivent être fournis par des services HA externes, avec réplication et sauvegardes adaptées.
- L'Ingress, les certificats TLS, les adresses IP/CIDR egress et le WAF sont définis dans un overlay propre au datacenter/cloud retenu.
- Les namespaces d'Ingress et de monitoring doivent porter respectivement les labels `eadmin.gov.gn/ingress-enabled=true` et `eadmin.gov.gn/monitoring-enabled=true` pour atteindre les pods.

## Secret runtime attendu

Le secret externe `eadmin-runtime-secrets` doit au minimum fournir :

- `DATABASE_URL` vers le cluster PostgreSQL HA ;
- `REDIS_URL` vers Redis HA ;
- `SECRET_KEY` ;
- `ENCRYPTION_KEY` ;
- `MINIO_ENDPOINT` ou endpoint S3 compatible ;
- `MINIO_ACCESS_KEY` ;
- `MINIO_SECRET_KEY` ;
- les paramètres de sécurité/CORS propres au domaine gouvernemental.

Aucune valeur réelle ne doit être ajoutée à ce dépôt.

## État des données

Le cluster Kubernetes est considéré remplaçable. Les pods applicatifs ne sont pas l'autorité de persistance. Les autorités de données sont :

1. PostgreSQL HA + WAL/PITR ;
2. Redis HA pour les états temporaires et de sécurité ;
3. stockage objet versionné/répliqué pour les pièces administratives ;
4. système de sauvegarde hors site ;
5. KMS/HSM externe pour les secrets et clés de production.

## Déploiement

`platform.yaml` peut être validé par kubeconform, mais ne doit pas être appliqué en production avant :

1. injection des digests d'images ;
2. création du secret externe ;
3. configuration de l'Ingress/WAF/TLS ;
4. restriction réseau aux CIDR réels des services stateful ;
5. validation du plan de sauvegarde/PITR ;
6. exercice de restauration réussi ;
7. validation sécurité de l'environnement cible.

Les objectifs RTO/RPO et la procédure de reprise sont décrits dans `docs/operations/DISASTER_RECOVERY.md`.
