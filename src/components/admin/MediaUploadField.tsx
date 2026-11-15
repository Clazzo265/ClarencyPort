import {
  AlertTriangle,
  CheckCircle2,
  Crop,
  FileText,
  FolderOpen,
  Globe,
  Lock,
  Pause,
  Play,
  RefreshCw,
  Trash2,
  Upload,
  XCircle,
} from 'lucide-react';
import { motion } from 'motion/react';
import { useEffect, useRef, useState } from 'react';
import { subscribeDriveAuth, type DriveAuthSnapshot } from '../../services/googleDriveAuth';
import type { ProviderUploadProgress } from '../../services/mediaProvider';
import {
  changeMediaVisibility,
  startManagedMediaUpload,
  type ManagedUploadHandle,
} from '../../services/mediaService';
import type {
  DriveWorkspaceConfig,
  MediaCategory,
  MediaFileRecord,
} from '../../types/portfolio';
import {
  findDuplicateMediaRecords,
  formatBytes,
  inspectFileMagicBytes,
  validateMediaDescriptor,
} from '../../utils/mediaLogic';
import { sanitizeExternalUrl } from '../../utils/validation';
import { SmartDriveImage } from '../shared/SmartDriveImage';
import { DriveConnectionCard } from './DriveConnectionCard';
import { MediaLibraryPickerModal } from './MediaLibraryPickerModal';

interface MediaUploadFieldProps {
  label: string;
  helperText: string;
  folder?: 'images' | 'cv' | 'research';
  category?: MediaCategory;
  contextSlug?: string;
  value: string;
  mediaId?: string;
  fileName?: string;
  mediaFiles?: MediaFileRecord[];
  driveConfig?: DriveWorkspaceConfig | null;
  allowCropToggle?: boolean;
  cropSquareDefault?: boolean;
  allowPublicToggle?: boolean;
  onChange: (nextUrl: string, nextFileName?: string, nextMediaId?: string) => void;
  onStatusChange?: (status: 'idle' | 'uploading' | 'error' | 'uploaded') => void;
}

export function MediaUploadField({
  label,
  helperText,
  folder = 'images',
  category,
  contextSlug,
  value,
  mediaId,
  fileName,
  mediaFiles = [],
  driveConfig = null,
  allowCropToggle = false,
  cropSquareDefault = false,
  allowPublicToggle = true,
  onChange,
  onStatusChange,
}: MediaUploadFieldProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const handleRef = useRef<ManagedUploadHandle | null>(null);
  const lastFileRef = useRef<File | null>(null);

  const resolvedCategory: MediaCategory =
    category ??
    (folder === 'cv' ? 'cv' : folder === 'research' ? 'research' : 'project-cover');
  const isImage =
    folder === 'images' &&
    resolvedCategory !== 'cv' &&
    resolvedCategory !== 'research';

  const [driveAuth, setDriveAuth] = useState<DriveAuthSnapshot>({
    status: 'disconnected',
    connectedEmail: null,
    expiresAtMs: null,
    error: null,
  });
  const [dragActive, setDragActive] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState<ProviderUploadProgress | null>(null);
  const [cropSquare, setCropSquare] = useState(cropSquareDefault);
  const [makePublicAfterUpload, setMakePublicAfterUpload] = useState(false);
  const [duplicateCandidate, setDuplicateCandidate] = useState<{
    file: File;
    matches: MediaFileRecord[];
  } | null>(null);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [lastUploadedRecord, setLastUploadedRecord] = useState<MediaFileRecord | null>(null);
  const [publishing, setPublishing] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [confirmedMsg, setConfirmedMsg] = useState<string | null>(null);

  useEffect(() => {
    return subscribeDriveAuth(setDriveAuth);
  }, []);

  const linkedRecord =
    mediaFiles.find((m) => m.id === mediaId) ??
    lastUploadedRecord ??
    null;

  const acceptAttr = isImage ? 'image/jpeg,image/png,image/webp' : 'application/pdf';
  const constraintsText = isImage
    ? 'Accepted: JPEG, PNG, WebP · Max 10 MB (auto-resized & EXIF stripped)'
    : 'Accepted: PDF (.pdf) · Max 15 MB (stored uncompressed)';

  const inspectAndMaybeWarnDuplicate = async (file: File) => {
    setErrorMsg(null);
    setConfirmedMsg(null);
    setDuplicateCandidate(null);

    const slice = new Uint8Array(await file.slice(0, 16).arrayBuffer());
    const magic = inspectFileMagicBytes(slice);
    const check = validateMediaDescriptor({
      name: file.name,
      size: file.size,
      declaredMime: file.type,
      magicMime: magic,
      expectedKind: isImage ? 'image' : 'pdf',
    });

    if (!check.valid) {
      setErrorMsg(check.error);
      onStatusChange?.('error');
      return;
    }

    const matches = findDuplicateMediaRecords(mediaFiles, {
      originalName: file.name,
      size: file.size,
      category: resolvedCategory,
    });
    if (matches.length > 0) {
      setDuplicateCandidate({ file, matches });
      return;
    }

    void runUpload(file);
  };

  const runUpload = async (file: File) => {
    lastFileRef.current = file;
    setDuplicateCandidate(null);
    setErrorMsg(null);
    setConfirmedMsg(null);
    setUploading(true);
    setProgress({
      state: 'preparing',
      bytesTransferred: 0,
      totalBytes: file.size,
      percent: 0,
      detailMessage: 'Preparing resumable Google Drive upload…',
    });
    onStatusChange?.('uploading');

    const ctrl = startManagedMediaUpload({
      file,
      category: resolvedCategory,
      contextSlug,
      cropSquare: isImage && cropSquare,
      makePublic: allowPublicToggle && makePublicAfterUpload,
      existingConfig: driveConfig,
      onProgress: (p) => setProgress(p),
    });
    handleRef.current = ctrl;

    try {
      const record = await ctrl.promise;
      setLastUploadedRecord(record);
      const nextUrl = record.publicUrl || '';
      onChange(nextUrl, record.name, record.id);
      setConfirmedMsg(
        record.visibility === 'PUBLIC'
          ? `Uploaded & published in Google Drive: ${record.name}`
          : `Saved privately to Google Drive (${record.name}). Publish below if visitors should see it.`,
      );
      onStatusChange?.('uploaded');
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Upload failed. Please try again.';
      setErrorMsg(msg);
      onStatusChange?.('error');
    } finally {
      setUploading(false);
      handleRef.current = null;
    }
  };

  const handlePublishLinked = async () => {
    if (!linkedRecord) return;
    setPublishing(true);
    setErrorMsg(null);
    try {
      const updated = await changeMediaVisibility(linkedRecord, 'PUBLIC');
      setLastUploadedRecord(updated);
      onChange(updated.publicUrl || '', updated.name, updated.id);
      setConfirmedMsg(
        updated.deliveryStatus === 'verified'
          ? `Public delivery verified for ${updated.name}.`
          : updated.deliveryError || 'Marked public in Google Drive.',
      );
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Could not publish media file.');
    } finally {
      setPublishing(false);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    void inspectAndMaybeWarnDuplicate(file);
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setDragActive(false);
    if (uploading) return;
    const file = e.dataTransfer.files?.[0];
    if (file) {
      void inspectAndMaybeWarnDuplicate(file);
    }
  };

  const safePreview = sanitizeExternalUrl(value);
  const isDriveConnected = driveAuth.status === 'connected';
  const isPaused = progress?.state === 'paused';

  return (
    <div
      onDragOver={(e) => {
        e.preventDefault();
        if (!uploading) setDragActive(true);
      }}
      onDragLeave={() => setDragActive(false)}
      onDrop={handleDrop}
      className={`space-y-3.5 rounded-xl border p-4 transition-colors duration-150 ${
        dragActive
          ? 'border-[#22D3EE] bg-[#2563EB]/10'
          : 'border-slate-400/20 bg-[#050816]/60'
      }`}
    >
      <div>
        <p className="text-sm font-medium text-[#F8FAFC]">{label}</p>
        <p className="mt-0.5 text-xs text-[#94A3B8]">{helperText}</p>
        <p className="mt-1 font-mono text-[11px] text-[#22D3EE]">{constraintsText}</p>
      </div>

      {!isDriveConnected && <DriveConnectionCard driveConfig={driveConfig} compact />}

      <input
        ref={inputRef}
        type="file"
        accept={acceptAttr}
        onChange={handleFileChange}
        className="sr-only"
      />

      {(allowCropToggle || allowPublicToggle) && (
        <div className="flex flex-wrap gap-4 rounded-lg border border-slate-400/15 bg-[#080D1C]/70 px-3 py-2.5 text-xs text-[#94A3B8]">
          {isImage && allowCropToggle && (
            <label className="flex min-h-[36px] cursor-pointer items-center gap-2 text-[#F8FAFC]">
              <input
                type="checkbox"
                checked={cropSquare}
                onChange={(e) => setCropSquare(e.target.checked)}
                className="h-4 w-4 accent-[#2563EB]"
              />
              <Crop className="h-3.5 w-3.5 text-[#22D3EE]" aria-hidden="true" />
              <span>Square crop (1:1 portrait)</span>
            </label>
          )}
          {allowPublicToggle && (
            <label className="flex min-h-[36px] cursor-pointer items-center gap-2 text-[#F8FAFC]">
              <input
                type="checkbox"
                checked={makePublicAfterUpload}
                onChange={(e) => setMakePublicAfterUpload(e.target.checked)}
                className="h-4 w-4 accent-[#2563EB]"
              />
              <Globe className="h-3.5 w-3.5 text-[#22D3EE]" aria-hidden="true" />
              <span>Publish to portfolio visitors on upload</span>
            </label>
          )}
        </div>
      )}

      {safePreview && (
        <div className="overflow-hidden rounded-lg border border-slate-400/15 bg-[#080D1C]">
          {isImage ? (
            <SmartDriveImage
              src={safePreview}
              alt={label}
              className="aspect-[16/9] max-h-52 w-full object-cover"
              fallback={
                <div className="flex aspect-[16/9] max-h-52 items-center justify-center bg-[#080D1C] p-4 text-xs text-[#94A3B8]">
                  Preview unavailable until Drive public delivery is confirmed.
                </div>
              }
            />
          ) : (
            <div className="flex items-center gap-3 p-3.5 text-sm text-[#F8FAFC]">
              <FileText className="h-5 w-5 shrink-0 text-[#22D3EE]" aria-hidden="true" />
              <div className="min-w-0 flex-1">
                <p className="truncate font-medium">{fileName || 'Uploaded PDF Document'}</p>
                <a
                  href={safePreview}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs text-[#22D3EE] hover:underline"
                >
                  Open PDF
                </a>
              </div>
            </div>
          )}
        </div>
      )}

      {linkedRecord && linkedRecord.visibility !== 'PUBLIC' && (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-amber-500/30 bg-amber-950/25 p-3 text-xs text-amber-100">
          <div className="flex items-center gap-2">
            <Lock className="h-4 w-4 shrink-0 text-amber-300" aria-hidden="true" />
            <span>
              <strong>{linkedRecord.name}</strong> is currently{' '}
              <strong>{linkedRecord.visibility}</strong> in Google Drive. Visitors cannot load it
              until published.
            </span>
          </div>
          <button
            type="button"
            disabled={publishing || !isDriveConnected}
            onClick={() => void handlePublishLinked()}
            className="inline-flex min-h-[36px] items-center gap-1.5 rounded-lg bg-[#2563EB] px-3 text-xs font-semibold text-white hover:bg-[#1D4ED8] disabled:opacity-50"
          >
            <Globe className="h-3.5 w-3.5" aria-hidden="true" />
            <span>{publishing ? 'Publishing…' : 'Publish File Now'}</span>
          </button>
        </div>
      )}

      {duplicateCandidate && (
        <div className="space-y-2.5 rounded-xl border border-amber-500/35 bg-amber-950/30 p-3.5 text-xs text-amber-100">
          <div className="flex items-start gap-2">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-300" aria-hidden="true" />
            <div>
              <p className="font-semibold">Similar file already exists in Media Library</p>
              <p className="mt-0.5 text-amber-200/80">
                Found {duplicateCandidate.matches.length} matching file(s):{' '}
                {duplicateCandidate.matches.map((m) => m.name).join(', ')}. Reuse existing to save
                Google Drive quota, or upload anyway.
              </p>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => {
                const match = duplicateCandidate.matches[0];
                setDuplicateCandidate(null);
                onChange(match.publicUrl || '', match.name, match.id);
                setLastUploadedRecord(match);
              }}
              className="min-h-[36px] rounded-lg bg-[#2563EB] px-3 font-semibold text-white"
            >
              Use Existing File
            </button>
            <button
              type="button"
              onClick={() => void runUpload(duplicateCandidate.file)}
              className="min-h-[36px] rounded-lg border border-amber-400/30 px-3 font-medium text-amber-100"
            >
              Upload New Copy
            </button>
            <button
              type="button"
              onClick={() => setDuplicateCandidate(null)}
              className="min-h-[36px] px-2 text-amber-200/80 hover:text-white"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {uploading && progress && (
        <div className="space-y-2.5 rounded-lg border border-slate-400/15 bg-[#080D1C] p-3.5">
          <div className="flex items-center justify-between gap-2 text-xs text-[#F8FAFC]">
            <span className="truncate">{progress.detailMessage || 'Uploading to Google Drive…'}</span>
            <span className="shrink-0 font-mono tabular-nums text-[#22D3EE]">
              {progress.percent}% ({formatBytes(progress.bytesTransferred)} /{' '}
              {formatBytes(progress.totalBytes)})
            </span>
          </div>
          <div className="h-1.5 overflow-hidden rounded-full bg-slate-400/20">
            <motion.div
              className="h-full bg-[#22D3EE]"
              initial={{ width: 0 }}
              animate={{ width: `${progress.percent}%` }}
              transition={{ duration: 0.15 }}
            />
          </div>
          <div className="flex flex-wrap gap-3">
            {isPaused ? (
              <button
                type="button"
                onClick={() => handleRef.current?.resume()}
                className="inline-flex min-h-[36px] items-center gap-1.5 text-xs font-medium text-[#22D3EE] hover:underline"
              >
                <Play className="h-3.5 w-3.5" aria-hidden="true" />
                <span>Resume</span>
              </button>
            ) : (
              <button
                type="button"
                onClick={() => handleRef.current?.pause()}
                className="inline-flex min-h-[36px] items-center gap-1.5 text-xs font-medium text-amber-300 hover:underline"
              >
                <Pause className="h-3.5 w-3.5" aria-hidden="true" />
                <span>Pause</span>
              </button>
            )}
            <button
              type="button"
              onClick={() => handleRef.current?.cancel()}
              className="inline-flex min-h-[36px] items-center gap-1.5 text-xs font-medium text-rose-300 hover:underline"
            >
              <XCircle className="h-3.5 w-3.5" aria-hidden="true" />
              <span>Cancel upload</span>
            </button>
          </div>
        </div>
      )}

      {errorMsg && (
        <div
          role="alert"
          className="rounded-lg border border-rose-500/30 bg-rose-950/30 p-3 text-xs text-rose-200"
        >
          <p>{errorMsg}</p>
          {lastFileRef.current && isDriveConnected && (
            <button
              type="button"
              onClick={() => lastFileRef.current && void runUpload(lastFileRef.current)}
              className="mt-2 inline-flex min-h-[36px] items-center gap-1.5 font-medium text-[#22D3EE] hover:underline"
            >
              <RefreshCw className="h-3.5 w-3.5" aria-hidden="true" />
              <span>Retry upload</span>
            </button>
          )}
        </div>
      )}

      {confirmedMsg && !uploading && (
        <p role="status" className="flex items-center gap-1.5 text-xs text-emerald-300">
          <CheckCircle2 className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
          <span>{confirmedMsg}</span>
        </p>
      )}

      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          disabled={uploading || !isDriveConnected}
          onClick={() => inputRef.current?.click()}
          className="inline-flex min-h-[44px] items-center gap-2 rounded-lg bg-[#2563EB] px-4 py-2 text-xs font-semibold text-white transition-colors hover:bg-[#1D4ED8] disabled:opacity-50"
        >
          <Upload className="h-4 w-4" aria-hidden="true" />
          <span>
            {safePreview || linkedRecord
              ? isImage
                ? 'Upload New Photo'
                : 'Upload New PDF'
              : isImage
                ? 'Upload from Device'
                : 'Upload PDF'}
          </span>
        </button>

        <button
          type="button"
          disabled={uploading}
          onClick={() => setPickerOpen(true)}
          className="inline-flex min-h-[44px] items-center gap-2 rounded-lg border border-slate-400/25 bg-[#080D1C] px-4 py-2 text-xs font-medium text-[#F8FAFC] hover:border-[#22D3EE]/50 disabled:opacity-50"
        >
          <FolderOpen className="h-4 w-4 text-[#22D3EE]" aria-hidden="true" />
          <span>Choose from Media Library</span>
        </button>

        {(safePreview || linkedRecord) && !uploading && (
          <button
            type="button"
            onClick={() => {
              setConfirmedMsg(null);
              setLastUploadedRecord(null);
              onChange('', '', '');
            }}
            className="inline-flex min-h-[44px] items-center gap-1.5 rounded-lg border border-slate-400/20 px-3.5 py-2 text-xs font-medium text-[#94A3B8] hover:text-rose-300"
          >
            <Trash2 className="h-4 w-4" aria-hidden="true" />
            <span>Unlink</span>
          </button>
        )}
      </div>

      <MediaLibraryPickerModal
        open={pickerOpen}
        onClose={() => setPickerOpen(false)}
        mediaFiles={mediaFiles}
        expectedKind={isImage ? 'image' : 'pdf'}
        requirePublicForDisplay={allowPublicToggle}
        onSelect={(rec) => {
          setLastUploadedRecord(rec);
          onChange(rec.publicUrl || '', rec.name, rec.id);
          setConfirmedMsg(`Linked from Media Library: ${rec.name}`);
        }}
      />
    </div>
  );
}
