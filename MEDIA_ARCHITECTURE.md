# KLARENCY Universal Media Architecture

## 1. Hybrid Architecture Overview

KLARENCY 6.0 separates **Identity + Structured Metadata** from **Binary File Storage**:

| Responsibility | Provider | Reason |
| :--- | :--- | :--- |
| Administrator Authentication | Firebase Authentication (Google Sign-In) | Strict verified owner gate (`cchilongo88@gmail.com` / `admins/{uid}`) |
| Metadata, Visibility & Usage Links | Cloud Firestore (`/mediaFiles`, `/siteContent/driveConfig`) | Real-time portfolio queries & strict security rules under Spark free tier |
| Binary Media Storage | Google Drive API v3 (`KLARENCY MEDIA/`) | Zero Firebase Blaze billing required; 15 GB standard Google Drive storage |
| Local Interrupted-Upload Recovery | Browser IndexedDB (`klarency_drafts_db`) | Recovers Drive uploads if Firestore write fails mid-transfer |

No binary files or Base64 image blobs are ever stored in Cloud Firestore.

## 2. Provider Abstraction Layer

- `src/services/mediaProvider.ts` defines the provider-agnostic `MediaStorageProvider` contract (`getAccountInfo`, `ensureFolderHierarchy`, `startResumableUpload`, `setPublicReadable`, `verifyPublicDelivery`, `fetchPrivatePreviewBlobUrl`, `renameFile`, `deleteFile`, `verifyFileExists`).
- `src/services/googleDriveProvider.ts` implements `GoogleDriveStorageProvider` against Google Drive REST API v3.
- `src/services/mediaService.ts` orchestrates Drive operations, Firestore `/mediaFiles` writes, `/siteContent/driveConfig`, `auditLogs`, and IndexedDB partial-failure recovery.

## 3. Resumable Upload & Image Optimization Pipeline

1. **Magic-Byte Inspection (`inspectFileMagicBytes`)**: Reads leading bytes (`FF D8 FF` JPEG, `89 50 4E 47` PNG, `RIFF....WEBP`, `%PDF`) and rejects mismatched extensions or empty/corrupted files before transfer.
2. **Client-Side Optimization (`prepareImagePayload`)**:
   - Resizes oversized photos to max `1800px` (or `1024×1024` 1:1 square crop when enabled for portraits).
   - Redraws to `<canvas>` to strip EXIF/GPS metadata from mobile camera uploads.
   - PDFs bypass canvas compression and upload bit-for-bit intact.
3. **Chunked Resumable Transfer**:
   - Initializes a Drive resumable session (`uploadType=resumable`).
   - Uploads in `512 KB` chunks via `PUT` with `Content-Range`, handling HTTP `308 Resume Incomplete` responses.
   - Supports **Pause**, **Resume** (querying confirmed byte offset via `Content-Range: bytes */total`), **Cancel**, and **Retry**.

## 4. Public Image Delivery & Fallback Strategy

Google Drive is file storage, not a dedicated CDN. KLARENCY avoids fragile temporary `thumbnailLink` URLs and instead:
1. Explicitly grants `role: 'reader', type: 'anyone'` via Drive Permissions API only when an asset's visibility is set to **`PUBLIC`**.
2. Runs `verifyPublicDelivery()` across candidate image endpoints:
   - `https://lh3.googleusercontent.com/d/{driveFileId}=w1600`
   - `https://drive.google.com/thumbnail?id={driveFileId}&sz=w1600`
   - `https://drive.google.com/uc?export=view&id={driveFileId}`
3. Records `deliveryStatus` (`verified` vs `failed` + diagnostic `deliveryError`) in Firestore.
4. Uses `<SmartDriveImage />` on public views to step through Drive host fallbacks automatically and render clean gradient fallbacks if delivery is blocked by an organization/network policy.
5. Previews `PRIVATE` and `UNPUBLISHED` files inside Owner Studio using authenticated `fetch` (`?alt=media` + Bearer token) converted to short-lived `URL.createObjectURL` blobs.
