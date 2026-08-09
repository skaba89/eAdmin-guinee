# eAdmin Guinée — Positionnement pour présentation institutionnelle

**Statut : document de cadrage — ne vaut pas homologation juridique, certification de sécurité ni qualification de signature électronique.**

**Dernière révision technique : 9 août 2026.**

Ce document définit les formulations qui peuvent être utilisées lors d'une présentation à une administration publique guinéenne et celles qui doivent rester conditionnelles tant que les autorités compétentes, les responsables juridiques et les partenaires d'infrastructure n'ont pas formellement validé le dispositif.

## 1. Positionnement recommandé

eAdmin Guinée doit être présenté comme une **plateforme GovTech souverainisable, multi-institution, auditable et industrialisable**, disposant déjà de fondations techniques fortes : authentification renforcée, IAM RBAC/ABAC, isolation PostgreSQL RLS, journalisation, stockage documentaire serveur, catalogue de démarches versionné, modèles documentaires approuvables et rendus côté serveur, résilience, SSO OIDC, PRA/PCA, PWA faible débit et traitements IA assistés avec sources et validation humaine.

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
| Documents générés | « modèles texte versionnés, approuvables, sourcés, rendus côté serveur avec empreintes et provenance » | « document juridiquement authentique » sans circuit de confiance/homologation |
| Signature | « parapheur, preuve interne liée au contenu et frontière PKI fail-closed » | « signature qualifiée », « certificat gouvernemental », « non-répudiation légale garantie » |
| Archivage | « conservation versionnée et auditable » | « archivage légal certifié » |
| IA | « assistance sourcée, traçable et soumise à validation humaine » | « décision administrative autonome par IA » |
| Résilience | « baseline Kubernetes, probes, PRA/PCA et gates opérationnels présents » | « haute disponibilité nationale démontrée » sans test de charge/PRA en environnement cible |
| Portail citoyen | « soumission, pièces, suivi et satisfaction persistés côté serveur » | « identité citoyenne officiellement vérifiée » tant qu'aucune autorité d'identité n'est intégrée |
| Démarches | « catalogue serveur versionné avec statut de politique et source » | présenter des délais/frais internes comme des délais/frais légaux sans source approuvée |

## 4. Génération documentaire — verrou technique résolu

Le générateur HTML historique côté navigateur n'est plus une source d'autorité. Le flux de génération administratif est désormais gouverné côté serveur :

1. le modèle documentaire est versionné avec la version de démarche ;
2. le modèle est du texte avec une liste fermée de variables autorisées, et non du HTML arbitraire ;
3. le statut du modèle distingue `not_configured`, `draft` et `approved` ;
4. un modèle `approved` doit référencer une source institutionnelle ;
5. une empreinte SHA-256 du modèle est calculée et vérifiée avant rendu ;
6. la génération recharge la version historique exacte de la démarche capturée lors de la soumission ;
7. toutes les données injectées sont échappées avant le rendu HTML ;
8. le document conserve la version de démarche, l'empreinte du modèle, sa source, son propre hash et la preuve `rendered_server_side` ;
9. la génération est bloquée si le modèle n'est pas approuvé, n'est pas sourcé ou si son empreinte ne correspond plus ;
10. le passage au statut `prete` reste bloqué si aucun document n'a réellement été persisté.

L'interface agent ne compose plus de document administratif dans React et ne présente plus de faux emplacement « signature/cachet » ou de mention juridique fabriquée côté client.

**Ce verrou technique ne vaut pas qualification juridique.** La signature, le cachet, le certificat, l'horodatage qualifié éventuel et l'archivage probant restent des circuits de confiance séparés à intégrer et homologuer selon les exigences retenues.

## 5. Gestion des échéances — formulation contrôlée

L'interface distingue désormais :

- un **objectif de traitement interne** lorsqu'aucune source officielle approuvée n'est attachée à la politique ;
- un **délai réglementaire sourcé** uniquement lorsque la version de démarche est marquée approuvée et référence sa source.

Le dépassement d'une échéance produit un signal de priorité/escalade. Il ne provoque pas de rejet automatique de la demande.

## 6. Éléments de preuve à préparer pour le gouvernement

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

## 7. Pilote recommandé

Le premier pilote doit rester limité et mesurable : quelques démarches de 1 à 3 institutions, un nombre contrôlé d'agents, une population citoyenne pilote et des critères d'acceptation explicites.

Les KPI proposés : taux de demandes abouties, délai médian de traitement, taux de dossiers incomplets, disponibilité, erreurs 5xx, taux de synchronisation après coupure réseau, satisfaction citoyenne, incidents IAM/RLS, temps de reprise PRA, consommation infrastructure et taux de traitement manuel évité.

## 8. Règle de communication

Toute affirmation de conformité, valeur légale, qualification de signature, identité officielle, délai réglementaire ou disponibilité nationale doit être accompagnée de sa **preuve externe ou de son statut** : `implémenté`, `testé`, `pilote`, `à homologuer`, `dépend d'un partenaire`, ou `non disponible`.

Cette discipline protège le projet et renforce sa crédibilité institutionnelle.
