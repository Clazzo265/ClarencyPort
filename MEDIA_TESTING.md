# KLARENCY Media Testing & Verification Report

## Automated Checks Run

| Check | Command | Scope |
| :--- | :--- | :--- |
| Media Pure Logic Unit Tests | `npx --yes tsx --test src/utils/mediaLogic.test.ts` | Magic bytes, extension mismatch rejection, managed filenames, range header parsing, Drive URL candidate extraction, duplicate detection, usage tracking, filter/stats |
| Firestore Rules Contract Tests | `npx --yes tsx --test src/utils/firestoreRulesContract.test.ts` | Public vs admin read/write isolation, `mediaFiles` visibility boundaries, `driveConfig` admin-only isolation, Dirty Dozen attack payloads |
| Portfolio Logic & Motion Tests | `npx --yes tsx --test src/utils/portfolioLogic.test.ts src/utils/motionTokens.test.ts` | Public/admin search isolation, project counts, motion tokens |
| Firestore Rules Lint | `npx eslint firestore.rules` | Syntax & security rule static checks |
| TypeScript & Vite Build | `npm run build` / `npm run lint` | Full app compilation & strict type-checking |

## Interactive Browser Verification Notes

- Headless browser verification (`playwright-cli`) validates public portfolio rendering (desktop `1440×900` and mobile `390×844`), zero console/page errors, project modal + gallery lightbox rendering, and `/admin` authentication gating.
- **Interactive Google Sign-In & Live Google Drive OAuth Uploads**: Live OAuth consent popups (`cchilongo88@gmail.com` + `drive.file` scope) require manual human authentication in a real browser session and cannot be completed automatically in headless automation. Use the manual checklist below after deploying or running locally with a real Google sign-in.

## Owner Manual Verification Checklist (Android & Desktop)

1. Sign into `/admin` with `cchilongo88@gmail.com`.
2. Open **Media Library** and tap **Connect Google Drive**; confirm `KLARENCY MEDIA/` and all subfolders are created in Google Drive.
3. Upload a mobile photo (`JPEG`/`PNG`/`WebP`); test **Pause**, **Resume**, and completion.
4. Confirm uploaded file starts as **`PRIVATE`** and renders securely inside **Inspect & Manage** via authenticated preview.
5. Transition the file to **`PUBLIC`** and verify `deliveryStatus: 'verified'`.
6. Link the file to a project cover or portrait, save, and confirm it renders on the public `/` portfolio on mobile and desktop.
7. Upload a CV PDF to **Profile & CV**, keep Private until ready, then enable public CV download and test download on `/`.
8. Attempt to delete a published asset in **Media Library** and verify the published-reference safeguard warning appears.
