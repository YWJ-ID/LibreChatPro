import { useEffect } from 'react';
import { OGDialog, OGDialogContent, OGDialogHeader, OGDialogTitle } from '@librechat/client';
import { useGetStartupConfig } from '~/data-provider';
import { useAuthContext, useLocalize } from '~/hooks';
import { useAuthModal } from './AuthModalContext';
import LoginForm from './LoginForm';
import Registration from './Registration';
import TwoFactorScreen from './TwoFactorScreen';
import RequestPasswordReset from './RequestPasswordReset';
import ResetPassword from './ResetPassword';
import VerifyEmail from './VerifyEmail';
import { getLoginError } from '~/utils';
import { ErrorMessage } from './ErrorMessage';

export default function AuthModal() {
  const localize = useLocalize();
  const { data: startupConfig } = useGetStartupConfig();
  const { error, setError, login: authenticate, isAuthenticated, twoFATempToken } = useAuthContext();
  const { isOpen, step, closeAuthModal, setAuthStep } = useAuthModal();

  useEffect(() => {
    if (twoFATempToken) {
      setAuthStep('two-factor');
    }
  }, [twoFATempToken, setAuthStep]);

  useEffect(() => {
    if (isAuthenticated && isOpen) {
      closeAuthModal();
    }
  }, [isAuthenticated, isOpen, closeAuthModal]);

  if (!startupConfig || isAuthenticated) {
    return null;
  }

  return (
    <OGDialog open={isOpen} onOpenChange={(open) => !open && closeAuthModal()}>
      <OGDialogContent
        showCloseButton
        className="max-h-[90vh] max-w-md overflow-y-auto"
        aria-describedby="inline-auth-description"
      >
        <OGDialogHeader>
          <OGDialogTitle>
            {step === 'register'
              ? localize('com_auth_create_account')
              : step === 'two-factor'
                ? localize('com_auth_verify_your_identity')
                : step === 'forgot-password' || step === 'reset-password'
                  ? localize('com_auth_reset_password')
                  : step === 'verify-email'
                    ? localize('com_auth_email_verification_in_progress')
                    : localize('com_auth_welcome_back')}
          </OGDialogTitle>
          <p id="inline-auth-description" className="sr-only">
            {localize('com_auth_welcome_back')}
          </p>
        </OGDialogHeader>
        {error && <ErrorMessage>{getLoginError(error)}</ErrorMessage>}
        {step === 'login' && startupConfig.emailLoginEnabled && (
          <LoginForm
            onSubmit={(data) => authenticate(data, { redirect: null })}
            startupConfig={startupConfig}
            error={error}
            setError={setError}
          />
        )}
        {step === 'register' && <Registration inline onComplete={closeAuthModal} />}
        {step === 'two-factor' && twoFATempToken && (
          <TwoFactorScreen tempToken={twoFATempToken} onComplete={closeAuthModal} />
        )}
        {step === 'forgot-password' && <RequestPasswordReset />}
        {step === 'reset-password' && <ResetPassword />}
        {step === 'verify-email' && <VerifyEmail />}
        {step === 'login' && startupConfig.registrationEnabled && (
          <button
            type="button"
            className="mt-4 w-full text-sm text-green-600 underline"
            onClick={() => setAuthStep('register')}
          >
            {localize('com_auth_sign_up')}
          </button>
        )}
      </OGDialogContent>
    </OGDialog>
  );
}
