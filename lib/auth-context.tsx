'use client';

import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from 'react';
import {
  onAuthStateChanged, signInWithEmailAndPassword, createUserWithEmailAndPassword,
  signOut as firebaseSignOut, type User as FirebaseUser,
} from 'firebase/auth';
import { auth, isFirebaseConfigured } from './firebase';

interface PendingAction {
  type: 'booking' | 'instant';
  data: unknown;
}

interface AuthContextValue {
  user: FirebaseUser | null;
  loading: boolean;
  pendingAction: PendingAction | null;
  signIn: (email: string, password: string) => Promise<{ error: string | null }>;
  signUp: (email: string, password: string) => Promise<{ error: string | null }>;
  signOut: () => Promise<void>;
  setPendingAction: (action: PendingAction | null) => void;
  showAuthModal: boolean;
  setShowAuthModal: (show: boolean) => void;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

function getAuthErrorMessage(error: unknown): string {
  const code = typeof error === 'object' && error && 'code' in error ? String(error.code) : '';
  switch (code) {
    case 'auth/invalid-credential':
    case 'auth/wrong-password':
    case 'auth/user-not-found':
      return 'Email or password is incorrect. Check that this user exists in Firebase Authentication.';
    case 'auth/email-already-in-use':
      return 'This email already has an account. Switch to Sign in.';
    case 'auth/operation-not-allowed':
      return 'Email/password sign-in is disabled. Enable it in Firebase Console under Authentication > Sign-in method.';
    case 'auth/unauthorized-domain':
      return 'This website domain is not authorized in Firebase Authentication settings.';
    case 'auth/too-many-requests':
      return 'Too many attempts. Wait a while and try again.';
    case 'auth/network-request-failed':
      return 'Could not reach Firebase Authentication. Check your network and try again.';
    default:
      return error instanceof Error ? error.message : 'Authentication failed. Please try again.';
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<FirebaseUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [pendingAction, setPendingAction] = useState<PendingAction | null>(null);
  const [showAuthModal, setShowAuthModal] = useState(false);

  useEffect(() => {
    if (!isFirebaseConfigured()) {
      setUser(null);
      setLoading(false);
      return;
    }

    const unsub = onAuthStateChanged(auth, (u) => {
      setUser(u);
      setLoading(false);
    });
    return () => unsub();
  }, []);

  const signIn = useCallback(async (email: string, password: string) => {
    if (!isFirebaseConfigured()) {
      return { error: 'Firebase is not configured for this deployment.' };
    }

    try {
      await signInWithEmailAndPassword(auth, email, password);
      return { error: null };
    } catch (err) {
      return { error: getAuthErrorMessage(err) };
    }
  }, []);

  const signUp = useCallback(async (email: string, password: string) => {
    if (!isFirebaseConfigured()) {
      return { error: 'Firebase is not configured for this deployment.' };
    }

    try {
      await createUserWithEmailAndPassword(auth, email, password);
      return { error: null };
    } catch (err) {
      return { error: getAuthErrorMessage(err) };
    }
  }, []);

  const signOut = useCallback(async () => {
    if (!isFirebaseConfigured()) {
      setUser(null);
      return;
    }

    await firebaseSignOut(auth);
    setUser(null);
  }, []);

  return (
    <AuthContext.Provider
      value={{
        user, loading, pendingAction,
        signIn, signUp, signOut,
        setPendingAction, showAuthModal, setShowAuthModal,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
