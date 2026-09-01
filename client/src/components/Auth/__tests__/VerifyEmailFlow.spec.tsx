import React from 'react';
import { render, waitFor, fireEvent } from 'test/layout-test-utils';
import { useNavigate } from 'react-router-dom';
import { AuthModalProvider, AuthModal } from '~/components/Auth';
import * as mutations from '~/data-provider/mutations';
import * as endpointQueries from '~/data-provider/Endpoints/queries';

jest.mock('librechat-data-provider/react-query');

const mockStartupConfig = {
  isLoading: false,
  isError: false,
  data: {
    socialLogins: [],
    emailLoginEnabled: true,
    registrationEnabled: true,
    socialLoginEnabled: false,
    serverDomain: 'mock-server',
  },
};

let verifyMutate: jest.Mock;

const Trigger = ({ to }: { to: string }) => {
  const navigate = useNavigate();
  return (
    <button data-testid="go-verify" onClick={() => navigate(to)}>
      go
    </button>
  );
};

const setup = () => {
  verifyMutate = jest.fn();
  // Prime a prior auth step so the captured step ref is already set.
  window.history.pushState({}, '', '/c/new?auth=login');
  jest.spyOn(endpointQueries, 'useGetStartupConfig').mockReturnValue(mockStartupConfig as never);
  jest.spyOn(mutations, 'useVerifyEmailMutation').mockReturnValue({
    isLoading: false,
    isError: false,
    isSuccess: false,
    mutate: verifyMutate,
    mutateAsync: verifyMutate,
  } as never);
  jest.spyOn(mutations, 'useResendVerificationEmail').mockReturnValue({
    isLoading: false,
    mutate: jest.fn(),
  } as never);

  render(
    <>
      <Trigger to="/c/new?auth=verify-email&token=abc123&email=user%40example.com" />
      <AuthModalProvider>
        <AuthModal />
      </AuthModalProvider>
    </>,
  );
};

test('VerifyEmail receives token/email after SPA navigation from a prior auth step', async () => {
  setup();
  expect(verifyMutate).not.toHaveBeenCalled();
  fireEvent.click(document.querySelector('[data-testid="go-verify"]') as HTMLElement);
  await waitFor(() => expect(verifyMutate).toHaveBeenCalledTimes(1), { timeout: 3000 });
  expect(verifyMutate).toHaveBeenCalledWith({ email: 'user@example.com', token: 'abc123' });
});
