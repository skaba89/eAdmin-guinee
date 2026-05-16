# Phase 5: Document Upload/Download Implementation

## Task ID: phase-5-document-upload-download
## Agent: main-developer
## Status: COMPLETED

## Summary
Implemented Phase 5 (Document Upload/Download) for the eAdministration Suite Guinea project. This phase adds enhanced file upload/download capabilities with Guinea branding, drag & drop support, and proper document generation.

## Files Created
1. **`src/components/app/file-upload-zone.tsx`** - New reusable drag & drop file upload component
2. **`src/lib/document-download.ts`** - Shared document download utility with Guinea branding

## Files Modified
1. **`src/components/app/citizen-portal-page.tsx`** - Enhanced download & file upload integration
2. **`src/components/app/service-requests-page.tsx`** - Enhanced download with proper document generation

## Implementation Details

### 1. FileUploadZone Component (`file-upload-zone.tsx`)
- Drag & drop zone with visual feedback (border color change, icon change on drag over)
- File type validation: PDF, JPG, PNG, DOC, DOCX only
- File size validation: max 10MB
- File preview for images (thumbnail)
- File list with remove button
- Upload progress simulation
- Category prop support ('justificatif' | 'document_produit' | 'complement')
- Multiple files prop
- French labels throughout
- Guinea brand colors (RED=#CE1126, YELLOW=#FCD116, GREEN=#009460, Navy=#0B2E58)
- Uses shadcn/ui components and lucide-react icons
- Guinea tricolor stripe at top of drop zone

### 2. Document Download Feature (`document-download.ts`)
- `generateProducedDocumentContent()` - Creates Guinea-branded formal administrative document
  - Republic of Guinea header with motto
  - Document reference, service, category
  - Citizen identity section
  - Request details section
  - Attached files listing
  - Administrative attestation with legal references
  - Agent signature block
  - eAdministration Suite footer
- `generateAttachedFileContent()` - Creates formatted content for attached file downloads
- `downloadProducedDocument()` - Download handler for produced documents
- `downloadAttachedFile()` - Download handler for attached files
- `triggerDownload()` - Generic file download utility

### 3. Citizen Portal Enhancements (`citizen-portal-page.tsx`)
- Replaced old simple download function with enhanced Guinea-branded downloads
- Added `downloadProducedDocument` and `downloadAttachedFile` imports
- Integrated FileUploadZone in the detail dialog for:
  - `pieces_complementaires` status: complement file upload
  - `soumise` status: justificatif file upload
- Shows already uploaded files with remove option
- Refreshes selected request after file operations
- Complement dialog now uses FileUploadZone instead of manual file handling
- Updated MAX_FILE_SIZE to 10MB
- Added DOC/DOCX to allowed file types

### 4. Service Requests Page Enhancements (`service-requests-page.tsx`)
- Replaced inline download functions with shared `downloadProducedDoc` and `downloadAttachedDoc`
- Removed old `downloadFile` and `downloadAttachedFile` local functions
- Now generates proper Guinea-branded documents for both produced documents and attached files

## Testing
- TypeScript compilation passes for all changed files
- No ESLint errors in changed files
- Dev server compiles and serves without errors
- All HTTP responses return 200
