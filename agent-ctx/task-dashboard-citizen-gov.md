# Task: Dashboard & Citizen Portal - Government Platform Rewrite

## Summary
Rewrote both `dashboard-page.tsx` and `citizen-portal-page.tsx` to transform the eAdministration Suite Guinea into a true STATE-LEVEL government platform for the Republic of Guinea.

## Dashboard (`dashboard-page.tsx`) Changes
- **Page Header**: Changed to "Centre de Commandement Interministériel" with subtitle and Circulaire badge + 18/24 institutions indicator
- **KPI Cards**: 8 government-specific KPIs in 2 rows of 4 (Courriers interministériels, Documents officiels, Procédures numérisées, Délai moyen, Conformité réglementaire, Satisfaction citoyenne, Institutions connectées, Demandes citoyennes)
- **Line Chart**: Courriers interministériels using MONTHLY_DATA
- **Area Chart**: Documents archivés par institution with top 5 ministries
- **Bar Chart**: Performance par région administrative (8 Guinean regions)
- **Pie Chart**: Répartition par type de document (6 categories)
- **PND Section**: 4 progress bars with animated fill for Plan National de Développement axes
- **Recent Activity**: 10 government-specific activities (décrets, circulaires, arrêtés, etc.)
- **Quick Actions**: Updated to government actions
- **Heatmap**: Relabeled "Activité interministérielle par jour et heure" with brand-colored heatmap
- **Sovereignty Badge**: Data Center Conakry + Loi L/2016/018/AN compliance

## Citizen Portal (`citizen-portal-page.tsx`) Changes
- **Header**: "Guinée Services Publics" with Guinea tricolor accents and Service Public Numérique badge
- **Stats Banner**: 4 key metrics (124,500 inscrits, 8,730 traitées, 94% satisfaction, 48h délai)
- **Service Categories**: 8 categories (État Civil, Justice & Légal, Identification, Urbanisme, Entreprise, Éducation, Santé, Résidence) with 28 total services
- **Each service card**: Icon, name, description, delay (e.g., "Délai: 48h"), price, "Demander" button with category-colored button
- **Tracking**: Updated with GN-2026-XXXXXX format and Guinean administrative steps
- **Notification Preferences**: WhatsApp (primary), SMS Orange/MTN/Cellcom, Email, USSD (*144#)
- **Digital Receipt**: Full mock receipt with Guinea coat of arms, tricolor bars, "Travaux · Justice · Solidarité", stamp placeholder, QR code
- **Footer**: Legal privacy notice (Loi L/2016/018/AN) and Ministry attribution

## Verification
- `bun run lint` passed cleanly (no errors)
- Dev server compiles successfully
- All text in French
- Brand colors #0B2E58 and #C8A45C used throughout
- Guinea flag colors used as accents
