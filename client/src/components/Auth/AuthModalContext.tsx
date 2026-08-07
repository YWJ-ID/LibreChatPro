import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useAuthContext } from '~/hooks/AuthContext';

export type AuthModalStep =
  | 'login'
  | 'register'
  | 'forgot-password'
  | 'reset-password'
  | 'two-factor'
  | 'verify-email';

const authSteps = new Set<AuthModalStep>([
  'login',
  'register',
  'forgot-password',
  'reset-password',
  'two-factor',
  'verify-email',
]);

type AuthModalContextValue = {
  isOpen: boolean;
  step: AuthModalStep;
  openAuthModal: (step?: AuthModalStep) => void;
  closeAuthModal: () => void;
  setAuthStep: (step: AuthModalStep) => void;
};

const AuthModalContext = createContext<AuthModalContextValue | undefined>(undefined);

export function AuthModalProvider({ children }: { children: ReactNode }) {
  useAuthContext();
  const [searchParams, setSearchParams] = useSearchParams();
  const [isOpen, setIsOpen] = useState(false);
  const [step, setStep] = useState<AuthModalStep>('login');

  useEffect(() => {
    const auth = searchParams.get('auth');
    if (auth && authSteps.has(auth as AuthModalStep)) {
      setStep(auth as AuthModalStep);
      setIsOpen(true);
    }
  }, [searchParams]);

  const openAuthModal = useCallback((nextStep: AuthModalStep = 'login') => {
    setStep(nextStep);
    setIsOpen(true);
  }, []);

  const closeAuthModal = useCallback(() => {
    setIsOpen(false);
    const nextParams = new URLSearchParams(searchParams);
    nextParams.delete('auth');
    nextParams.delete('error');
    nextParams.delete('token');
    nextParams.delete('userId');
    setSearchParams(nextParams, { replace: true });
  }, [searchParams, setSearchParams]);

  const setAuthStep = useCallback((nextStep: AuthModalStep) => {
    setStep(nextStep);
    setIsOpen(true);
    const nextParams = new URLSearchParams(searchParams);
    nextParams.set('auth', nextStep);
    setSearchParams(nextParams, { replace: true });
  }, [searchParams, setSearchParams]);

  const value = useMemo(
    () => ({ isOpen, step, openAuthModal, closeAuthModal, setAuthStep }),
    [isOpen, step, openAuthModal, closeAuthModal, setAuthStep],
  );

  return <AuthModalContext.Provider value={value}>{children}</AuthModalContext.Provider>;
}

export function useAuthModal() {
  const context = useContext(AuthModalContext);
  if (!context) {
    throw new Error('useAuthModal must be used within AuthModalProvider');
  }
  return context;
}
