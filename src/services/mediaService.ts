import {
  deleteDoc,
  doc,
  getDoc,
  serverTimestamp,
  setDoc,
  Timestamp,
  updateDoc,
} from 'firebase/firestore';
import type {
  DriveWorkspaceConfig,
  MediaCategory,
  MediaDeliveryStatus,
  MediaFileRecord,
  MediaVisibility,
} from '../types/portfolio';
import {
  buildManagedFilename,
  sanitizeDisplayFilename,
  translateMediaError,
} from '../utils/mediaLogic';
import { auth, db, handleFirestoreError, OperationType } from './firebase';
import { getInMemoryDriveToken, connectGoogleDrive } from './googleDriveAuth';
import { googleDriveProvider } from './googleDriveProvider';
import {
  addPendingMediaRecovery,
  removePendingMediaRecovery,
  type PendingMediaRecovery,
} from './indexedDbDrafts';
import type {
  ProviderAccountQuota,
  ProviderUploadHandle,
  ProviderUploadProgress,
} from './mediaProvider';
import { recordAuditLog } from './portfolioService';

function makeMediaId(): string {
  const stamp = Date.now().toString(36);
  const rand = Math.random().toString(36).slice(2, 8);
  return `media-${stamp}-${rand}`.replace(/[^a-zA-Z0-9_-]/g, '');
}

function assertOwnerAuthenticated(): { uid: string; email: string } {
  const user = auth.currentUser;
  if (!user || !user.emailVerified) {
    throw new Error('Verified KLARENCY administrator sign-in is required.');
  }
  return { uid: user.uid, email: user.email ?? 'owner' };
}

function assertDriveAccessToken(): string {
  const token = getInMemoryDriveToken();
  if (!token) {
    throw new Error('Google Drive is not connected for this session. Tap Connect Google Drive to continue.');
  }
  return token;
}

function toIso(val: unknown): string | undefined {
  if (!val) return undefined;
  if (val instanceof Timestamp) return val.toDate().toISOString();
  if (typeof val === 'string') return val;
  return undefined;
}

export function mapMediaDoc(id: string, data: Record<string, unknown>): MediaFileRecord {
  return {
    id,
    name: String(data.name ?? ''),
    originalName: String(data.originalName ?? ''),
    mimeType: (data.mimeType as MediaFileRecord['mimeType']) ?? 'image/jpeg',
    size: Number(data.size ?? 0),
    sha256: data.sha256 ? String(data.sha256) : undefined,
    width: typeof data.width === 'number' ? data.width : undefined,
    height: typeof data.height === 'number' ? data.height : undefined,
    driveFileId: String(data.driveFileId ?? ''),
    driveFolderId: String(data.driveFolderId ?? ''),
    drivePermissionId: data.drivePermissionId ? String(data.drivePermissionId) : undefined,
    category: (data.category as MediaCategory) ?? 'other',
    description: data.description ? String(data.description) : undefined,
    visibility: (data.visibility as MediaVisibility) ?? 'PRIVATE',
    uploadStatus: 'completed',
    storageProvider: 'google-drive',
    publicUrl: data.publicUrl ? String(data.publicUrl) : undefined,
    fallbackPublicUrl: data.fallbackPublicUrl ? String(data.fallbackPublicUrl) : undefined,
    deliveryStatus: (data.deliveryStatus as MediaDeliveryStatus) ?? 'private',
    deliveryError: data.deliveryError ? String(data.deliveryError) : undefined,
    uploadedBy: String(data.uploadedBy ?? ''),
    createdAt: toIso(data.createdAt),
    updatedAt: toIso(data.updatedAt),
    schemaVersion: Number(data.schemaVersion ?? 1),
  };
}

export async function loadStoredDriveConfig(): Promise<DriveWorkspaceConfig | null> {
  try {
    const snap = await getDoc(doc(db, 'siteContent', 'driveConfig'));
    if (!snap.exists()) return null;
    const data = snap.data();
    return {
      provider: 'google-drive',
      rootFolderName: String(data.rootFolderName ?? 'KLARENCY MEDIA'),
      folderIds: data.folderIds,
      connectedEmail: data.connectedEmail ? String(data.connectedEmail) : undefined,
      updatedAt: toIso(data.updatedAt),
    };
  } catch {
    return null;
  }
}

export async function connectAndInitDriveWorkspace(options?: {
  forceAccountChooser?: boolean;
}): Promise<{ config: DriveWorkspaceConfig; quota: ProviderAccountQuota }> {
  assertOwnerAuthenticated();
  const accessToken = await connectGoogleDrive(options);
  const existing = await loadStoredDriveConfig();
  const folderIds = await googleDriveProvider.ensureFolderHierarchy(
    accessToken,
    existing?.folderIds ?? null,
  );
  const quota = await googleDriveProvider.getAccountInfo(accessToken);

  const configPayload = {
    provider: 'google-drive' as const,
    rootFolderName: 'KLARENCY MEDIA',
    folderIds,
    connectedEmail: (quota.emailAddress || auth.currentUser?.email || '').slice(0, 160),
    updatedAt: serverTimestamp(),
  };

  try {
    await setDoc(doc(db, 'siteContent', 'driveConfig'), configPayload);
    await recordAuditLog(
      'connect',
      'driveConfig',
      'driveConfig',
      `Connected Google Drive workspace (${configPayload.connectedEmail || 'KLARENCY MEDIA'}).`,
    );
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, 'siteContent/driveConfig');
  }

  return {
    config: {
      provider: 'google-drive',
      rootFolderName: 'KLARENCY MEDIA',
      folderIds,
      connectedEmail: configPayload.connectedEmail,
      updatedAt: new Date().toISOString(),
    },
    quota,
  };
}

export async function fetchDriveAccountQuota(): Promise<ProviderAccountQuota> {
  assertOwnerAuthenticated();
  const token = assertDriveAccessToken();
  return googleDriveProvider.getAccountInfo(token);
}

async function ensureActiveWorkspace(
  knownConfig?: DriveWorkspaceConfig | null,
): Promise<{ accessToken: string; config: DriveWorkspaceConfig }> {
  assertOwnerAuthenticated();
  const accessToken = assertDriveAccessToken();
  const stored = knownConfig ?? (await loadStoredDriveConfig());

  if (stored?.folderIds?.rootId) {
    return { accessToken, config: stored };
  }

  const folderIds = await googleDriveProvider.ensureFolderHierarchy(accessToken, null);
  const quota = await googleDriveProvider.getAccountInfo(accessToken).catch(() => null);
  const connectedEmail = (quota?.emailAddress || auth.currentUser?.email || '').slice(0, 160);

  await setDoc(doc(db, 'siteContent', 'driveConfig'), {
    provider: 'google-drive',
    rootFolderName: 'KLARENCY MEDIA',
    folderIds,
    connectedEmail,
    updatedAt: serverTimestamp(),
  });

  return {
    accessToken,
    config: {
      provider: 'google-drive',
      rootFolderName: 'KLARENCY MEDIA',
      folderIds,
      connectedEmail,
    },
  };
}

export interface ManagedUploadHandle {
  pause: () => void;
  resume: () => void;
  cancel: () => void;
  promise: Promise<MediaFileRecord>;
}

export function startManagedMediaUpload(params: {
  file: File;
  category: MediaCategory;
  customName?: string;
  contextSlug?: string;
  description?: string;
  cropSquare?: boolean;
  makePublic?: boolean;
  existingConfig?: DriveWorkspaceConfig | null;
  onProgress: (progress: ProviderUploadProgress) => void;
}): ManagedUploadHandle {
  let innerHandle: ProviderUploadHandle | null = null;
  let cancelledBeforeStart = false;
  let pausedBeforeStart = false;

  const promise = (async (): Promise<MediaFileRecord> => {
    const owner = assertOwnerAuthenticated();
    const { accessToken, config } = await ensureActiveWorkspace(params.existingConfig);

    if (cancelledBeforeStart) {
      throw new Error('Upload cancelled by owner.');
    }

    const customManagedName = params.customName?.trim()
      ? sanitizeDisplayFilename(params.customName)
      : undefined;

    innerHandle = googleDriveProvider.startResumableUpload({
      accessToken,
      file: params.file,
      category: params.category,
      folders: config.folderIds,
      customName: customManagedName,
      contextSlug: params.contextSlug,
      cropSquare: params.cropSquare,
      onProgress: params.onProgress,
    });

    if (pausedBeforeStart) {
      innerHandle.pause();
    }

    const uploaded = await innerHandle.promise;
    const mediaId = makeMediaId();
    const cleanDescription = (params.description ?? '').trim().slice(0, 500);

    const firestorePayload = {
      name: uploaded.managedFileName.slice(0, 200),
      originalName: uploaded.originalName.slice(0, 240),
      mimeType: uploaded.mimeType,
      size: uploaded.size,
      ...(uploaded.sha256 ? { sha256: uploaded.sha256 } : {}),
      ...(uploaded.width ? { width: uploaded.width } : {}),
      ...(uploaded.height ? { height: uploaded.height } : {}),
      driveFileId: uploaded.driveFileId,
      driveFolderId: uploaded.driveFolderId,
      category: params.category,
      ...(cleanDescription ? { description: cleanDescription } : {}),
      visibility: 'PRIVATE' as const,
      uploadStatus: 'completed' as const,
      storageProvider: 'google-drive' as const,
      deliveryStatus: 'private' as const,
      uploadedBy: owner.uid,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
      schemaVersion: 1,
    };

    try {
      await setDoc(doc(db, 'mediaFiles', mediaId), firestorePayload);
    } catch (firestoreErr) {
      // Save recovery payload in IndexedDB so the owner never loses an already-uploaded Drive file
      await addPendingMediaRecovery({
        id: mediaId,
        name: uploaded.managedFileName,
        originalName: uploaded.originalName,
        mimeType: uploaded.mimeType,
        size: uploaded.size,
        sha256: uploaded.sha256,
        width: uploaded.width,
        height: uploaded.height,
        driveFileId: uploaded.driveFileId,
        driveFolderId: uploaded.driveFolderId,
        category: params.category,
        description: cleanDescription || undefined,
        createdAtMs: Date.now(),
      });
      throw new Error(
        `File uploaded to Google Drive (${uploaded.managedFileName}), but Firestore metadata could not be saved yet (${translateMediaError(firestoreErr)}). Open Media Library to recover this upload in 1 tap.`,
      );
    }

    let finalRecord: MediaFileRecord = {
      id: mediaId,
      name: uploaded.managedFileName,
      originalName: uploaded.originalName,
      mimeType: uploaded.mimeType,
      size: uploaded.size,
      sha256: uploaded.sha256,
      width: uploaded.width,
      height: uploaded.height,
      driveFileId: uploaded.driveFileId,
      driveFolderId: uploaded.driveFolderId,
      category: params.category,
      description: cleanDescription || undefined,
      visibility: 'PRIVATE',
      uploadStatus: 'completed',
      storageProvider: 'google-drive',
      deliveryStatus: 'private',
      uploadedBy: owner.uid,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      schemaVersion: 1,
    };

    await recordAuditLog(
      'upload',
      'media',
      mediaId,
      `Uploaded "${uploaded.managedFileName}" (${params.category}) to Google Drive.`,
    );

    if (params.makePublic) {
      finalRecord = await changeMediaVisibility(finalRecord, 'PUBLIC');
    }

    params.onProgress({
      state: 'completed',
      bytesTransferred: uploaded.size,
      totalBytes: uploaded.size,
      percent: 100,
      detailMessage:
        finalRecord.visibility === 'PUBLIC'
          ? 'Uploaded and verified for public portfolio delivery.'
          : 'Uploaded securely as Private to KLARENCY MEDIA.',
    });

    return finalRecord;
  })();

  return {
    pause: () => {
      pausedBeforeStart = true;
      innerHandle?.pause();
    },
    resume: () => {
      pausedBeforeStart = false;
      innerHandle?.resume();
    },
    cancel: () => {
      cancelledBeforeStart = true;
      innerHandle?.cancel();
    },
    promise,
  };
}

export async function recoverPendingMediaRecord(
  pending: PendingMediaRecovery,
): Promise<MediaFileRecord> {
  const owner = assertOwnerAuthenticated();
  const token = assertDriveAccessToken();
  const existsInDrive = await googleDriveProvider.verifyFileExists(token, pending.driveFileId);
  if (!existsInDrive) {
    await removePendingMediaRecovery(pending.driveFileId);
    throw new Error('The file no longer exists in Google Drive; stale recovery item cleared.');
  }

  await setDoc(doc(db, 'mediaFiles', pending.id), {
    name: pending.name.slice(0, 200),
    originalName: pending.originalName.slice(0, 240),
    mimeType: pending.mimeType,
    size: pending.size,
    ...(pending.sha256 ? { sha256: pending.sha256 } : {}),
    ...(pending.width ? { width: pending.width } : {}),
    ...(pending.height ? { height: pending.height } : {}),
    driveFileId: pending.driveFileId,
    driveFolderId: pending.driveFolderId,
    category: pending.category,
    ...(pending.description ? { description: pending.description.slice(0, 500) } : {}),
    visibility: 'PRIVATE',
    uploadStatus: 'completed',
    storageProvider: 'google-drive',
    deliveryStatus: 'private',
    uploadedBy: owner.uid,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
    schemaVersion: 1,
  });

  await removePendingMediaRecovery(pending.driveFileId);
  await recordAuditLog(
    'recover',
    'media',
    pending.id,
    `Recovered Google Drive media record "${pending.name}".`,
  );

  return {
    id: pending.id,
    name: pending.name,
    originalName: pending.originalName,
    mimeType: pending.mimeType,
    size: pending.size,
    sha256: pending.sha256,
    width: pending.width,
    height: pending.height,
    driveFileId: pending.driveFileId,
    driveFolderId: pending.driveFolderId,
    category: pending.category,
    description: pending.description,
    visibility: 'PRIVATE',
    uploadStatus: 'completed',
    storageProvider: 'google-drive',
    deliveryStatus: 'private',
    uploadedBy: owner.uid,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    schemaVersion: 1,
  };
}

export async function changeMediaVisibility(
  record: MediaFileRecord,
  targetVisibility: MediaVisibility,
): Promise<MediaFileRecord> {
  assertOwnerAuthenticated();
  const token = assertDriveAccessToken();

  if (targetVisibility === 'PUBLIC') {
    const perm = await googleDriveProvider.setPublicReadable(
      token,
      record.driveFileId,
      true,
      record.drivePermissionId,
    );
    const check = await googleDriveProvider.verifyPublicDelivery(
      record.driveFileId,
      record.mimeType,
    );

    const patchData = {
      visibility: 'PUBLIC' as const,
      drivePermissionId: perm.permissionId ?? '',
      publicUrl: check.publicUrl ?? '',
      fallbackPublicUrl: check.fallbackPublicUrl ?? '',
      deliveryStatus: check.deliveryStatus,
      deliveryError: check.error ? check.error.slice(0, 400) : '',
      updatedAt: serverTimestamp(),
    };

    try {
      await updateDoc(doc(db, 'mediaFiles', record.id), patchData);
      await recordAuditLog(
        'publish',
        'media',
        record.id,
        `Set "${record.name}" visibility to PUBLIC (delivery: ${check.deliveryStatus}).`,
      );
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `mediaFiles/${record.id}`);
    }

    return {
      ...record,
      visibility: 'PUBLIC',
      drivePermissionId: perm.permissionId,
      publicUrl: check.publicUrl,
      fallbackPublicUrl: check.fallbackPublicUrl,
      deliveryStatus: check.deliveryStatus,
      deliveryError: check.error,
      updatedAt: new Date().toISOString(),
    };
  }

  await googleDriveProvider.setPublicReadable(
    token,
    record.driveFileId,
    false,
    record.drivePermissionId,
  );

  const patchData = {
    visibility: targetVisibility,
    drivePermissionId: '',
    publicUrl: '',
    fallbackPublicUrl: '',
    deliveryStatus: 'private' as const,
    deliveryError: '',
    updatedAt: serverTimestamp(),
  };

  try {
    await updateDoc(doc(db, 'mediaFiles', record.id), patchData);
    await recordAuditLog(
      'visibility',
      'media',
      record.id,
      `Set "${record.name}" visibility to ${targetVisibility}.`,
    );
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, `mediaFiles/${record.id}`);
  }

  return {
    ...record,
    visibility: targetVisibility,
    drivePermissionId: undefined,
    publicUrl: undefined,
    fallbackPublicUrl: undefined,
    deliveryStatus: 'private',
    deliveryError: undefined,
    updatedAt: new Date().toISOString(),
  };
}

export async function updateMediaMetadata(
  record: MediaFileRecord,
  updates: { name?: string; description?: string; category?: MediaCategory },
): Promise<MediaFileRecord> {
  assertOwnerAuthenticated();
  const nextName = updates.name ? sanitizeDisplayFilename(updates.name).slice(0, 200) : record.name;
  const nextDescription =
    updates.description !== undefined ? updates.description.trim().slice(0, 500) : record.description ?? '';
  const nextCategory = updates.category ?? record.category;

  if (nextName !== record.name) {
    const token = assertDriveAccessToken();
    await googleDriveProvider.renameFile(token, record.driveFileId, nextName);
  }

  try {
    await updateDoc(doc(db, 'mediaFiles', record.id), {
      name: nextName,
      category: nextCategory,
      description: nextDescription,
      driveFolderId: record.driveFolderId,
      updatedAt: serverTimestamp(),
    });
    await recordAuditLog(
      'update',
      'media',
      record.id,
      `Updated metadata for media "${nextName}" (${nextCategory}).`,
    );
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, `mediaFiles/${record.id}`);
  }

  return {
    ...record,
    name: nextName,
    category: nextCategory,
    description: nextDescription || undefined,
    updatedAt: new Date().toISOString(),
  };
}

export async function replaceMediaAsset(params: {
  existingRecord: MediaFileRecord;
  file: File;
  cropSquare?: boolean;
  deleteOldDriveFile?: boolean;
  existingConfig?: DriveWorkspaceConfig | null;
  onProgress: (progress: ProviderUploadProgress) => void;
}): Promise<MediaFileRecord> {
  assertOwnerAuthenticated();
  const { accessToken, config } = await ensureActiveWorkspace(params.existingConfig);

  const managedName = buildManagedFilename({
    originalName: params.file.name,
    category: params.existingRecord.category,
  });

  const handle = googleDriveProvider.startResumableUpload({
    accessToken,
    file: params.file,
    category: params.existingRecord.category,
    folders: config.folderIds,
    customName: managedName,
    cropSquare: params.cropSquare,
    onProgress: params.onProgress,
  });

  const uploaded = await handle.promise;
  let visibility = params.existingRecord.visibility;
  let drivePermissionId: string | undefined;
  let publicUrl = '';
  let fallbackPublicUrl = '';
  let deliveryStatus: MediaDeliveryStatus = 'private';
  let deliveryError = '';

  if (visibility === 'PUBLIC') {
    const perm = await googleDriveProvider.setPublicReadable(tokenOrThrow(accessToken), uploaded.driveFileId, true);
    const check = await googleDriveProvider.verifyPublicDelivery(uploaded.driveFileId, uploaded.mimeType);
    drivePermissionId = perm.permissionId;
    publicUrl = check.publicUrl ?? '';
    fallbackPublicUrl = check.fallbackPublicUrl ?? '';
    deliveryStatus = check.deliveryStatus;
    deliveryError = check.error ?? '';
  }

  try {
    await updateDoc(doc(db, 'mediaFiles', params.existingRecord.id), {
      name: uploaded.managedFileName.slice(0, 200),
      originalName: uploaded.originalName.slice(0, 240),
      mimeType: uploaded.mimeType,
      size: uploaded.size,
      ...(uploaded.sha256 ? { sha256: uploaded.sha256 } : {}),
      ...(uploaded.width ? { width: uploaded.width } : {}),
      ...(uploaded.height ? { height: uploaded.height } : {}),
      driveFileId: uploaded.driveFileId,
      driveFolderId: uploaded.driveFolderId,
      drivePermissionId: drivePermissionId ?? '',
      publicUrl,
      fallbackPublicUrl,
      deliveryStatus,
      deliveryError: deliveryError.slice(0, 400),
      updatedAt: serverTimestamp(),
    });

    if (params.deleteOldDriveFile && params.existingRecord.driveFileId) {
      await googleDriveProvider
        .deleteFile(accessToken, params.existingRecord.driveFileId)
        .catch(() => {});
    }

    await recordAuditLog(
      'replace',
      'media',
      params.existingRecord.id,
      `Replaced file content for "${params.existingRecord.name}" with "${uploaded.managedFileName}".`,
    );
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, `mediaFiles/${params.existingRecord.id}`);
  }

  return {
    ...params.existingRecord,
    name: uploaded.managedFileName,
    originalName: uploaded.originalName,
    mimeType: uploaded.mimeType,
    size: uploaded.size,
    sha256: uploaded.sha256,
    width: uploaded.width,
    height: uploaded.height,
    driveFileId: uploaded.driveFileId,
    driveFolderId: uploaded.driveFolderId,
    drivePermissionId,
    publicUrl: publicUrl || undefined,
    fallbackPublicUrl: fallbackPublicUrl || undefined,
    deliveryStatus,
    deliveryError: deliveryError || undefined,
    updatedAt: new Date().toISOString(),
  };
}

function tokenOrThrow(token: string): string {
  if (!token) throw new Error('Drive session expired.');
  return token;
}

export async function verifyMediaDeliveryAndExistence(
  record: MediaFileRecord,
): Promise<MediaFileRecord> {
  assertOwnerAuthenticated();
  const token = getInMemoryDriveToken();

  if (token) {
    const exists = await googleDriveProvider.verifyFileExists(token, record.driveFileId);
    if (!exists) {
      await updateDoc(doc(db, 'mediaFiles', record.id), {
        deliveryStatus: 'failed',
        deliveryError: 'File was moved to trash or deleted directly inside Google Drive.',
        updatedAt: serverTimestamp(),
      });
      return {
        ...record,
        deliveryStatus: 'failed',
        deliveryError: 'File was moved to trash or deleted directly inside Google Drive.',
      };
    }
  }

  if (record.visibility === 'PUBLIC') {
    const check = await googleDriveProvider.verifyPublicDelivery(record.driveFileId, record.mimeType);
    await updateDoc(doc(db, 'mediaFiles', record.id), {
      publicUrl: check.publicUrl ?? '',
      fallbackPublicUrl: check.fallbackPublicUrl ?? '',
      deliveryStatus: check.deliveryStatus,
      deliveryError: (check.error ?? '').slice(0, 400),
      updatedAt: serverTimestamp(),
    });
    return {
      ...record,
      publicUrl: check.publicUrl,
      fallbackPublicUrl: check.fallbackPublicUrl,
      deliveryStatus: check.deliveryStatus,
      deliveryError: check.error,
    };
  }

  return record;
}

export async function deleteMediaAsset(
  record: MediaFileRecord,
  options?: { deleteInDrive?: boolean },
): Promise<void> {
  assertOwnerAuthenticated();
  const deleteInDrive = options?.deleteInDrive ?? true;

  if (deleteInDrive) {
    const token = assertDriveAccessToken();
    await googleDriveProvider.deleteFile(token, record.driveFileId);
  }

  try {
    await deleteDoc(doc(db, 'mediaFiles', record.id));
    await recordAuditLog(
      'delete',
      'media',
      record.id,
      `Deleted media "${record.name}" (${deleteInDrive ? 'removed from Google Drive + Firestore' : 'removed metadata only'}).`,
    );
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, `mediaFiles/${record.id}`);
  }
}

export async function getMediaPreviewUrl(
  record: MediaFileRecord,
): Promise<{ url: string; isObjectUrl: boolean }> {
  if (record.visibility === 'PUBLIC' && record.publicUrl) {
    return { url: record.publicUrl, isObjectUrl: false };
  }
  assertOwnerAuthenticated();
  const token = assertDriveAccessToken();
  const blobUrl = await googleDriveProvider.fetchPrivatePreviewBlobUrl(token, record.driveFileId);
  return { url: blobUrl, isObjectUrl: true };
}
