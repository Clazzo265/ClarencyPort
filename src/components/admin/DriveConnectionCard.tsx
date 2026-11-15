import { AlertCircle, CheckCircle2, Cloud, FolderCheck, LogOut, RefreshCw } from 'lucide-react';
import { useEffect, useState } from 'react';
import {
  disconnectGoogleDrive,
  subscribeDriveAuth,
  type DriveAuthSnapshot,
} from '../../services/googleDriveAuth';
import { connectAndInitDriveWorkspace } from '../../services/mediaService';
import type { DriveWorkspaceConfig } from '../../types/portfolio';

interface DriveConnectionCardProps {
  driveConfig: DriveWorkspaceConfig | null;
  compact?: boolean;
  onConnected?: () => void;
}

export function DriveConnectionCard({
  driveConfig,
  compact = false,
  onConnected,
}: DriveConnectionCardProps) {
  const [authSnap, setAuthSnap] = useState<DriveAuthSnapshot>({
    status: 'disconnected',
    connectedEmail: null,
    expiresAtMs: null,
    error: null,
  });
  const [connecting, setConnecting] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  useEffect(() => {
    return subscribeDriveAuth(setAuthSnap);
  }, []);

  const handleConnect = async (forceAccountChooser = false) => {
    setConnecting(true);
    setActionError(null);
    try {
      await connectAndInitDriveWorkspace({ forceAccountChooser });
      onConnected?.();
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'Unable to connect Google Drive.');
    } finally {
      setConnecting(false);
    }
  };

  const isConnected = authSnap.status === 'connected';
  const isExpired = authSnap.status === 'expired';
  const displayError = actionError || authSnap.error;

  if (compact) {
    return (
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-400/20 bg-[#080D1C] p-3.5">
        <div className="flex min-w-0 items-center gap-2.5">
          {isConnected ? (
            <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-400" aria-hidden="true" />
          ) : (
            <Cloud className="h-4 w-4 shrink-0 text-[#22D3EE]" aria-hidden="true" />
          )}
          <div className="min-w-0">
            <p className="truncate text-xs font-medium text-[#F8FAFC]">
              {isConnected
                ? `Google Drive connected (${authSnap.connectedEmail || driveConfig?.connectedEmail || 'Session Active'})`
                : isExpired
                  ? 'Google Drive session expired — renew to upload or edit'
                  : 'Connect Google Drive to upload or manage media'}
            </p>
            {displayError && !isConnected && (
              <p className="mt-0.5 text-[11px] text-rose-300">{displayError}</p>
            )}
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          {!isConnected ? (
            <button
              type="button"
              disabled={connecting}
              onClick={() => void handleConnect(false)}
              className="inline-flex min-h-[40px] items-center gap-1.5 rounded-lg bg-[#2563EB] px-3.5 text-xs font-semibold text-white hover:bg-[#1D4ED8] disabled:opacity-50"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${connecting ? 'animate-spin' : ''}`} />
              <span>{connecting ? 'Connecting…' : isExpired ? 'Renew Drive Session' : 'Connect Google Drive'}</span>
            </button>
          ) : (
            <button
              type="button"
              onClick={() => disconnectGoogleDrive()}
              className="inline-flex min-h-[36px] items-center gap-1.5 rounded-lg border border-slate-400/20 px-3 text-xs text-[#94A3B8] hover:text-[#F8FAFC]"
            >
              <LogOut className="h-3.5 w-3.5" aria-hidden="true" />
              <span>Disconnect</span>
            </button>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="kl-surface rounded-2xl p-5">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-start gap-3.5">
          <div
            className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ${
              isConnected
                ? 'bg-emerald-500/15 text-emerald-300'
                : isExpired
                  ? 'bg-amber-500/15 text-amber-300'
                  : 'bg-[#2563EB]/20 text-[#22D3EE]'
            }`}
          >
            {isConnected ? (
              <FolderCheck className="h-5 w-5" aria-hidden="true" />
            ) : (
              <Cloud className="h-5 w-5" aria-hidden="true" />
            )}
          </div>
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="font-display text-base font-semibold text-[#F8FAFC]">
                Google Drive Media Storage
              </h2>
              <span
                className={`rounded-md px-2 py-0.5 font-mono text-[11px] ${
                  isConnected
                    ? 'bg-emerald-500/15 text-emerald-300'
                    : isExpired
                      ? 'bg-amber-500/15 text-amber-300'
                      : 'bg-slate-400/15 text-[#94A3B8]'
                }`}
              >
                {isConnected ? 'Connected' : isExpired ? 'Session Expired' : 'Not Connected'}
              </span>
            </div>
            <p className="mt-1 text-xs leading-relaxed text-[#94A3B8]">
              {isConnected
                ? `Active in-memory session for ${authSnap.connectedEmail || driveConfig?.connectedEmail || 'authorized account'}. Root folder: ${driveConfig?.rootFolderName || 'KLARENCY MEDIA'}.`
                : 'Uses least-privilege drive.file access — KLARENCY can only see files it uploads into KLARENCY MEDIA. Tokens stay strictly in session memory.'}
            </p>
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            disabled={connecting}
            onClick={() => void handleConnect(false)}
            className="inline-flex min-h-[44px] items-center gap-2 rounded-lg bg-[#2563EB] px-4 text-xs font-semibold text-white hover:bg-[#1D4ED8] disabled:opacity-50"
          >
            <RefreshCw className={`h-4 w-4 ${connecting ? 'animate-spin' : ''}`} />
            <span>
              {connecting
                ? 'Authorizing…'
                : isConnected
                  ? 'Re-verify Folders'
                  : isExpired
                    ? 'Renew Authorization'
                    : 'Connect Google Drive'}
            </span>
          </button>

          {isConnected && (
            <>
              <button
                type="button"
                disabled={connecting}
                onClick={() => void handleConnect(true)}
                className="min-h-[44px] rounded-lg border border-slate-400/20 px-3.5 text-xs font-medium text-[#94A3B8] hover:text-[#F8FAFC]"
              >
                Switch Account
              </button>
              <button
                type="button"
                onClick={() => disconnectGoogleDrive()}
                className="inline-flex min-h-[44px] items-center gap-1.5 rounded-lg border border-slate-400/20 px-3.5 text-xs font-medium text-[#94A3B8] hover:text-rose-300"
              >
                <LogOut className="h-4 w-4" aria-hidden="true" />
                <span>Disconnect</span>
              </button>
            </>
          )}
        </div>
      </div>

      {displayError && (
        <div
          role="alert"
          className="mt-4 flex items-start gap-2 rounded-xl border border-rose-500/30 bg-rose-950/30 p-3 text-xs text-rose-200"
        >
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-rose-300" aria-hidden="true" />
          <span>{displayError}</span>
        </div>
      )}
    </div>
  );
}
