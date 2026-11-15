import { WifiOff } from 'lucide-react';
import { useSyncStatus } from '../../context/SyncStatusContext';

export function OfflineBanner() {
  const { isOnline } = useSyncStatus();
  if (isOnline) return null;

  return (
    <div
      role="status"
      className="border-b border-amber-500/30 bg-amber-950/50 px-4 py-2 text-center text-xs text-amber-200"
    >
      <span className="inline-flex items-center gap-2">
        <WifiOff className="h-3.5 w-3.5" aria-hidden="true" />
        <span>
          You are offline. Viewing locally cached public portfolio content—contact submission and
          cloud updates will resume when reconnected.
        </span>
      </span>
    </div>
  );
}
