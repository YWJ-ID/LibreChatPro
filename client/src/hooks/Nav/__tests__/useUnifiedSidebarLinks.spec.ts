import { renderHook } from '@testing-library/react';

jest.mock('~/hooks/AuthContext', () => ({
  useAuthContext: jest.fn(),
}));

jest.mock('recoil', () => ({
  useRecoilValue: () => null,
}));

jest.mock('~/store', () => ({
  __esModule: true,
  default: {
    conversationByIndex: jest.fn(() => 'conversation-by-index'),
  },
}));

jest.mock('~/data-provider', () => ({
  useGetEndpointsQuery: () => ({ data: {} }),
  useGetStartupConfig: () => ({ data: undefined }),
}));

jest.mock('librechat-data-provider/react-query', () => ({
  useUserKeyQuery: () => ({ data: { expiresAt: undefined } }),
}));

jest.mock('../useSideNavLinks', () => ({
  __esModule: true,
  default: jest.fn(() => [{ id: 'settings' }]),
}));

jest.mock('~/components/UnifiedSidebar/ConversationsSection', () => ({
  __esModule: true,
  default: () => null,
}));

import useUnifiedSidebarLinks from '../useUnifiedSidebarLinks';

const mockUseAuthContext = jest.requireMock('~/hooks/AuthContext').useAuthContext;

describe('useUnifiedSidebarLinks', () => {
  it('keeps the guest chat history panel from mounting authenticated content', () => {
    mockUseAuthContext.mockReturnValue({ isAuthenticated: false });

    const { result } = renderHook(() => useUnifiedSidebarLinks());
    const [conversationLink] = result.current;

    expect(conversationLink.id).toBe('conversations');
    expect(conversationLink.Component).toBeUndefined();
    expect(result.current).toHaveLength(1);
  });
});
