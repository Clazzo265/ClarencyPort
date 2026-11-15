import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react';
import type { SyncStatus } from '../types/portfolio';
import { formatMalawiTime } from '../utils/portfolioLogic';

interface SyncStatusContextValue {
  isOnline: boolean;
  syncStatus: SyncStatus;
  lastSavedAt: string | null;
  hasUnsavedChanges: boolean;
  setSaving: () => void;
  setSaved: () => void;
  setUnsaved: (dirty: boolean) => void;
  setWaitingSync: () => void;
  setSyncError: () => void;
  resetSync: () => void;
}

const SyncStatusContext = createContext<SyncStatusContextValue | null>(null);

export function SyncStatusProvider({ children }: { children: ReactNode }) {
  const [isOnline, setIsOnline] = useState<boolean>(
    typeof navigator !== 'undefined' ? navigator.onLine : true,
  );
  const [syncStatus, setSyncStatus] = useState<SyncStatus>(
    typeof navigator !== 'undefined' && !navigator.onLine ? 'offline' : 'idle',
  );
  const [lastSavedAt, setLastSavedAt] = useState<string | null>(null);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);

  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      setSyncStatus((prev) => (prev === 'offline' ? 'reconnecting' : prev));
      setTimeout(() => {
        setSyncStatus((prev) => (prev === 'reconnecting' ? (hasUnsavedChanges ? 'waiting-sync' : 'idle') : prev));
      }, 900);
    };

    const handleOffline = () => {
      setIsOnline(false);
      setSyncStatus('offline');
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [hasUnsavedChanges]);

  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (hasUnsavedChanges) {
        e.preventDefault();
        e.returnValue = '';
      }
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [hasUnsavedChanges]);

  const setSaving = useCallback(() => {
    setSyncStatus(navigator.onLine ? 'saving' : 'offline');
  }, []);

  const setSaved = useCallback(() => {
    setHasUnsavedChanges(false);
    setLastSavedAt(formatMalawiTime(new Date().toISOString()));
    setSyncStatus('saved');
  }, []);

  const setUnsaved = useCallback((dirty: boolean) => {
    setHasUnsavedChanges(dirty);
    if (dirty) {
      setSyncStatus(navigator.onLine ? 'unsaved' : 'offline');
    } else {
      setSyncStatus((prev) => (prev === 'unsaved' ? 'idle' : prev));
    }
  }, []);

  const setWaitingSync = useCallback(() => {
    setSyncStatus('waiting-sync');
  }, []);

  const setSyncError = useCallback(() => {
    setSyncStatus('error');
  }, []);

  const resetSync = useCallback(() => {
    setHasUnsavedChanges(false);
    setSyncStatus(navigator.onLine ? 'idle' : 'offline');
  }, []);

  return (
    <SyncStatusContext.Provider
      value={{
        isOnline,
        syncStatus,
        lastSavedAt,
        hasUnsavedChanges,
        setSaving,
        setSaved,
        setUnsaved,
        setWaitingSync,
        setSyncError,
        resetSync,
      }}
    >
      {children}
    </SyncStatusContext.Provider>
  );
}

export function useSyncStatus(): SyncStatusContextValue {
  const ctx = useContext(SyncStatusContext);
  if (!ctx) throw new Error('useSyncStatus must be used within SyncStatusProvider');
  return ctx;
}
