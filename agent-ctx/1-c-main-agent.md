---
Task ID: 1-c
Agent: Main Agent
Task: Fix multiple pages so dropdown actions, buttons, and forms actually work

Work Log:

- Updated `/src/components/app/courriers-page.tsx`:
  - Added onClick handlers to all 5 dropdown menu items:
    - **Consulter**: Opens a dialog showing full courrier details (référence, objet, type, expéditeur, destinataire, date, statut, priorité, classification, circuit, SLA)
    - **Viser**: Changes statut to "Visé" and shows success toast
    - **Transférer**: Opens a dialog with Select for target institution (12 institutions listed), then updates expéditeur and shows toast "Courrier [ref] transféré à [institution]"
    - **Traiter**: Changes statut to "Traité" and shows success toast
    - **Archiver**: Changes statut to "Archivé" and shows success toast
  - Added 'Visé' and 'Archivé' to CourrierStatus type and STATUS_COLORS map
  - Enhanced Courrier interface with type, destinataire, classification fields
  - Updated all 12 seed courriers with complete data
  - Added form validation for new courrier: required fields (objet, type, destinataire) with error messages
  - Added type, destinataire, classification fields to new courrier form
  - Stats cards now derive from actual courriers array (totalCount, entrantsCount, sortantsCount, enAttenteCount, urgentsCount, slaPercent)
  - SLA progress bar also uses computed slaPercent
  - Implemented pagination with currentPage state, PAGE_SIZE=10, previous/next buttons, page number buttons
  - Pagination resets to page 1 on tab/filter/search changes

- Updated `/src/components/app/users-page.tsx`:
  - Added onClick handlers to all 4 dropdown menu items:
    - **Voir le profil**: Opens a dialog showing full user details (name, email, role, status, institution, last login)
    - **Modifier**: Opens an edit dialog pre-filled with user data (name, email, role, status, institution), saves changes to state
    - **Réinitialiser mot de passe**: Shows confirmation dialog, then shows toast "Mot de passe réinitialisé pour [name]"
    - **Supprimer**: Shows confirmation dialog, removes user from list, shows toast
  - Added bulk action handlers:
    - **Désactiver**: Shows confirmation, updates selected users' status to 'inactif', clears selection
    - **Changer le rôle**: Opens dialog with role selector, applies to selected users
    - **Supprimer**: Shows confirmation, removes selected users from list
  - Export: Generates CSV string from filtered users with proper headers, triggers browser download
  - Import: Shows toast "Fonctionnalité d'import en cours de développement"
  - Stats now derive from actual users array (total, actifs count, admin count, inactifs count)
  - Added KeyRound icon import for reset password action
  - Fixed JSX parsing error with dynamic icon component in view profile dialog

- Updated `/src/components/app/admin-page.tsx`:
  - Delete API key button: Shows confirmation dialog, removes key from array, shows toast with key name
  - Copy button: Uses navigator.clipboard.writeText() to copy the key, shows toast "Clé copiée dans le presse-papier"
  - Module toggles: Show toast "Module [name] [activé/désactivé]" on toggle
  - Save button (Enregistrer les modifications): Now uses controlled inputs for institution settings (name, sigle, tutelle, location) and shows toast "Paramètres de l'institution enregistrés avec succès"
  - Added deleteKeyDialog state and deleteKeyId for confirmation flow
  - Fixed CardDescription escaped apostrophe with &apos;

- Updated `/src/components/app/settings-page.tsx`:
  - Theme switcher: Now imports useAppStore and calls toggleTheme, applies document.documentElement.classList.toggle('dark', ...) directly when theme changes
  - Syncs with app store's theme state (light/dark/system)
  - Integration buttons (Configurer/Connecter): Open a dialog with URL and API key form fields, save to local state (savedIntegrations), show toast
  - Logo change button: Opens file dialog (input type="file"), shows selected file name in the logo area, shows toast "Logo mis à jour"
  - Save handlers: All "Enregistrer" buttons use controlled inputs and show toast with section name:
    - General: "Paramètres généraux enregistrés"
    - Security: "Paramètres sécurité enregistrés"
    - Notifications: "Paramètres notifications enregistrés"
    - Appearance: "Paramètres apparence enregistrés"
  - All form values captured from controlled inputs (instName, instSigle, instAddress, instPhone, instEmail, instWebsite)

Stage Summary:
- All 4 pages now have fully functional dropdown actions, buttons, and forms
- Courriers: 5 dropdown actions, form validation, derived stats, working pagination
- Users: 4 dropdown actions, 3 bulk actions, CSV export, import placeholder
- Admin: API key delete/copy with confirmation, module toggle toasts, controlled institution settings
- Settings: Theme switcher synced with app store, integration config dialog, logo upload, controlled form inputs
- All Guinea branding and visual design preserved
- Dev server compiles successfully with no new lint errors
