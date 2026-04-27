/* eslint-disable react-refresh/only-export-components */
import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import {
  createUserWithEmailAndPassword,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signOut,
} from 'firebase/auth';

import { auth, isFirebaseConfigured } from '../firebase.js';

const AuthContext = createContext(null);
const ADMIN_EMAIL = (import.meta.env.VITE_ADMIN_EMAIL || '').toLowerCase();

export const useAuth = () => {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider.');
  }

  return context;
};

const resolveClaims = async firebaseUser => {
  if (!firebaseUser) {
    return null;
  }
  try {
    const result = await firebaseUser.getIdTokenResult();
    return result.claims || {};
  } catch (error) {
    console.warn('Failed to load custom claims.', error);
    return {};
  }
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [claims, setClaims] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!isFirebaseConfigured || !auth) {
      setUser(null);
      setClaims(null);
      setLoading(false);
      return undefined;
    }

    const unsubscribe = onAuthStateChanged(auth, async currentUser => {
      setUser(currentUser);
      setClaims(await resolveClaims(currentUser));
      setLoading(false);
    });

    return () => {
      unsubscribe();
    };
  }, []);

  const assertAuthReady = useCallback(() => {
    if (!isFirebaseConfigured || !auth) {
      throw new Error('Firebase is not configured. Add VITE_FIREBASE_* values in a local .env file.');
    }
  }, []);

  const refreshClaims = useCallback(async () => {
    if (!auth?.currentUser) {
      setClaims(null);
      return null;
    }
    await auth.currentUser.getIdToken(true);
    const next = await resolveClaims(auth.currentUser);
    setClaims(next);
    return next;
  }, []);

  const bootstrapAdminAccount = useCallback(async (email, password) => {
    const response = await fetch('/api/admin/bootstrap', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });

    const result = await response.json().catch(() => ({}));

    if (!response.ok || !result.ok) {
      const error = new Error(result.error || 'Unable to prepare the admin account right now.');
      error.code = 'auth/admin-bootstrap-failed';
      throw error;
    }

    return result;
  }, []);

  const login = useCallback(async (email, password) => {
    try {
      assertAuthReady();
      const credential = await signInWithEmailAndPassword(auth, email, password);
      await refreshClaims();
      return credential;
    } catch (error) {
      console.error('Failed to sign in.', error);
      throw error;
    }
  }, [assertAuthReady, refreshClaims]);

  const loginOrCreateAdmin = useCallback(async (email, password) => {
    assertAuthReady();
    try {
      const credential = await signInWithEmailAndPassword(auth, email, password);
      await refreshClaims();
      return credential;
    } catch (error) {
      const isAdminCredential =
        ADMIN_EMAIL && email.toLowerCase() === ADMIN_EMAIL;

      if (
        isAdminCredential &&
        (error?.code === 'auth/invalid-credential' || error?.code === 'auth/user-not-found')
      ) {
        await bootstrapAdminAccount(email, password);
        const credential = await signInWithEmailAndPassword(auth, email, password);
        await refreshClaims();
        return credential;
      }

      console.error('Failed to sign in admin.', error);
      throw error;
    }
  }, [assertAuthReady, bootstrapAdminAccount, refreshClaims]);

  const signup = useCallback(async (email, password) => {
    try {
      assertAuthReady();
      const credential = await createUserWithEmailAndPassword(auth, email, password);
      await refreshClaims();
      return credential;
    } catch (error) {
      console.error('Failed to create account.', error);
      throw error;
    }
  }, [assertAuthReady, refreshClaims]);

  const logout = useCallback(async () => {
    try {
      assertAuthReady();
      const result = await signOut(auth);
      setClaims(null);
      return result;
    } catch (error) {
      console.error('Failed to sign out.', error);
      throw error;
    }
  }, [assertAuthReady]);

  const isAdmin = useMemo(() => {
    if (claims?.admin === true) {
      return true;
    }
    if (ADMIN_EMAIL && (user?.email || '').toLowerCase() === ADMIN_EMAIL) {
      return true;
    }
    return false;
  }, [claims, user]);

  const value = useMemo(
    () => ({
      user,
      claims,
      isAdmin,
      loading,
      login,
      loginOrCreateAdmin,
      signup,
      logout,
      refreshClaims,
      isFirebaseConfigured,
    }),
    [claims, isAdmin, loading, login, loginOrCreateAdmin, logout, refreshClaims, signup, user]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
