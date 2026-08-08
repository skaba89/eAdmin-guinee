# Chaîne de confiance, PKI et dossier d'homologation — eAdmin Guinée

## 1. Principe de sécurité

La plateforme distingue strictement quatre niveaux d'assurance :

1. **Preuve d'approbation interne** : hash SHA-256 déterministe lié à la version du document, à l'acteur, à l'action et au timestamp interne. Ce niveau n'est pas une signature PKI qualifiée.
2. **Intégration PKI techniquement prête** : fournisseur, endpoint de signature, TSA, trust bundle, politique attendue, référence de credential et référence de clé HSM/KMS sont configurés. Ce niveau ne qualifie toujours aucune signature.
3. **Preuve cryptographiquement validée** : chaîne de certificat, statut/révocation, signature, timestamp et politique ont été validés pour une preuve donnée.
4. **Qualification externe attestée** : une autorité/processus de confiance externe a produit une attestation identifiable pour cette preuve et la politique applicable. Seul ce dernier niveau peut permettre à la plateforme d'exposer `qualified_pki=true` pour une preuve précise.

Une variable de configuration, un rôle administrateur ou une migration de données ne peuvent pas transformer les niveaux 1 à 3 en niveau 4.

## 2. Gestion des clés

La clé privée de signature ne doit jamais :

- être stockée dans Git ;
- être placée dans `.env`, un ConfigMap ou une table applicative ;
- être fournie directement au code Python/JavaScript ;
- être copiée dans les logs, les sauvegardes applicatives ou les artifacts CI.

`PKI_HSM_KEY_REFERENCE` contient uniquement une **référence** vers une clé conservée dans un HSM/KMS ou service de signature externe. Le futur adaptateur fournisseur demande une opération de signature ; il ne récupère pas la clé privée.

## 3. Contrat du fournisseur de confiance

Avant activation de `PKI_ENABLED`, le fournisseur retenu doit permettre de documenter au minimum :

- identité du fournisseur et environnement ciblé ;
- méthode d'authentification de l'application (mTLS, identité managée ou credential de coffre) ;
- algorithmes et profils de signature acceptés ;
- chaîne de certificats et trust anchors ;
- politique/OID attendue ;
- service d'horodatage TSA et validation du timestamp ;
- mécanisme de révocation (OCSP/CRL ou équivalent) ;
- identifiant de transaction idempotent ;
- conservation/export de l'artefact de preuve (CMS/PAdES/XAdES ou format retenu) ;
- journal d'audit fournisseur ;
- procédure d'incident, révocation et rotation des certificats ;
- attestations externes nécessaires pour revendiquer le niveau de qualification attendu.

## 4. Modèle de preuve externe

`qualified_signature_evidence` est volontairement séparée de `signature_steps`.

Chaque preuve externe est liée à :

- `document_id` ;
- `document_version` ;
- `document_hash` ;
- éventuellement `signature_step_id` ;
- fournisseur et transaction externe ;
- empreinte SHA-256 du certificat signataire ;
- algorithme de signature ;
- résultat de validation de chaîne ;
- statut du certificat et date du contrôle de révocation ;
- empreinte du token d'horodatage, date TSA et résultat de validation ;
- politique de confiance/OID ;
- statut de validation cryptographique ;
- statut et référence d'attestation de qualification externe.

L'artefact cryptographique complet est conservé dans le stockage objet sécurisé via `evidence_object_key`, et non injecté dans les réponses API.

## 5. RLS et autorité d'écriture

La table de preuve externe utilise `ENABLE ROW LEVEL SECURITY` + `FORCE ROW LEVEL SECURITY`.

- un utilisateur ordinaire peut uniquement lire une preuve si le document correspondant est déjà visible dans son périmètre RLS ;
- aucun endpoint utilisateur ne crée ou modifie ces preuves ;
- le futur adaptateur fournisseur devra utiliser une identité technique dédiée, journalisée et limitée au flux de preuve ;
- les suppressions ou corrections doivent être traitées comme événements de sécurité/audit, pas comme modifications métier ordinaires.

## 6. Contrôles nécessaires avant `qualified_pki=true`

La fonction de décision doit exiger simultanément :

- intégration PKI opérationnelle et trust bundle présent ;
- fournisseur identique au fournisseur approuvé ;
- preuve liée à une version/hash documentaire ;
- chaîne de certificat valide ;
- certificat déclaré `good` ;
- contrôle de révocation horodaté ;
- timestamp TSA présent et valide ;
- politique/OID valide et identique à celle configurée ;
- validation cryptographique au statut `validated` ;
- qualification au statut `externally_attested` ;
- référence d'attestation externe non vide.

Tout contrôle absent ou inconnu produit `qualified_pki=false`.

## 7. Dossier d'homologation technique à constituer

### Architecture et exploitation

- architecture logique/physique et flux réseau ;
- inventaire des composants et versions ;
- matrice des environnements ;
- séparation des responsabilités ;
- HSM/KMS, gestion des secrets et rotation ;
- haute disponibilité, sauvegardes, PITR, PRA/PCA et preuves d'exercices ;
- observabilité, SIEM/SOC, alertes et runbooks.

### Identité et accès

- matrice RBAC/ABAC ;
- MFA et politiques de sessions ;
- comptes techniques et responsabilités ;
- revues périodiques d'accès ;
- processus arrivée/mobilité/départ ;
- comptes d'urgence et procédure break-glass.

### Données et traçabilité

- classification des données ;
- RLS/multi-tenant ;
- chiffrement au repos/en transit ;
- cycle de vie des documents ;
- journal d'audit et chaîne d'intégrité ;
- conservation et purge ;
- preuves de restauration et cohérence hash/document.

### PKI et signatures

- contrat et documentation du fournisseur ;
- certificats et chaîne de confiance ;
- profils de signature ;
- politique/OID ;
- TSA ;
- OCSP/CRL ;
- procédure de validation long terme si requise ;
- tests de certificat expiré/révoqué/inconnu ;
- tests TSA indisponible/invalide ;
- rotation/révocation ;
- preuve d'attestation externe de qualification.

### Sécurité applicative

- SAST/SCA/secret scanning ;
- DAST/pentest ;
- analyse de dépendances et images ;
- tests RLS/IDOR ;
- tests auth/MFA/session ;
- tests upload/antivirus ;
- revue des endpoints administratifs ;
- gestion et preuve des correctifs de vulnérabilités.

### Gouvernance

- propriétaire du risque ;
- registre des risques et exceptions ;
- plan de traitement ;
- preuves d'acceptation des risques résiduels ;
- processus de changement ;
- gestion d'incident et notification ;
- fréquence de réévaluation de l'homologation.

## 8. États du dossier

Chaque contrôle du dossier doit porter un état explicite :

- `NOT_STARTED` ;
- `IMPLEMENTED_UNVERIFIED` ;
- `TESTED` ;
- `EXTERNALLY_VERIFIED` ;
- `ACCEPTED` ;
- `NOT_APPLICABLE` avec justification.

Le terme **homologué**, **certifié** ou **qualifié** ne doit jamais être affiché sur la base de `IMPLEMENTED_UNVERIFIED` ou `TESTED` uniquement.

## 9. Limite actuelle

Le dépôt fournit à ce stade une **fondation PKI-ready et fail-closed**. L'intégration réelle d'une CA/TSA, les credentials, les certificats, la chaîne de confiance, les profils juridiques applicables et les attestations de qualification sont des éléments externes qui doivent être fournis et validés dans l'environnement cible avant toute revendication de qualification ou d'homologation.
