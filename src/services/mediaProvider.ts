import type {
  DriveFolderMap,
  MediaCategory,
  MediaDeliveryStatus,
  MediaStorageProviderId,
  MediaUploadState,
} from '../types/portfolio';

export interface ProviderUploadProgress {
  state: MediaUploadState;
  bytesTransferred: number;
  totalBytes: number;
  percent: number;
  detailMessage?: string;
}

export interface ProviderUploadedAsset {
  driveFileId: string;
  driveFolderId: string;
  managedFileName: string;
  originalName: string;
  mimeType: 'image/jpeg' | 'image/png' | 'image/webp' | 'application/pdf';
  size: number;
  sha256?: string;
  width?: number;
  height?: number;
}

export interface ProviderUploadHandle {
  pause: () => void;
  resume: () => void;
  cancel: () => void;
  promise: Promise<ProviderUploadedAsset>;
}

export interface ProviderAccountQuota {
  displayName?: string;
  emailAddress?: string;
  limitBytes: number | null;
  usageBytes: number | null;
  usageInDriveBytes: number | null;
}

export interface PublicDeliveryCheckResult {
  deliveryStatus: MediaDeliveryStatus;
  publicUrl?: string;
  fallbackPublicUrl?: string;
  error?: string;
}

export interface MediaStorageProvider {
  readonly id: MediaStorageProviderId;
  readonly label: string;

  getAccountInfo(accessToken: string): Promise<ProviderAccountQuota>;

  ensureFolderHierarchy(
    accessToken: string,
    existingFolders?: Partial<DriveFolderMap> | null,
  ): Promise<DriveFolderMap>;

  startResumableUpload(params: {
    accessToken: string;
    file: File;
    category: MediaCategory;
    folders: DriveFolderMap;
    customName?: string;
    contextSlug?: string;
    cropSquare?: boolean;
    onProgress: (progress: ProviderUploadProgress) => void;
  }): ProviderUploadHandle;

  setPublicReadable(
    accessToken: string,
    fileId: string,
    makePublic: boolean,
    existingPermissionId?: string,
  ): Promise<{ permissionId?: string; isPublic: boolean }>;

  verifyPublicDelivery(fileId: string, mimeType: string): Promise<PublicDeliveryCheckResult>;

  fetchPrivatePreviewBlobUrl(accessToken: string, fileId: string): Promise<string>;

  renameFile(accessToken: string, fileId: string, nextName: string): Promise<void>;

  deleteFile(accessToken: string, fileId: string): Promise<void>;

  verifyFileExists(accessToken: string, fileId: string): Promise<boolean>;
}
