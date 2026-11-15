import type { MediaCategory } from '../types/portfolio';

const DB_NAME = 'klarency_drafts_db';
const DB_VERSION = 1;
const STORE_NAME = 'drafts';
const DEFAULT_TTL_MS = 14 * 24 * 60 * 60 * 1000; // 14 days
const PENDING_MEDIA_KEY = 'klarency_pending_media_recovery';

export interface LocalDraftRecord<T = unknown> {
  key: string;
  data: T;
  updatedAt: number;
  expiresAt: number;
}

export interface PendingMediaRecovery {
  id: string;
  name: string;
  originalName: string;
  mimeType: 'image/jpeg' | 'image/png' | 'image/webp' | 'application/pdf';
  size: number;
  sha256?: string;
  width?: number;
  height?: number;
  driveFileId: string;
  driveFolderId: string;
  category: MediaCategory;
  description?: string;
  createdAtMs: number;
}

function openDraftDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof indexedDB === 'undefined') {
      reject(new Error('IndexedDB is unavailable in this environment.'));
      return;
    }
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: 'key' });
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error ?? new Error('Failed to open IndexedDB.'));
  });
}

export async function saveLocalDraft<T>(key: string, data: T, ttlMs = DEFAULT_TTL_MS): Promise<number> {
  const now = Date.now();
  const record: LocalDraftRecord<T> = {
    key,
    data,
    updatedAt: now,
    expiresAt: now + ttlMs,
  };
  try {
    const db = await openDraftDb();
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      tx.objectStore(STORE_NAME).put(record);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error ?? new Error('Failed to save local draft.'));
    });
    db.close();
  } catch (err) {
    console.warn('Local draft persistence skipped:', err);
  }
  return now;
}

export async function loadLocalDraft<T>(key: string): Promise<LocalDraftRecord<T> | null> {
  try {
    const db = await openDraftDb();
    const record = await new Promise<LocalDraftRecord<T> | undefined>((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readonly');
      const req = tx.objectStore(STORE_NAME).get(key);
      req.onsuccess = () => resolve(req.result as LocalDraftRecord<T> | undefined);
      req.onerror = () => reject(req.error ?? new Error('Failed to read local draft.'));
    });
    db.close();

    if (!record) return null;
    if (record.expiresAt < Date.now()) {
      await clearLocalDraft(key);
      return null;
    }
    return record;
  } catch {
    return null;
  }
}

export async function clearLocalDraft(key: string): Promise<void> {
  try {
    const db = await openDraftDb();
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      tx.objectStore(STORE_NAME).delete(key);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error ?? new Error('Failed to delete local draft.'));
    });
    db.close();
  } catch {
    // No-op if IndexedDB is unavailable
  }
}

export async function purgeExpiredDrafts(): Promise<number> {
  let removed = 0;
  try {
    const db = await openDraftDb();
    const now = Date.now();
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      const req = store.openCursor();
      req.onsuccess = () => {
        const cursor = req.result;
        if (!cursor) return;
        const val = cursor.value as LocalDraftRecord;
        if (val.expiresAt < now) {
          cursor.delete();
          removed += 1;
        }
        cursor.continue();
      };
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error ?? new Error('Failed to purge expired drafts.'));
    });
    db.close();
  } catch {
    return 0;
  }
  return removed;
}

export async function loadPendingMediaRecoveries(): Promise<PendingMediaRecovery[]> {
  const rec = await loadLocalDraft<PendingMediaRecovery[]>(PENDING_MEDIA_KEY);
  return Array.isArray(rec?.data) ? rec.data : [];
}

export async function addPendingMediaRecovery(item: PendingMediaRecovery): Promise<void> {
  const current = await loadPendingMediaRecoveries();
  const next = [item, ...current.filter((x) => x.driveFileId !== item.driveFileId)].slice(0, 20);
  await saveLocalDraft(PENDING_MEDIA_KEY, next);
}

export async function removePendingMediaRecovery(driveFileId: string): Promise<void> {
  const current = await loadPendingMediaRecoveries();
  const next = current.filter((x) => x.driveFileId !== driveFileId);
  if (next.length === 0) {
    await clearLocalDraft(PENDING_MEDIA_KEY);
  } else {
    await saveLocalDraft(PENDING_MEDIA_KEY, next);
  }
}
