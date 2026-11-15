import { Check, FileText, Globe, Lock, Search, X } from 'lucide-react';
import { useMemo, useState } from 'react';
import { changeMediaVisibility } from '../../services/mediaService';
import type { MediaFileRecord } from '../../types/portfolio';
import { filterMediaFiles, formatBytes } from '../../utils/mediaLogic';
import { SmartDriveImage } from '../shared/SmartDriveImage';

interface MediaLibraryPickerModalProps {
  open: boolean;
  onClose: () => void;
  mediaFiles: MediaFileRecord[];
  expectedKind?: 'image' | 'pdf' | 'any';
  requirePublicForDisplay?: boolean;
  onSelect: (record: MediaFileRecord) => void;
}

export function MediaLibraryPickerModal({
  open,
  onClose,
  mediaFiles,
  expectedKind = 'any',
  requirePublicForDisplay = false,
  onSelect,
}: MediaLibraryPickerModalProps) {
  const [query, setQuery] = useState('');
  const [publishingId, setPublishingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const typeFilter =
    expectedKind === 'image' ? 'images' : expectedKind === 'pdf' ? 'documents' : 'all';

  const items = useMemo(
    () =>
      filterMediaFiles(mediaFiles, {
        query,
        typeFilter,
        sort: 'newest',
      }),
    [mediaFiles, query, typeFilter],
  );

  if (!open) return null;

  const handleChoose = async (item: MediaFileRecord, publishFirst: boolean) => {
    setError(null);
    if (publishFirst && item.visibility !== 'PUBLIC') {
      setPublishingId(item.id);
      try {
        const updated = await changeMediaVisibility(item, 'PUBLIC');
        onSelect(updated);
        onClose();
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Unable to publish selected file.');
      } finally {
        setPublishingId(null);
      }
      return;
    }

    onSelect(item);
    onClose();
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Choose from Media Library"
      className="fixed inset-0 z-50 flex items-center justify-center bg-[#050816]/85 p-4 backdrop-blur-sm"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="flex max-h-[88vh] w-full max-w-3xl flex-col overflow-hidden rounded-2xl border border-slate-400/25 bg-[#080D1C] shadow-2xl">
        <div className="flex items-center justify-between gap-4 border-b border-slate-400/15 px-5 py-4">
          <div>
            <h2 className="font-display text-lg font-bold text-[#F8FAFC]">
              Select from Media Library
            </h2>
            <p className="text-xs text-[#94A3B8]">
              Reuse already uploaded Google Drive assets without uploading duplicates.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close media picker"
            className="inline-flex h-10 w-10 items-center justify-center rounded-lg border border-slate-400/20 text-[#94A3B8] hover:text-[#F8FAFC]"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="border-b border-slate-400/15 px-5 py-3">
          <div className="relative">
            <Search
              className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#94A3B8]"
              aria-hidden="true"
            />
            <input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search uploaded photos or PDFs..."
              className="min-h-[42px] w-full rounded-lg border border-slate-400/20 bg-[#050816] pl-9 pr-3 text-sm text-[#F8FAFC]"
            />
          </div>
          {error && (
            <p role="alert" className="mt-2 text-xs text-rose-300">
              {error}
            </p>
          )}
        </div>

        <div className="flex-1 overflow-y-auto p-5">
          {items.length === 0 ? (
            <div className="rounded-xl border border-slate-400/15 bg-[#050816]/60 p-8 text-center text-sm text-[#94A3B8]">
              No matching {expectedKind === 'pdf' ? 'PDF documents' : expectedKind === 'image' ? 'images' : 'media files'} found in Media Library yet.
            </div>
          ) : (
            <div className="grid gap-3 sm:grid-cols-2">
              {items.map((item) => {
                const isImage = item.mimeType !== 'application/pdf';
                const isPublic = item.visibility === 'PUBLIC';
                const busy = publishingId === item.id;

                return (
                  <div
                    key={item.id}
                    className="flex flex-col justify-between gap-3 rounded-xl border border-slate-400/20 bg-[#050816]/80 p-3.5"
                  >
                    <div className="flex items-start gap-3">
                      <div className="h-16 w-20 shrink-0 overflow-hidden rounded-lg border border-slate-400/15 bg-[#080D1C]">
                        {isImage && isPublic && item.publicUrl ? (
                          <SmartDriveImage
                            src={item.publicUrl}
                            alt={item.name}
                            className="h-full w-full object-cover"
                            fallback={
                              <div className="flex h-full items-center justify-center text-[10px] text-[#94A3B8]">
                                Drive Img
                              </div>
                            }
                          />
                        ) : (
                          <div className="flex h-full flex-col items-center justify-center gap-1 text-[#22D3EE]">
                            {isImage ? (
                              <Lock className="h-4 w-4 text-amber-300" aria-hidden="true" />
                            ) : (
                              <FileText className="h-5 w-5" aria-hidden="true" />
                            )}
                            <span className="font-mono text-[10px] text-[#94A3B8]">
                              {isImage ? 'Private' : 'PDF'}
                            </span>
                          </div>
                        )}
                      </div>

                      <div className="min-w-0 flex-1">
                        <p className="truncate text-xs font-semibold text-[#F8FAFC]">{item.name}</p>
                        <p className="mt-0.5 font-mono text-[11px] text-[#94A3B8]">
                          {item.category} · {formatBytes(item.size)}
                        </p>
                        <div className="mt-1.5 inline-flex items-center gap-1 rounded px-1.5 py-0.5 font-mono text-[10px] bg-slate-400/10 text-[#22D3EE]">
                          {isPublic ? (
                            <>
                              <Globe className="h-3 w-3 text-emerald-300" />
                              <span className="text-emerald-300">PUBLIC</span>
                            </>
                          ) : (
                            <>
                              <Lock className="h-3 w-3 text-amber-300" />
                              <span className="text-amber-300">{item.visibility}</span>
                            </>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="flex flex-wrap gap-2">
                      {requirePublicForDisplay && !isPublic ? (
                        <button
                          type="button"
                          disabled={busy}
                          onClick={() => void handleChoose(item, true)}
                          className="inline-flex min-h-[38px] flex-1 items-center justify-center gap-1.5 rounded-lg bg-[#2563EB] px-3 text-xs font-semibold text-white hover:bg-[#1D4ED8] disabled:opacity-50"
                        >
                          <Globe className="h-3.5 w-3.5" aria-hidden="true" />
                          <span>{busy ? 'Publishing…' : 'Publish & Select'}</span>
                        </button>
                      ) : (
                        <button
                          type="button"
                          onClick={() => void handleChoose(item, false)}
                          className="inline-flex min-h-[38px] flex-1 items-center justify-center gap-1.5 rounded-lg bg-[#2563EB] px-3 text-xs font-semibold text-white hover:bg-[#1D4ED8]"
                        >
                          <Check className="h-3.5 w-3.5" aria-hidden="true" />
                          <span>Select</span>
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
