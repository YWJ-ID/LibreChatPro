import { renderHook } from '@testing-library/react';
import useGetSender from '../useGetSender';

jest.mock('~/data-provider', () => ({
  useGetEndpointsQuery: () => ({ data: {} }),
}));

describe('useGetSender', () => {
  it('returns the default sender when no endpoint option is available', () => {
    const { result } = renderHook(() => useGetSender());

    expect(() => result.current(null)).not.toThrow();
    expect(result.current(null)).toBe('');
  });
});
