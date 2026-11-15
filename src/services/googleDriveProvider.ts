import type { DriveFolderMap, MediaCategory } from '../types/portfolio';
import {
  buildDrivePublicUrlCandidates,
  buildManagedFilename,
  inspectFileMagicBytes,
  MEDIA_LIMITS,
  parseGoogleRangeHeader,
  resolveFolderIdForCategory,
  sanitizeDisplayFilename,
  translateMediaError,
  validateMediaDescriptor,
  type SupportedMediaMime,
} from '../utils/mediaLogic';
import { markDriveTokenExpired } from './googleDriveAuth';
import type {
  MediaStorageProvider,
  ProviderAccountQuota,
  ProviderUploadHandle,
  ProviderUploadedAsset,
  ProviderUploadProgress,
  PublicDeliveryCheckResult,
} from './mediaProvider';

const DRIVE_FILES_API = 'https://www.googleapis.com/drive/v3/files';
const DRIVE_UPLOAD_API = 'https://www.googleapis.com/upload/drive/v3/files';
const DRIVE_ABOUT_API = 'https://www.googleapis.com/drive/v3/about';
const FOLDER_MIME = 'application/vnd.google-apps.folder';

async function computeSha256Hex(blob: Blob): Promise<string | undefined> {
  try {
    if (typeof crypto === 'undefined' || !crypto.subtle) return undefined;
    const buffer = await blob.arrayBuffer();
    const digest = await crypto.subtle.digest('SHA-256', buffer);
    return Array.from(new Uint8Array(digest))
      .map((b) => b.toString(16).padStart(2, '0'))
      .join('');
  } catch {
    return undefined;
  }
}

async function readLeadingBytes(file: File, count = 16): Promise<Uint8Array> {
  const slice = file.slice(0, count);
  const buffer = await slice.arrayBuffer();
  return new Uint8Array(buffer);
}

/**
 * Optimizes image files before upload:
 * - Resizes oversized images to max 1800px (or 1024x1024 square when cropSquare=true)
 * - Strips EXIF/GPS metadata by drawing to an HTMLCanvasElement
 * - Preserves WebP/PNG/JPEG cleanly without compressing PDFs
 */
export async function prepareImagePayload(
  file: File,
  cropSquare = false,
): Promise<{
  blob: Blob;
  mimeType: 'image/jpeg' | 'image/png' | 'image/webp';
  width: number;
  height: number;
  ext: string;
}> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const objectUrl = URL.createObjectURL(file);

    img.onload = () => {
      URL.revokeObjectURL(objectUrl);

      let srcX = 0;
      let srcY = 0;
      let srcW = img.naturalWidth || img.width;
      let srcH = img.naturalHeight || img.height;
      let outW = srcW;
      let outH = srcH;

      if (cropSquare) {
        const minSide = Math.min(srcW, srcH);
        srcX = Math.floor((srcW - minSide) / 2);
        srcY = Math.floor((srcH - minSide) / 2);
        srcW = minSide;
        srcH = minSide;
        const target = Math.min(minSide, MEDIA_LIMITS.portraitCropSizePx);
        outW = target;
        outH = target;
      } else if (srcW > MEDIA_LIMITS.maxImageDimensionPx || srcH > MEDIA_LIMITS.maxImageDimensionPx) {
        const scale = Math.min(
          MEDIA_LIMITS.maxImageDimensionPx / srcW,
          MEDIA_LIMITS.maxImageDimensionPx / srcH,
        );
        outW = Math.max(1, Math.round(srcW * scale));
        outH = Math.max(1, Math.round(srcH * scale));
      }

      const canvas = document.createElement('canvas');
      canvas.width = outW;
      canvas.height = outH;
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        reject(new Error('Could not initialize image optimizer in this browser.'));
        return;
      }

      ctx.drawImage(img, srcX, srcY, srcW, srcH, 0, 0, outW, outH);

      const preferredMime: 'image/jpeg' | 'image/png' | 'image/webp' =
        file.type === 'image/png'
          ? 'image/png'
          : file.type === 'image/webp'
            ? 'image/webp'
            : 'image/jpeg';

      canvas.toBlob(
        (blob) => {
          if (!blob) {
            reject(new Error('Image optimization failed. Please choose another file.'));
            return;
          }
          const actualMime = (
            blob.type === 'image/png' || blob.type === 'image/webp' || blob.type === 'image/jpeg'
              ? blob.type
              : preferredMime
          ) as 'image/jpeg' | 'image/png' | 'image/webp';
          const ext = actualMime === 'image/png' ? 'png' : actualMime === 'image/webp' ? 'webp' : 'jpg';
          resolve({ blob, mimeType: actualMime, width: outW, height: outH, ext });
        },
        preferredMime,
        0.86,
      );
    };

    img.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      reject(new Error('Could not decode the selected image. The file may be corrupted.'));
    };

    img.src = objectUrl;
  });
}

async function driveJsonFetch<T>(
  url: string,
  accessToken: string,
  init: RequestInit = {},
): Promise<T> {
  const response = await fetch(url, {
    ...init,
    headers: {
      Authorization: `Bearer ${accessToken}`,
      ...(init.headers || {}),
    },
  });

  if (response.status === 401) {
    markDriveTokenExpired();
    throw new Error('401 Invalid Credentials: Google Drive authorization expired.');
  }

  if (!response.ok) {
    let detail = `Google Drive request failed (${response.status}).`;
    try {
      const body = (await response.json()) as {
        error?: { message?: string; errors?: Array<{ reason?: string }> };
      };
      const reason = body?.error?.errors?.[0]?.reason;
      const msg = body?.error?.message;
      detail = [reason, msg].filter(Boolean).join(': ') || detail;
    } catch {
      // Ignore parse error
    }
    throw new Error(translateMediaError(new Error(detail)));
  }

  if (response.status === 204) {
    return {} as T;
  }
  return (await response.json()) as T;
}

async function verifyFolderActive(accessToken: string, folderId?: string): Promise<boolean> {
  if (!folderId) return false;
  try {
    const res = await fetch(
      `${DRIVE_FILES_API}/${encodeURIComponent(folderId)}?fields=id,mimeType,trashed`,
      { headers: { Authorization: `Bearer ${accessToken}` } },
    );
    if (res.status === 401) {
      markDriveTokenExpired();
      throw new Error('401 Invalid Credentials');
    }
    if (!res.ok) return false;
    const data = (await res.json()) as { id?: string; mimeType?: string; trashed?: boolean };
    return Boolean(data.id && !data.trashed && data.mimeType === FOLDER_MIME);
  } catch (err) {
    if (err instanceof Error && err.message.includes('401')) throw err;
    return false;
  }
}

async function findOrCreateFolder(
  accessToken: string,
  name: string,
  parentId: string | null,
  existingId?: string,
): Promise<string> {
  if (await verifyFolderActive(accessToken, existingId)) {
    return existingId!;
  }

  const escapedName = name.replace(/'/g, "\\'");
  const qParts = [
    `name='${escapedName}'`,
    `mimeType='${FOLDER_MIME}'`,
    'trashed=false',
  ];
  if (parentId) {
    qParts.push(`'${parentId}' in parents`);
  }

  const searchUrl = `${DRIVE_FILES_API}?q=${encodeURIComponent(qParts.join(' and '))}&fields=files(id,name)&pageSize=5`;
  const found = await driveJsonFetch<{ files?: Array<{ id: string }> }>(searchUrl, accessToken);
  if (found.files && found.files.length > 0) {
    return found.files[0].id;
  }

  const created = await driveJsonFetch<{ id: string }>(
    `${DRIVE_FILES_API}?fields=id`,
    accessToken,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name,
        mimeType: FOLDER_MIME,
        ...(parentId ? { parents: [parentId] } : {}),
      }),
    },
  );
  return created.id;
}

function uploadSingleChunk(params: {
  uploadUri: string;
  chunk: Blob;
  startByte: number;
  endByteInclusive: number;
  totalBytes: number;
  onChunkProgress: (loadedInChunk: number) => void;
  onAbortRegister: (abortFn: () => void) => void;
}): Promise<{
  status: number;
  nextOffset: number;
  file?: { id: string; name: string; mimeType: string; size?: string; parents?: string[] };
}> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    params.onAbortRegister(() => xhr.abort());

    xhr.open('PUT', params.uploadUri, true);
    xhr.setRequestHeader(
      'Content-Range',
      `bytes ${params.startByte}-${params.endByteInclusive}/${params.totalBytes}`,
    );

    xhr.upload.onprogress = (ev) => {
      if (ev.lengthComputable) {
        params.onChunkProgress(ev.loaded);
      }
    };

    xhr.onload = () => {
      if (xhr.status === 308) {
        const rangeHeader = xhr.getResponseHeader('Range');
        const nextOffset = parseGoogleRangeHeader(rangeHeader) || params.endByteInclusive + 1;
        resolve({ status: 308, nextOffset });
      } else if (xhr.status === 200 || xhr.status === 201) {
        try {
          const parsed = JSON.parse(xhr.responseText);
          resolve({ status: xhr.status, nextOffset: params.totalBytes, file: parsed });
        } catch {
          reject(new Error('Upload succeeded, but Drive returned an unreadable metadata payload.'));
        }
      } else if (xhr.status === 401) {
        markDriveTokenExpired();
        reject(new Error('401 Invalid Credentials: Google Drive token expired mid-upload.'));
      } else if (xhr.status === 404 || xhr.status === 410) {
        reject(new Error('410 Upload session expired. Start a fresh upload.'));
      } else {
        reject(new Error(`Google Drive upload error (HTTP ${xhr.status}).`));
      }
    };

    xhr.onerror = () => {
      reject(new Error('Network connection interrupted during upload.'));
    };

    xhr.onabort = () => {
      reject(new Error('UPLOAD_ABORTED'));
    };

    xhr.send(params.chunk);
  });
}

async function queryConfirmedByteOffset(uploadUri: string, totalBytes: number): Promise<number> {
  const res = await fetch(uploadUri, {
    method: 'PUT',
    headers: {
      'Content-Range': `bytes */${totalBytes}`,
    },
  });

  if (res.status === 308) {
    return parseGoogleRangeHeader(res.headers.get('Range'));
  }
  if (res.status === 200 || res.status === 201) {
    return totalBytes;
  }
  if (res.status === 404 || res.status === 410) {
    throw new Error('410 Upload session expired before resuming. Please start the upload again.');
  }
  throw new Error(`Unable to query upload offset (HTTP ${res.status}).`);
}

function testImageLoad(url: string, timeoutMs = 8500): Promise<boolean> {
  return new Promise((resolve) => {
    if (typeof Image === 'undefined') {
      resolve(false);
      return;
    }
    const img = new Image();
    img.referrerPolicy = 'no-referrer';
    let settled = false;
    const timer = window.setTimeout(() => {
      if (!settled) {
        settled = true;
        resolve(false);
      }
    }, timeoutMs);

    img.onload = () => {
      if (!settled) {
        settled = true;
        window.clearTimeout(timer);
        resolve(img.naturalWidth > 0);
      }
    };
    img.onerror = () => {
      if (!settled) {
        settled = true;
        window.clearTimeout(timer);
        resolve(false);
      }
    };
    img.src = url;
  });
}

export class GoogleDriveStorageProvider implements MediaStorageProvider {
  readonly id = 'google-drive' as const;
  readonly label = 'Google Drive API v3';

  async getAccountInfo(accessToken: string): Promise<ProviderAccountQuota> {
    const res = await driveJsonFetch<{
      user?: { displayName?: string; emailAddress?: string };
      storageQuota?: { limit?: string; usage?: string; usageInDrive?: string };
    }>(
      `${DRIVE_ABOUT_API}?fields=${encodeURIComponent(
        'user(displayName,emailAddress),storageQuota(limit,usage,usageInDrive)',
      )}`,
      accessToken,
    );

    const toNum = (v?: string) => {
      if (!v) return null;
      const n = Number(v);
      return Number.isFinite(n) ? n : null;
    };

    return {
      displayName: res.user?.displayName,
      emailAddress: res.user?.emailAddress,
      limitBytes: toNum(res.storageQuota?.limit),
      usageBytes: toNum(res.storageQuota?.usage),
      usageInDriveBytes: toNum(res.storageQuota?.usageInDrive),
    };
  }

  async ensureFolderHierarchy(
    accessToken: string,
    existingFolders?: Partial<DriveFolderMap> | null,
  ): Promise<DriveFolderMap> {
    const rootId = await findOrCreateFolder(
      accessToken,
      'KLARENCY MEDIA',
      null,
      existingFolders?.rootId,
    );

    const [
      profileId,
      projectsId,
      cvId,
      researchId,
      experienceId,
      certificatesId,
      otherId,
    ] = await Promise.all([
      findOrCreateFolder(accessToken, 'Profile', rootId, existingFolders?.profileId),
      findOrCreateFolder(accessToken, 'Projects', rootId, existingFolders?.projectsId),
      findOrCreateFolder(accessToken, 'CV', rootId, existingFolders?.cvId),
      findOrCreateFolder(accessToken, 'Research', rootId, existingFolders?.researchId),
      findOrCreateFolder(accessToken, 'Experience', rootId, existingFolders?.experienceId),
      findOrCreateFolder(accessToken, 'Certificates', rootId, existingFolders?.certificatesId),
      findOrCreateFolder(accessToken, 'Other', rootId, existingFolders?.otherId),
    ]);

    const [projectCoversId, projectScreenshotsId, projectDemosId] = await Promise.all([
      findOrCreateFolder(accessToken, 'Covers', projectsId, existingFolders?.projectCoversId),
      findOrCreateFolder(
        accessToken,
        'Screenshots',
        projectsId,
        existingFolders?.projectScreenshotsId,
      ),
      findOrCreateFolder(
        accessToken,
        'Demonstrations',
        projectsId,
        existingFolders?.projectDemosId,
      ),
    ]);

    return {
      rootId,
      profileId,
      projectsId,
      projectCoversId,
      projectScreenshotsId,
      projectDemosId,
      cvId,
      researchId,
      experienceId,
      certificatesId,
      otherId,
    };
  }

  startResumableUpload(params: {
    accessToken: string;
    file: File;
    category: MediaCategory;
    folders: DriveFolderMap;
    customName?: string;
    contextSlug?: string;
    cropSquare?: boolean;
    onProgress: (progress: ProviderUploadProgress) => void;
  }): ProviderUploadHandle {
    let paused = false;
    let cancelled = false;
    let abortCurrentChunk: (() => void) | null = null;
    let resumeWaiter: (() => void) | null = null;
    let activeUploadUri: string | null = null;

    const emit = (p: ProviderUploadProgress) => {
      params.onProgress(p);
    };

    const promise = (async (): Promise<ProviderUploadedAsset> => {
      if (typeof navigator !== 'undefined' && !navigator.onLine) {
        throw new Error('You appear to be offline. Reconnect to upload media to Google Drive.');
      }

      emit({
        state: 'preparing',
        bytesTransferred: 0,
        totalBytes: params.file.size,
        percent: 0,
        detailMessage: 'Validating file header and preparing payload…',
      });

      const headerBytes = await readLeadingBytes(params.file);
      const magicMime = inspectFileMagicBytes(headerBytes);
      const validation = validateMediaDescriptor({
        name: params.file.name,
        size: params.file.size,
        declaredMime: params.file.type,
        magicMime,
      });
      if (!validation.valid) {
        throw new Error(validation.error);
      }

      let uploadBlob: Blob = params.file;
      let resolvedMime: SupportedMediaMime = validation.resolvedMime;
      let width: number | undefined;
      let height: number | undefined;
      let extOverride: string | undefined;

      if (validation.resolvedMime !== 'application/pdf') {
        const prepared = await prepareImagePayload(params.file, Boolean(params.cropSquare));
        uploadBlob = prepared.blob;
        resolvedMime = prepared.mimeType;
        width = prepared.width;
        height = prepared.height;
        extOverride = prepared.ext;
      }

      if (uploadBlob.size > MEDIA_LIMITS.maxDocumentBytes) {
        throw new Error('Prepared payload exceeds upload limit.');
      }

      const sha256 = await computeSha256Hex(uploadBlob);
      const folderId = resolveFolderIdForCategory(params.category, params.folders);
      const managedFileName = params.customName
        ? sanitizeDisplayFilename(params.customName)
        : buildManagedFilename({
            originalName: params.file.name,
            category: params.category,
            contextSlug: params.contextSlug,
            extensionOverride: extOverride,
          });

      if (cancelled) {
        throw new Error('Upload cancelled before transfer began.');
      }

      // Initialize Google Drive Resumable Upload Session
      const initRes = await fetch(
        `${DRIVE_UPLOAD_API}?uploadType=resumable&fields=id,name,mimeType,size,parents`,
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${params.accessToken}`,
            'Content-Type': 'application/json; charset=UTF-8',
            'X-Upload-Content-Type': resolvedMime,
            'X-Upload-Content-Length': String(uploadBlob.size),
          },
          body: JSON.stringify({
            name: managedFileName,
            parents: [folderId],
            description: `KLARENCY (${params.category}) · Original: ${params.file.name}`,
          }),
        },
      );

      if (initRes.status === 401) {
        markDriveTokenExpired();
        throw new Error('401 Invalid Credentials: Google Drive authorization expired.');
      }
      if (!initRes.ok) {
        throw new Error(
          translateMediaError(
            new Error(`Failed to initialize resumable upload (HTTP ${initRes.status}).`),
          ),
        );
      }

      const uploadUri = initRes.headers.get('Location');
      if (!uploadUri) {
        throw new Error('Google Drive did not return a resumable upload session URI.');
      }
      activeUploadUri = uploadUri;

      const totalBytes = uploadBlob.size;
      let offset = 0;
      let retryCount = 0;

      while (offset < totalBytes) {
        if (cancelled) {
          throw new Error('Upload cancelled by owner.');
        }

        if (paused) {
          emit({
            state: 'paused',
            bytesTransferred: offset,
            totalBytes,
            percent: Math.round((offset / totalBytes) * 100),
            detailMessage: 'Upload paused. Tap Resume to continue from last confirmed byte.',
          });
          await new Promise<void>((resolve) => {
            resumeWaiter = resolve;
          });
          resumeWaiter = null;
          if (cancelled) {
            throw new Error('Upload cancelled by owner.');
          }
          emit({
            state: 'resuming',
            bytesTransferred: offset,
            totalBytes,
            percent: Math.round((offset / totalBytes) * 100),
            detailMessage: 'Verifying received bytes with Google Drive…',
          });
          offset = await queryConfirmedByteOffset(uploadUri, totalBytes);
          if (offset >= totalBytes) break;
        }

        const chunkEnd = Math.min(totalBytes, offset + MEDIA_LIMITS.resumableChunkBytes);
        const chunk = uploadBlob.slice(offset, chunkEnd);

        emit({
          state: 'uploading',
          bytesTransferred: offset,
          totalBytes,
          percent: Math.round((offset / totalBytes) * 100),
          detailMessage: `Uploading chunk (${Math.round(chunkEnd / 1024)} / ${Math.round(totalBytes / 1024)} KB)…`,
        });

        try {
          const result = await uploadSingleChunk({
            uploadUri,
            chunk,
            startByte: offset,
            endByteInclusive: chunkEnd - 1,
            totalBytes,
            onChunkProgress: (loadedInChunk) => {
              const transferred = Math.min(totalBytes, offset + loadedInChunk);
              emit({
                state: 'uploading',
                bytesTransferred: transferred,
                totalBytes,
                percent: Math.min(99, Math.round((transferred / totalBytes) * 100)),
              });
            },
            onAbortRegister: (fn) => {
              abortCurrentChunk = fn;
            },
          });

          abortCurrentChunk = null;
          retryCount = 0;

          if (result.status === 200 || result.status === 201) {
            if (!result.file?.id) {
              throw new Error('Drive completed transfer without returning a file ID.');
            }
            emit({
              state: 'processing',
              bytesTransferred: totalBytes,
              totalBytes,
              percent: 100,
              detailMessage: 'Confirming file metadata in Firestore…',
            });
            return {
              driveFileId: result.file.id,
              driveFolderId: folderId,
              managedFileName: result.file.name || managedFileName,
              originalName: params.file.name,
              mimeType: resolvedMime,
              size: totalBytes,
              sha256,
              width,
              height,
            };
          }

          offset = result.nextOffset;
        } catch (err) {
          abortCurrentChunk = null;
          const msg = err instanceof Error ? err.message : String(err);

          if (msg === 'UPLOAD_ABORTED') {
            if (cancelled) throw new Error('Upload cancelled by owner.');
            if (paused) continue;
          }

          const isNetwork =
            msg.toLowerCase().includes('network') || msg.toLowerCase().includes('offline');
          if (isNetwork && retryCount < 2 && typeof navigator !== 'undefined' && navigator.onLine) {
            retryCount += 1;
            emit({
              state: 'resuming',
              bytesTransferred: offset,
              totalBytes,
              percent: Math.round((offset / totalBytes) * 100),
              detailMessage: `Connection hiccup — querying Google Drive byte status (attempt ${retryCount}/2)…`,
            });
            await new Promise((r) => setTimeout(r, 900 * retryCount));
            offset = await queryConfirmedByteOffset(uploadUri, totalBytes);
            continue;
          }

          throw new Error(translateMediaError(err));
        }
      }

      throw new Error('Upload stream ended unexpectedly before receiving Drive confirmation.');
    })();

    return {
      pause: () => {
        paused = true;
        abortCurrentChunk?.();
      },
      resume: () => {
        paused = false;
        resumeWaiter?.();
      },
      cancel: () => {
        cancelled = true;
        paused = false;
        abortCurrentChunk?.();
        resumeWaiter?.();
        if (activeUploadUri) {
          void fetch(activeUploadUri, { method: 'DELETE' }).catch(() => {});
        }
      },
      promise,
    };
  }

  async setPublicReadable(
    accessToken: string,
    fileId: string,
    makePublic: boolean,
    existingPermissionId?: string,
  ): Promise<{ permissionId?: string; isPublic: boolean }> {
    const permsList = await driveJsonFetch<{
      permissions?: Array<{ id: string; type: string; role: string }>;
    }>(
      `${DRIVE_FILES_API}/${encodeURIComponent(fileId)}/permissions?fields=permissions(id,type,role)`,
      accessToken,
    );

    const anyonePerms = (permsList.permissions ?? []).filter((p) => p.type === 'anyone');

    if (makePublic) {
      if (anyonePerms.length > 0) {
        return { permissionId: anyonePerms[0].id, isPublic: true };
      }
      const created = await driveJsonFetch<{ id: string }>(
        `${DRIVE_FILES_API}/${encodeURIComponent(fileId)}/permissions?fields=id`,
        accessToken,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ role: 'reader', type: 'anyone' }),
        },
      );
      return { permissionId: created.id, isPublic: true };
    }

    const targets = new Set<string>(anyonePerms.map((p) => p.id));
    if (existingPermissionId) targets.add(existingPermissionId);

    for (const permId of targets) {
      await fetch(
        `${DRIVE_FILES_API}/${encodeURIComponent(fileId)}/permissions/${encodeURIComponent(permId)}`,
        {
          method: 'DELETE',
          headers: { Authorization: `Bearer ${accessToken}` },
        },
      );
    }

    return { permissionId: undefined, isPublic: false };
  }

  async verifyPublicDelivery(
    fileId: string,
    mimeType: string,
  ): Promise<PublicDeliveryCheckResult> {
    const { primary, fallback, candidates } = buildDrivePublicUrlCandidates(fileId, mimeType);

    if (mimeType === 'application/pdf') {
      return {
        deliveryStatus: 'verified',
        publicUrl: primary,
        fallbackPublicUrl: fallback,
      };
    }

    for (const candidate of candidates) {
      const ok = await testImageLoad(candidate);
      if (ok) {
        return {
          deliveryStatus: 'verified',
          publicUrl: candidate,
          fallbackPublicUrl: candidate === primary ? fallback : primary,
        };
      }
    }

    return {
      deliveryStatus: 'failed',
      publicUrl: primary,
      fallbackPublicUrl: fallback,
      error:
        'Google Drive public permission succeeded, but browser image delivery could not be confirmed anonymously (host or account sharing policy may restrict anonymous embedding).',
    };
  }

  async fetchPrivatePreviewBlobUrl(accessToken: string, fileId: string): Promise<string> {
    const res = await fetch(
      `${DRIVE_FILES_API}/${encodeURIComponent(fileId)}?alt=media`,
      {
        headers: { Authorization: `Bearer ${accessToken}` },
      },
    );
    if (res.status === 401) {
      markDriveTokenExpired();
      throw new Error('401 Invalid Credentials');
    }
    if (!res.ok) {
      throw new Error(translateMediaError(new Error(`HTTP ${res.status}`)));
    }
    const blob = await res.blob();
    return URL.createObjectURL(blob);
  }

  async renameFile(accessToken: string, fileId: string, nextName: string): Promise<void> {
    await driveJsonFetch(`${DRIVE_FILES_API}/${encodeURIComponent(fileId)}`, accessToken, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: sanitizeDisplayFilename(nextName) }),
    });
  }

  async deleteFile(accessToken: string, fileId: string): Promise<void> {
    const res = await fetch(`${DRIVE_FILES_API}/${encodeURIComponent(fileId)}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    if (res.status === 401) {
      markDriveTokenExpired();
      throw new Error('401 Invalid Credentials');
    }
    if (!res.ok && res.status !== 404) {
      throw new Error(translateMediaError(new Error(`Delete failed (HTTP ${res.status})`)));
    }
  }

  async verifyFileExists(accessToken: string, fileId: string): Promise<boolean> {
    try {
      const res = await fetch(
        `${DRIVE_FILES_API}/${encodeURIComponent(fileId)}?fields=id,trashed`,
        { headers: { Authorization: `Bearer ${accessToken}` } },
      );
      if (!res.ok) return false;
      const data = (await res.json()) as { id?: string; trashed?: boolean };
      return Boolean(data.id && !data.trashed);
    } catch {
      return false;
    }
  }
}

export const googleDriveProvider = new GoogleDriveStorageProvider();
