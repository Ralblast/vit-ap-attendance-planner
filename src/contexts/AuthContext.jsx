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

export const useAuth = () => {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider.');
  }

  return context;
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!isFirebaseConfigured || !auth) {
      setUser(null);
      setLoading(false);
      return undefined;
    }

    const unsubscribe = onAuthStateChanged(auth, currentUser => {
      setUser(currentUser);
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

  const login = useCallback(async (email, password) => {
    try {
      assertAuthReady();
      return await signInWithEmailAndPassword(auth, email, password);
    } catch (error) {
      console.error('Failed to sign in.', error);
      throw error;
    }
  }, [assertAuthReady]);

  const loginOrCreateAdmin = useCallback(async (email, password) => {
    try {
      assertAuthReady();
      return await signInWithEmailAndPassword(auth, email, password);
    } catch (error) {
      const adminEmail = import.meta.env.VITE_ADMIN_EMAIL || '';
      const adminPassword = import.meta.env.VITE_ADMIN_PASSWORD || '';
      const isAdminCredential =
        adminEmail &&
        adminPassword &&
        email.toLowerCase() === adminEmail.toLowerCase() &&
        password === adminPassword;

      if (
        isAdminCredential &&
        (error?.code === 'auth/invalid-credential' || error?.code === 'auth/user-not-found')
      ) {
        return await createUserWithEmailAndPassword(auth, email, password);
      }

      console.error('Failed to sign in admin.', error);
      throw error;
    }
  }, [assertAuthReady]);

  const signup = useCallback(async (email, password) => {
    try {
      assertAuthReady();
      return await createUserWithEmailAndPassword(auth, email, password);
    } catch (error) {
      console.error('Failed to create account.', error);
      throw error;
    }
  }, [assertAuthReady]);

  const logout = useCallback(async () => {
    try {
      assertAuthReady();
      return await signOut(auth);
    } catch (error) {
      console.error('Failed to sign out.', error);
      throw error;
    }
  }, [assertAuthReady]);

  const value = useMemo(
    () => ({
      user,
      loading,
      login,
      loginOrCreateAdmin,
      signup,
      logout,
      isFirebaseConfigured,
    }),
    [loading, login, loginOrCreateAdmin, logout, signup, user]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
