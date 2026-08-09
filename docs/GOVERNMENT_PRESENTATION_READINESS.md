# eAdmin Guinée — Positionnement pour présentation institutionnelle

**Statut : document de cadrage — ne vaut pas homologation juridique, certification de sécurité ni qualification de signature électronique.**

**Dernière révision technique : 9 août 2026.**

Ce document définit les formulations qui peuvent être utilisées lors d'une présentation à une administration publique guinéenne et celles qui doivent rester conditionnelles tant que les autorités compétentes, les responsables juridiques et les partenaires d'infrastructure n'ont pas formellement validé le dispositif.

## 1. Positionnement recommandé

eAdmin Guinée doit être présenté comme une **plateforme GovTech souverainisable, multi-institution, auditable et industrialisable**, disposant déjà de fondations techniques fortes : authentification renforcée, IAM RBAC/ABAC, isolation PostgreSQL RLS, journalisation, stockage documentaire serveur, catalogue de démarches versionné, résilience, SSO OIDC, PRA/PCA, PWA faible débit et traitements IA assistés avec sources et validation humaine.

La plateforme ne doit pas être présentée comme « déjà homologuée par l'État », « juridiquement certifiée », « qualifiée PKI » ou « conforme à tous les textes » tant qu'un dossier d'homologation et des validations externes n'ont pas été obtenus.

## 2. Références juridiques guinéennes à intégrer au dossier

Les travaux de conformité doivent notamment être instruits au regard des textes guinéens publiés par l'ARPT :

- **Loi L/2015/037/AN relative à la cybersécurité et à la protection des données à caractère personnel** ;
- **Loi L/2016/035/AN relative aux transactions électroniques** ;
- textes d'application, décisions, décrets et exigences sectorielles applicables selon l'institution et la démarche concernées.

Référence officielle ARPT : https://www.arpt.gov.gn/lois-et-ordonnances/

La République de Guinée ne doit pas être présentée comme un État membre de l'UEMOA. Lorsque des références régionales sont nécessaires, elles doivent être choisies en fonction du cadre réellement applicable à la Guinée et validées juridiquement.

## 3. Matrice des affirmations autorisées

| Sujet | Formulation acceptable | Formulation à éviter tant que non homologuée |
|---|---|---|
| IAM | « RBAC + ABAC, délégations temporaires, break-glass, recertification et JML sont intégrés » | « IAM certifié État » |
| Isolation | « Isolation tenant/institution renforcée par PostgreSQL RLS et contrôles applicatifs » | « impossibilité absolue de fuite de données » |
| MFA | « MFA et politiques d'accès renforcé disponibles » | « conformité réglementaire garantie par le MFA » |
| SSO | « Fédération OIDC intégrée avec configuration d'un fournisseur d'identité » | « connexion déjà fédérée à tous les annuaires gouvernementaux » |
| Signature | « parapheur, preuve interne liée au contenu et frontière PKI fail-closed » | « signature qualifiée », « certificat gouvernemental », « non-répudiation légale garantie » |
| Archivage | « conservation versionnée et auditable » | « archivage légal certifié » |
| IA | « assistance sourcée, traçable et soumise à validation humaine » | « décision administrative autonome par IA » |
| Résilience | « baseline Kubernetes, probes, PRA/PCA et gates opérationnels présents » | « haute disponibilité nationale démontrée » sans test de charge/PRA en environnement cible |
| Portail citoyen | « soumission, pièces, suivi et satisfaction persistés côté serveur » | « identité citoyenne officiellement vérifiée » tant qu'aucune autorité d'identité n'est intégrée |
| Démarches | « catalogue serveur versionné avec statut de politique et source » | présenter des délais/frais internes comme des délais/frais légaux sans source approuvée |

## 4. Point bloquant à corriger avant démonstration officielle

Le module de traitement des demandes contient encore un générateur HTML côté navigateur qui compose un document générique avec en-tête « République de Guinée », mention de conformité légale, « Signature & Cachet officiel » et emplacement QR. Ce rendu ne doit pas devenir une source d'autorité.

La cible est :

1. modèles administratifs versionnés côté serveur ;
2. modèle lié à un service et à une institution ;
3. approbation explicite du modèle avant activation ;
4. données injectées côté serveur avec échappement ;
5. hash du contenu produit côté serveur ;
6. référence de version du modèle conservée avec le document généré ;
7. blocage de la génération lorsqu'aucun modèle approuvé n'est disponible ;
8. signature/PKI séparée de la génération documentaire et fail-closed si la confiance externe n'est pas configurée.

## 5. Éléments de preuve à préparer pour le gouvernement

Avant une présentation de décision ou un pilote institutionnel, préparer :

- architecture logique et architecture de déploiement ;
- matrice des rôles/habilitations et séparation des tâches ;
- démonstration d'isolation tenant/institution ;
- rapport des gates CI Government Readiness ;
- inventaire des données personnelles et finalités ;
- politique de conservation/suppression ;
- DPIA/AIPD ou étude d'impact adaptée au cadre retenu ;
- stratégie de souveraineté/hébergement et chiffrement au repos ;
- PRA/PCA avec objectifs RPO/RTO contractuels ;
- plan de tests de charge et résultats ;
- dossier d'intégration identité/SSO gouvernemental ;
- dossier PKI/signature avec autorité de certification réellement retenue ;
- catalogue initial des démarches validé par les administrations propriétaires ;
- modèles documentaires fournis et approuvés par les institutions compétentes ;
- procédure SOC/gestion d'incident et responsabilités ;
- plan pilote avec indicateurs mesurables.

## 6. Pilote recommandé

Le premier pilote doit rester limité et mesurable : quelques démarches de 1 à 3 institutions, un nombre contrôlé d'agents, une population citoyenne pilote et des critères d'acceptation explicites.

Les KPI proposés : taux de demandes abouties, délai médian de traitement, taux de dossiers incomplets, disponibilité, erreurs 5xx, taux de synchronisation après coupure réseau, satisfaction citoyenne, incidents IAM/RLS, temps de reprise PRA, consommation infrastructure et taux de traitement manuel évité.

## 7. Règle de communication

Toute affirmation de conformité, valeur légale, qualification de signature, identité officielle, délai réglementaire ou disponibilité nationale doit être accompagnée de sa **preuve externe ou de son statut** : `implémenté`, `testé`, `pilote`, `à homologuer`, `dépend d'un partenaire`, ou `non disponible`.

Cette discipline protège le projet et renforce sa crédibilité institutionnelle.
