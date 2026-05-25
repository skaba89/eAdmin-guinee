"""
Script de seed des comptes démo - eAdministration Suite Guinea.
Crée les 6 comptes de démonstration avec des mots de passe conformes.

Usage:
    python -m app.seed_demo          # Créer les comptes
    python -m app.seed_demo --reset  # Supprimer et recréer

Comptes créés:
    1. Super Administrateur — superadmin@eadmin.gn
    2. Administrateur Général — admin@eadmin.gn
    3. Agent Ministériel — ministere@eadmin.gn
    4. Agent de Mairie — mairie@eadmin.gn
    5. Agent d'Agence (ANIP) — agence@eadmin.gn
    6. Citoyen — citoyen@eadmin.gn

Mot de passe démo : Eadmin2026! (majuscule + chiffre + spécial + 10 chars)
"""

import asyncio
import sys

from passlib.context import CryptContext
from sqlalchemy import delete, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import async_session_factory
from app.models.user import RoleEnum, User

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

# Mot de passe démo conforme : 10+ chars, majuscule, chiffre, caractère spécial
DEMO_PASSWORD = "Eadmin2026!"

# Définition des comptes démo
DEMO_ACCOUNTS = [
    {
        "email": "superadmin@eadmin.gn",
        "full_name": "Amadou Oury Bah",
        "role": RoleEnum.SUPER_ADMIN,
        "institution": "Présidence de la République de Guinée",
    },
    {
        "email": "admin@eadmin.gn",
        "full_name": "Sékou Condé",
        "role": RoleEnum.ADMIN,
        "institution": "Ministère de l'Administration du Territoire",
    },
    {
        "email": "ministere@eadmin.gn",
        "full_name": "Dr. Alpha Diallo",
        "role": RoleEnum.DIRECTOR,
        "institution": "Ministère de l'Éducation Nationale",
    },
    {
        "email": "mairie@eadmin.gn",
        "full_name": "Mme Fatoumata Bah",
        "role": RoleEnum.CHEF_SERVICE,
        "institution": "Mairie de Conakry — Kaloum",
    },
    {
        "email": "agence@eadmin.gn",
        "full_name": "M. Mamadou Soumah",
        "role": RoleEnum.AGENT,
        "institution": "ANIP — Agence Nationale d'Identification Personnelle",
    },
    {
        "email": "citoyen@eadmin.gn",
        "full_name": "Aminata Diallo",
        "role": RoleEnum.LECTEUR,
        "institution": None,
    },
]


async def seed_accounts(reset: bool = False) -> list[User]:
    """
    Crée les comptes de démonstration.
    Si reset=True, supprime les comptes existants d'abord.
    """
    async with async_session_factory() as session:
        if reset:
            print("🗑️  Suppression des comptes démo existants...")
            # Supprimer uniquement les comptes démo
            demo_emails = [acc["email"] for acc in DEMO_ACCOUNTS]
            stmt = delete(User).where(User.email.in_(demo_emails))
            await session.execute(stmt)
            await session.commit()
            print(f"   {len(demo_emails)} comptes supprimés.")

        created = []
        for account in DEMO_ACCOUNTS:
            # Vérifier si le compte existe déjà
            result = await session.execute(
                select(User).where(User.email == account["email"])
            )
            existing = result.scalar_one_or_none()

            if existing:
                print(f"   ⏭️  {account['email']} existe déjà — mis à jour du mot de passe")
                existing.hashed_password = pwd_context.hash(DEMO_PASSWORD)
                existing.full_name = account["full_name"]
                existing.role = account["role"]
                existing.institution = account["institution"]
                existing.is_active = True
                created.append(existing)
            else:
                user = User(
                    email=account["email"],
                    hashed_password=pwd_context.hash(DEMO_PASSWORD),
                    full_name=account["full_name"],
                    role=account["role"],
                    institution=account["institution"],
                    is_active=True,
                )
                session.add(user)
                created.append(user)
                print(f"   ✅ {account['email']} créé ({account['role'].value})")

        await session.commit()

        # Rafraîchir les objets pour obtenir les IDs
        for user in created:
            await session.refresh(user)

        return created


async def main():
    """Point d'entrée principal."""
    reset = "--reset" in sys.argv

    print("=" * 60)
    print("🌱 eAdministration Suite Guinea — Seed des comptes démo")
    print("=" * 60)
    print(f"\n📋 Mot de passe démo : {DEMO_PASSWORD}")
    print(f"🔄 Mode reset : {'OUI' if reset else 'NON'}\n")

    try:
        users = await seed_accounts(reset=reset)
        print(f"\n✅ {len(users)} comptes prêts !")
        print("\n📊 Résumé :")
        print("-" * 60)
        for user in users:
            print(f"  {user.role.value:20s} | {user.email:30s} | {user.full_name}")
        print("-" * 60)
    except Exception as e:
        print(f"\n❌ Erreur lors du seed : {e}")
        raise


if __name__ == "__main__":
    asyncio.run(main())
