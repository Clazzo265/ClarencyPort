import {
  GoogleAuthProvider,
  onAuthStateChanged,
  signInWithPopup,
  signOut as firebaseSignOut,
  type User,
} from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react';
import { auth, db, OWNER_EMAIL } from '../services/firebase';
import { clearDriveAuthSession } from '../services/googleDriveAuth';

interface AuthContextValue {
  user: User | null;
  authReady: boolean;
  isAdmin: boolean;
  isSigningIn: boolean;
  authError: string | null;
  signInWithGoogle: () => Promise<void>;
  signOut: () => Promise<void>;
  clearAuthError: () => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [authReady, setAuthReady] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [isSigningIn, setIsSigningIn] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (nextUser) => {
      setUser(nextUser);
      if (!nextUser || !nextUser.emailVerified) {
        setIsAdmin(false);
        clearDriveAuthSession('disconnected', null);
        setAuthReady(true);
        return;
      }

      if (nextUser.email === OWNER_EMAIL) {
        setIsAdmin(true);
        setAuthReady(true);
        return;
      }

      try {
        const adminSnap = await getDoc(doc(db, 'admins', nextUser.uid));
        setIsAdmin(adminSnap.exists());
      } catch {
        setIsAdmin(false);
      } finally {
        setAuthReady(true);
      }
    });

    return () => unsubscribe();
  }, []);

  const signInWithGoogle = useCallback(async () => {
    setIsSigningIn(true);
    setAuthError(null);
    try {
      const provider = new GoogleAuthProvider();
      provider.setCustomParameters({ prompt: 'select_account' });
      const result = await signInWithPopup(auth, provider);
      const signedInUser = result.user;

      if (!signedInUser.emailVerified) {
        await firebaseSignOut(auth);
        setAuthError('A verified Google account is required to access administrator controls.');
        return;
      }

      if (signedInUser.email !== OWNER_EMAIL) {
        try {
          const adminSnap = await getDoc(doc(db, 'admins', signedInUser.uid));
          if (!adminSnap.exists()) {
            await firebaseSignOut(auth);
            setAuthError(
              'This account is not authorized as a KLARENCY administrator. Access has been denied.',
            );
          }
        } catch {
          await firebaseSignOut(auth);
          setAuthError('Access verification failed. Only authorized owner accounts may enter.');
        }
      }
    } catch (error) {
      const code = (error as { code?: string })?.code;
      if (code === 'auth/popup-closed-by-user') {
        setAuthError('Sign-in popup was closed before completion.');
      } else if (code === 'auth/popup-blocked') {
        setAuthError('Browser blocked the sign-in popup. Please allow popups for this site and retry.');
      } else {
        setAuthError('Unable to complete sign-in. Check your network connection and try again.');
      }
    } finally {
      setIsSigningIn(false);
    }
  }, []);

  const signOut = useCallback(async () => {
    clearDriveAuthSession('disconnected', null);
    await firebaseSignOut(auth);
    setIsAdmin(false);
  }, []);

  const clearAuthError = useCallback(() => setAuthError(null), []);

  return (
    <AuthContext.Provider
      value={{
        user,
        authReady,
        isAdmin,
        isSigningIn,
        authError,
        signInWithGoogle,
        signOut,
        clearAuthError,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
