import type {
  DriveFolderMap,
  ExperienceEntry,
  MediaCategory,
  MediaFileRecord,
  MediaVisibility,
  Project,
  PublicProfile,
  ResearchEntry,
} from '../types/portfolio';

export const MEDIA_LIMITS = {
  maxImageBytes: 10 * 1024 * 1024, // 10 MB
  maxDocumentBytes: 15 * 1024 * 1024, // 15 MB
  resumableChunkBytes: 512 * 1024, // 512 KB (2x Google 256 KB minimum)
  maxImageDimensionPx: 1800,
  portraitCropSizePx: 1024,
} as const;

export const ALLOWED_IMAGE_MIME_TYPES = [
  'image/jpeg',
  'image/png',
  'image/webp',
] as const;

export const ALLOWED_DOCUMENT_MIME_TYPES = ['application/pdf'] as const;

export const ALL_ALLOWED_MIME_TYPES = [
  ...ALLOWED_IMAGE_MIME_TYPES,
  ...ALLOWED_DOCUMENT_MIME_TYPES,
] as const;

export type SupportedMediaMime = (typeof ALL_ALLOWED_MIME_TYPES)[number];

const EXTENSION_MIME_MAP: Record<string, SupportedMediaMime> = {
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  png: 'image/png',
  webp: 'image/webp',
  pdf: 'application/pdf',
};

export function inspectFileMagicBytes(bytes: Uint8Array): SupportedMediaMime | null {
  if (bytes.length < 4) return null;

  // JPEG: FF D8 FF
  if (bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) {
    return 'image/jpeg';
  }

  // PNG: 89 50 4E 47 0D 0A 1A 0A
  if (
    bytes.length >= 8 &&
    bytes[0] === 0x89 &&
    bytes[1] === 0x50 &&
    bytes[2] === 0x4e &&
    bytes[3] === 0x47 &&
    bytes[4] === 0x0d &&
    bytes[5] === 0x0a &&
    bytes[6] === 0x1a &&
    bytes[7] === 0x0a
  ) {
    return 'image/png';
  }

  // WebP: RIFF....WEBP
  if (
    bytes.length >= 12 &&
    bytes[0] === 0x52 &&
    bytes[1] === 0x49 &&
    bytes[2] === 0x46 &&
    bytes[3] === 0x46 &&
    bytes[8] === 0x57 &&
    bytes[9] === 0x45 &&
    bytes[10] === 0x42 &&
    bytes[11] === 0x50
  ) {
    return 'image/webp';
  }

  // PDF: %PDF
  if (bytes[0] === 0x25 && bytes[1] === 0x50 && bytes[2] === 0x44 && bytes[3] === 0x46) {
    return 'application/pdf';
  }

  return null;
}

export function validateMediaDescriptor(params: {
  name: string;
  size: number;
  declaredMime: string;
  magicMime: SupportedMediaMime | null;
  expectedKind?: 'image' | 'pdf' | 'any';
}): { valid: true; resolvedMime: SupportedMediaMime } | { valid: false; error: string } {
  if (!params.name.trim()) {
    return { valid: false, error: 'Selected file does not have a valid filename.' };
  }
  if (params.size <= 0) {
    return { valid: false, error: 'The selected file is empty (0 bytes) and cannot be uploaded.' };
  }

  const ext = params.name.split('.').pop()?.toLowerCase() ?? '';
  const extMime = EXTENSION_MIME_MAP[ext];
  if (!extMime) {
    return {
      valid: false,
      error: 'Unsupported file extension. Allowed formats: JPEG, JPG, PNG, WebP, and PDF.',
    };
  }

  if (!params.magicMime) {
    return {
      valid: false,
      error: 'The file appears corrupted or does not match a valid JPEG, PNG, WebP, or PDF signature.',
    };
  }

  if (params.magicMime !== extMime) {
    return {
      valid: false,
      error: `File extension (.${ext}) does not match the actual file content (${params.magicMime}). Upload rejected for safety.`,
    };
  }

  if (
    params.declaredMime &&
    ALL_ALLOWED_MIME_TYPES.includes(params.declaredMime as SupportedMediaMime) &&
    params.declaredMime !== params.magicMime
  ) {
    return {
      valid: false,
      error: 'Declared MIME type does not match actual file signature.',
    };
  }

  if (params.expectedKind === 'image' && params.magicMime === 'application/pdf') {
    return { valid: false, error: 'Please select an image file (JPEG, PNG, or WebP).' };
  }
  if (params.expectedKind === 'pdf' && params.magicMime !== 'application/pdf') {
    return { valid: false, error: 'Please select a PDF document (.pdf).' };
  }

  const maxLimit =
    params.magicMime === 'application/pdf'
      ? MEDIA_LIMITS.maxDocumentBytes
      : MEDIA_LIMITS.maxImageBytes;

  if (params.size > maxLimit) {
    const maxMb = Math.round(maxLimit / (1024 * 1024));
    return {
      valid: false,
      error: `File exceeds the ${maxMb} MB limit (${formatBytes(params.size)}). Choose a smaller file.`,
    };
  }

  return { valid: true, resolvedMime: params.magicMime };
}

export function sanitizeDisplayFilename(raw: string): string {
  return (
    raw
      .replace(/[/\\?%*:|"<>]/g, '-')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '')
      .slice(0, 120) || 'media-asset'
  );
}

export function buildManagedFilename(params: {
  originalName: string;
  category: MediaCategory;
  contextSlug?: string;
  year?: number;
  uniqueSuffix?: string;
  extensionOverride?: string;
}): string {
  const year = params.year ?? new Date().getFullYear();
  const suffix =
    params.uniqueSuffix ?? Math.random().toString(36).slice(2, 6).replace(/[^a-z0-9]/g, 'x');
  const ext = (
    params.extensionOverride ||
    params.originalName.split('.').pop()?.toLowerCase().replace(/[^a-z0-9]/g, '') ||
    'bin'
  ).slice(0, 8);

  const rawStem = params.contextSlug
    ? params.contextSlug
    : params.originalName.replace(/\.[^/.]+$/, '');
  const cleanStem = rawStem
    .toLowerCase()
    .replace(/[^a-z0-9-]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 36) || 'asset';

  const prefixMap: Record<MediaCategory, string> = {
    profile: 'profile-clarence',
    'project-cover': `project-${cleanStem}-cover`,
    'project-screenshot': `project-${cleanStem}-shot`,
    'project-demo': `project-${cleanStem}-demo`,
    cv: 'clarence-cv',
    research: `research-${cleanStem}`,
    experience: `experience-${cleanStem}`,
    certificate: `certificate-${cleanStem}`,
    other: `media-${cleanStem}`,
  };

  return `${prefixMap[params.category]}-${year}-${suffix}.${ext}`;
}

export function resolveFolderIdForCategory(
  category: MediaCategory,
  folders: DriveFolderMap,
): string {
  switch (category) {
    case 'profile':
      return folders.profileId;
    case 'project-cover':
      return folders.projectCoversId;
    case 'project-screenshot':
      return folders.projectScreenshotsId;
    case 'project-demo':
      return folders.projectDemosId;
    case 'cv':
      return folders.cvId;
    case 'research':
      return folders.researchId;
    case 'experience':
      return folders.experienceId;
    case 'certificate':
      return folders.certificatesId;
    default:
      return folders.otherId;
  }
}

export function parseGoogleRangeHeader(rangeHeader: string | null): number {
  if (!rangeHeader) return 0;
  const match = /bytes=\d+-(\d+)/i.exec(rangeHeader);
  if (!match) return 0;
  const endByte = Number.parseInt(match[1], 10);
  return Number.isFinite(endByte) && endByte >= 0 ? endByte + 1 : 0;
}

export function buildDrivePublicUrlCandidates(
  driveFileId: string,
  mimeType: string,
): { primary: string; fallback: string; candidates: string[] } {
  const id = encodeURIComponent(driveFileId.trim());
  if (mimeType === 'application/pdf') {
    const downloadUrl = `https://drive.google.com/uc?export=download&id=${id}`;
    const previewUrl = `https://drive.google.com/file/d/${id}/preview`;
    return {
      primary: downloadUrl,
      fallback: previewUrl,
      candidates: [downloadUrl, previewUrl],
    };
  }
  const lh3 = `https://lh3.googleusercontent.com/d/${id}=w1600`;
  const thumbProxy = `https://drive.google.com/thumbnail?id=${id}&sz=w1600`;
  const ucView = `https://drive.google.com/uc?export=view&id=${id}`;
  return {
    primary: lh3,
    fallback: thumbProxy,
    candidates: [lh3, thumbProxy, ucView],
  };
}

export function extractDriveFileIdFromUrl(rawUrl?: string): string | null {
  if (!rawUrl) return null;
  const trimmed = rawUrl.trim();
  const lh3Match = /lh3\.googleusercontent\.com\/d\/([a-zA-Z0-9_-]+)/.exec(trimmed);
  if (lh3Match) return lh3Match[1];
  const driveIdParam = /[?&]id=([a-zA-Z0-9_-]+)/.exec(trimmed);
  if (driveIdParam) return driveIdParam[1];
  const drivePathMatch = /drive\.google\.com\/file\/d\/([a-zA-Z0-9_-]+)/.exec(trimmed);
  if (drivePathMatch) return drivePathMatch[1];
  return null;
}

export function findDuplicateMediaRecords(
  records: MediaFileRecord[],
  candidate: { originalName: string; size: number; sha256?: string; category?: MediaCategory },
): MediaFileRecord[] {
  return records.filter((rec) => {
    if (candidate.sha256 && rec.sha256 && rec.sha256 === candidate.sha256) {
      return true;
    }
    const sameNameAndSize =
      rec.originalName.toLowerCase() === candidate.originalName.toLowerCase() &&
      rec.size === candidate.size;
    if (candidate.category) {
      return sameNameAndSize && rec.category === candidate.category;
    }
    return sameNameAndSize;
  });
}

export interface MediaUsageReference {
  kind: 'profile' | 'project' | 'research' | 'experience';
  id: string;
  title: string;
  role: string;
  isPublished: boolean;
}

export function findMediaUsage(
  media: MediaFileRecord,
  context: {
    profile: PublicProfile;
    projects: Project[];
    research: ResearchEntry[];
    experiences: ExperienceEntry[];
  },
): MediaUsageReference[] {
  const refs: MediaUsageReference[] = [];
  const matchesUrl = (url?: string) =>
    Boolean(
      url &&
        ((media.publicUrl && url === media.publicUrl) ||
          (media.fallbackPublicUrl && url === media.fallbackPublicUrl) ||
          extractDriveFileIdFromUrl(url) === media.driveFileId),
    );

  if (context.profile.portraitMediaId === media.id || matchesUrl(context.profile.portraitUrl)) {
    refs.push({
      kind: 'profile',
      id: 'publicProfile',
      title: 'Owner Portrait',
      role: 'Hero Portrait',
      isPublished: true,
    });
  }

  if (context.profile.cvMediaId === media.id || matchesUrl(context.profile.cvUrl)) {
    refs.push({
      kind: 'profile',
      id: 'publicProfile-cv',
      title: 'Curriculum Vitae',
      role: context.profile.cvEnabled ? 'Public CV Download' : 'Stored CV (Hidden)',
      isPublished: Boolean(context.profile.cvEnabled),
    });
  }

  for (const proj of context.projects) {
    if (proj.publishState === 'trashed') continue;
    const isCover = proj.coverMediaId === media.id || matchesUrl(proj.imageUrl);
    const isGallery =
      (proj.galleryMediaIds ?? []).includes(media.id) ||
      (proj.galleryImageUrls ?? []).some((u) => matchesUrl(u));

    if (isCover || isGallery) {
      refs.push({
        kind: 'project',
        id: proj.id,
        title: proj.title,
        role: isCover ? 'Project Cover' : 'Project Screenshot',
        isPublished: proj.publishState === 'published',
      });
    }
  }

  for (const item of context.research) {
    if (item.documentMediaId === media.id || matchesUrl(item.documentUrl)) {
      refs.push({
        kind: 'research',
        id: item.id,
        title: item.title,
        role: 'Research Document',
        isPublished: item.publishState === 'published',
      });
    }
  }

  for (const exp of context.experiences) {
    if (exp.certificateMediaId === media.id || matchesUrl(exp.verificationUrl)) {
      refs.push({
        kind: 'experience',
        id: exp.id,
        title: exp.title,
        role: 'Credential Document',
        isPublished: exp.publishState === 'published',
      });
    }
  }

  return refs;
}

export type MediaLibrarySort = 'newest' | 'oldest' | 'name' | 'size';

export function filterMediaFiles(
  records: MediaFileRecord[],
  options: {
    query?: string;
    typeFilter?: 'all' | 'images' | 'documents';
    categoryFilter?: MediaCategory | 'all' | 'projects';
    visibilityFilter?: MediaVisibility | 'all';
    sort?: MediaLibrarySort;
  },
): MediaFileRecord[] {
  const q = (options.query ?? '').trim().toLowerCase();
  const typeFilter = options.typeFilter ?? 'all';
  const categoryFilter = options.categoryFilter ?? 'all';
  const visibilityFilter = options.visibilityFilter ?? 'all';
  const sort = options.sort ?? 'newest';

  const filtered = records
    .filter((item) => {
      if (typeFilter === 'images') return item.mimeType !== 'application/pdf';
      if (typeFilter === 'documents') return item.mimeType === 'application/pdf';
      return true;
    })
    .filter((item) => {
      if (categoryFilter === 'all') return true;
      if (categoryFilter === 'projects') {
        return (
          item.category === 'project-cover' ||
          item.category === 'project-screenshot' ||
          item.category === 'project-demo'
        );
      }
      return item.category === categoryFilter;
    })
    .filter((item) => {
      if (visibilityFilter === 'all') return true;
      return item.visibility === visibilityFilter;
    })
    .filter((item) => {
      if (!q) return true;
      return (
        item.name.toLowerCase().includes(q) ||
        item.originalName.toLowerCase().includes(q) ||
        item.category.toLowerCase().includes(q) ||
        (item.description ?? '').toLowerCase().includes(q)
      );
    });

  return [...filtered].sort((a, b) => {
    if (sort === 'name') return a.name.localeCompare(b.name);
    if (sort === 'size') return b.size - a.size;
    const ta = a.createdAt ? Date.parse(a.createdAt) : 0;
    const tb = b.createdAt ? Date.parse(b.createdAt) : 0;
    return sort === 'oldest' ? ta - tb : tb - ta;
  });
}

export interface MediaLibraryStats {
  totalFiles: number;
  totalBytes: number;
  imageCount: number;
  documentCount: number;
  publicCount: number;
  unpublishedCount: number;
  privateCount: number;
  byCategory: Record<MediaCategory, number>;
}

export function computeMediaLibraryStats(records: MediaFileRecord[]): MediaLibraryStats {
  const byCategory: Record<MediaCategory, number> = {
    profile: 0,
    'project-cover': 0,
    'project-screenshot': 0,
    'project-demo': 0,
    cv: 0,
    research: 0,
    experience: 0,
    certificate: 0,
    other: 0,
  };

  let totalBytes = 0;
  let imageCount = 0;
  let documentCount = 0;
  let publicCount = 0;
  let unpublishedCount = 0;
  let privateCount = 0;

  for (const item of records) {
    totalBytes += item.size || 0;
    if (item.mimeType === 'application/pdf') documentCount += 1;
    else imageCount += 1;

    if (item.visibility === 'PUBLIC') publicCount += 1;
    else if (item.visibility === 'UNPUBLISHED') unpublishedCount += 1;
    else privateCount += 1;

    if (byCategory[item.category] !== undefined) {
      byCategory[item.category] += 1;
    }
  }

  return {
    totalFiles: records.length,
    totalBytes,
    imageCount,
    documentCount,
    publicCount,
    unpublishedCount,
    privateCount,
    byCategory,
  };
}

export function formatBytes(bytes: number): string {
  if (!Number.isFinite(bytes) || bytes <= 0) return '0 B';
  const units = ['B', 'KB', 'MB', 'GB'];
  const idx = Math.min(units.length - 1, Math.floor(Math.log(bytes) / Math.log(1024)));
  const value = bytes / Math.pow(1024, idx);
  return `${idx === 0 ? value : value.toFixed(1)} ${units[idx]}`;
}

export function translateMediaError(error: unknown): string {
  const raw = error instanceof Error ? error.message : String(error ?? '');
  const lower = raw.toLowerCase();

  if (lower.includes('401') || lower.includes('invalid credentials') || lower.includes('token')) {
    return 'Google Drive authorization has expired or is invalid. Reconnect Google Drive and retry.';
  }
  if (lower.includes('accessnotconfigured') || lower.includes('api has not been used') || lower.includes('disabled')) {
    return 'Google Drive API v3 is not enabled on the Google Cloud project yet. Enable drive.googleapis.com and retry.';
  }
  if (lower.includes('insufficient') || lower.includes('403') && lower.includes('scope')) {
    return 'Insufficient Google Drive permission. Reconnect and grant Drive file access when prompted.';
  }
  if (lower.includes('storagequotaexceeded') || lower.includes('quota')) {
    return 'Google Drive storage quota is full or rate-limited. Free space in Google Drive and retry.';
  }
  if (lower.includes('sharing') || lower.includes('cannotshare') || lower.includes('domainpolicy')) {
    return 'Public link sharing is blocked by this Google account or organization policy. Keep the file private or use an approved public image delivery URL.';
  }
  if (lower.includes('404') || lower.includes('not found') || lower.includes('410')) {
    return 'The Drive file or resumable upload session could not be found (it may have expired or been deleted in Drive). Start a fresh upload.';
  }
  if (lower.includes('offline') || lower.includes('failed to fetch') || lower.includes('network')) {
    return 'Network connection interrupted. Your session details are preserved — reconnect and tap Resume or Retry.';
  }
  if (lower.includes('permission-denied') || lower.includes('insufficient permissions')) {
    return 'Firestore rejected this metadata write. Verify you are signed in as the authorized portfolio owner.';
  }
  return raw || 'An unexpected media error occurred. Please retry.';
}
