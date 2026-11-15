import { FileText, RefreshCw, Trash2, Upload, XCircle } from 'lucide-react';
import { useRef, useState } from 'react';
import { startResumableUpload, type UploadController } from '../../services/storageUpload';
import { sanitizeExternalUrl } from '../../utils/validation';

interface MediaUploadFieldProps {
  label: string;
  helperText: string;
  folder: 'images' | 'cv' | 'research';
  value: string;
  fileName?: string;
  onChange: (nextUrl: string, nextFileName?: string) => void;
  onStatusChange?: (status: 'idle' | 'uploading' | 'error' | 'uploaded') => void;
}

export function MediaUploadField({
  label,
  helperText,
  folder,
  value,
  fileName,
  onChange,
  onStatusChange,
}: MediaUploadFieldProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const controllerRef = useRef<UploadController | null>(null);
  const lastFileRef = useRef<File | null>(null);

  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [confirmedMsg, setConfirmedMsg] = useState<string | null>(null);

  const isImage = folder === 'images';
  const acceptAttr = isImage ? 'image/jpeg,image/png,image/webp' : 'application/pdf';
  const constraintsText = isImage
    ? 'Accepted: JPEG, PNG, WebP · Max 5 MB (auto-resized & EXIF stripped)'
    : 'Accepted: PDF (.pdf) · Max 10 MB';

  const runUpload = async (file: File) => {
    lastFileRef.current = file;
    setErrorMsg(null);
    setConfirmedMsg(null);
    setUploading(true);
    setProgress(0);
    onStatusChange?.('uploading');

    const ctrl = startResumableUpload({
      file,
      folder,
      onProgress: (pct) => setProgress(pct),
    });
    controllerRef.current = ctrl;

    try {
      const result = await ctrl.promise;
      onChange(result.downloadUrl, result.fileName);
      setConfirmedMsg(`Confirmed in cloud storage: ${result.fileName}`);
      onStatusChange?.('uploaded');
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Upload failed. Please try again.');
      onStatusChange?.('error');
    } finally {
      setUploading(false);
      controllerRef.current = null;
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    void runUpload(file);
  };

  const safePreview = sanitizeExternalUrl(value);

  return (
    <div className="space-y-3 rounded-xl border border-slate-400/20 bg-[#050816]/60 p-4">
      <div>
        <p className="text-sm font-medium text-[#F8FAFC]">{label}</p>
        <p className="mt-0.5 text-xs text-[#94A3B8]">{helperText}</p>
        <p className="mt-1 font-mono text-[11px] text-[#22D3EE]">{constraintsText}</p>
      </div>

      <input
        ref={inputRef}
        type="file"
        accept={acceptAttr}
        onChange={handleFileChange}
        className="sr-only"
      />

      {safePreview && (
        <div className="overflow-hidden rounded-lg border border-slate-400/15 bg-[#080D1C]">
          {isImage ? (
            <img
              src={safePreview}
              alt={label}
              referrerPolicy="no-referrer"
              className="aspect-[16/9] max-h-52 w-full object-cover"
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
                  Open uploaded PDF
                </a>
              </div>
            </div>
          )}
        </div>
      )}

      {uploading && (
        <div className="space-y-2 rounded-lg border border-slate-400/15 bg-[#080D1C] p-3">
          <div className="flex items-center justify-between text-xs text-[#F8FAFC]">
            <span>Uploading to cloud storage…</span>
            <span className="font-mono tabular-nums">{progress}%</span>
          </div>
          <div className="h-1.5 overflow-hidden rounded-full bg-slate-400/20">
            <div
              className="h-full bg-[#22D3EE] transition-all duration-150"
              style={{ width: `${progress}%` }}
            />
          </div>
          <button
            type="button"
            onClick={() => controllerRef.current?.cancel()}
            className="inline-flex min-h-[36px] items-center gap-1.5 text-xs font-medium text-rose-300 hover:underline"
          >
            <XCircle className="h-3.5 w-3.5" aria-hidden="true" />
            <span>Cancel upload</span>
          </button>
        </div>
      )}

      {errorMsg && (
        <div
          role="alert"
          className="rounded-lg border border-rose-500/30 bg-rose-950/30 p-3 text-xs text-rose-200"
        >
          <p>{errorMsg}</p>
          {lastFileRef.current && (
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
        <p role="status" className="text-xs text-emerald-300">
          {confirmedMsg}
        </p>
      )}

      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          disabled={uploading}
          onClick={() => inputRef.current?.click()}
          className="inline-flex min-h-[44px] items-center gap-2 rounded-lg bg-[#2563EB] px-4 py-2 text-xs font-semibold text-white hover:bg-[#1D4ED8] disabled:opacity-50"
        >
          <Upload className="h-4 w-4" aria-hidden="true" />
          <span>{safePreview ? (isImage ? 'Replace photo' : 'Replace PDF') : isImage ? 'Choose from device' : 'Upload PDF'}</span>
        </button>

        {safePreview && !uploading && (
          <button
            type="button"
            onClick={() => {
              setConfirmedMsg(null);
              onChange('', '');
            }}
            className="inline-flex min-h-[44px] items-center gap-1.5 rounded-lg border border-slate-400/20 px-3.5 py-2 text-xs font-medium text-[#94A3B8] hover:text-rose-300"
          >
            <Trash2 className="h-4 w-4" aria-hidden="true" />
            <span>Remove</span>
          </button>
        )}
      </div>
    </div>
  );
}
