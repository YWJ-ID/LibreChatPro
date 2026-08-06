/* eslint-disable i18next/no-literal-string */
import React from 'react';
import { render, waitFor } from '@testing-library/react';
import { createMemoryRouter, RouterProvider } from 'react-router-dom';
import useAuthRedirect from '../useAuthRedirect';
import { useAuthContext } from '~/hooks';

// Polyfill Request for React Router in test environment
if (typeof Request === 'undefined') {
  global.Request = class Request {
    constructor(
      public url: string,
      public init?: RequestInit,
    ) {}
  } as any;
}

jest.mock('~/hooks', () => ({
  useAuthContext: jest.fn(),
}));

/**
 * TestComponent that uses the useAuthRedirect hook and exposes its return value
 */
function TestComponent() {
  const result = useAuthRedirect();
  // Expose result for assertions
  (window as any).__testResult = result;
  return <div data-testid="test-component">Test Component</div>;
}

/**
 * Creates a test router with optional basename to verify navigation works correctly
 * with subdirectory deployments (e.g., /librechat)
 */
const createTestRouter = (basename = '/', initialEntry?: string) => {
  const defaultEntry = basename === '/' ? '/' : `${basename}/`;

  return createMemoryRouter(
    [
      {
        path: '/',
        element: <TestComponent />,
      },
      {
        path: '/login',
        element: <div data-testid="login-page">Login Page</div>,
      },
      {
        path: '/c/:id',
        element: <TestComponent />,
      },
    ],
    {
      basename,
      initialEntries: [initialEntry ?? defaultEntry],
    },
  );
};

describe('useAuthRedirect', () => {
  beforeEach(() => {
    (window as any).__testResult = undefined;
  });

  afterEach(() => {
    jest.clearAllMocks();
    (window as any).__testResult = undefined;
  });

  it('should not redirect when user is authenticated', async () => {
    (useAuthContext as jest.Mock).mockReturnValue({
      user: { id: '123', email: 'test@example.com' },
      isAuthenticated: true,
    });

    const router = createTestRouter();
    const { getByTestId } = render(<RouterProvider router={router} />);

    expect(router.state.location.pathname).toBe('/');
    expect(getByTestId('test-component')).toBeInTheDocument();

    // Wait for the timeout (300ms) plus a buffer
    await new Promise((resolve) => setTimeout(resolve, 400));

    // Should still be on home page, not redirected
    expect(router.state.location.pathname).toBe('/');
    expect(getByTestId('test-component')).toBeInTheDocument();
  });

  it('should keep the anonymous user on the current route', async () => {
    (useAuthContext as jest.Mock).mockReturnValue({
      user: null,
      isAuthenticated: false,
    });

    const router = createTestRouter();
    const { getByTestId } = render(<RouterProvider router={router} />);

    await new Promise((resolve) => setTimeout(resolve, 400));

    expect(router.state.location.pathname).toBe('/');
    expect(getByTestId('test-component')).toBeInTheDocument();
  });

  it('should keep the anonymous user on a subdirectory route', async () => {
    (useAuthContext as jest.Mock).mockReturnValue({
      user: null,
      isAuthenticated: false,
    });

    const router = createTestRouter('/librechat');
    const { getByTestId } = render(<RouterProvider router={router} />);

    await new Promise((resolve) => setTimeout(resolve, 400));

    expect(router.state.location.pathname).toBe('/librechat/');
    expect(getByTestId('test-component')).toBeInTheDocument();
  });

  it('does not navigate when the anonymous user remains on a subdirectory route', async () => {
    (useAuthContext as jest.Mock).mockReturnValue({
      user: null,
      isAuthenticated: false,
    });

    const router = createTestRouter('/librechat');
    render(<RouterProvider router={router} />);

    await new Promise((resolve) => setTimeout(resolve, 400));

    expect(router.state.location.pathname).toBe('/librechat/');
  });

  it('should clear timeout on unmount', async () => {
    (useAuthContext as jest.Mock).mockReturnValue({
      user: null,
      isAuthenticated: false,
    });

    const router = createTestRouter();
    const { unmount } = render(<RouterProvider router={router} />);

    // Unmount immediately before timeout fires
    unmount();

    // Wait past the timeout period
    await new Promise((resolve) => setTimeout(resolve, 400));

    // Should still be at home, not redirected (timeout was cleared)
    expect(router.state.location.pathname).toBe('/');
  });

  it('should return user and isAuthenticated values', async () => {
    const mockUser = { id: '123', email: 'test@example.com' };
    (useAuthContext as jest.Mock).mockReturnValue({
      user: mockUser,
      isAuthenticated: true,
    });

    const router = createTestRouter();
    render(<RouterProvider router={router} />);

    await waitFor(() => {
      const testResult = (window as any).__testResult;
      expect(testResult).toBeDefined();
      expect(testResult.user).toEqual(mockUser);
      expect(testResult.isAuthenticated).toBe(true);
    });
  });

  it('should preserve a chat route without adding redirect parameters', async () => {
    (useAuthContext as jest.Mock).mockReturnValue({
      user: null,
      isAuthenticated: false,
    });

    const router = createTestRouter('/', '/c/abc123');
    render(<RouterProvider router={router} />);

    await new Promise((resolve) => setTimeout(resolve, 400));

    expect(router.state.location.pathname).toBe('/c/abc123');
    expect(router.state.location.search).toBe('');
  });

  it('should preserve chat query parameters without redirecting', async () => {
    (useAuthContext as jest.Mock).mockReturnValue({
      user: null,
      isAuthenticated: false,
    });

    const router = createTestRouter('/', '/c/abc123?q=hello&submit=true#section');
    render(<RouterProvider router={router} />);

    await new Promise((resolve) => setTimeout(resolve, 400));

    expect(router.state.location.pathname).toBe('/c/abc123');
    expect(router.state.location.search).toBe('?q=hello&submit=true');
    expect(router.state.location.hash).toBe('#section');
  });

  it('should preserve a chat route under a router basename', async () => {
    (useAuthContext as jest.Mock).mockReturnValue({
      user: null,
      isAuthenticated: false,
    });

    const router = createTestRouter('/librechat', '/librechat/c/abc123');
    render(<RouterProvider router={router} />);

    await new Promise((resolve) => setTimeout(resolve, 400));

    expect(router.state.location.pathname).toBe('/librechat/c/abc123');
    expect(router.state.location.search).toBe('');
  });

  it('should not change the login route', async () => {
    (useAuthContext as jest.Mock).mockReturnValue({
      user: null,
      isAuthenticated: false,
    });

    const router = createMemoryRouter(
      [
        {
          path: '/login',
          element: <TestComponent />,
        },
      ],
      { initialEntries: ['/login'] },
    );
    render(<RouterProvider router={router} />);

    await new Promise((resolve) => setTimeout(resolve, 400));

    expect(router.state.location.pathname).toBe('/login');
    expect(router.state.location.search).toBe('');
  });
});
