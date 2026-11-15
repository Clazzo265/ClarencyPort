# KLARENCY Environment & Configuration Reference

## Runtime Configuration Files

- **`firebase-applet-config.json`** (public client config committed by AI Studio Firebase/OAuth provisioning):
  - `projectId`: `gen-lang-client-0736739466`
  - `authDomain`: `gen-lang-client-0736739466.firebaseapp.com`
  - `oAuthClientId`: `629492794963-hlehmqjghh08s8ve8pkggpqjfjse70s2.apps.googleusercontent.com`
- **`.env.example`**:
  - `GEMINI_API_KEY` (injected via AI Studio Secrets when server-side Gemini features are used; not exposed client-side)
  - `APP_URL` (Cloud Run service URL injected at runtime)

## Security Rules & Blueprint

- `firebase-blueprint.json`: Schema definition for `/siteContent/publicProfile`, `/siteContent/privateSettings`, `/siteContent/driveConfig`, `/mediaFiles`, `/projects`, `/skills`, `/research`, `/experiences`, `/contactMessages`, `/auditLogs`, `/admins`.
- `firestore.rules`: Deployed Firestore rules enforcing admin-only writes, `PUBLIC`-only visitor reads on `/mediaFiles`, and strict schema checks.

## Important Security Notes

- **No OAuth client secrets** or **service account private keys** are placed in frontend source code or `.env.example`.
- Google Drive OAuth access tokens (`https://www.googleapis.com/auth/drive.file`) are requested client-side via Google Identity Services (`https://accounts.google.com/gsi/client`) / Firebase GoogleAuthProvider popup and held strictly in memory.
