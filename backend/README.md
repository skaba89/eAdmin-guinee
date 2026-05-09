# eAdministration Suite Guinea - Backend API

## Présentation

Backend API de la plateforme **eAdministration Suite Guinea**, une solution GovTech de nouvelle génération pour la modernisation de l'administration publique en République de Guinée.

## Technologies

- **Framework** : FastAPI 0.109
- **Base de données** : PostgreSQL 16 (SQLAlchemy asynchrone)
- **Cache** : Redis 7
- **Stockage fichiers** : MinIO (S3-compatible)
- **Authentification** : JWT (python-jose)
- **Migrations** : Alembic

## Structure du projet

```
backend/
├── app/
│   ├── __init__.py
│   ├── main.py              # Application FastAPI
│   ├── config.py            # Configuration (pydantic-settings)
│   ├── database.py          # Connexion SQLAlchemy asynchrone
│   ├── models/              # Modèles ORM
│   │   ├── __init__.py
│   │   ├── user.py
│   │   ├── document.py
│   │   ├── courrier.py
│   │   ├── workflow.py
│   │   └── audit.py
│   └── api/                 # Routes API
│       ├── __init__.py
│       ├── auth.py
│       ├── documents.py
│       ├── courriers.py
│       ├── workflows.py
│       ├── users.py
│       ├── analytics.py
│       └── audit.py
├── alembic/                 # Migrations
├── alembic.ini
├── requirements.txt
└── Dockerfile
```

## Installation locale

```bash
# Créer un environnement virtuel
python -m venv venv
source venv/bin/activate

# Installer les dépendances
pip install -r requirements.txt

# Lancer le serveur de développement
uvicorn app.main:app --reload --port 8000
```

## Avec Docker

```bash
docker-compose up -d
```

## Documentation API

Une fois le serveur lancé, accédez à :
- Swagger UI : `http://localhost:8000/docs`
- ReDoc : `http://localhost:8000/redoc`

## Variables d'environnement

Voir `.env.example` pour la liste complète des variables.
