import {
  AlertTriangle,
  CheckCircle2,
  Copy,
  Crop,
  ExternalLink,
  Eye,
  FileText,
  Globe,
  Grid,
  List,
  Lock,
  Pause,
  Play,
  RefreshCw,
  Replace,
  Search,
  Trash2,
  Upload,
  X,
  XCircle,
  ZoomIn,
  ZoomOut,
} from 'lucide-react';
import { motion } from 'motion/react';
import { useEffect, useMemo, useRef, useState } from 'react';
import { subscribeDriveAuth, type DriveAuthSnapshot } from '../../services/googleDriveAuth';
import {
  loadPendingMediaRecoveries,
  type PendingMediaRecovery,
} from '../../services/indexedDbDrafts';
import type { ProviderAccountQuota, ProviderUploadProgress } from '../../services/mediaProvider';
import {
  changeMediaVisibility,
  deleteMediaAsset,
  fetchDriveAccountQuota,
  getMediaPreviewUrl,
  recoverPendingMediaRecord,
  replaceMediaAsset,
  startManagedMediaUpload,
  updateMediaMetadata,
  verifyMediaDeliveryAndExistence,
  type ManagedUploadHandle,
} from '../../services/mediaService';
import type {
  DriveWorkspaceConfig,
  ExperienceEntry,
  MediaCategory,
  MediaFileRecord,
  MediaVisibility,
  Project,
  PublicProfile,
  ResearchEntry,
} from '../../types/portfolio';
import {
  computeMediaLibraryStats,
  filterMediaFiles,
  findDuplicateMediaRecords,
  findMediaUsage,
  formatBytes,
  inspectFileMagicBytes,
  validateMediaDescriptor,
  type MediaLibrarySort,
} from '../../utils/mediaLogic';
import { SmartDriveImage } from '../shared/SmartDriveImage';
import { DriveConnectionCard } from './DriveConnectionCard';

interface MediaLibraryManagerProps {
  mediaFiles: MediaFileRecord[];
  driveConfig: DriveWorkspaceConfig | null;
  profile: PublicProfile;
  projects: Project[];
  research: ResearchEntry[];
  experiences: ExperienceEntry[];
}

const CATEGORY_OPTIONS: Array<{ value: MediaCategory; label: string }> = [
  { value: 'profile', label: 'Profile Portrait' },
  { value: 'project-cover', label: 'Project Cover' },
  { value: 'project-screenshot', label: 'Project Screenshot' },
  { value: 'project-demo', label: 'Project Demo' },
  { value: 'cv', label: 'Curriculum Vitae (CV)' },
  { value: 'research', label: 'Research Document' },
  { value: 'experience', label: 'Experience Attachment' },
  { value: 'certificate', label: 'Certificate' },
  { value: 'other', label: 'Other Asset' },
];

function VisibilityBadge({ visibility }: { visibility: MediaVisibility }) {
  if (visibility === 'PUBLIC') {
    return (
      <span className="inline-flex items-center gap-1 rounded bg-emerald-500/15 px-2 py-0.5 font-mono text-[10px] text-emerald-300">
        <Globe className="h-3 w-3" aria-hidden="true" />
        <span>PUBLIC</span>
      </span>
    );
  }
  if (visibility === 'UNPUBLISHED') {
    return (
      <span className="inline-flex items-center gap-1 rounded bg-slate-400/15 px-2 py-0.5 font-mono text-[10px] text-slate-300">
        <Lock className="h-3 w-3" aria-hidden="true" />
        <span>UNPUBLISHED</span>
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 rounded bg-amber-500/15 px-2 py-0.5 font-mono text-[10px] text-amber-300">
      <Lock className="h-3 w-3" aria-hidden="true" />
      <span>PRIVATE</span>
    </span>
  );
}

export function MediaLibraryManager({
  mediaFiles,
  driveConfig,
  profile,
  projects,
  research,
  experiences,
}: MediaLibraryManagerProps) {
  const [driveAuth, setDriveAuth] = useState<DriveAuthSnapshot>({
    status: 'disconnected',
    connectedEmail: null,
    expiresAtMs: null,
    error: null,
  });
  const [quota, setQuota] = useState<ProviderAccountQuota | null>(null);
  const [pendingRecoveries, setPendingRecoveries] = useState<PendingMediaRecovery[]>([]);
  const [recoveringId, setRecoveringId] = useState<string | null>(null);

  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState<'all' | 'images' | 'documents'>('all');
  const [categoryFilter, setCategoryFilter] = useState<MediaCategory | 'all' | 'projects'>('all');
  const [visibilityFilter, setVisibilityFilter] = useState<MediaVisibility | 'all'>('all');
  const [sortBy, setSortBy] = useState<MediaLibrarySort>('newest');

  // Upload sheet state
  const [uploadDrawerOpen, setUploadDrawerOpen] = useState(false);
  const uploadInputRef = useRef<HTMLInputElement>(null);
  const uploadHandleRef = useRef<ManagedUploadHandle | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [localPreviewUrl, setLocalPreviewUrl] = useState<string | null>(null);
  const [uploadCategory, setUploadCategory] = useState<MediaCategory>('project-cover');
  const [uploadName, setUploadName] = useState('');
  const [uploadDescription, setUploadDescription] = useState('');
  const [uploadCropSquare, setUploadCropSquare] = useState(false);
  const [uploadMakePublic, setUploadMakePublic] = useState(false);
  const [duplicateWarning, setDuplicateWarning] = useState<MediaFileRecord[]>([]);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<ProviderUploadProgress | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [bannerMessage, setBannerMessage] = useState<string | null>(null);

  // Inspect / Manage modal state
  const [activeMediaId, setActiveMediaId] = useState<string | null>(null);
  const activeMedia = useMemo(
    () => mediaFiles.find((m) => m.id === activeMediaId) ?? null,
    [mediaFiles, activeMediaId],
  );
  const [previewSrc, setPreviewSrc] = useState<string | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [previewError, setPreviewError] = useState<string | null>(null);
  const [zoomed, setZoomed] = useState(false);
  const [editName, setEditName] = useState('');
  const [editCategory, setEditCategory] = useState<MediaCategory>('other');
  const [editDescription, setEditDescription] = useState('');
  const [savingMeta, setSavingMeta] = useState(false);
  const [visibilityBusy, setVisibilityBusy] = useState(false);
  const [verifyingBusy, setVerifyingBusy] = useState(false);
  const [copiedUrl, setCopiedUrl] = useState(false);

  // Replace file inside modal
  const replaceInputRef = useRef<HTMLInputElement>(null);
  const [deleteOldOnReplace, setDeleteOldOnReplace] = useState(true);
  const [replacing, setReplacing] = useState(false);
  const [replaceProgress, setReplaceProgress] = useState<ProviderUploadProgress | null>(null);

  // Delete confirmation modal
  const [confirmDeleteOpen, setConfirmDeleteOpen] = useState(false);
  const [deleteInDriveAlso, setDeleteInDriveAlso] = useState(true);
  const [ackPublishedDelete, setAckPublishedDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [modalError, setModalError] = useState<string | null>(null);

  useEffect(() => {
    return subscribeDriveAuth(setDriveAuth);
  }, []);

  useEffect(() => {
    void loadPendingMediaRecoveries().then(setPendingRecoveries);
  }, [mediaFiles.length]);

  useEffect(() => {
    if (driveAuth.status === 'connected') {
      void fetchDriveAccountQuota()
        .then(setQuota)
        .catch(() => setQuota(null));
    } else {
      setQuota(null);
    }
  }, [driveAuth.status]);

  useEffect(() => {
    return () => {
      if (localPreviewUrl) URL.revokeObjectURL(localPreviewUrl);
    };
  }, [localPreviewUrl]);

  // Sync inspect modal preview & fields when activeMedia changes
  useEffect(() => {
    let revokedUrl: string | null = null;
    let active = true;

    setZoomed(false);
    setModalError(null);
    setPreviewError(null);
    setConfirmDeleteOpen(false);
    setAckPublishedDelete(false);
    setCopiedUrl(false);

    if (!activeMedia) {
      setPreviewSrc(null);
      return;
    }

    setEditName(activeMedia.name);
    setEditCategory(activeMedia.category);
    setEditDescription(activeMedia.description ?? '');

    if (activeMedia.visibility === 'PUBLIC' && activeMedia.publicUrl) {
      setPreviewSrc(activeMedia.publicUrl);
      setPreviewLoading(false);
      return;
    }

    if (driveAuth.status !== 'connected') {
      setPreviewSrc(null);
      setPreviewLoading(false);
      setPreviewError('Connect Google Drive above to view Private or Unpublished file previews.');
      return;
    }

    setPreviewLoading(true);
    void getMediaPreviewUrl(activeMedia)
      .then((res) => {
        if (!active) {
          if (res.isObjectUrl) URL.revokeObjectURL(res.url);
          return;
        }
        if (res.isObjectUrl) revokedUrl = res.url;
        setPreviewSrc(res.url);
      })
      .catch((err) => {
        if (active) {
          setPreviewError(err instanceof Error ? err.message : 'Unable to fetch Drive preview.');
        }
      })
      .finally(() => {
        if (active) setPreviewLoading(false);
      });

    return () => {
      active = false;
      if (revokedUrl) URL.revokeObjectURL(revokedUrl);
    };
  }, [activeMedia?.id, activeMedia?.visibility, activeMedia?.publicUrl, driveAuth.status]);

  const stats = useMemo(() => computeMediaLibraryStats(mediaFiles), [mediaFiles]);
  const filtered = useMemo(
    () =>
      filterMediaFiles(mediaFiles, {
        query: searchQuery,
        typeFilter,
        categoryFilter,
        visibilityFilter,
        sort: sortBy,
      }),
    [mediaFiles, searchQuery, typeFilter, categoryFilter, visibilityFilter, sortBy],
  );

  const activeUsages = useMemo(() => {
    if (!activeMedia) return [];
    return findMediaUsage(activeMedia, { profile, projects, research, experiences });
  }, [activeMedia, profile, projects, research, experiences]);

  const publishedUsages = activeUsages.filter((u) => u.isPublished);

  const handleSelectUploadFile = async (file: File) => {
    setUploadError(null);
    setDuplicateWarning([]);
    if (localPreviewUrl) {
      URL.revokeObjectURL(localPreviewUrl);
      setLocalPreviewUrl(null);
    }

    const header = new Uint8Array(await file.slice(0, 16).arrayBuffer());
    const magic = inspectFileMagicBytes(header);
    const check = validateMediaDescriptor({
      name: file.name,
      size: file.size,
      declaredMime: file.type,
      magicMime: magic,
      expectedKind: 'any',
    });

    if (!check.valid) {
      setSelectedFile(null);
      setUploadError(check.error);
      return;
    }

    setSelectedFile(file);
    setUploadName(file.name);
    if (check.resolvedMime !== 'application/pdf') {
      setLocalPreviewUrl(URL.createObjectURL(file));
    }

    const dupes = findDuplicateMediaRecords(mediaFiles, {
      originalName: file.name,
      size: file.size,
    });
    setDuplicateWarning(dupes);
  };

  const handleStartUpload = async () => {
    if (!selectedFile) return;
    setUploadError(null);
    setUploading(true);
    setUploadProgress({
      state: 'preparing',
      bytesTransferred: 0,
      totalBytes: selectedFile.size,
      percent: 0,
      detailMessage: 'Initializing resumable transfer…',
    });

    const handle = startManagedMediaUpload({
      file: selectedFile,
      category: uploadCategory,
      customName: uploadName.trim() || undefined,
      description: uploadDescription,
      cropSquare: selectedFile.type !== 'application/pdf' && uploadCropSquare,
      makePublic: uploadMakePublic,
      existingConfig: driveConfig,
      onProgress: setUploadProgress,
    });
    uploadHandleRef.current = handle;

    try {
      const created = await handle.promise;
      setBannerMessage(`Uploaded "${created.name}" (${created.visibility}) to KLARENCY MEDIA.`);
      setSelectedFile(null);
      if (localPreviewUrl) URL.revokeObjectURL(localPreviewUrl);
      setLocalPreviewUrl(null);
      setUploadDescription('');
      setUploadMakePublic(false);
      setUploadCropSquare(false);
      setDuplicateWarning([]);
      setUploadDrawerOpen(false);
    } catch (err) {
      setUploadError(err instanceof Error ? err.message : 'Upload failed.');
    } finally {
      setUploading(false);
      uploadHandleRef.current = null;
      void loadPendingMediaRecoveries().then(setPendingRecoveries);
    }
  };

  const handleRecoverPending = async (item: PendingMediaRecovery) => {
    setRecoveringId(item.driveFileId);
    setBannerMessage(null);
    try {
      const recovered = await recoverPendingMediaRecord(item);
      setBannerMessage(`Recovered "${recovered.name}" into Media Library.`);
      setPendingRecoveries(await loadPendingMediaRecoveries());
    } catch (err) {
      setUploadError(err instanceof Error ? err.message : 'Recovery failed.');
    } finally {
      setRecoveringId(null);
    }
  };

  const handleSaveMetadata = async () => {
    if (!activeMedia) return;
    setSavingMeta(true);
    setModalError(null);
    try {
      await updateMediaMetadata(activeMedia, {
        name: editName,
        category: editCategory,
        description: editDescription,
      });
      setBannerMessage(`Saved metadata updates for "${editName}".`);
    } catch (err) {
      setModalError(err instanceof Error ? err.message : 'Could not update media details.');
    } finally {
      setSavingMeta(false);
    }
  };

  const handleChangeVisibility = async (nextVis: MediaVisibility) => {
    if (!activeMedia) return;
    setVisibilityBusy(true);
    setModalError(null);
    try {
      const updated = await changeMediaVisibility(activeMedia, nextVis);
      setBannerMessage(
        nextVis === 'PUBLIC'
          ? `"${updated.name}" is now PUBLIC (delivery: ${updated.deliveryStatus}).`
          : `"${updated.name}" is now ${nextVis} (public link removed in Google Drive).`,
      );
    } catch (err) {
      setModalError(err instanceof Error ? err.message : 'Failed to change visibility.');
    } finally {
      setVisibilityBusy(false);
    }
  };

  const handleVerifySync = async () => {
    if (!activeMedia) return;
    setVerifyingBusy(true);
    setModalError(null);
    try {
      const res = await verifyMediaDeliveryAndExistence(activeMedia);
      setBannerMessage(`Drive check for "${res.name}": ${res.deliveryStatus}.`);
    } catch (err) {
      setModalError(err instanceof Error ? err.message : 'Verification check failed.');
    } finally {
      setVerifyingBusy(false);
    }
  };

  const handleReplaceFile = async (file: File) => {
    if (!activeMedia) return;
    setModalError(null);
    const header = new Uint8Array(await file.slice(0, 16).arrayBuffer());
    const magic = inspectFileMagicBytes(header);
    const expectedKind = activeMedia.mimeType === 'application/pdf' ? 'pdf' : 'image';
    const check = validateMediaDescriptor({
      name: file.name,
      size: file.size,
      declaredMime: file.type,
      magicMime: magic,
      expectedKind,
    });
    if (!check.valid) {
      setModalError(check.error);
      return;
    }

    setReplacing(true);
    setReplaceProgress({
      state: 'preparing',
      bytesTransferred: 0,
      totalBytes: file.size,
      percent: 0,
      detailMessage: 'Uploading replacement file to Google Drive…',
    });

    try {
      const updated = await replaceMediaAsset({
        existingRecord: activeMedia,
        file,
        deleteOldDriveFile: deleteOldOnReplace,
        existingConfig: driveConfig,
        onProgress: setReplaceProgress,
      });
      setBannerMessage(`Replaced file content for "${updated.name}".`);
    } catch (err) {
      setModalError(err instanceof Error ? err.message : 'File replacement failed.');
    } finally {
      setReplacing(false);
      setReplaceProgress(null);
    }
  };

  const handleConfirmDelete = async () => {
    if (!activeMedia) return;
    if (publishedUsages.length > 0 && !ackPublishedDelete) return;
    setDeleting(true);
    setModalError(null);
    try {
      await deleteMediaAsset(activeMedia, { deleteInDrive: deleteInDriveAlso });
      setBannerMessage(`Deleted "${activeMedia.name}" from Media Library.`);
      setConfirmDeleteOpen(false);
      setActiveMediaId(null);
    } catch (err) {
      setModalError(err instanceof Error ? err.message : 'Failed to delete media asset.');
    } finally {
      setDeleting(false);
    }
  };

  const isConnected = driveAuth.status === 'connected';

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 border-b border-slate-400/15 pb-5 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="font-display text-2xl font-bold text-[#F8FAFC] sm:text-3xl">
            Media Library
          </h1>
          <p className="mt-1 text-sm text-[#94A3B8]">
            Manage photos and PDFs stored inside your Google Drive KLARENCY MEDIA folder.
          </p>
        </div>

        <button
          type="button"
          onClick={() => setUploadDrawerOpen((prev) => !prev)}
          className="inline-flex min-h-[48px] items-center justify-center gap-2 rounded-xl bg-[#2563EB] px-5 text-sm font-semibold text-white hover:bg-[#1D4ED8]"
        >
          <Upload className="h-4 w-4" aria-hidden="true" />
          <span>{uploadDrawerOpen ? 'Hide Upload Panel' : 'Upload Media'}</span>
        </button>
      </div>

      <DriveConnectionCard driveConfig={driveConfig} />

      {bannerMessage && (
        <div
          role="status"
          className="flex items-center justify-between gap-3 rounded-xl border border-emerald-500/30 bg-emerald-950/30 px-4 py-3 text-xs text-emerald-200"
        >
          <div className="flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-300" aria-hidden="true" />
            <span>{bannerMessage}</span>
          </div>
          <button
            type="button"
            onClick={() => setBannerMessage(null)}
            aria-label="Dismiss notification"
            className="text-emerald-200/70 hover:text-white"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      {pendingRecoveries.length > 0 && (
        <div className="space-y-3 rounded-2xl border border-amber-500/35 bg-amber-950/30 p-4 text-xs text-amber-100">
          <div className="flex items-start gap-2.5">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-300" aria-hidden="true" />
            <div>
              <p className="font-semibold">
                {pendingRecoveries.length} Google Drive upload(s) need Firestore metadata recovery
              </p>
              <p className="mt-0.5 text-amber-200/80">
                The binary file finished uploading to Drive, but saving its Firestore record was
                interrupted. Tap Recover so you do not need to re-upload.
              </p>
            </div>
          </div>
          <div className="space-y-2">
            {pendingRecoveries.map((item) => (
              <div
                key={item.driveFileId}
                className="flex flex-wrap items-center justify-between gap-2 rounded-lg bg-[#050816]/60 px-3 py-2"
              >
                <span className="truncate font-medium">
                  {item.name} ({formatBytes(item.size)})
                </span>
                <button
                  type="button"
                  disabled={!isConnected || recoveringId === item.driveFileId}
                  onClick={() => void handleRecoverPending(item)}
                  className="min-h-[36px] rounded-lg bg-[#2563EB] px-3 font-semibold text-white disabled:opacity-50"
                >
                  {recoveringId === item.driveFileId ? 'Recovering…' : 'Recover to Library'}
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Storage Stats Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="kl-surface rounded-xl p-4">
          <p className="text-xs text-[#94A3B8]">Tracked media files</p>
          <p className="mt-1.5 font-mono text-2xl font-semibold text-[#F8FAFC] tabular-nums">
            {stats.totalFiles}
          </p>
          <p className="mt-1 text-xs text-[#94A3B8]">
            {stats.imageCount} images · {stats.documentCount} PDFs
          </p>
        </div>

        <div className="kl-surface rounded-xl p-4">
          <p className="text-xs text-[#94A3B8]">KLARENCY media size</p>
          <p className="mt-1.5 font-mono text-2xl font-semibold text-[#22D3EE] tabular-nums">
            {formatBytes(stats.totalBytes)}
          </p>
          <p className="mt-1 text-xs text-[#94A3B8]">Stored in Google Drive</p>
        </div>

        <div className="kl-surface rounded-xl p-4">
          <p className="text-xs text-[#94A3B8]">Visibility breakdown</p>
          <p className="mt-1.5 font-mono text-2xl font-semibold text-emerald-300 tabular-nums">
            {stats.publicCount} public
          </p>
          <p className="mt-1 text-xs text-[#94A3B8]">
            {stats.privateCount} private · {stats.unpublishedCount} unpublished
          </p>
        </div>

        <div className="kl-surface rounded-xl p-4">
          <p className="text-xs text-[#94A3B8]">Google Drive account quota</p>
          {quota && quota.limitBytes ? (
            <>
              <p className="mt-1.5 font-mono text-2xl font-semibold text-[#F8FAFC] tabular-nums">
                {formatBytes(quota.usageBytes ?? 0)}
              </p>
              <p className="mt-1 text-xs text-[#94A3B8]">
                of {formatBytes(quota.limitBytes)} total Drive capacity
              </p>
            </>
          ) : (
            <>
              <p className="mt-1.5 font-mono text-lg font-semibold text-[#94A3B8]">
                {isConnected ? 'Unavailable' : 'Connect Drive'}
              </p>
              <p className="mt-1 text-xs text-[#94A3B8]">Live quota shows when connected</p>
            </>
          )}
        </div>
      </div>

      {/* Mobile-First Upload Sheet */}
      {uploadDrawerOpen && (
        <section className="kl-surface space-y-5 rounded-2xl border border-[#22D3EE]/35 p-5 sm:p-6">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h2 className="font-display text-lg font-semibold text-[#F8FAFC]">
                Upload New Media to Google Drive
              </h2>
              <p className="text-xs text-[#94A3B8]">
                Uploads start as Private by default. JPEG/PNG/WebP up to 10 MB; PDF up to 15 MB.
              </p>
            </div>
            <button
              type="button"
              onClick={() => setUploadDrawerOpen(false)}
              aria-label="Close upload panel"
              className="inline-flex h-10 w-10 items-center justify-center rounded-lg border border-slate-400/20 text-[#94A3B8]"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          <input
            ref={uploadInputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp,application/pdf"
            onChange={(e) => {
              const f = e.target.files?.[0];
              e.target.value = '';
              if (f) void handleSelectUploadFile(f);
            }}
            className="sr-only"
          />

          {!selectedFile ? (
            <button
              type="button"
              onClick={() => uploadInputRef.current?.click()}
              className="flex min-h-[120px] w-full flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed border-slate-400/25 bg-[#050816]/60 p-6 text-center transition-colors hover:border-[#22D3EE]"
            >
              <Upload className="h-6 w-6 text-[#22D3EE]" aria-hidden="true" />
              <span className="text-sm font-medium text-[#F8FAFC]">
                Tap to select photo or PDF from phone or computer
              </span>
              <span className="text-xs text-[#94A3B8]">
                Images are optimized & EXIF-stripped automatically before transfer
              </span>
            </button>
          ) : (
            <div className="grid gap-5 lg:grid-cols-12">
              <div className="lg:col-span-5">
                <div className="overflow-hidden rounded-xl border border-slate-400/20 bg-[#050816]">
                  {localPreviewUrl ? (
                    <img
                      src={localPreviewUrl}
                      alt="Selected upload preview"
                      className="aspect-[16/10] w-full object-cover"
                    />
                  ) : (
                    <div className="flex aspect-[16/10] flex-col items-center justify-center gap-2 p-4 text-[#22D3EE]">
                      <FileText className="h-9 w-9" aria-hidden="true" />
                      <span className="max-w-full truncate px-2 text-xs text-[#F8FAFC]">
                        {selectedFile.name}
                      </span>
                    </div>
                  )}
                </div>
                <div className="mt-2 flex items-center justify-between text-xs text-[#94A3B8]">
                  <span>{formatBytes(selectedFile.size)}</span>
                  <button
                    type="button"
                    disabled={uploading}
                    onClick={() => uploadInputRef.current?.click()}
                    className="font-medium text-[#22D3EE] hover:underline"
                  >
                    Change file
                  </button>
                </div>
              </div>

              <div className="space-y-3.5 lg:col-span-7">
                <div className="grid gap-3 sm:grid-cols-2">
                  <div>
                    <label htmlFor="up-cat" className="block text-xs font-medium text-[#F8FAFC]">
                      Destination Folder / Category
                    </label>
                    <select
                      id="up-cat"
                      value={uploadCategory}
                      onChange={(e) => setUploadCategory(e.target.value as MediaCategory)}
                      className="mt-1 min-h-[44px] w-full rounded-lg border border-slate-400/20 bg-[#050816] px-3 text-sm text-[#F8FAFC]"
                    >
                      {CATEGORY_OPTIONS.map((opt) => (
                        <option key={opt.value} value={opt.value}>
                          {opt.label}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label htmlFor="up-name" className="block text-xs font-medium text-[#F8FAFC]">
                      Display filename
                    </label>
                    <input
                      id="up-name"
                      type="text"
                      value={uploadName}
                      onChange={(e) => setUploadName(e.target.value)}
                      className="mt-1 min-h-[44px] w-full rounded-lg border border-slate-400/20 bg-[#050816] px-3 text-sm text-[#F8FAFC]"
                    />
                  </div>
                </div>

                <div>
                  <label htmlFor="up-desc" className="block text-xs font-medium text-[#F8FAFC]">
                    Notes / alt description (optional)
                  </label>
                  <input
                    id="up-desc"
                    type="text"
                    value={uploadDescription}
                    onChange={(e) => setUploadDescription(e.target.value)}
                    placeholder="e.g., Hardware bench prototype photo"
                    className="mt-1 min-h-[44px] w-full rounded-lg border border-slate-400/20 bg-[#050816] px-3 text-sm text-[#F8FAFC]"
                  />
                </div>

                <div className="flex flex-wrap gap-4 text-xs text-[#F8FAFC]">
                  {selectedFile.type !== 'application/pdf' && (
                    <label className="flex min-h-[36px] cursor-pointer items-center gap-2">
                      <input
                        type="checkbox"
                        checked={uploadCropSquare}
                        onChange={(e) => setUploadCropSquare(e.target.checked)}
                        className="h-4 w-4 accent-[#2563EB]"
                      />
                      <Crop className="h-3.5 w-3.5 text-[#22D3EE]" aria-hidden="true" />
                      <span>Square crop (1:1)</span>
                    </label>
                  )}
                  <label className="flex min-h-[36px] cursor-pointer items-center gap-2">
                    <input
                      type="checkbox"
                      checked={uploadMakePublic}
                      onChange={(e) => setUploadMakePublic(e.target.checked)}
                      className="h-4 w-4 accent-[#2563EB]"
                    />
                    <Globe className="h-3.5 w-3.5 text-[#22D3EE]" aria-hidden="true" />
                    <span>Publish publicly immediately</span>
                  </label>
                </div>

                {duplicateWarning.length > 0 && (
                  <div className="rounded-lg border border-amber-500/30 bg-amber-950/30 p-3 text-xs text-amber-200">
                    Warning: A file with the same name and size already exists in Media Library (
                    {duplicateWarning[0].name}). Uploading will create a separate file.
                  </div>
                )}

                {uploading && uploadProgress && (
                  <div className="space-y-2 rounded-lg border border-slate-400/20 bg-[#050816] p-3">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-[#F8FAFC]">
                        {uploadProgress.detailMessage || 'Uploading…'}
                      </span>
                      <span className="font-mono text-[#22D3EE] tabular-nums">
                        {uploadProgress.percent}%
                      </span>
                    </div>
                    <div className="h-1.5 overflow-hidden rounded-full bg-slate-400/20">
                      <motion.div
                        className="h-full bg-[#22D3EE]"
                        initial={{ width: 0 }}
                        animate={{ width: `${uploadProgress.percent}%` }}
                      />
                    </div>
                    <div className="flex gap-3">
                      {uploadProgress.state === 'paused' ? (
                        <button
                          type="button"
                          onClick={() => uploadHandleRef.current?.resume()}
                          className="inline-flex items-center gap-1 text-xs font-medium text-[#22D3EE]"
                        >
                          <Play className="h-3.5 w-3.5" /> Resume
                        </button>
                      ) : (
                        <button
                          type="button"
                          onClick={() => uploadHandleRef.current?.pause()}
                          className="inline-flex items-center gap-1 text-xs font-medium text-amber-300"
                        >
                          <Pause className="h-3.5 w-3.5" /> Pause
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => uploadHandleRef.current?.cancel()}
                        className="inline-flex items-center gap-1 text-xs font-medium text-rose-300"
                      >
                        <XCircle className="h-3.5 w-3.5" /> Cancel
                      </button>
                    </div>
                  </div>
                )}

                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    disabled={uploading || !isConnected}
                    onClick={() => void handleStartUpload()}
                    className="inline-flex min-h-[44px] items-center gap-2 rounded-lg bg-[#2563EB] px-5 text-xs font-semibold text-white hover:bg-[#1D4ED8] disabled:opacity-50"
                  >
                    <Upload className="h-4 w-4" aria-hidden="true" />
                    <span>{uploading ? 'Uploading…' : 'Start Upload to Drive'}</span>
                  </button>
                  {!uploading && (
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedFile(null);
                        setUploadError(null);
                      }}
                      className="min-h-[44px] rounded-lg border border-slate-400/20 px-4 text-xs text-[#94A3B8]"
                    >
                      Clear
                    </button>
                  )}
                </div>
              </div>
            </div>
          )}

          {uploadError && (
            <p
              role="alert"
              className="rounded-lg border border-rose-500/30 bg-rose-950/30 p-3 text-xs text-rose-200"
            >
              {uploadError}
            </p>
          )}
        </section>
      )}

      {/* Search, Filters & View Toggle */}
      <div className="kl-surface flex flex-col gap-3 rounded-2xl p-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="relative flex-1">
          <Search
            className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#94A3B8]"
            aria-hidden="true"
          />
          <input
            type="search"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by filename, category, or notes..."
            className="min-h-[44px] w-full rounded-lg border border-slate-400/20 bg-[#050816] pl-9 pr-3 text-sm text-[#F8FAFC]"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <select
            aria-label="Filter by file type"
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value as 'all' | 'images' | 'documents')}
            className="min-h-[44px] rounded-lg border border-slate-400/20 bg-[#050816] px-3 text-xs text-[#F8FAFC]"
          >
            <option value="all">All Types</option>
            <option value="images">Images Only</option>
            <option value="documents">PDFs Only</option>
          </select>

          <select
            aria-label="Filter by category"
            value={categoryFilter}
            onChange={(e) =>
              setCategoryFilter(e.target.value as MediaCategory | 'all' | 'projects')
            }
            className="min-h-[44px] rounded-lg border border-slate-400/20 bg-[#050816] px-3 text-xs text-[#F8FAFC]"
          >
            <option value="all">All Folders</option>
            <option value="projects">All Project Media</option>
            {CATEGORY_OPTIONS.map((c) => (
              <option key={c.value} value={c.value}>
                {c.label}
              </option>
            ))}
          </select>

          <select
            aria-label="Filter by visibility"
            value={visibilityFilter}
            onChange={(e) => setVisibilityFilter(e.target.value as MediaVisibility | 'all')}
            className="min-h-[44px] rounded-lg border border-slate-400/20 bg-[#050816] px-3 text-xs text-[#F8FAFC]"
          >
            <option value="all">All Visibility</option>
            <option value="PUBLIC">Public</option>
            <option value="UNPUBLISHED">Unpublished</option>
            <option value="PRIVATE">Private</option>
          </select>

          <select
            aria-label="Sort media"
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as MediaLibrarySort)}
            className="min-h-[44px] rounded-lg border border-slate-400/20 bg-[#050816] px-3 text-xs text-[#F8FAFC]"
          >
            <option value="newest">Newest first</option>
            <option value="oldest">Oldest first</option>
            <option value="name">Filename (A–Z)</option>
            <option value="size">Largest first</option>
          </select>

          <div className="flex overflow-hidden rounded-lg border border-slate-400/20 bg-[#050816]">
            <button
              type="button"
              onClick={() => setViewMode('grid')}
              aria-label="Grid view"
              className={`inline-flex h-[42px] w-10 items-center justify-center ${
                viewMode === 'grid' ? 'bg-[#2563EB] text-white' : 'text-[#94A3B8]'
              }`}
            >
              <Grid className="h-4 w-4" />
            </button>
            <button
              type="button"
              onClick={() => setViewMode('list')}
              aria-label="List view"
              className={`inline-flex h-[42px] w-10 items-center justify-center ${
                viewMode === 'list' ? 'bg-[#2563EB] text-white' : 'text-[#94A3B8]'
              }`}
            >
              <List className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Media Items */}
      {filtered.length === 0 ? (
        <div className="kl-surface rounded-2xl p-10 text-center">
          <p className="text-sm text-[#94A3B8]">
            {mediaFiles.length === 0
              ? 'No files uploaded yet. Connect Google Drive and tap Upload Media to add your first photo or CV.'
              : 'No media assets match your current search or filters.'}
          </p>
        </div>
      ) : viewMode === 'grid' ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((item) => {
            const isImage = item.mimeType !== 'application/pdf';
            const usages = findMediaUsage(item, { profile, projects, research, experiences });
            return (
              <div
                key={item.id}
                className="kl-surface flex flex-col overflow-hidden rounded-2xl border border-slate-400/20 transition-colors hover:border-[#22D3EE]/45"
              >
                <div className="relative aspect-[16/10] bg-[#050816]">
                  {isImage && item.visibility === 'PUBLIC' && item.publicUrl ? (
                    <SmartDriveImage
                      src={item.publicUrl}
                      alt={item.name}
                      className="h-full w-full object-cover"
                      fallback={
                        <div className="flex h-full items-center justify-center text-xs text-[#94A3B8]">
                          Tap Inspect to verify delivery
                        </div>
                      }
                    />
                  ) : (
                    <div className="flex h-full flex-col items-center justify-center gap-1.5 text-[#22D3EE]">
                      {isImage ? (
                        <Lock className="h-6 w-6 text-amber-300" aria-hidden="true" />
                      ) : (
                        <FileText className="h-7 w-7" aria-hidden="true" />
                      )}
                      <span className="font-mono text-[11px] text-[#94A3B8]">
                        {isImage ? 'Private Image (Tap Inspect)' : 'PDF Document'}
                      </span>
                    </div>
                  )}
                  <div className="absolute left-3 top-3">
                    <VisibilityBadge visibility={item.visibility} />
                  </div>
                </div>

                <div className="flex flex-1 flex-col justify-between p-4">
                  <div>
                    <p className="truncate text-sm font-semibold text-[#F8FAFC]">{item.name}</p>
                    <p className="mt-1 font-mono text-[11px] text-[#94A3B8]">
                      {item.category} · {formatBytes(item.size)}
                      {item.width && item.height ? ` · ${item.width}×${item.height}` : ''}
                    </p>
                    {usages.length > 0 && (
                      <p className="mt-1.5 text-[11px] text-[#22D3EE]">
                        Used in {usages.length} portfolio item{usages.length === 1 ? '' : 's'}
                      </p>
                    )}
                    {item.deliveryStatus === 'failed' && (
                      <p className="mt-1 text-[11px] text-rose-300">
                        Delivery check needs attention
                      </p>
                    )}
                  </div>

                  <button
                    type="button"
                    onClick={() => setActiveMediaId(item.id)}
                    className="mt-4 inline-flex min-h-[42px] w-full items-center justify-center gap-2 rounded-lg border border-slate-400/20 bg-[#050816] text-xs font-semibold text-[#F8FAFC] hover:border-[#22D3EE]/50"
                  >
                    <Eye className="h-4 w-4 text-[#22D3EE]" aria-hidden="true" />
                    <span>Inspect & Manage</span>
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="space-y-2.5">
          {filtered.map((item) => {
            const usages = findMediaUsage(item, { profile, projects, research, experiences });
            return (
              <div
                key={item.id}
                className="kl-surface flex flex-wrap items-center justify-between gap-4 rounded-xl p-4"
              >
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="truncate text-sm font-semibold text-[#F8FAFC]">{item.name}</p>
                    <VisibilityBadge visibility={item.visibility} />
                  </div>
                  <p className="mt-1 font-mono text-xs text-[#94A3B8]">
                    {item.category} · {formatBytes(item.size)} · Used in {usages.length} slot(s)
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => setActiveMediaId(item.id)}
                  className="inline-flex min-h-[42px] items-center gap-2 rounded-lg border border-slate-400/20 bg-[#050816] px-4 text-xs font-semibold text-[#F8FAFC] hover:border-[#22D3EE]/50"
                >
                  <Eye className="h-4 w-4 text-[#22D3EE]" aria-hidden="true" />
                  <span>Inspect</span>
                </button>
              </div>
            );
          })}
        </div>
      )}

      {/* Inspect, Preview, Edit, Visibility, Replace & Delete Modal */}
      {activeMedia && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label={`Manage ${activeMedia.name}`}
          className="fixed inset-0 z-50 flex items-center justify-center bg-[#050816]/85 p-3 backdrop-blur-sm sm:p-5"
          onClick={(e) => {
            if (e.target === e.currentTarget) setActiveMediaId(null);
          }}
        >
          <div className="max-h-[92vh] w-full max-w-4xl overflow-y-auto rounded-2xl border border-slate-400/25 bg-[#080D1C] p-5 shadow-2xl sm:p-7">
            <div className="flex items-start justify-between gap-4 border-b border-slate-400/15 pb-4">
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <VisibilityBadge visibility={activeMedia.visibility} />
                  <span className="font-mono text-xs text-[#94A3B8]">
                    {activeMedia.mimeType} · {formatBytes(activeMedia.size)}
                  </span>
                </div>
                <h2 className="mt-2 truncate font-display text-xl font-bold text-[#F8FAFC]">
                  {activeMedia.name}
                </h2>
              </div>
              <button
                type="button"
                onClick={() => setActiveMediaId(null)}
                aria-label="Close media inspector"
                className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-slate-400/20 text-[#94A3B8] hover:text-white"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {modalError && (
              <div
                role="alert"
                className="mt-4 rounded-xl border border-rose-500/30 bg-rose-950/30 p-3 text-xs text-rose-200"
              >
                {modalError}
              </div>
            )}

            <div className="mt-5 grid gap-6 lg:grid-cols-12">
              {/* Preview Pane */}
              <div className="space-y-3 lg:col-span-6">
                <div className="overflow-hidden rounded-xl border border-slate-400/20 bg-[#050816]">
                  {previewLoading ? (
                    <div className="flex aspect-[4/3] items-center justify-center text-xs text-[#94A3B8]">
                      Loading authenticated Google Drive preview…
                    </div>
                  ) : previewError ? (
                    <div className="flex aspect-[4/3] items-center justify-center p-6 text-center text-xs text-amber-200">
                      {previewError}
                    </div>
                  ) : activeMedia.mimeType === 'application/pdf' && previewSrc ? (
                    <div className="flex aspect-[4/3] flex-col items-center justify-center gap-3 p-6 text-center">
                      <FileText className="h-12 w-12 text-[#22D3EE]" aria-hidden="true" />
                      <p className="text-sm font-medium text-[#F8FAFC]">PDF Document Ready</p>
                      <a
                        href={previewSrc}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex min-h-[40px] items-center gap-1.5 rounded-lg bg-[#2563EB] px-4 text-xs font-semibold text-white"
                      >
                        <ExternalLink className="h-3.5 w-3.5" aria-hidden="true" />
                        <span>Open PDF Preview</span>
                      </a>
                    </div>
                  ) : previewSrc ? (
                    <div className={`relative ${zoomed ? 'max-h-[460px] overflow-auto' : ''}`}>
                      <img
                        src={previewSrc}
                        alt={activeMedia.name}
                        referrerPolicy="no-referrer"
                        className={
                          zoomed
                            ? 'w-[160%] max-w-none object-contain'
                            : 'aspect-[4/3] w-full object-contain'
                        }
                      />
                    </div>
                  ) : null}
                </div>

                {activeMedia.mimeType !== 'application/pdf' && previewSrc && (
                  <button
                    type="button"
                    onClick={() => setZoomed((z) => !z)}
                    className="inline-flex min-h-[38px] items-center gap-1.5 rounded-lg border border-slate-400/20 px-3 text-xs text-[#F8FAFC]"
                  >
                    {zoomed ? <ZoomOut className="h-3.5 w-3.5" /> : <ZoomIn className="h-3.5 w-3.5" />}
                    <span>{zoomed ? 'Reset Zoom' : 'Zoom Preview'}</span>
                  </button>
                )}

                {/* Usage Tracker */}
                <div className="rounded-xl border border-slate-400/15 bg-[#050816]/70 p-3.5">
                  <p className="text-xs font-semibold text-[#F8FAFC]">Where Used in Portfolio</p>
                  {activeUsages.length === 0 ? (
                    <p className="mt-1 text-xs text-[#94A3B8]">
                      Not currently linked to any profile, project, research, or credential slot.
                    </p>
                  ) : (
                    <ul className="mt-2 space-y-1.5 text-xs">
                      {activeUsages.map((u) => (
                        <li key={`${u.kind}-${u.id}`} className="flex items-center justify-between gap-2">
                          <span className="truncate text-[#F8FAFC]">{u.title}</span>
                          <span className="shrink-0 font-mono text-[11px] text-[#22D3EE]">
                            {u.role} · {u.isPublished ? 'Published' : 'Draft'}
                          </span>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              </div>

              {/* Management Controls */}
              <div className="space-y-5 lg:col-span-6">
                {/* Visibility & Delivery Sync */}
                <div className="space-y-3 rounded-xl border border-slate-400/15 bg-[#050816]/70 p-4">
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-xs font-semibold text-[#F8FAFC]">
                      Visibility & Google Drive Permissions
                    </p>
                    <button
                      type="button"
                      disabled={verifyingBusy}
                      onClick={() => void handleVerifySync()}
                      className="inline-flex items-center gap-1 text-[11px] text-[#22D3EE] hover:underline disabled:opacity-50"
                    >
                      <RefreshCw className={`h-3 w-3 ${verifyingBusy ? 'animate-spin' : ''}`} />
                      <span>Verify Sync</span>
                    </button>
                  </div>

                  <div className="grid grid-cols-3 gap-2">
                    {(['PRIVATE', 'UNPUBLISHED', 'PUBLIC'] as MediaVisibility[]).map((vis) => {
                      const active = activeMedia.visibility === vis;
                      return (
                        <button
                          key={vis}
                          type="button"
                          disabled={visibilityBusy || !isConnected || active}
                          onClick={() => void handleChangeVisibility(vis)}
                          className={`min-h-[40px] rounded-lg px-2 text-xs font-semibold transition-colors disabled:opacity-60 ${
                            active
                              ? 'bg-[#2563EB] text-white'
                              : 'border border-slate-400/20 bg-[#080D1C] text-[#94A3B8] hover:text-white'
                          }`}
                        >
                          {vis}
                        </button>
                      );
                    })}
                  </div>

                  {activeMedia.visibility === 'PUBLIC' && activeMedia.publicUrl && (
                    <div className="space-y-1.5 pt-1">
                      <p className="text-[11px] text-[#94A3B8]">
                        Delivery Status:{' '}
                        <strong
                          className={
                            activeMedia.deliveryStatus === 'verified'
                              ? 'text-emerald-300'
                              : 'text-amber-300'
                          }
                        >
                          {activeMedia.deliveryStatus}
                        </strong>
                      </p>
                      {activeMedia.deliveryError && (
                        <p className="text-[11px] text-rose-300">{activeMedia.deliveryError}</p>
                      )}
                      <div className="flex items-center gap-2">
                        <input
                          readOnly
                          value={activeMedia.publicUrl}
                          aria-label="Public delivery URL"
                          className="min-h-[36px] flex-1 rounded-lg border border-slate-400/20 bg-[#080D1C] px-2.5 font-mono text-[11px] text-[#94A3B8]"
                        />
                        <button
                          type="button"
                          onClick={() => {
                            void navigator.clipboard.writeText(activeMedia.publicUrl || '');
                            setCopiedUrl(true);
                            setTimeout(() => setCopiedUrl(false), 1800);
                          }}
                          className="inline-flex min-h-[36px] items-center gap-1 rounded-lg border border-slate-400/20 px-2.5 text-xs text-[#F8FAFC]"
                        >
                          <Copy className="h-3.5 w-3.5" />
                          <span>{copiedUrl ? 'Copied' : 'Copy'}</span>
                        </button>
                      </div>
                    </div>
                  )}
                </div>

                {/* Metadata Edit */}
                <div className="space-y-3 rounded-xl border border-slate-400/15 bg-[#050816]/70 p-4">
                  <p className="text-xs font-semibold text-[#F8FAFC]">Rename & Metadata</p>
                  <input
                    type="text"
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    aria-label="Filename"
                    className="min-h-[42px] w-full rounded-lg border border-slate-400/20 bg-[#080D1C] px-3 text-sm text-[#F8FAFC]"
                  />
                  <select
                    value={editCategory}
                    onChange={(e) => setEditCategory(e.target.value as MediaCategory)}
                    aria-label="Media category"
                    className="min-h-[42px] w-full rounded-lg border border-slate-400/20 bg-[#080D1C] px-3 text-xs text-[#F8FAFC]"
                  >
                    {CATEGORY_OPTIONS.map((c) => (
                      <option key={c.value} value={c.value}>
                        {c.label}
                      </option>
                    ))}
                  </select>
                  <input
                    type="text"
                    value={editDescription}
                    onChange={(e) => setEditDescription(e.target.value)}
                    placeholder="Description or alt text note..."
                    className="min-h-[42px] w-full rounded-lg border border-slate-400/20 bg-[#080D1C] px-3 text-sm text-[#F8FAFC]"
                  />
                  <button
                    type="button"
                    disabled={savingMeta || (!isConnected && editName !== activeMedia.name)}
                    onClick={() => void handleSaveMetadata()}
                    className="min-h-[40px] rounded-lg bg-[#2563EB] px-4 text-xs font-semibold text-white hover:bg-[#1D4ED8] disabled:opacity-50"
                  >
                    {savingMeta ? 'Saving…' : 'Save Metadata'}
                  </button>
                </div>

                {/* Replace File & Delete Actions */}
                <div className="space-y-3 rounded-xl border border-slate-400/15 bg-[#050816]/70 p-4">
                  <input
                    ref={replaceInputRef}
                    type="file"
                    accept={
                      activeMedia.mimeType === 'application/pdf'
                        ? 'application/pdf'
                        : 'image/jpeg,image/png,image/webp'
                    }
                    onChange={(e) => {
                      const f = e.target.files?.[0];
                      e.target.value = '';
                      if (f) void handleReplaceFile(f);
                    }}
                    className="sr-only"
                  />
                  <label className="flex cursor-pointer items-center gap-2 text-xs text-[#94A3B8]">
                    <input
                      type="checkbox"
                      checked={deleteOldOnReplace}
                      onChange={(e) => setDeleteOldOnReplace(e.target.checked)}
                      className="h-4 w-4 accent-[#2563EB]"
                    />
                    <span>Delete previous Drive file after replacement</span>
                  </label>
                  {replacing && replaceProgress && (
                    <p className="font-mono text-xs text-[#22D3EE]">
                      Replacing… {replaceProgress.percent}%
                    </p>
                  )}
                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      disabled={replacing || !isConnected}
                      onClick={() => replaceInputRef.current?.click()}
                      className="inline-flex min-h-[42px] items-center gap-1.5 rounded-lg border border-slate-400/25 px-3.5 text-xs font-medium text-[#F8FAFC] hover:border-[#22D3EE]/50 disabled:opacity-50"
                    >
                      <Replace className="h-4 w-4 text-[#22D3EE]" aria-hidden="true" />
                      <span>Replace File</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setConfirmDeleteOpen(true)}
                      className="inline-flex min-h-[42px] items-center gap-1.5 rounded-lg border border-rose-500/35 px-3.5 text-xs font-medium text-rose-300 hover:bg-rose-950/30"
                    >
                      <Trash2 className="h-4 w-4" aria-hidden="true" />
                      <span>Delete Media…</span>
                    </button>
                  </div>

                  {confirmDeleteOpen && (
                    <div className="mt-3 space-y-3 rounded-xl border border-rose-500/40 bg-rose-950/30 p-3.5 text-xs text-rose-100">
                      <p className="font-semibold">Confirm permanent media deletion</p>
                      {publishedUsages.length > 0 && (
                        <div className="space-y-2 rounded-lg bg-[#050816]/60 p-2.5 text-amber-200">
                          <p>
                            Warning: This asset is currently referenced by {publishedUsages.length}{' '}
                            published item(s): {publishedUsages.map((u) => u.title).join(', ')}.
                          </p>
                          <label className="flex cursor-pointer items-center gap-2 font-medium">
                            <input
                              type="checkbox"
                              checked={ackPublishedDelete}
                              onChange={(e) => setAckPublishedDelete(e.target.checked)}
                              className="h-4 w-4 accent-rose-500"
                            />
                            <span>I understand public displays will lose this file</span>
                          </label>
                        </div>
                      )}
                      <label className="flex cursor-pointer items-center gap-2">
                        <input
                          type="checkbox"
                          checked={deleteInDriveAlso}
                          onChange={(e) => setDeleteInDriveAlso(e.target.checked)}
                          className="h-4 w-4 accent-rose-500"
                        />
                        <span>Also delete file permanently from Google Drive</span>
                      </label>
                      <div className="flex gap-2">
                        <button
                          type="button"
                          disabled={
                            deleting ||
                            (deleteInDriveAlso && !isConnected) ||
                            (publishedUsages.length > 0 && !ackPublishedDelete)
                          }
                          onClick={() => void handleConfirmDelete()}
                          className="min-h-[38px] rounded-lg bg-rose-600 px-3.5 font-semibold text-white disabled:opacity-50"
                        >
                          {deleting ? 'Deleting…' : 'Confirm Delete'}
                        </button>
                        <button
                          type="button"
                          onClick={() => setConfirmDeleteOpen(false)}
                          className="min-h-[38px] rounded-lg border border-slate-400/20 px-3 text-slate-200"
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
