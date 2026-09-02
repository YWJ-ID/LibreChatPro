import React from 'react';
import { render, waitFor, fireEvent, screen } from 'test/layout-test-utils';
import { useNavigate } from 'react-router-dom';
import { AuthModalProvider, AuthModal } from '~/components/Auth';
import * as mutations from '~/data-provider/mutations';
import * as endpointQueries from '~/data-provider/Endpoints/queries';

jest.mock('librechat-data-provider/react-query');

jest.mock('@librechat/client', () => {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const ReactMock = require('react');
  return {
    ...jest.requireActual('@librechat/client'),
    OGDialog: ({ children, open }: { children: React.ReactNode; open: boolean }) =>
      ReactMock.createElement(
        'div',
        { 'data-testid': 'og-dialog', 'data-open': String(open) },
        open ? children : null,
      ),
    OGDialogContent: ({ children }: { children: React.ReactNode }) =>
      ReactMock.createElement('div', { 'data-testid': 'og-dialog-content' }, children),
    OGDialogHeader: ({ children }: { children: React.ReactNode }) =>
      ReactMock.createElement('div', null, children),
    OGDialogTitle: ({ children }: { children: React.ReactNode }) =>
      ReactMock.createElement('h2', null, children),
  };
});

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
let capturedVerifyOptions: {
  onSuccess: () => void;
  onError: (error: unknown) => void;
};

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
  capturedVerifyOptions = { onSuccess: () => undefined, onError: () => undefined };
  // Prime a prior auth step so the captured step ref is already set.
  window.history.pushState({}, '', '/c/new?auth=login');
  jest.spyOn(endpointQueries, 'useGetStartupConfig').mockReturnValue(mockStartupConfig as never);
  jest.spyOn(mutations, 'useVerifyEmailMutation').mockImplementation((options) => {
    capturedVerifyOptions = options as typeof capturedVerifyOptions;
    return {
      isLoading: false,
      isError: false,
      isSuccess: false,
      mutate: (variables: unknown) => {
        verifyMutate(variables);
        capturedVerifyOptions.onSuccess();
      },
      mutateAsync: verifyMutate,
    } as never;
  });
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

test('switches to the inline login step after successful verification', async () => {
  setup();
  fireEvent.click(document.querySelector('[data-testid="go-verify"]') as HTMLElement);
  await waitFor(() => expect(verifyMutate).toHaveBeenCalledTimes(1), { timeout: 3000 });
  await waitFor(() => expect(screen.getByLabelText('Email address')).toBeInTheDocument(), {
    timeout: 6000,
  });
});
