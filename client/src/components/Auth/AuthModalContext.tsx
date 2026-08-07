import { createContext, useCallback, useContext, useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import { useAuthContext } from '~/hooks/AuthContext';

export type AuthModalStep = 'login' | 'register' | 'two-factor';

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
  const [isOpen, setIsOpen] = useState(false);
  const [step, setStep] = useState<AuthModalStep>('login');

  const openAuthModal = useCallback((nextStep: AuthModalStep = 'login') => {
    setStep(nextStep);
    setIsOpen(true);
  }, []);

  const closeAuthModal = useCallback(() => {
    setIsOpen(false);
  }, []);

  const setAuthStep = useCallback((nextStep: AuthModalStep) => {
    setStep(nextStep);
    setIsOpen(true);
  }, []);

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
