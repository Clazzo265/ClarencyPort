# KLARENCY Google Drive Setup Guide

KLARENCY 6.0 uses **Google Drive API v3** with the least-privilege `https://www.googleapis.com/auth/drive.file` scope as its media storage layer, while keeping **Firebase Authentication** and **Cloud Firestore** active.

## 1. Google Cloud & OAuth Provisioning

- **Cloud Project ID:** `gen-lang-client-0736739466`
- **OAuth Client Type:** Web Application (Client-side GIS / Firebase Auth OAuth flow; no client secret stored in frontend code)
- **Configured Scope:** `https://www.googleapis.com/auth/drive.file`
  - This scope grants KLARENCY access **only** to files and folders created or explicitly opened by KLARENCY. It cannot read unrelated personal Drive files.

### Required Google Cloud Console Settings
1. Ensure **Google Drive API** (`drive.googleapis.com`) is enabled in Google Cloud Console for project `gen-lang-client-0736739466`.
2. Ensure the OAuth Consent Screen is configured with:
   - App name (`Clarence Chilongo's Apps` / `KLARENCY`)
   - Scopes including `https://www.googleapis.com/auth/drive.file`
   - Owner test user (`cchilongo88@gmail.com`) listed if the consent screen is in **Testing** mode.
3. Verify Authorized JavaScript Origins include:
   - Local development (`http://localhost:3000`)
   - Your deployed Cloud Run / Firebase Hosting domain(s) (`APP_URL`).

## 2. Folder Hierarchy Created Automatically

When the verified owner signs into `/admin` and taps **Connect Google Drive**, `connectAndInitDriveWorkspace()` idempotently locates or creates:

```text
KLARENCY MEDIA/
├── Profile/
├── Projects/
│   ├── Covers/
│   ├── Screenshots/
│   └── Demonstrations/
├── CV/
├── Research/
├── Experience/
├── Certificates/
└── Other/
```

Folder IDs are saved in Cloud Firestore at `/siteContent/driveConfig` (admin-read/write only) and verified before reuse on subsequent sessions.

## 3. Using Media Upload in Owner Studio

1. Open `/admin` and sign in with the verified owner Google account (`cchilongo88@gmail.com`).
2. Navigate to **Media Library** (or use any image/PDF upload field inside **Add Project**, **Profile & CV**, **Research**, or **Experience**).
3. Tap **Connect Google Drive** to grant session-only `drive.file` access.
4. Select an image (`JPEG`, `PNG`, `WebP` up to 10 MB) or PDF (`up to 15 MB`).
5. By default, uploaded assets are stored as **`PRIVATE`**. Explicitly toggle **Publish** or use **Media Library → Inspect & Manage** when you want an image or CV to be publicly viewable on the portfolio.
