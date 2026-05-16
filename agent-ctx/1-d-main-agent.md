# Task 1-d: Fix header search bar, notifications, signatures page verification, and audit logs page

## Agent: Main Agent

## Summary of Changes

### 1. app-header.tsx — Global Search Bar & Notification Fixes
- Replaced non-functional search Input with clickable button opening CommandDialog (⌘K shortcut)
- CommandDialog searches across 3 data sources: citizen requests (from store), documents (static), courriers (static)
- Results grouped by category, clicking navigates to appropriate page
- Notification dropdown items are clickable and navigate to category-related pages
- "Voir toutes les notifications" navigates to notifications page
- "Mon profil" and "Préférences" navigate to settings page
- Mobile search button added

### 2. signatures-page.tsx — Hash-Based Verification & QR Code
- Replaced Math.random() hash with deterministic generateHash(reference, signer, timestamp)
- Added originalHash and signerName fields to SignatureRequest
- Verification now recomputes hash and compares with stored originalHash
- Shows "Document intègre" (green) or "Document modifié — intégrité compromise" (red)
- Replaced QrCode icon with QRCodeSVG component generating deterministic 9×9 grid pattern

### 3. audit-logs-page.tsx — Live Mode, Date Filters, CSV Export, Refresh
- Live mode: adds realistic fake log every 5 seconds via setInterval (5 action types)
- Date range filters: dateFrom/dateTo state wired to inputs, filter logs by timestamp
- CSV export: generates UTF-8 BOM CSV with French headers, triggers download
- Refresh button: shows spinner for 1s, then toast "Journaux actualisés"

### 4. analytics-page.tsx — Period Selector & Export Buttons
- Period selector generates different data per period (7d=weekly, 30d=4-week, 90d=3-month, 1y=12-month)
- Summary cards, line chart, bar chart, radar chart all update with period
- Brief loading spinner on period change
- PDF export: generates structured text report, downloads as analytics-export.pdf
- Excel export: generates CSV with data tables, downloads as analytics-export.csv

### 5. notifications-page.tsx — Clickable Items & Test Button
- Notification cards clickable: marks as read + navigates to related page
- Category→Page mapping for 9 categories
- Stop propagation on action buttons to prevent unwanted navigation
- "Créer une notification de test" button with Plus icon creates new unread notification

## Files Modified
- `/src/components/layout/app-header.tsx`
- `/src/components/app/signatures-page.tsx`
- `/src/components/app/audit-logs-page.tsx`
- `/src/components/app/analytics-page.tsx`
- `/src/components/app/notifications-page.tsx`
- `/home/z/my-project/worklog.md`

## Build Status
- Dev server compiles successfully
- No new lint errors introduced (pre-existing errors in access-guard.tsx are unrelated)
