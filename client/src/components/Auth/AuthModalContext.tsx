import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
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
  params: URLSearchParams;
  openAuthModal: (step?: AuthModalStep) => void;
  closeAuthModal: () => void;
  setAuthStep: (step: AuthModalStep) => void;
};

const AuthModalContext = createContext<AuthModalContextValue | undefined>(undefined);

export function AuthModalProvider({ children }: { children: ReactNode }) {
  useAuthContext();
  const [searchParams, setSearchParams] = useSearchParams();
  const capturedParamsRef = useRef(false);
  const [authParams, setAuthParams] = useState(() => new URLSearchParams(searchParams));
  const [isOpen, setIsOpen] = useState(false);
  const [step, setStep] = useState<AuthModalStep>('login');

  useEffect(() => {
    const auth = searchParams.get('auth');
    if (!auth) {
      return;
    }
    if (authSteps.has(auth as AuthModalStep)) {
      setStep(auth as AuthModalStep);
      setIsOpen(true);
      if (!capturedParamsRef.current) {
        capturedParamsRef.current = true;
        setAuthParams(new URLSearchParams(searchParams));
      }
    }

    const sensitiveParams = ['token', 'userId', 'tempToken'];
    if (sensitiveParams.some((param) => searchParams.has(param))) {
      const sanitized = new URLSearchParams(searchParams);
      sensitiveParams.forEach((param) => sanitized.delete(param));
      setSearchParams(sanitized, { replace: true });
    }
  }, [searchParams, setSearchParams]);

  const openAuthModal = useCallback((nextStep: AuthModalStep = 'login') => {
    setStep(nextStep);
    setIsOpen(true);
  }, []);

  const closeAuthModal = useCallback(() => {
    setIsOpen(false);
    capturedParamsRef.current = false;
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
    () => ({ isOpen, step, params: authParams, openAuthModal, closeAuthModal, setAuthStep }),
    [isOpen, step, authParams, openAuthModal, closeAuthModal, setAuthStep],
  );

  return <AuthModalContext.Provider value={value}>{children}</AuthModalContext.Provider>;
}

export function useAuthModal() {
  const context = useContext(AuthModalContext);
  if (context) {
    return context;
  }
  return {
    isOpen: false,
    step: 'login' as AuthModalStep,
    params: new URLSearchParams(),
    openAuthModal: () => undefined,
    closeAuthModal: () => undefined,
    setAuthStep: () => undefined,
  };
}
