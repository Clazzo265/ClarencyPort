# KLARENCY Media Migration Guide (Firebase Storage → Google Drive API v3)

## Summary of Architectural Migration

KLARENCY previously initialized `firebase/storage` inside `src/services/firebase.ts` and `src/services/storageUpload.ts`. Because Firebase Storage requires the paid Blaze plan on modern Firebase tiers, KLARENCY 6.0 removes all runtime `firebase/storage` usage while preserving Firebase Authentication and Cloud Firestore.

## Changes Applied

1. **Removed Firebase Storage Runtime Code**:
   - Removed `getStorage` / `firebase/storage` from `src/services/firebase.ts`.
   - Removed `src/services/storageUpload.ts` once all upload fields migrated to Google Drive.
   - `grep -rn "firebase/storage" src` returns zero matches.
2. **Preserved Existing Data & Backward Compatibility**:
   - Existing Firestore fields (`PublicProfile.portraitUrl`, `PublicProfile.cvUrl`, `Project.imageUrl`, `ResearchEntry.documentUrl`, `ExperienceEntry.verificationUrl`) remain intact and readable by the public portfolio.
   - New optional relational media fields (`portraitMediaId`, `cvMediaId`, `coverMediaId`, `galleryMediaIds`, `galleryImageUrls`, `documentMediaId`, `certificateMediaId`) were added compatibly to TypeScript types, Zod validation schemas, `firebase-blueprint.json`, and `firestore.rules`.
3. **Note on Legacy URLs**:
   - Any pre-existing `firebasestorage.googleapis.com` URLs stored on older Firestore records will continue to render if still accessible, or can be replaced cleanly with a Google Drive upload via **Owner Studio → Media Library** or each editor's upload field.
   - `storage.rules` at the repository root is kept only as historical configuration and is no longer required at runtime.
