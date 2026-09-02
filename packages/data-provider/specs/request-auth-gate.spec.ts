/**
 * @jest-environment @happy-dom/jest-environment
 */
import axios from 'axios';
import { setTokenHeader } from '../src/headers-helpers';
import { setAuthStatus, getAuthStatus } from '../src/request';

/**
 * Auth gate tests for request.ts.
 *
 * On a fresh page load the app has not yet resolved whether a refresh token
 * exists. Requests to protected endpoints must not be sent until auth status
 * is known — otherwise they 401 (no Bearer token yet) and the app re-fires
 * them after refresh, producing a storm of 401s and duplicate requests.
 *
 * The default auth status is 'authenticated' so non-Auth flows (share pages,
 * tests) behave as before; AuthContextProvider sets 'checking' on mount.
 */

const mockAdapter = jest.fn();
let originalAdapter: typeof axios.defaults.adapter;

beforeAll(async () => {
  originalAdapter = axios.defaults.adapter;
  axios.defaults.adapter = mockAdapter;
  await import('../src/request');
});

beforeEach(() => {
  mockAdapter.mockReset();
  mockAdapter.mockResolvedValue({ data: {}, status: 200, headers: {}, config: {} });
});

afterEach(() => {
  setAuthStatus('authenticated');
  delete axios.defaults.headers.common['Authorization'];
});

afterAll(() => {
  axios.defaults.adapter = originalAdapter;
});

describe('auth gate — default (authenticated)', () => {
  it('passes protected requests straight to the adapter', async () => {
    await axios.get('/api/models');
    expect(mockAdapter).toHaveBeenCalledTimes(1);
    expect(getAuthStatus()).toBe('authenticated');
  });
});

describe('auth gate — checking', () => {
  it('defers protected requests and flushes them with the token after auth', async () => {
    setAuthStatus('checking');
    const promise = axios.get('/api/models');
    await new Promise((r) => setTimeout(r, 0));
    expect(mockAdapter).toHaveBeenCalledTimes(0);

    setTokenHeader('fresh-token');
    setAuthStatus('authenticated');

    await promise;
    expect(mockAdapter).toHaveBeenCalledTimes(1);
    expect(mockAdapter.mock.calls[0][0].headers.Authorization).toBe('Bearer fresh-token');
  });

  it('defers protected requests and rejects them when auth resolves to guest', async () => {
    setAuthStatus('checking');
    const promise = axios.get('/api/models');
    await new Promise((r) => setTimeout(r, 0));
    expect(mockAdapter).toHaveBeenCalledTimes(0);

    setAuthStatus('guest');

    await expect(promise).rejects.toBeDefined();
    expect(mockAdapter).toHaveBeenCalledTimes(0);
  });

  it('lets public requests through immediately', async () => {
    setAuthStatus('checking');
    await axios.get('/api/config');
    await axios.get('/api/auth/refresh');
    await axios.get('/api/banner');
    expect(mockAdapter).toHaveBeenCalledTimes(3);
  });
});

describe('auth gate — guest', () => {
  it('rejects protected requests without sending them', async () => {
    setAuthStatus('guest');
    await expect(axios.get('/api/models')).rejects.toBeDefined();
    expect(mockAdapter).toHaveBeenCalledTimes(0);
  });

  it('still lets public requests through', async () => {
    setAuthStatus('guest');
    await axios.get('/api/config');
    expect(mockAdapter).toHaveBeenCalledTimes(1);
  });

  it('lets email verification endpoints through for unauthenticated users', async () => {
    setAuthStatus('guest');
    await axios.get('/api/user/verify');
    await axios.get('/api/user/verify/resend');
    expect(mockAdapter).toHaveBeenCalledTimes(2);
  });
});

describe('auth gate — URL classification', () => {
  it('treats non-API URLs (static assets, /health) as public', async () => {
    setAuthStatus('checking');
    await axios.get('/health');
    await axios.get('/images/avatar/x.png');
    expect(mockAdapter).toHaveBeenCalledTimes(2);
  });

  it('treats /api/files/config and other requireJwtAuth routes as protected', async () => {
    setAuthStatus('checking');
    const filesConfig = axios.get('/api/files/config');
    const convos = axios.get('/api/convos');
    const messages = axios.get('/api/messages');
    await new Promise((r) => setTimeout(r, 0));
    expect(mockAdapter).toHaveBeenCalledTimes(0);

    setAuthStatus('authenticated');
    await Promise.all([filesConfig, convos, messages]);
    expect(mockAdapter).toHaveBeenCalledTimes(3);
  });
});
