# eAdmin Guinée — Jeu de recette multi-rôles

Ce jeu de données est destiné aux tests fonctionnels, aux démonstrations et à la recette de la plateforme eAdmin Guinée. Il couvre tous les rôles applicatifs, plusieurs institutions, plusieurs citoyens, tous les principaux statuts d'une demande administrative et des cas de sécurité multi-tenant.

> **Sécurité** — le seed `backend/scripts/seed_recette_data.py` refuse explicitement de s'exécuter lorsque l'application est en production. Les données sont fictives et les documents générés portent une mention de recette sans valeur administrative.

## 1. Chargement en une commande sous Windows

Après avoir récupéré la branche ou, une fois la PR fusionnée, après `git pull` :

```powershell
.\local-seed-test-data.bat
```

Le script :

1. démarre ou réutilise la stack Docker locale ;
2. exécute les migrations et le bootstrap local existants via `local-start.bat` ;
3. exécute `python -m scripts.seed_recette_data` dans le backend ;
4. crée ou met à jour le jeu de recette de manière idempotente ;
5. affiche ensuite les accès locaux avec `local-status.bat`.

Le mot de passe n'est **pas** commité dans Git. Tous les comptes `@recette.eadmin.gn` utilisent le mot de passe local défini par `EADMIN_RECETTE_PASSWORD`, ou à défaut le même mot de passe que les comptes bootstrap (`EADMIN_BOOTSTRAP_TEST_PASSWORD` / `LOCAL_TEST_PASSWORD`).

Pour recharger le jeu sans reconstruire la stack :

```powershell
docker compose --env-file .env.local -f docker-compose.local.yml exec -T backend python -m scripts.seed_recette_data
```

## 2. Comptes de recette

| Rôle | Compte | Périmètre principal | Usage de recette |
|---|---|---|---|
| SUPER_ADMIN | `superadmin.recette@recette.eadmin.gn` | Global | Administration globale, tenants, rôles, contrôles négatifs |
| MINISTRE | `ministre.justice@recette.eadmin.gn` | Tenant République de Guinée | Vue tenant-wide, gouvernance, contrôle inter-tenant |
| DIRECTEUR | `directeur.justice@recette.eadmin.gn` | Direction Justice | Administration de rôles inférieurs, décisions, périmètre institutionnel |
| CHEF_SERVICE | `chef.casier@recette.eadmin.gn` | Service du casier | Approbation, rejet, génération documentaire |
| ADMIN | `admin.ratoma@recette.eadmin.gn` | Mairie Ratoma | Gestion des utilisateurs et dossiers Ratoma |
| ADMIN | `admin.matoto@recette.eadmin.gn` | Mairie Matoto | Gestion des utilisateurs et dossiers Matoto |
| MAIRIE | `mairie.ratoma@recette.eadmin.gn` | Mairie Ratoma | Traitement opérationnel municipal |
| AGENCE | `agence.anip@recette.eadmin.gn` | ANIP | Traitement opérationnel agence |
| AGENT | `agent.ratoma@recette.eadmin.gn` | Mairie Ratoma | Traitement Ratoma |
| AGENT | `agent.matoto@recette.eadmin.gn` | Mairie Matoto | Traitement Matoto |
| AGENT | `agent.anip@recette.eadmin.gn` | ANIP | Traitement identification |
| AGENT | `agent.apip@recette.eadmin.gn` | APIP | Traitement entreprise |
| AGENT | `agent.justice@recette.eadmin.gn` | Service du casier | Traitement Justice |
| CITOYEN | `citoyen.awa@recette.eadmin.gn` | Propriétaire uniquement | Soumission, suivi, rejet, confidentialité |
| CITOYEN | `citoyen.mamadou@recette.eadmin.gn` | Propriétaire uniquement | Pièces, livraison, satisfaction, SLA |
| CITOYEN | `citoyen.fatou@recette.eadmin.gn` | Propriétaire uniquement | ANIP/APIP, validation, document prêt |
| CITOYEN | `citoyen.isolation@recette.eadmin.gn` | Tenant secondaire | Preuve d'isolation inter-tenant |

## 3. Institutions créées

Le dataset ne se limite pas à une seule institution locale. Il crée une structure suffisamment riche pour tester les portées :

- Ministère de la Justice — Recette ;
- Direction des services judiciaires — Recette ;
- Service du casier judiciaire — Recette ;
- Mairie de Ratoma — Recette ;
- Mairie de Matoto — Recette ;
- ANIP — Recette ;
- APIP Guinée — Recette ;
- Mairie Isolation — Recette dans un **tenant secondaire**.

Les identifiants techniques se terminent par `-recette`, ce qui permet de les reconnaître immédiatement dans PostgreSQL.

## 4. Démarches administratives fictives

| ID | Catégorie | Institution de test typique | SLA |
|---|---|---|---:|
| `recette-acte-naissance` | État civil | Mairie | 3 jours |
| `recette-certificat-residence` | Résidence | Mairie | 2 jours |
| `recette-carte-identite` | Identification | ANIP | 10 jours |
| `recette-casier-judiciaire` | Justice | Service du casier | 5 jours |
| `recette-creation-entreprise` | Entreprise | APIP | 4 jours |
| `recette-isolation-service` | État civil | Tenant secondaire | 2 jours |

Chaque démarche dispose de pièces requises, d'un SLA, d'un routage et d'un modèle documentaire fictif approuvé afin de tester le parcours serveur de génération de document.

## 5. Dossiers préchargés

| Référence | Citoyen | Institution | Statut | Point à tester |
|---|---|---|---|---|
| `REC-GN-2026-001` | Awa | Ratoma | `soumise` | prise en charge et transition vers en cours |
| `REC-GN-2026-002` | Awa | Ratoma | `en_cours` | traitement opérationnel |
| `REC-GN-2026-003` | Mamadou | Matoto | `pieces_complementaires` | reprise après pièce manquante |
| `REC-GN-2026-004` | Fatou | ANIP | `validee` | génération du document puis passage à prêt |
| `REC-GN-2026-005` | Fatou | APIP | `prete` | livraison/retrait ; document déjà généré |
| `REC-GN-2026-006` | Mamadou | Justice | `livree` | terminal, document généré, satisfaction 5/5 |
| `REC-GN-2026-007` | Awa | Ratoma | `rejetee` | état terminal et motif de rejet |
| `REC-GN-2026-008` | Mamadou | Matoto | `en_cours` | dossier volontairement en dépassement de SLA |
| `REC-ISO-2026-001` | Citoyen isolation | Tenant secondaire | `soumise` | isolation inter-tenant |

## 6. Parcours de recette par rôle

### CITOYEN

Tester au minimum : connexion, affichage exclusif de ses dossiers, création d'une nouvelle demande, contrôles des champs obligatoires, impossibilité de consulter le dossier d'un autre citoyen, notation d'un dossier livré, refus de notation avant livraison et isolation du tenant secondaire.

Cas très utile : connecter **Awa** et vérifier qu'elle voit `REC-GN-2026-001`, `002` et `007`, mais pas `003`, `004`, `005`, `006` ni `008`.

### AGENT

Tester : liste limitée à son institution, prise en charge d'une demande, `soumise -> en_cours`, `en_cours -> pieces_complementaires`, ajout de notes, impossibilité d'approuver une demande et impossibilité de consulter une autre institution.

Cas très utile : connecter `agent.ratoma@...` et essayer d'ouvrir `REC-GN-2026-003` de Matoto. La plateforme ne doit pas révéler ce dossier.

### MAIRIE

Tester : visibilité Ratoma uniquement, traitement opérationnel municipal, refus Matoto, refus des décisions nécessitant `approve/reject` et contrôle qu'un rôle MAIRIE ne peut être rattaché à une institution de type agence.

### AGENCE

Tester : visibilité ANIP uniquement, traitement du dossier ANIP, absence d'accès aux mairies/APIP et validation du rattachement AGENCE vers une institution de type agence.

### ADMIN

Tester : liste des utilisateurs de sa mairie, création d'un rôle inférieur dans sa mairie, refus inter-mairie, refus d'élévation de privilège, règle **un seul ADMIN actif par mairie**, et isolation des dossiers.

Scénario de sécurité prioritaire : `admin.ratoma@...` tente de créer un AGENT sur `mairie-matoto-recette` → **403 attendu**.

### CHEF_SERVICE

Tester : traitement dans son service, approbation, rejet, génération documentaire serveur, interdiction du passage `validee -> prete` sans document, puis transition réussie après génération, et refus hors institution.

### DIRECTEUR

Tester : permissions de niveau direction, administration de rôles strictement inférieurs, approbation/rejet, refus de créer MINISTRE/SUPER_ADMIN et respect strict du périmètre institutionnel.

**Point d'architecture à surveiller en recette :** l'implémentation actuelle contraint tous les rôles opérationnels sous MINISTRE à leur `institution_id` exact. Une direction ne bénéficie donc pas automatiquement d'une visibilité hiérarchique sur ses institutions enfants. Si une vue agrégée Direction → Services est souhaitée fonctionnellement, elle doit faire l'objet d'une règle métier explicite plutôt que d'être supposée par le jeu de données.

### MINISTRE

Tester : visibilité tenant-wide, absence d'accès au tenant secondaire, administration de rôles inférieurs dans le tenant, impossibilité de créer SUPER_ADMIN et accès aux fonctions de gouvernance de niveau ministre sous réserve des contrôles ABAC/MFA.

### SUPER_ADMIN

Tester : visibilité globale, création de tous les rôles avec rattachement valide, institution inconnue → 422, email en doublon → 409, opérations sensibles tenant/settings avec ABAC/MFA et conservation des bons codes 4xx lorsque le payload est invalide.

## 7. Scénarios de workflow recommandés

Les transitions autorisées par le backend doivent être testées comme une machine à états :

- `soumise -> en_cours` ;
- `soumise -> rejetee` ;
- `en_cours -> pieces_complementaires` ;
- `en_cours -> validee` avec rôle d'approbation ;
- `en_cours -> rejetee` avec rôle d'approbation ;
- `pieces_complementaires -> en_cours` ;
- `pieces_complementaires -> rejetee` ;
- `validee -> prete` **uniquement après génération du document** ;
- `validee -> rejetee` ;
- `prete -> livree` ;
- `livree` et `rejetee` sont terminaux.

Les transitions non prévues doivent retourner un conflit métier et ne doivent jamais altérer silencieusement le dossier.

## 8. Notifications

Le seed ajoute trois exemples dans l'outbox :

- un e-mail `sent` pour un dossier livré ;
- un e-mail `retry` pour une demande de pièce complémentaire ;
- un WhatsApp `blocked` pour tester un canal indisponible/non configuré.

Ces lignes permettent d'inspecter l'interface d'observabilité des notifications sans envoyer de vrais messages externes.

## 9. Vérifications PostgreSQL utiles

Lister les comptes de recette :

```sql
SELECT email, role, tenant_id, institution_id, is_active
FROM users
WHERE email LIKE '%@recette.eadmin.gn'
ORDER BY role, email;
```

Lister les dossiers :

```sql
SELECT reference, status, citizen_email, tenant_id, institution_id, deadline_date
FROM service_requests
WHERE reference LIKE 'REC-%'
ORDER BY reference;
```

Vérifier qu'il n'y a qu'un ADMIN actif par mairie de recette :

```sql
SELECT institution_id, COUNT(*)
FROM users
WHERE role = 'ADMIN'
  AND is_active = TRUE
  AND institution_id LIKE 'mairie-%-recette'
GROUP BY institution_id
HAVING COUNT(*) > 1;
```

Le résultat attendu est **0 ligne**.

## 10. Catalogue machine-readable

Tous les scénarios détaillés avec leur identifiant (`CIT-01`, `AGT-01`, etc.) sont disponibles dans :

```text
test-data/role-use-cases.json
```

Ce fichier est prévu pour être réutilisé par Playwright, Postman/Newman ou le runner E2E dédié afin d'automatiser progressivement toute la matrice de recette.