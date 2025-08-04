import { renderHook } from '@testing-library/react';
import { useBetting } from '../../hooks/useBetting';
import { useAnchorWallet, useConnection } from '@solana/wallet-adapter-react';

// Mock dependencies
jest.mock('@solana/wallet-adapter-react');

const mockUseAnchorWallet = useAnchorWallet as jest.MockedFunction<typeof useAnchorWallet>;
const mockUseConnection = useConnection as jest.MockedFunction<typeof useConnection>;

const mockWalletData = {
  publicKey: { toString: () => 'test-wallet-address' },
  signTransaction: jest.fn(),
  signAllTransactions: jest.fn(),
};

const mockConnectionData = {
  connection: {
    getRecentBlockhash: jest.fn(),
    sendRawTransaction: jest.fn(),
  },
};

describe('useBetting Hook', () => {
  beforeEach(() => {
    mockUseAnchorWallet.mockReturnValue(mockWalletData);
    mockUseConnection.mockReturnValue(mockConnectionData);
    jest.clearAllMocks();
  });

  it('should initialize with default values', () => {
    const { result } = renderHook(() => useBetting('test-match'));

    expect(result.current.error).toBeNull();
    expect(result.current.userBets).toEqual([]);
    expect(result.current.pools).toEqual({ total: 0, agent1: 0, agent2: 0 });
    expect(typeof result.current.placeBet).toBe('function');
    expect(typeof result.current.claimWinnings).toBe('function');
    expect(typeof result.current.refetch).toBe('function');
  });

  it('should handle no wallet connected', () => {
    mockUseAnchorWallet.mockReturnValue(null);
    
    const { result } = renderHook(() => useBetting('test-match'));

    expect(result.current.isLoading).toBe(false);
    expect(result.current.pools).toEqual({ total: 0, agent1: 0, agent2: 0 });
  });
});
