import { useState, useEffect, useMemo, useCallback } from 'react';
import { Spinner } from '@librechat/client';
import { useSearchParams } from 'react-router-dom';
import { useVerifyEmailMutation, useResendVerificationEmail } from '~/data-provider';
import { useLocalize } from '~/hooks';
import { useAuthModal } from './AuthModalContext';

type VerifyEmailProps = {
  token?: string;
  email?: string;
};

function RequestPasswordReset({ token: tokenProp, email: emailProp }: VerifyEmailProps = {}) {
  const localize = useLocalize();
  const { setAuthStep } = useAuthModal();
  const [params] = useSearchParams();

  const [countdown, setCountdown] = useState<number>(3);
  const [headerText, setHeaderText] = useState<string>('');
  const [showResendLink, setShowResendLink] = useState<boolean>(false);
  const [verificationStatus, setVerificationStatus] = useState<boolean>(false);
  const token = useMemo(() => tokenProp ?? params.get('token') ?? '', [tokenProp, params]);
  const email = useMemo(() => emailProp ?? params.get('email') ?? '', [emailProp, params]);

  const countdownRedirect = useCallback(() => {
    setCountdown(3);
    const timer = setInterval(() => {
      setCountdown((prevCountdown) => {
        if (prevCountdown <= 1) {
          clearInterval(timer);
          setAuthStep('login');
          return 0;
        }
        return prevCountdown - 1;
      });
    }, 1000);
  }, [setAuthStep]);

  const verifyEmailMutation = useVerifyEmailMutation({
    onSuccess: () => {
      setHeaderText(localize('com_auth_email_verification_success') + ' 🎉');
      setVerificationStatus(true);
      countdownRedirect();
    },
    onError: (error: unknown) => {
      setHeaderText(localize('com_auth_email_verification_failed') + ' 😢');
      setShowResendLink(true);
      setCountdown(0);
      setVerificationStatus(true);
    },
  });

  const resendEmailMutation = useResendVerificationEmail({
    onSuccess: () => {
      setHeaderText(localize('com_auth_email_resent_success') + ' 📧');
      countdownRedirect();
    },
    onError: () => {
      setHeaderText(localize('com_auth_email_resent_failed') + ' 😢');
      setShowResendLink(true);
    },
    onMutate: () => setShowResendLink(false),
  });

  const handleResendEmail = () => {
    resendEmailMutation.mutate({ email });
  };

  useEffect(() => {
    if (verificationStatus || verifyEmailMutation.isLoading) {
      return;
    }

    if (token && email) {
      verifyEmailMutation.mutate({ email, token });
    } else {
      if (email) {
        setHeaderText(localize('com_auth_email_verification_failed_token_missing') + ' 😢');
      } else {
        setHeaderText(localize('com_auth_email_verification_invalid') + ' 🤨');
      }
      setShowResendLink(true);
      setCountdown(0);
      setVerificationStatus(true);
    }
  }, [token, email, verificationStatus, verifyEmailMutation]);

  const VerificationSuccess = () => (
    <div className="flex flex-col items-center justify-center">
      <h1 className="mb-3 text-center text-lg font-semibold text-black dark:text-white">
        {headerText}
      </h1>
      {countdown > 0 && (
        <p className="text-center text-sm text-gray-600 dark:text-gray-400">
          {localize('com_auth_email_verification_redirecting', { 0: countdown.toString() })}
        </p>
      )}
      {showResendLink && countdown === 0 && (
        <p className="text-center text-sm text-gray-600 dark:text-gray-400">
          {localize('com_auth_email_verification_resend_prompt')}
          <button
            className="ml-2 text-sm text-blue-600 hover:underline"
            onClick={handleResendEmail}
            disabled={resendEmailMutation.isLoading}
          >
            {localize('com_auth_email_resend_link')}
          </button>
        </p>
      )}
    </div>
  );

  const VerificationInProgress = () => (
    <div className="flex flex-col items-center justify-center">
      <h1 className="mb-3 text-center text-lg font-semibold text-black dark:text-white">
        {localize('com_auth_email_verification_in_progress')}
      </h1>
      <div className="mt-3 flex justify-center">
        <Spinner className="h-6 w-6 text-green-500" />
      </div>
    </div>
  );

  return (
    <div className="flex flex-col items-center justify-center py-6 text-center">
      {verificationStatus ? <VerificationSuccess /> : <VerificationInProgress />}
    </div>
  );
}

export default RequestPasswordReset;
