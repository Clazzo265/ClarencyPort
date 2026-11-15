import test from 'node:test';
import assert from 'node:assert/strict';
import type { DriveFolderMap, MediaFileRecord, Project, PublicProfile } from '../types/portfolio';
import {
  buildDrivePublicUrlCandidates,
  buildManagedFilename,
  computeMediaLibraryStats,
  extractDriveFileIdFromUrl,
  filterMediaFiles,
  findDuplicateMediaRecords,
  findMediaUsage,
  inspectFileMagicBytes,
  parseGoogleRangeHeader,
  resolveFolderIdForCategory,
  translateMediaError,
  validateMediaDescriptor,
} from './mediaLogic';

test('inspectFileMagicBytes detects JPEG, PNG, WebP, and PDF headers accurately', () => {
  assert.equal(inspectFileMagicBytes(new Uint8Array([0xff, 0xd8, 0xff, 0xe0])), 'image/jpeg');
  assert.equal(
    inspectFileMagicBytes(new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])),
    'image/png',
  );
  assert.equal(
    inspectFileMagicBytes(
      new Uint8Array([0x52, 0x49, 0x46, 0x46, 0x24, 0x00, 0x00, 0x00, 0x57, 0x45, 0x42, 0x50]),
    ),
    'image/webp',
  );
  assert.equal(inspectFileMagicBytes(new Uint8Array([0x25, 0x50, 0x44, 0x46])), 'application/pdf');
  assert.equal(inspectFileMagicBytes(new Uint8Array([0x3c, 0x73, 0x76, 0x67])), null);
});

test('validateMediaDescriptor rejects spoofed extensions, empty files, and oversized files', () => {
  const spoofed = validateMediaDescriptor({
    name: 'cv.pdf',
    size: 1024,
    declaredMime: 'application/pdf',
    magicMime: 'image/png',
  });
  assert.equal(spoofed.valid, false);

  const empty = validateMediaDescriptor({
    name: 'photo.jpg',
    size: 0,
    declaredMime: 'image/jpeg',
    magicMime: 'image/jpeg',
  });
  assert.equal(empty.valid, false);

  const oversized = validateMediaDescriptor({
    name: 'huge.webp',
    size: 12 * 1024 * 1024,
    declaredMime: 'image/webp',
    magicMime: 'image/webp',
  });
  assert.equal(oversized.valid, false);

  const valid = validateMediaDescriptor({
    name: 'bench-photo.webp',
    size: 245_000,
    declaredMime: 'image/webp',
    magicMime: 'image/webp',
    expectedKind: 'image',
  });
  assert.deepEqual(valid, { valid: true, resolvedMime: 'image/webp' });
});

test('buildManagedFilename and resolveFolderIdForCategory follow KLARENCY MEDIA conventions', () => {
  const name = buildManagedFilename({
    originalName: 'IMG_001.JPG',
    category: 'project-cover',
    contextSlug: 'Campus App',
    year: 2026,
    uniqueSuffix: 'a1b2',
    extensionOverride: 'webp',
  });
  assert.equal(name, 'project-campus-app-cover-2026-a1b2.webp');

  const cvName = buildManagedFilename({
    originalName: 'resume final.pdf',
    category: 'cv',
    year: 2026,
    uniqueSuffix: 'z9',
  });
  assert.equal(cvName, 'clarence-cv-2026-z9.pdf');

  const folderMap: DriveFolderMap = {
    rootId: 'root',
    profileId: 'prof',
    projectsId: 'proj',
    projectCoversId: 'covers',
    projectScreenshotsId: 'shots',
    projectDemosId: 'demos',
    cvId: 'cv',
    researchId: 'res',
    experienceId: 'exp',
    certificatesId: 'cert',
    otherId: 'other',
  };
  assert.equal(resolveFolderIdForCategory('project-screenshot', folderMap), 'shots');
  assert.equal(resolveFolderIdForCategory('cv', folderMap), 'cv');
});

test('parseGoogleRangeHeader and Drive URL extraction work accurately', () => {
  assert.equal(parseGoogleRangeHeader(null), 0);
  assert.equal(parseGoogleRangeHeader('bytes=0-524287'), 524288);

  const urls = buildDrivePublicUrlCandidates('1AbCdEfGhIjK', 'image/webp');
  assert.equal(urls.primary, 'https://lh3.googleusercontent.com/d/1AbCdEfGhIjK=w1600');
  assert.equal(extractDriveFileIdFromUrl(urls.primary), '1AbCdEfGhIjK');
  assert.equal(extractDriveFileIdFromUrl(urls.fallback), '1AbCdEfGhIjK');
});

test('findMediaUsage, filterMediaFiles, duplicate detection, and stats compute accurately', () => {
  const rec1: MediaFileRecord = {
    id: 'm1',
    name: 'project-solar-cover-2026-ab12.webp',
    originalName: 'solar.webp',
    mimeType: 'image/webp',
    size: 120_000,
    driveFileId: 'drive1',
    driveFolderId: 'covers',
    category: 'project-cover',
    visibility: 'PUBLIC',
    uploadStatus: 'completed',
    storageProvider: 'google-drive',
    publicUrl: 'https://lh3.googleusercontent.com/d/drive1=w1600',
    deliveryStatus: 'verified',
    uploadedBy: 'uid1',
    createdAt: '2026-11-01T10:00:00Z',
    schemaVersion: 1,
  };
  const rec2: MediaFileRecord = {
    ...rec1,
    id: 'm2',
    name: 'clarence-cv-2026-cd34.pdf',
    originalName: 'cv.pdf',
    mimeType: 'application/pdf',
    size: 400_000,
    driveFileId: 'drive2',
    driveFolderId: 'cv',
    category: 'cv',
    visibility: 'PRIVATE',
    publicUrl: undefined,
    deliveryStatus: 'private',
    createdAt: '2026-11-02T10:00:00Z',
  };

  const projects: Project[] = [
    {
      id: 'p1',
      title: 'Solar Telemetry',
      slug: 'solar-telemetry',
      summary: 'Solar bench monitor',
      technologies: ['C++'],
      devStatus: 'Prototype',
      publishState: 'published',
      featured: true,
      sortOrder: 1,
      coverMediaId: 'm1',
      imageUrl: rec1.publicUrl,
      ownerId: 'uid1',
    },
  ];

  const profile: PublicProfile = {
    ownerName: 'Clarence L. Chilongo',
    headline: 'Computer Engineering Student',
    tagline: 'Think Beyond Code',
    location: 'Malawi',
    shortBio: 'Software and embedded developer.',
    cvEnabled: false,
    cvMediaId: 'm2',
  };

  const usage = findMediaUsage(rec1, { profile, projects, research: [], experiences: [] });
  assert.equal(usage.length, 1);
  assert.equal(usage[0].isPublished, true);

  assert.equal(
    findDuplicateMediaRecords([rec1, rec2], { originalName: 'cv.pdf', size: 400_000 }).length,
    1,
  );
  assert.equal(filterMediaFiles([rec1, rec2], { typeFilter: 'documents' }).length, 1);
  assert.equal(filterMediaFiles([rec1, rec2], { visibilityFilter: 'PUBLIC' }).length, 1);

  const stats = computeMediaLibraryStats([rec1, rec2]);
  assert.equal(stats.totalFiles, 2);
  assert.equal(stats.totalBytes, 520_000);
  assert.equal(stats.publicCount, 1);
  assert.equal(stats.privateCount, 1);

  assert.match(translateMediaError(new Error('401 Invalid Credentials')), /expired/i);
});
