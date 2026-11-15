import { GoogleAuthProvider, reauthenticateWithPopup, signInWithPopup } from 'firebase/auth';
import { auth, GOOGLE_OAUTH_CLIENT_ID } from './firebase';

/**
 * Least-privilege Google Drive scope: grants access ONLY to files
 * created or explicitly opened by KLARENCY.
 */
export const DRIVE_SCOPES = ['https://www.googleapis.com/auth/drive.file'] as const;

export type DriveAuthStatus =
  | 'disconnected'
  | 'connecting'
  | 'connected'
  | 'expired'
  | 'error';

export interface DriveAuthSnapshot {
  status: DriveAuthStatus;
  connectedEmail: string | null;
  expiresAtMs: number | null;
  error: string | null;
}

// Strict in-memory token cache — NEVER persisted to localStorage, sessionStorage, or Firestore.
let memoryAccessToken: string | null = null;
let memoryTokenExpiresAtMs: number | null = null;
let memoryConnectedEmail: string | null = null;
let memoryStatus: DriveAuthStatus = 'disconnected';
let memoryError: string | null = null;

const listeners = new Set<(snapshot: DriveAuthSnapshot) => void>();

function notifyListeners() {
  const snap = getDriveAuthSnapshot();
  listeners.forEach((cb) => cb(snap));
}

export function subscribeDriveAuth(listener: (snapshot: DriveAuthSnapshot) => void): () => void {
  listeners.add(listener);
  listener(getDriveAuthSnapshot());
  return () => listeners.delete(listener);
}

export function getDriveAuthSnapshot(): DriveAuthSnapshot {
  const isExpired =
    memoryTokenExpiresAtMs !== null && Date.now() >= memoryTokenExpiresAtMs - 15_000;
  if (memoryAccessToken && isExpired) {
    memoryAccessToken = null;
    memoryStatus = 'expired';
    memoryError = 'Google Drive session token expired. Tap Renew Authorization to continue.';
  }
  return {
    status: memoryStatus,
    connectedEmail: memoryConnectedEmail,
    expiresAtMs: memoryTokenExpiresAtMs,
    error: memoryError,
  };
}

export function getInMemoryDriveToken(): string | null {
  const snap = getDriveAuthSnapshot();
  if (snap.status !== 'connected') return null;
  return memoryAccessToken;
}

export function setInMemoryDriveToken(params: {
  accessToken: string;
  expiresInSeconds?: number;
  email?: string | null;
}) {
  memoryAccessToken = params.accessToken;
  const ttlMs = ((params.expiresInSeconds ?? 3500) || 3500) * 1000;
  memoryTokenExpiresAtMs = Date.now() + ttlMs;
  if (params.email !== undefined) {
    memoryConnectedEmail = params.email;
  }
  memoryStatus = 'connected';
  memoryError = null;
  notifyListeners();
}

export function markDriveTokenExpired(message?: string) {
  memoryAccessToken = null;
  memoryStatus = 'expired';
  memoryError =
    message || 'Google Drive access token expired or was revoked. Reconnect Google Drive to continue.';
  notifyListeners();
}

export function clearDriveAuthSession(nextStatus: DriveAuthStatus = 'disconnected', error?: string | null) {
  memoryAccessToken = null;
  memoryTokenExpiresAtMs = null;
  memoryConnectedEmail = null;
  memoryStatus = nextStatus;
  memoryError = error ?? null;
  notifyListeners();
}

interface GisTokenResponse {
  access_token?: string;
  expires_in?: number;
  error?: string;
  error_description?: string;
  scope?: string;
}

interface GisTokenClient {
  requestAccessToken: (overrideConfig?: { prompt?: string; hint?: string }) => void;
}

declare global {
  interface Window {
    google?: {
      accounts?: {
        oauth2?: {
          initTokenClient: (config: {
            client_id: string;
            scope: string;
            hint?: string;
            callback: (resp: GisTokenResponse) => void;
            error_callback?: (err: { type?: string; message?: string }) => void;
          }) => GisTokenClient;
          revoke?: (token: string, done?: () => void) => void;
        };
      };
    };
  }
}

let gisScriptPromise: Promise<boolean> | null = null;

function loadGoogleIdentityScript(): Promise<boolean> {
  if (typeof window === 'undefined') return Promise.resolve(false);
  if (window.google?.accounts?.oauth2?.initTokenClient) return Promise.resolve(true);
  if (gisScriptPromise) return gisScriptPromise;

  gisScriptPromise = new Promise((resolve) => {
    const existing = document.querySelector<HTMLScriptElement>(
      'script[src="https://accounts.google.com/gsi/client"]',
    );
    if (existing) {
      existing.addEventListener('load', () => resolve(Boolean(window.google?.accounts?.oauth2)));
      existing.addEventListener('error', () => resolve(false));
      return;
    }
    const script = document.createElement('script');
    script.src = 'https://accounts.google.com/gsi/client';
    script.async = true;
    script.defer = true;
    script.onload = () => resolve(Boolean(window.google?.accounts?.oauth2));
    script.onerror = () => resolve(false);
    document.head.appendChild(script);
  });

  return gisScriptPromise;
}

async function requestTokenViaGis(promptMode: '' | 'consent' | 'select_account'): Promise<string> {
  if (!GOOGLE_OAUTH_CLIENT_ID) {
    throw new Error('Google OAuth Client ID is missing from firebase-applet-config.json.');
  }
  const loaded = await loadGoogleIdentityScript();
  if (!loaded || !window.google?.accounts?.oauth2?.initTokenClient) {
    throw new Error('Google Identity Services script could not be loaded.');
  }

  const loginHint = auth.currentUser?.email ?? undefined;

  return new Promise<string>((resolve, reject) => {
    const client = window.google!.accounts!.oauth2!.initTokenClient({
      client_id: GOOGLE_OAUTH_CLIENT_ID,
      scope: DRIVE_SCOPES.join(' '),
      hint: loginHint,
      callback: (resp) => {
        if (resp.error || !resp.access_token) {
          reject(
            new Error(
              resp.error_description ||
                resp.error ||
                'Google Drive authorization was declined or did not return an access token.',
            ),
          );
          return;
        }
        setInMemoryDriveToken({
          accessToken: resp.access_token,
          expiresInSeconds: resp.expires_in,
          email: auth.currentUser?.email ?? null,
        });
        resolve(resp.access_token);
      },
      error_callback: (err) => {
        reject(new Error(err?.message || 'Google authorization popup was closed or blocked.'));
      },
    });

    client.requestAccessToken({
      prompt: promptMode,
      hint: loginHint,
    });
  });
}

async function requestTokenViaFirebasePopup(forceSelectAccount: boolean): Promise<string> {
  const provider = new GoogleAuthProvider();
  for (const scope of DRIVE_SCOPES) {
    provider.addScope(scope);
  }
  if (forceSelectAccount) {
    provider.setCustomParameters({ prompt: 'consent select_account' });
  } else {
    provider.setCustomParameters({ prompt: 'consent' });
  }

  const result = auth.currentUser
    ? await reauthenticateWithPopup(auth.currentUser, provider)
    : await signInWithPopup(auth, provider);

  const credential = GoogleAuthProvider.credentialFromResult(result);
  if (!credential?.accessToken) {
    throw new Error('Google sign-in completed, but no Drive access token was issued.');
  }

  setInMemoryDriveToken({
    accessToken: credential.accessToken,
    expiresInSeconds: 3500,
    email: result.user.email,
  });
  return credential.accessToken;
}

/**
 * Requests explicit Google Drive authorization using Google Identity Services first,
 * falling back gracefully to Firebase Auth popup with the drive.file scope if GIS is unavailable.
 */
export async function connectGoogleDrive(options?: {
  forceAccountChooser?: boolean;
}): Promise<string> {
  if (!auth.currentUser || !auth.currentUser.emailVerified) {
    throw new Error('Sign in as the verified KLARENCY owner before connecting Google Drive.');
  }

  memoryStatus = 'connecting';
  memoryError = null;
  notifyListeners();

  try {
    try {
      return await requestTokenViaGis(options?.forceAccountChooser ? 'select_account' : 'consent');
    } catch (gisErr) {
      const msg = gisErr instanceof Error ? gisErr.message.toLowerCase() : '';
      // If user explicitly closed/cancelled consent, don't force a second popup unless GIS script failed
      if (msg.includes('access_denied') || msg.includes('closed')) {
        throw gisErr;
      }
      return await requestTokenViaFirebasePopup(Boolean(options?.forceAccountChooser));
    }
  } catch (err) {
    const message =
      err instanceof Error
        ? err.message
        : 'Unable to authorize Google Drive access. Please retry.';
    clearDriveAuthSession('error', message);
    throw new Error(message);
  }
}

export function disconnectGoogleDrive(): void {
  const token = memoryAccessToken;
  clearDriveAuthSession('disconnected', null);
  if (token && typeof window !== 'undefined' && window.google?.accounts?.oauth2?.revoke) {
    try {
      window.google.accounts.oauth2.revoke(token, () => {});
    } catch {
      // Ignore revoke errors
    }
  }
}
