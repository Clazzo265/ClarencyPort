import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const rulesPath = path.resolve(process.cwd(), 'firestore.rules');
const blueprintPath = path.resolve(process.cwd(), 'firebase-blueprint.json');
const rulesText = fs.readFileSync(rulesPath, 'utf8');
const blueprint = JSON.parse(fs.readFileSync(blueprintPath, 'utf8')) as {
  entities: Record<string, { required?: string[]; properties: Record<string, unknown> }>;
  firestore: Record<string, unknown>;
};

test('firestore.rules includes default deny safety net and rules_version 2', () => {
  assert.match(rulesText, /rules_version\s*=\s*'2';/);
  assert.match(rulesText, /match \/\{document=\*\*\}\s*\{\s*allow read, write: if false;\s*\}/);
});

test('firestore.rules enforces email_verified == true and bootstrapped owner email', () => {
  assert.match(rulesText, /request\.auth\.token\.email_verified == true/);
  assert.match(rulesText, /cchilongo88@gmail\.com/);
});

test('firestore.rules enforces strict publishState == published on all public list queries', () => {
  for (const collection of ['projects', 'skills', 'research', 'experiences']) {
    const blockRegex = new RegExp(`match /${collection}/\\{[a-zA-Z]+\\}[\\s\\S]*?allow list:\\s*if\\s*existing\\(\\)\\.publishState == 'published' \\|\\| isAdmin\\(\\);`);
    assert.match(rulesText, blockRegex, `Missing published-only list guard for ${collection}`);
  }
});

test('firestore.rules restricts mediaFiles to PUBLIC only and locks down driveConfig', () => {
  assert.match(
    rulesText,
    /match \/mediaFiles\/\{mediaId\}[\s\S]*?allow get:\s*if isValidId\(mediaId\) && \(existing\(\)\.visibility == 'PUBLIC' \|\| isAdmin\(\)\);/,
  );
  assert.match(
    rulesText,
    /match \/mediaFiles\/\{mediaId\}[\s\S]*?allow list:\s*if existing\(\)\.visibility == 'PUBLIC' \|\| isAdmin\(\);/,
  );
  assert.match(
    rulesText,
    /match \/siteContent\/driveConfig[\s\S]*?allow get:\s*if isAdmin\(\);/,
  );
  assert.doesNotMatch(rulesText, /accessToken|refreshToken|clientSecret/);
});

test('firestore.rules locks down contactMessages, privateSettings, auditLogs, and admins from public reads', () => {
  assert.match(rulesText, /match \/siteContent\/privateSettings[\s\S]*?allow get:\s*if isAdmin\(\);/);
  assert.match(rulesText, /match \/contactMessages\/\{messageId\}[\s\S]*?allow get:\s*if isAdmin\(\)/);
  assert.match(rulesText, /match \/contactMessages\/\{messageId\}[\s\S]*?allow list:\s*if isAdmin\(\);/);
  assert.match(rulesText, /match \/auditLogs\/\{logId\}[\s\S]*?allow update, delete:\s*if false;/);
  assert.match(rulesText, /match \/admins\/\{adminId\}[\s\S]*?allow create:\s*if isOwnerEmail\(\)/);
});

test('firebase-blueprint.json covers every Firestore path defined in firestore.rules', () => {
  const expectedPaths = [
    '/siteContent/publicProfile',
    '/siteContent/privateSettings',
    '/siteContent/driveConfig',
    '/mediaFiles/{mediaId}',
    '/projects/{projectId}',
    '/projects/{projectId}/revisions/{revisionId}',
    '/skills/{skillId}',
    '/research/{researchId}',
    '/experiences/{experienceId}',
    '/contactMessages/{messageId}',
    '/auditLogs/{logId}',
    '/admins/{adminId}',
  ];

  for (const expectedPath of expectedPaths) {
    assert.ok(blueprint.firestore[expectedPath], `Missing blueprint path: ${expectedPath}`);
  }
});
