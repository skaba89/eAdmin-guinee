---
Task ID: P0-P2-corrections
Agent: Super Z (main)
Task: Correction des issues critiques P0-P2 identifiées lors de l'audit eAdmin Guinée

Work Log:
- P0-1: Supprimé le bouton "Générer le document officiel" dupliqué et la section "Document officiel généré" dupliquée dans service-requests-page.tsx (cause principale du bug popup)
- P0-2: Ajouté l'initialisation globale de checkAndRejectExpiredRequests() dans page.tsx avec useEffect (chargement app + toutes les 30 min)
- P0-3: Remplacé ROLE_PAGE_ACCESS (page.tsx) par canAccessPage()/getDefaultPage() de rbac.ts — unification du système RBAC
- P1-1: Vérifié que les jours fériés guinéens sont déjà implémentés dans addBusinessDays() (14+ holidays)
- P1-2: Vérifié que l'escalade superviseur est déjà implémentée dans checkAndRejectExpiredRequests() (isDeadlineCritical)
- P1-3: Vérifié que la section "Notifications" est déjà présente dans citizen-portal-page.tsx
- P2-1: Supprimé les imports inutilisés (DropdownMenu, getDeadlineDays), corrigé next.config.ts (ignoreBuildErrors=false, reactStrictMode=true)
- P2-2: Exclu examples/ et skills/ de la compilation TypeScript (tsconfig.json)
- Build vérifié avec succès après toutes les corrections
- Push sur GitHub: commit 6b7a7ee

Stage Summary:
- 4 fichiers modifiés: page.tsx, service-requests-page.tsx, next.config.ts, tsconfig.json
- Build réussi avec TypeScript strict (ignoreBuildErrors=false)
- RBAC unifié: une seule source de vérité dans rbac.ts
- Auto-rejection des demandes expirées: désormais globale (pas seulement sur la page service-requests)
- Bug popup corrigé: suppression des éléments dupliqués pour la génération de documents
