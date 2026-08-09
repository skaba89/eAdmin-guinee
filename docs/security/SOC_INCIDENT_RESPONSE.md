# SOC eAdmin Guinée — réponse à incident et intégration SIEM

## 1. Objectif

Le SOC eAdmin traite les événements de sécurité comme des preuves opérationnelles, pas comme de simples logs d'application. Le journal d'audit serveur reste la source métier de référence ; les événements pertinents sont normalisés dans `security_signals`, pseudonymisés puis corrélés dans `security_incidents`.

Aucune donnée de type mot de passe, token, cookie, secret, OTP, clé privée ou credential ne doit être persistée dans un signal SOC. Les adresses réseau et User-Agent sont pseudonymisés avant stockage.

## 2. Niveaux de gravité et délais

| Niveau | Exemple | Acquittement cible | Confinement cible |
|---|---|---:|---:|
| SEV-1 | Compromission SUPER_ADMIN, exfiltration, break-glass abusif, signature/PKI compromise | 5 min | 15 min |
| SEV-2 | Rafale d'authentification, élévation de privilège suspecte, attaque WAF critique | 15 min | 30 min |
| SEV-3 | Anomalie ciblée sans preuve de compromission | 1 h | 4 h |
| SEV-4 | Signal informatif nécessitant analyse différée | 1 jour ouvré | selon analyse |

Les métriques SOC doivent suivre au minimum MTTD, MTTA, MTTC et MTTR par niveau de gravité.

## 3. Cycle obligatoire d'un incident

1. **Détection** — le signal est créé depuis l'audit applicatif ou une source externe authentifiée HMAC.
2. **Qualification** — le moteur applique les règles de corrélation et crée ou enrichit un incident.
3. **Acquittement** — un responsable habilité prend connaissance de l'incident.
4. **Investigation** — l'incident est assigné et les éléments de preuve sont collectés.
5. **Confinement** — sessions révoquées, identités désactivées, flux bloqués ou service isolé selon le scénario.
6. **Éradication** — suppression de la cause racine : secret compromis renouvelé, compte malveillant supprimé, vulnérabilité corrigée, règle WAF adaptée.
7. **Rétablissement** — remise en service contrôlée, tests de sécurité et vérification d'intégrité.
8. **Résolution** — la cause et les actions sont documentées dans le champ de résolution.
9. **Clôture** — possible uniquement après résolution.
10. **Post-mortem** — obligatoire pour SEV-1 et SEV-2, avec actions correctives, propriétaire et échéance.

## 4. Chaîne de conservation des preuves

La chaîne de conservation doit permettre de démontrer qui a collecté, consulté et modifié l'état d'un incident. Les événements sources ne sont jamais supprimés par l'API SOC.

Pour chaque preuve externe conservée hors base :

- calculer SHA-256 à l'acquisition ;
- conserver l'horodatage UTC ;
- enregistrer la source et l'identifiant externe ;
- stocker l'objet dans le stockage documentaire protégé ;
- ne jamais modifier l'objet original ;
- journaliser les accès et exports ;
- appliquer la politique nationale de rétention approuvée.

## 5. Ingestion externe WAF / IDS / reverse-proxy

L'endpoint machine `/api/v1/soc/ingest` est **désactivé par défaut**. Lorsqu'il est activé, chaque requête doit porter :

- `X-EAdmin-SOC-Timestamp` : timestamp Unix ;
- `X-EAdmin-SOC-Signature` : `sha256=<HMAC_SHA256(secret, timestamp + "." + body)>` ;
- un `source` et `external_event_id` stables dans le corps JSON.

La fenêtre anti-rejeu est limitée par `SOC_INGEST_MAX_SKEW_SECONDS`. Un même couple `(source, external_event_id)` est idempotent. La clé HMAC doit provenir du gestionnaire de secrets de l'environnement et ne jamais être présente dans Git.

## 6. SIEM

Le SIEM national ou institutionnel doit consommer les signaux normalisés et non les logs applicatifs bruts lorsque cela est possible. Les champs recommandés sont :

- source / external_event_id ;
- event_type / category / severity ;
- tenant_id / institution_id ;
- actor_id lorsque autorisé ;
- network_source_hash et user_agent_hash ;
- correlation_key ;
- occurred_at / incident_id ;
- détails caviardés.

La destination SIEM réelle, son protocole, sa rétention et ses clés d'accès restent des choix d'exploitation. Le dépôt ne prétend pas qu'un SIEM externe est connecté tant qu'aucun collecteur officiel n'est configuré.

## 7. Scénarios de détection initiaux

### Rafale d'authentification

Cinq échecs ou plus partageant la même clé de corrélation sur dix minutes créent ou enrichissent un incident `authentication_failure_burst` de niveau high.

### Break-glass

Toute délégation break-glass approuvée devient un incident critique `break_glass_activated`. L'objectif est de distinguer « autorisé » de « ordinaire » : un accès d'urgence légitime reste un événement SOC à examiner.

### Changement de privilège

Les changements d'habilitation sensibles sont corrélés en `privilege_change`. Toute modification contenant une cible SUPER_ADMIN est critique.

### Audit critique

Tout audit applicatif marqué `critical` crée un incident `critical_security_audit`.

## 8. PRA/PCA du SOC

Le SOC dépend de PostgreSQL et des mêmes mécanismes de sauvegarde vérifiée que la plateforme. Les objectifs opérationnels doivent rester compatibles avec le PRA national :

- **RPO** : ne pas accepter une perte de preuves supérieure au RPO approuvé pour PostgreSQL ;
- **RTO** : restaurer la consultation et la création d'incidents dans le RTO de sécurité approuvé ;
- après restauration, exécuter le corrélateur sur tous les signaux `processed_at IS NULL` ;
- vérifier les compteurs d'incidents et la continuité des références ;
- documenter chaque exercice PRA dans le registre d'exploitation.

## 9. Runbooks SEV-1 minimaux

### Compte privilégié compromis

Révoquer toutes les sessions, désactiver la liaison SSO concernée si nécessaire, bloquer le compte, préserver les journaux, identifier les actions réalisées, renouveler les secrets touchés, vérifier les délégations et rôles, puis effectuer une revue complète des accès.

### Suspicion d'exfiltration

Conserver les preuves, isoler la source, bloquer les flux sortants pertinents, identifier les données et tenants touchés, préserver les objets et hashes, informer la gouvernance habilitée, puis appliquer les obligations légales et réglementaires validées par l'autorité compétente.

### Compromission PKI

Suspendre les opérations de signature concernées, révoquer ou désactiver la clé/certificat auprès du prestataire, préserver les preuves TSA et chaînes de validation, identifier les documents touchés et ne jamais requalifier automatiquement une preuve interne en signature qualifiée.

## 10. Conditions de passage en production

Avant ouverture nationale :

- désigner l'équipe d'astreinte et les responsables SEV-1/SEV-2 ;
- valider les coordonnées d'escalade hors bande ;
- choisir le SIEM officiel et tester l'ingestion ;
- vérifier la rotation des secrets d'ingestion ;
- réaliser un exercice de compromission de compte privilégié ;
- réaliser un exercice PRA du SOC ;
- mesurer MTTD/MTTA/MTTR ;
- effectuer un pentest indépendant et une revue des règles de détection ;
- faire approuver la rétention et la chaîne de conservation par les autorités compétentes.
