# KLARENCY Media Security Model

## 1. Dual Authorization Gate

Every mutating or private media operation requires **two independent verified credentials**:
1. **Verified Firebase Administrator**: `auth.currentUser` must have `email_verified == true` and either match `cchilongo88@gmail.com` or exist in `/admins/{uid}` (enforced in `firestore.rules`).
2. **Active In-Memory Google Drive OAuth Token**: Obtained interactively via Google Identity Services (`https://www.googleapis.com/auth/drive.file`) or Firebase GoogleAuthProvider popup fallback.

## 2. Token Storage & Session Hygiene

- **In-Memory Only**: Drive access tokens live exclusively in module memory (`src/services/googleDriveAuth.ts`).
- **Never Persisted**: Tokens are **never** written to `localStorage`, `sessionStorage`, cookies, URLs, logs, or Cloud Firestore.
- **Automatic Wipe**: Signing out of Firebase or entering an unauthenticated auth state immediately invokes `clearDriveAuthSession()` and revokes/clears memory state.

## 3. Strict 3-State Media Visibility

| State | Firestore Public Read | Google Drive Permission | Behavior |
| :--- | :--- | :--- | :--- |
| `PRIVATE` | Denied | Owner-only (`anyone` removed) | Default for all uploads; previewed only in Owner Studio via Bearer `?alt=media` |
| `UNPUBLISHED` | Denied | Owner-only (`anyone` removed) | Previously published or staged media hidden from visitors |
| `PUBLIC` | Allowed | `type: 'anyone', role: 'reader'` | Verified public URL exposed for portfolio display |

- **No Auto-Publishing**: Files upload as `PRIVATE` unless the owner explicitly checks the publish option or transitions visibility inside **Media Library** or the upload card.

## 4. Firestore Security Rules (`/mediaFiles` & `/siteContent/driveConfig`)

- `/siteContent/driveConfig`: `allow get, create, update: if isAdmin() && isValidDriveConfig(...)`; `allow delete: if false`. Public visitors cannot read Drive folder mappings.
- `/mediaFiles/{mediaId}`:
  - `allow get, list: if existing().visibility == 'PUBLIC' || isAdmin()`
  - Strict field schema validation (`isValidMediaFile`) enforcing valid MIME types (`image/jpeg`, `image/png`, `image/webp`, `application/pdf`), max size bounds, `storageProvider == 'google-drive'`, valid categories, valid delivery statuses, and `uploadedBy == request.auth.uid`.
  - Audited via append-only `/auditLogs/{logId}` (`allow update, delete: if false`).

## 5. Abuse Prevention & Deletion Safeguards

- Magic-byte header verification rejects spoofed file extensions and malformed binaries client-side before network upload.
- Image EXIF/GPS metadata is stripped via `<canvas>` re-encoding before uploading.
- Deleting media in **Media Library** inspects `findMediaUsage()` across profile, CV, projects, research, and experiences, requiring explicit confirmation and acknowledgement if any **published** item still references the asset.
