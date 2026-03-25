import React, { useEffect, useMemo, useState } from 'react';
import { AnimatePresence, motion as Motion } from 'framer-motion';
import { Loader, X } from 'lucide-react';

import { useAuth } from '../contexts/AuthContext.jsx';

const AUTH_MODE = {
  LOGIN: 'login',
  SIGNUP: 'signup',
};

const AUTH_COPY = {
  [AUTH_MODE.LOGIN]: {
    title: 'Sign in',
    subtitle: 'Pick up your saved planner right where you left it.',
    submitLabel: 'Sign In',
    switchLabel: "Don't have an account?",
    switchAction: 'Create one',
  },
  [AUTH_MODE.SIGNUP]: {
    title: 'Create account',
    subtitle: 'Save courses, attendance, and skip plans to your dashboard.',
    submitLabel: 'Create Account',
    switchLabel: 'Already registered?',
    switchAction: 'Sign in',
  },
};

const AUTH_ERRORS = {
  'auth/admin-restricted-operation': 'This Firebase project is blocking account creation right now.',
  'auth/app-not-authorized': 'This app is not authorized in your Firebase project yet.',
  'auth/configuration-not-found': 'Email/password auth is not fully configured in Firebase.',
  'auth/email-already-in-use': 'That email is already in use. Try signing in instead.',
  'auth/invalid-login-credentials': 'That email or password does not look right.',
  'auth/invalid-api-key': 'The Firebase API key is invalid. Recheck src/firebase.js.',
  'auth/invalid-credential': 'That email or password does not look right.',
  'auth/invalid-email': 'Enter a valid email address.',
  'auth/missing-email': 'Enter your email before continuing.',
  'auth/operation-not-allowed': 'Email/password sign-in is not enabled in Firebase Authentication.',
  'auth/missing-password': 'Enter your password before continuing.',
  'auth/network-request-failed': 'Network issue detected. Please try again in a moment.',
  'auth/too-many-requests': 'Too many attempts. Wait a bit and try again.',
  'auth/unauthorized-domain': 'This domain is not authorized in Firebase Authentication settings.',
  'auth/user-not-found': 'No account was found for that email.',
  'auth/weak-password': 'Choose a stronger password with at least 6 characters.',
  'auth/wrong-password': 'That password is incorrect.',
};

const INITIAL_FORM = {
  email: '',
  password: '',
  confirmPassword: '',
};

export default function AuthModal({ isOpen, onClose, onSuccess }) {
  const { login, signup } = useAuth();
  const [mode, setMode] = useState(AUTH_MODE.LOGIN);
  const [form, setForm] = useState(INITIAL_FORM);
  const [fieldErrors, setFieldErrors] = useState({});
  const [success, setSuccess] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const activeCopy = useMemo(() => AUTH_COPY[mode], [mode]);

  useEffect(() => {
    if (!isOpen) {
      setMode(AUTH_MODE.LOGIN);
      setForm(INITIAL_FORM);
      setFieldErrors({});
      setSuccess('');
      setIsSubmitting(false);
    }
  }, [isOpen]);

  useEffect(() => {
    setFieldErrors({});
    setSuccess('');
  }, [mode]);

  const handleChange = event => {
    const { name, value } = event.target;

    setForm(previousValue => ({
      ...previousValue,
      [name]: value,
    }));
  };

  const handleSubmit = async event => {
    event.preventDefault();
    setFieldErrors({});
    setSuccess('');

    if (mode === AUTH_MODE.SIGNUP && form.password !== form.confirmPassword) {
      setFieldErrors({ confirmPassword: 'Passwords do not match yet.' });
      return;
    }

    try {
      setIsSubmitting(true);

      if (mode === AUTH_MODE.LOGIN) {
        await login(form.email.trim(), form.password);
        setSuccess('Signed in successfully.');
      } else {
        await signup(form.email.trim(), form.password);
        setSuccess('Account created successfully.');
      }

      onSuccess?.();
      onClose?.();
    } catch (submitError) {
      const message =
        AUTH_ERRORS[submitError?.code] ||
        submitError?.message ||
        'Something went wrong. Please try again.';

      if (
        submitError?.code === 'auth/invalid-email' ||
        submitError?.code === 'auth/missing-email' ||
        submitError?.code === 'auth/email-already-in-use' ||
        submitError?.code === 'auth/user-not-found'
      ) {
        setFieldErrors({ email: message });
      } else {
        setFieldErrors({ password: message });
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const toggleMode = () => {
    setMode(currentMode =>
      currentMode === AUTH_MODE.LOGIN ? AUTH_MODE.SIGNUP : AUTH_MODE.LOGIN
    );
  };

  return (
    <AnimatePresence>
      {isOpen ? (
        <Motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[70] flex items-center justify-center bg-[rgba(0,0,0,0.7)] px-4 backdrop-blur-md"
        >
          <Motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 12 }}
            transition={{ duration: 0.2, ease: 'easeOut' }}
            className="relative w-full max-w-[380px] rounded-2xl border border-border-default bg-surface p-8 text-text-primary"
          >
            <button
              type="button"
              onClick={onClose}
              className="absolute right-5 top-5 text-text-muted transition-colors hover:text-text-primary"
            >
              <X size={16} />
            </button>

            <div className="mb-6 space-y-1 pr-8">
              <h2 className="text-xl font-semibold text-text-primary">{activeCopy.title}</h2>
              <p className="text-sm text-text-muted">{activeCopy.subtitle}</p>
            </div>

            <form className="space-y-3" onSubmit={handleSubmit}>
              <label className="block">
                <span className="mb-1.5 block text-sm font-medium text-text-secondary">Email</span>
                <input
                  type="email"
                  name="email"
                  value={form.email}
                  onChange={handleChange}
                  autoComplete="email"
                  className="field-input"
                  placeholder="student@vitap.ac.in"
                  required
                />
                {fieldErrors.email ? (
                  <p className="mt-1.5 text-sm text-danger">{fieldErrors.email}</p>
                ) : null}
              </label>

              <label className="block">
                <span className="mb-1.5 block text-sm font-medium text-text-secondary">Password</span>
                <input
                  type="password"
                  name="password"
                  value={form.password}
                  onChange={handleChange}
                  autoComplete={mode === AUTH_MODE.LOGIN ? 'current-password' : 'new-password'}
                  className="field-input"
                  placeholder="Minimum 6 characters"
                  required
                />
                {fieldErrors.password ? (
                  <p className="mt-1.5 text-sm text-danger">{fieldErrors.password}</p>
                ) : null}
              </label>

              {mode === AUTH_MODE.SIGNUP ? (
                <label className="block">
                  <span className="mb-1.5 block text-sm font-medium text-text-secondary">
                    Confirm password
                  </span>
                  <input
                    type="password"
                    name="confirmPassword"
                    value={form.confirmPassword}
                    onChange={handleChange}
                    autoComplete="new-password"
                    className="field-input"
                    placeholder="Repeat the same password"
                    required
                  />
                  {fieldErrors.confirmPassword ? (
                    <p className="mt-1.5 text-sm text-danger">{fieldErrors.confirmPassword}</p>
                  ) : null}
                </label>
              ) : null}

              {success ? <p className="text-sm text-success">{success}</p> : null}

              <Motion.button
                type="submit"
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.99 }}
                disabled={isSubmitting}
                className="flex w-full items-center justify-center gap-2 rounded-lg bg-accent px-4 py-2.5 text-sm font-medium text-inverse transition-colors hover:bg-accent-dim disabled:cursor-not-allowed disabled:opacity-80"
              >
                {isSubmitting ? <Loader className="animate-spin" size={16} /> : null}
                {isSubmitting ? 'Please wait...' : activeCopy.submitLabel}
              </Motion.button>
            </form>

            <div className="mt-4 text-sm text-text-muted">
              <span>{activeCopy.switchLabel}</span>
              <button
                type="button"
                onClick={toggleMode}
                className="ml-1 font-medium text-accent transition-colors hover:text-accent-dim"
              >
                {activeCopy.switchAction}
              </button>
            </div>
          </Motion.div>
        </Motion.div>
      ) : null}
    </AnimatePresence>
  );
}
