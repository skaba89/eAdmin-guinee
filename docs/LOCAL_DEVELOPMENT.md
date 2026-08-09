# Développement local — eAdmin Guinée

Cette stack est conçue pour le poste développeur. Elle est séparée du déploiement Render/production et n'utilise aucun secret de production.

## Windows — chemin recommandé

Prérequis : Docker Desktop démarré avec Docker Compose v2.

Après chaque mise à jour du dépôt :

```powershell
git pull
.\local-start.bat
```

Au premier démarrage, `scripts/local.ps1` crée automatiquement `.env.local` avec des secrets aléatoires locaux. Le fichier est ignoré par Git et est conservé entre les `git pull`.

La commande construit puis démarre :

- PostgreSQL 16 ;
- Redis 7 ;
- MinIO et le bucket `eadmin-documents` ;
- FastAPI avec migrations Alembic automatiques ;
- bootstrap des comptes de test ;
- worker durable de notifications ;
- Mailpit pour capturer les emails locaux ;
- Next.js en mode développement/hot reload.

Accès par défaut :

- application : `http://localhost:3000`
- backend : `http://localhost:8000`
- Swagger : `http://localhost:8000/docs`
- Mailpit : `http://localhost:8025`
- console MinIO : `http://localhost:9001`
- PostgreSQL exposé sur `localhost:5433`
- Redis exposé sur `localhost:6380`

Les ports peuvent être changés dans `.env.local` sans modifier Git.

## Comptes multi-portails

Le même mot de passe local aléatoire est utilisé pour les comptes de test et affiché à la fin de `local-start.bat` :

- `superadmin@eadmin.test` → SUPER_ADMIN
- `citoyen@eadmin.test` → CITOYEN
- `agent@eadmin.test` → AGENT
- `mairie@eadmin.test` → MAIRIE
- `agence@eadmin.test` → AGENCE
- `admin@eadmin.test` → ADMIN
- `chef-service@eadmin.test` → CHEF_SERVICE
- `directeur@eadmin.test` → DIRECTEUR
- `ministre@eadmin.test` → MINISTRE

Les comptes sont créés de façon idempotente : un redémarrage ou un `git pull` ne les duplique pas et ne réinitialise pas la base.

Pour réafficher les accès et l'état des conteneurs :

```powershell
.\local-status.bat
```

## Arrêter sans perdre les données

```powershell
.\local-stop.bat
```

Les volumes PostgreSQL, Redis et MinIO sont conservés.

## Repartir de zéro

```powershell
.\local-reset.bat
```

Cette commande supprime uniquement les volumes de la stack `eadmin-local`, les recrée, rejoue toutes les migrations et recrée les comptes locaux.

Utiliser `reset` si une ancienne base locale contient des comptes incompatibles ou si vous voulez refaire une recette depuis un état propre.

## Logs

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File .\scripts\local.ps1 logs
```

Pour un seul service :

```powershell
docker compose --env-file .env.local -f docker-compose.local.yml logs -f backend
```

## Observabilité locale optionnelle

Prometheus et Grafana sont placés dans le profil `observability` pour éviter de ralentir le démarrage applicatif quotidien.

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File .\scripts\local.ps1 up -Observability
```

Puis :

- Prometheus : `http://localhost:9090`
- Grafana : `http://localhost:3001`

Le mot de passe Grafana local est généré dans `.env.local`.

## Emails locaux

Les emails sortants sont envoyés au serveur SMTP Mailpit de la stack, jamais vers Internet. Ouvrir `http://localhost:8025` pour visualiser les messages émis par eAdmin.

Les fournisseurs SMS/WhatsApp restent des intégrations externes et ne sont pas simulés par cette stack. Leur absence locale ne doit pas empêcher les autres portails et parcours de fonctionner.

## Docker Compose direct

Le fichier `docker-compose.local.yml` est autonome. Après génération de `.env.local`, la commande équivalente est :

```powershell
docker compose --env-file .env.local -f docker-compose.local.yml up -d --build
```

Le chemin local ne doit jamais être utilisé comme modèle de secrets pour staging ou production.
