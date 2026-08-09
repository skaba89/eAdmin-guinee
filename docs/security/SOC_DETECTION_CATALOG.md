# Catalogue de détection SOC — eAdmin Guinée

Ce catalogue définit les règles natives du dépôt. Il ne remplace pas les règles d'un SIEM externe et ne prétend pas qu'un SIEM national est déjà connecté.

## Principes

- toute règle possède un identifiant stable ;
- les sources réseau sont corrélées sur une empreinte HMAC, jamais sur l'IP en clair dans `security_signals` ;
- les secrets, tokens, cookies, mots de passe, OTP et clés privées sont caviardés avant persistance SOC ;
- un signal ne devient pas automatiquement une compromission : il déclenche une qualification humaine selon la sévérité ;
- les faux positifs sont traités par ajustement documenté de règle, jamais par désactivation silencieuse du journal d'audit ;
- toute modification d'une règle critique doit passer les gates SOC et Government Readiness.

## Règles natives

### `authentication_failure_burst`

**Source** : audits `auth.login.failed`.

**Condition** : au moins 5 échecs partageant la même clé de corrélation dans une fenêtre de 10 minutes.

**Sévérité initiale** : high.

**Réponse attendue** : vérifier le compte visé, la source pseudonymisée, les succès proches, les changements de MFA et les sessions actives. En cas de compromission probable, révoquer les sessions et appliquer le runbook compte privilégié.

### `break_glass_activated`

**Source** : audit d'approbation d'une délégation `break_glass`.

**Condition** : toute activation, même légitime.

**Sévérité initiale** : critical.

**Réponse attendue** : rapprocher immédiatement l'événement du ticket incident obligatoire, contrôler l'approbateur MFA, le bénéficiaire, la durée et les actions effectuées pendant la fenêtre d'urgence.

### `privilege_change`

**Source** : audits IAM / security / admin de type `permission_change`.

**Condition** : modification sensible d'habilitation.

**Sévérité initiale** : high.

**Réponse attendue** : vérifier séparation des tâches, approbation, périmètre tenant/institution et révocation des anciennes sessions.

### `super_admin_change`

**Source** : détail d'audit contenant une cible ou un changement `SUPER_ADMIN`.

**Condition** : toute modification de privilège super administrateur.

**Sévérité initiale** : critical.

**Réponse attendue** : revue immédiate à quatre yeux, contrôle du compte demandeur, justification métier et recherche d'actions privilégiées connexes.

### `critical_security_audit`

**Source** : tout audit applicatif marqué `critical` qui ne correspond pas déjà à une règle plus spécifique.

**Condition** : sévérité `critical`.

**Sévérité initiale** : critical.

**Réponse attendue** : qualification SEV-1/SEV-2 selon l'actif et l'impact, préservation des preuves et application du runbook adapté.

## Tuning

Chaque changement de seuil doit documenter :

1. la période d'observation ;
2. le nombre de vrais/faux positifs ;
3. l'impact attendu sur MTTD et charge analyste ;
4. le nouveau seuil et sa justification ;
5. le propriétaire et la date de revue ;
6. un test automatisé démontrant que le scénario critique reste détecté.

Une règle ne doit jamais être désactivée uniquement pour faire passer un test, réduire le volume du SIEM ou masquer une faiblesse opérationnelle.
