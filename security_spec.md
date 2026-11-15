# KLARENCY Security Specification

## 1. Data Invariants
1. **Strict Draft & Private Media Isolation**: No `project`, `skill`, `research`, or `experience` document with `publishState != 'published'`, and no `mediaFiles` document with `visibility != 'PUBLIC'`, may ever be readable (`get` or `list`) by unauthenticated or non-admin users.
2. **Verified Admin Boundary**: Administrator privileges require either the bootstrapped owner email (`cchilongo88@gmail.com`) with `request.auth.token.email_verified == true`, OR an existing record in `/admins/{request.auth.uid}` paired with `email_verified == true`.
3. **No OAuth Tokens or Base64 Binaries in Firestore**: `/siteContent/driveConfig` stores only Google Drive folder IDs and non-sensitive display metadata; `/mediaFiles` stores only file metadata and verified public delivery URLs when `visibility == 'PUBLIC'`. OAuth access tokens remain strictly in-memory in the browser session.
4. **No Self-Privilege Escalation**: Non-owner users cannot create, update, or delete `/admins/{adminId}` documents.
5. **Contact Message Confidentiality**: Anyone may submit a `contactMessage` only if `status == 'unread'`, `createdAt == request.time`, and all fields satisfy strict length/format limits. Reading, listing, updating, or deleting `contactMessages` is restricted exclusively to verified administrators.
6. **PII & Private Settings Separation**: Private operational settings reside in `/siteContent/privateSettings` and Drive folder configuration in `/siteContent/driveConfig`, completely isolated from `/siteContent/publicProfile` and unreadable by public visitors.
7. **Immutable Temporal & Ownership Integrity**: `createdAt`, `ownerId`, `uploadedBy`, `actorUid`, and `savedBy` cannot be spoofed on create (`request.time`, `request.auth.uid`) or mutated on update.
8. **Master Gate on Subcollections**: `/projects/{projectId}/revisions/{revisionId}` requires `exists(/databases/$(database)/documents/projects/$(projectId))` and verified administrator access.
9. **Strict Key & Size Enforcement**: Every create enforces `keys().hasAll(...) && keys().hasOnly(...)` and every string/list checks bounded `.size()` to prevent shadow fields and Denial-of-Wallet payloads.

## 2. The "Dirty Dozen" Attack Payloads
1. **Unauthenticated Draft Read**: Anonymous visitor attempts `get /projects/draft-proj-1` (`publishState: 'draft'`) -> `PERMISSION_DENIED`.
2. **Unauthenticated Draft List Query**: Anonymous visitor runs `list /projects` without `where('publishState', '==', 'published')` -> `PERMISSION_DENIED`.
3. **Private/Unpublished Media Read**: Anonymous visitor attempts `get` or `list /mediaFiles` where `visibility` is `PRIVATE` or `UNPUBLISHED` -> `PERMISSION_DENIED`.
4. **Media Shadow Token Injection**: Rogue client attempts `create /mediaFiles/med-1` containing an `accessToken` or `refreshToken` field -> `PERMISSION_DENIED`.
5. **Contact Message Scraping**: Anonymous or signed-in non-admin user attempts `get` or `list` on `/contactMessages` -> `PERMISSION_DENIED`.
6. **Contact Message Status Spoofing**: Visitor submits `/contactMessages/msg-1` with `status: 'read'` or `status: 'archived'` -> `PERMISSION_DENIED`.
7. **Email Spoofing Without Verification**: Attacker authenticates with email `cchilongo88@gmail.com` where `email_verified == false` and attempts admin write -> `PERMISSION_DENIED`.
8. **Self-Admin Escalation**: Non-admin user attempts `create /admins/$(uid)` with `{ role: 'owner' }` -> `PERMISSION_DENIED`.
9. **Drive Config Exfiltration / Tampering**: Non-admin user attempts `get` or `write /siteContent/driveConfig` -> `PERMISSION_DENIED`.
10. **Payload Size Exhaustion**: Attacker attempts `create /contactMessages/msg-2` with 10,000-char `message` -> `PERMISSION_DENIED`.
11. **Temporal Backdating**: Attacker attempts `create /mediaFiles/med-2` or `/contactMessages/msg-3` with client-supplied `createdAt != request.time` -> `PERMISSION_DENIED`.
12. **Audit Log Tampering**: Authenticated user attempts `update` or `delete` on `/auditLogs/log-1` -> `PERMISSION_DENIED`.
