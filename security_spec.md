# KLARENCY Security Specification

## 1. Data Invariants
1. **Strict Draft Isolation**: No `project`, `skill`, `research`, or `experience` document with `publishState != 'published'` may ever be readable (`get` or `list`) by unauthenticated or non-admin users.
2. **Verified Admin Boundary**: Administrator privileges require either the bootstrapped owner email (`cchilongo88@gmail.com`) with `request.auth.token.email_verified == true`, OR an existing record in `/admins/{request.auth.uid}` paired with `email_verified == true`.
3. **No Self-Privilege Escalation**: Non-owner users cannot create, update, or delete `/admins/{adminId}` documents.
4. **Contact Message Confidentiality**: Anyone may submit a `contactMessage` only if `status == 'unread'`, `createdAt == request.time`, and all fields satisfy strict length/format limits. Reading, listing, updating, or deleting `contactMessages` is restricted exclusively to verified administrators.
5. **PII & Private Settings Separation**: Private operational settings reside in `/siteContent/privateSettings`, completely isolated from `/siteContent/publicProfile` and unreadable by public visitors.
6. **Immutable Temporal & Ownership Integrity**: `createdAt`, `ownerId`, `actorUid`, and `savedBy` cannot be spoofed on create (`request.time`, `request.auth.uid`) or mutated on update.
7. **Master Gate on Subcollections**: `/projects/{projectId}/revisions/{revisionId}` requires `exists(/databases/$(database)/documents/projects/$(projectId))` and verified administrator access.
8. **Strict Key & Size Enforcement**: Every create enforces `keys().hasAll(...) && keys().hasOnly(...)` and every string/list checks bounded `.size()` to prevent shadow fields and Denial-of-Wallet payloads.

## 2. The "Dirty Dozen" Attack Payloads
1. **Unauthenticated Draft Read**: Anonymous visitor attempts `get /projects/draft-proj-1` (`publishState: 'draft'`) -> `PERMISSION_DENIED`.
2. **Unauthenticated Draft List Query**: Anonymous visitor runs `list /projects` without `where('publishState', '==', 'published')` -> `PERMISSION_DENIED`.
3. **Contact Message Scraping**: Anonymous or signed-in non-admin user attempts `get` or `list` on `/contactMessages` -> `PERMISSION_DENIED`.
4. **Contact Message Status Spoofing**: Visitor submits `/contactMessages/msg-1` with `status: 'read'` or `status: 'archived'` -> `PERMISSION_DENIED`.
5. **Shadow Field Injection on Contact**: Visitor submits `/contactMessages/msg-1` containing an extra field `isAdminNote: true` -> `PERMISSION_DENIED`.
6. **Email Spoofing Without Verification**: Attacker authenticates with email `cchilongo88@gmail.com` where `email_verified == false` and attempts admin write -> `PERMISSION_DENIED`.
7. **Self-Admin Escalation**: Non-admin user attempts `create /admins/$(uid)` with `{ role: 'owner' }` -> `PERMISSION_DENIED`.
8. **Private Settings Exfiltration**: Non-admin user attempts `get /siteContent/privateSettings` -> `PERMISSION_DENIED`.
9. **Path ID Poisoning**: Attacker attempts `create /contactMessages/<200-char-invalid-id!@#>` -> `PERMISSION_DENIED`.
10. **Payload Size Exhaustion**: Attacker attempts `create /contactMessages/msg-2` with 10,000-char `message` -> `PERMISSION_DENIED`.
11. **Temporal Backdating**: Attacker or rogue client attempts `create /contactMessages/msg-3` with client-supplied `createdAt` not equal to `request.time` -> `PERMISSION_DENIED`.
12. **Audit Log Tampering**: Authenticated user attempts `update` or `delete` on `/auditLogs/log-1` -> `PERMISSION_DENIED`.
