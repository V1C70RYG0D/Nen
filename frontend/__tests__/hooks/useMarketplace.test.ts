import { renderHook, act, waitFor } from '@testing-library/react';
import { useMarketplace } from '../../hooks/useMarketplace';

// Mock the fetch API for testing
global.fetch = jest.fn();

const mockFetch = fetch as jest.MockedFunction<typeof fetch>;

describe('useMarketplace Hook', () => {
  beforeEach(() => {
    mockFetch.mockClear();
  });

  it('should fetch marketplace data and handle loading state', async () => {
    const mockListings = [{
      id: '1',
      agentId: 'agent1',
      price: 1.5,
      seller: 'seller1',
      isActive: true,
      createdAt: new Date()
    }];

    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => mockListings,
    } as Response);

    const { result } = renderHook(() => useMarketplace());

    expect(result.current.isLoading).toBe(true);

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.listings).toHaveLength(1);
    expect(result.current.error).toBeNull();
  });

  it('should handle errors during marketplace data fetching', async () => {
    mockFetch.mockRejectedValueOnce(new Error('Failed to fetch data.'));

    const { result } = renderHook(() => useMarketplace());

    await waitFor(() => {
      expect(result.current.error).toEqual('Failed to fetch data.');
    });

    expect(result.current.isLoading).toBe(false);
  });

  it('should refetch data when refetch is called', async () => {
    const mockListings = [];

    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => mockListings,
    } as Response);

    const { result } = renderHook(() => useMarketplace());

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    act(() => {
      result.current.refetch();
    });

    expect(result.current.isLoading).toBe(true);

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });
  });
});

