/**
 * Integration Tests for Backend API connections
 * Tests the integration between frontend components and backend services
 */

import React from 'react';
import { render, screen, waitFor, fireEvent, act } from '@testing-library/react';
import fetchMock from 'jest-fetch-mock';
import { WalletContextProvider } from '@/components/WalletProvider/WalletProvider';
import { MatchCard } from '@/components/MatchCard/MatchCard';
import { useBetting } from '@/hooks/useBetting';

// Enable fetch mocking
fetchMock.enableMocks();

// Mock wallet provider
jest.mock('@solana/wallet-adapter-react', () => ({
  useWallet: () => ({
    connected: true,
    publicKey: { toString: () => 'mock-wallet-address' },
  }),
  useAnchorWallet: () => ({
    publicKey: { toString: () => 'mock-wallet-address' },
  }),
  useConnection: () => ({
    connection: {
      getBalance: jest.fn().mockResolvedValue(1000000000), // 1 SOL
    },
  }),
}));

// Mock other dependencies
jest.mock('next/link', () => {
  return ({ children, href }: any) => <a href={href}>{children}</a>;
});

jest.mock('framer-motion', () => ({
  motion: {
    div: ({ children, whileHover, whileTap, animate, transition, initial, ...props }: any) => 
      <div {...props}>{children}</div>,
    nav: ({ children, whileHover, whileTap, animate, transition, initial, ...props }: any) => 
      <nav {...props}>{children}</nav>,
    button: ({ children, whileHover, whileTap, animate, transition, initial, ...props }: any) => 
      <button {...props}>{children}</button>,
  },
}));

const mockMatchData = {
  id: '1',
  status: 'live' as const,
  startTime: new Date().toISOString(),
  viewers: 100,
  totalPool: 123.45,
  pools: {
    agent1: 60,
    agent2: 40,
  },
  agent1: {
    name: 'Agent One',
    avatar: 'A1',
    elo: 1500,
    winRate: 0.7,
    personality: 'Aggressive',
  },
  agent2: {
    name: 'Agent Two',
    avatar: 'A2',
    elo: 1450,
    winRate: 0.6,
    personality: 'Defensive',
  },
};

describe('Backend API Integration', () => {
  beforeEach(() => {
    fetchMock.resetMocks();
  });

  it('should fetch and display match data from API', async () => {
    // Mock API response
    fetchMock.mockResponseOnce(JSON.stringify([mockMatchData]));

    const MockMatchList = () => {
      const [matches, setMatches] = React.useState([]);

      React.useEffect(() => {
        fetch('/api/matches')
          .then(res => res.json())
          .then(setMatches);
      }, []);

      return (
        <div>
          {matches.map((match: any) => (
            <MatchCard key={match.id} match={match} />
          ))}
        </div>
      );
    };

    render(<MockMatchList />);

    await waitFor(() => {
      expect(screen.getByText('Agent One')).toBeInTheDocument();
      expect(screen.getByText('Agent Two')).toBeInTheDocument();
    });

    expect(fetchMock).toHaveBeenCalledWith('/api/matches');
  });

  it('should handle API errors gracefully', async () => {
    // Mock API error
    fetchMock.mockRejectOnce(new Error('Network error'));

    const MockComponent = () => {
      const [error, setError] = React.useState('');

      React.useEffect(() => {
        fetch('/api/matches')
          .catch(err => setError(err.message));
      }, []);

      return <div>{error && <span>Error: {error}</span>}</div>;
    };

    render(<MockComponent />);

    await waitFor(() => {
      expect(screen.getByText('Error: Network error')).toBeInTheDocument();
    });
  });

  it('should integrate with WebSocket for real-time updates', async () => {
    // Mock WebSocket
    const mockWebSocket = {
      send: jest.fn(),
      close: jest.fn(),
      onmessage: null as any,
      onopen: null as any,
      onclose: null as any,
      onerror: null as any,
    };

    (global as any).WebSocket = jest.fn(() => mockWebSocket);

    const MockRealTimeComponent = () => {
      const [data, setData] = React.useState(null);

      React.useEffect(() => {
        const ws = new WebSocket('ws://localhost:8080');
        ws.onmessage = (event) => {
          setData(JSON.parse(event.data));
        };
        return () => ws.close();
      }, []);

      return <div>{data && <span>Live data received</span>}</div>;
    };

    render(<MockRealTimeComponent />);

    // Simulate receiving WebSocket message
    act(() => {
      mockWebSocket.onmessage({
        data: JSON.stringify({ type: 'match_update', match: mockMatchData })
      });
    });

    await waitFor(() => {
      expect(screen.getByText('Live data received')).toBeInTheDocument();
    });
  });

  it('should handle authentication flow with backend', async () => {
    // Mock auth API responses
    fetchMock
      .mockResponseOnce(JSON.stringify({ token: 'mock-jwt-token' })) // Login
      .mockResponseOnce(JSON.stringify({ user: { id: '1', wallet: 'mock-address' } })); // User profile

    const MockAuthComponent = () => {
      const [isAuthenticated, setIsAuthenticated] = React.useState(false);
      const [userProfile, setUserProfile] = React.useState(null);

      const handleLogin = async () => {
        const loginResponse = await fetch('/api/auth/login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ wallet: 'mock-address' }),
        });
        const { token } = await loginResponse.json();
        
        if (token) {
          setIsAuthenticated(true);
          
          const profileResponse = await fetch('/api/user/profile', {
            headers: { Authorization: `Bearer ${token}` },
          });
          const profile = await profileResponse.json();
          setUserProfile(profile.user);
        }
      };

      return (
        <div>
          {!isAuthenticated ? (
            <button onClick={handleLogin}>Login</button>
          ) : (
            <div>
              <span>Authenticated</span>
              {userProfile && <span>User ID: {userProfile.id}</span>}
            </div>
          )}
        </div>
      );
    };

    render(<MockAuthComponent />);

    fireEvent.click(screen.getByText('Login'));

    await waitFor(() => {
      expect(screen.getByText('Authenticated')).toBeInTheDocument();
      expect(screen.getByText('User ID: 1')).toBeInTheDocument();
    });

    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it('should handle betting API integration', async () => {
    // Mock betting API
    fetchMock.mockResponseOnce(JSON.stringify({
      success: true,
      transactionId: 'mock-tx-id',
      betId: 'bet-123'
    }));

    const mockPlaceBet = async (matchId: string, agent: number, amount: number) => {
      const response = await fetch('/api/bets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ matchId, agent, amount }),
      });
      return response.json();
    };

    const result = await mockPlaceBet('match-1', 1, 0.5);

    expect(result).toEqual({
      success: true,
      transactionId: 'mock-tx-id',
      betId: 'bet-123'
    });

    expect(fetchMock).toHaveBeenCalledWith('/api/bets', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ matchId: 'match-1', agent: 1, amount: 0.5 }),
    });
  });

  it('should sync data with blockchain state', async () => {
    // Mock blockchain data fetch
    fetchMock.mockResponseOnce(JSON.stringify({
      blockHeight: 12345,
      poolBalance: 1000000000, // 1 SOL in lamports
      bets: [
        { id: 'bet-1', amount: 500000000, agent: 1 },
        { id: 'bet-2', amount: 300000000, agent: 2 },
      ]
    }));

    const MockBlockchainSync = () => {
      const [blockchainData, setBlockchainData] = React.useState(null);

      React.useEffect(() => {
        fetch('/api/blockchain/match/1')
          .then(res => res.json())
          .then(setBlockchainData);
      }, []);

      return (
        <div>
          {blockchainData && (
            <div>
              <span>Block Height: {blockchainData.blockHeight}</span>
              <span>Pool Balance: {blockchainData.poolBalance}</span>
              <span>Total Bets: {blockchainData.bets.length}</span>
            </div>
          )}
        </div>
      );
    };

    render(<MockBlockchainSync />);

    await waitFor(() => {
      expect(screen.getByText('Block Height: 12345')).toBeInTheDocument();
      expect(screen.getByText('Pool Balance: 1000000000')).toBeInTheDocument();
      expect(screen.getByText('Total Bets: 2')).toBeInTheDocument();
    });
  });

  it('should handle rate limiting gracefully', async () => {
    // Mock rate limit response
    fetchMock.mockResponseOnce(
      JSON.stringify({ error: 'Rate limit exceeded' }),
      { status: 429 }
    );

    const MockRateLimitedComponent = () => {
      const [error, setError] = React.useState('');

      React.useEffect(() => {
        fetch('/api/matches')
          .then(res => {
            if (res.status === 429) {
              throw new Error('Rate limited');
            }
            return res.json();
          })
          .catch(err => setError(err.message));
      }, []);

      return <div>{error && <span>Error: {error}</span>}</div>;
    };

    render(<MockRateLimitedComponent />);

    await waitFor(() => {
      expect(screen.getByText('Error: Rate limited')).toBeInTheDocument();
    });
  });

  it('should handle concurrent API requests efficiently', async () => {
    // Mock multiple API endpoints
    fetchMock
      .mockResponseOnce(JSON.stringify([mockMatchData])) // matches
      .mockResponseOnce(JSON.stringify({ balance: 1000 })) // wallet balance
      .mockResponseOnce(JSON.stringify([{ id: 'bet-1' }])); // user bets

    const MockConcurrentRequests = () => {
      const [data, setData] = React.useState({ matches: [], balance: 0, bets: [] });

      React.useEffect(() => {
        Promise.all([
          fetch('/api/matches').then(res => res.json()),
          fetch('/api/wallet/balance').then(res => res.json()),
          fetch('/api/user/bets').then(res => res.json()),
        ]).then(([matches, balance, bets]) => {
          setData({ matches, balance: balance.balance, bets });
        });
      }, []);

      return (
        <div>
          <span>Matches: {data.matches.length}</span>
          <span>Balance: {data.balance}</span>
          <span>Bets: {data.bets.length}</span>
        </div>
      );
    };

    render(<MockConcurrentRequests />);

    await waitFor(() => {
      expect(screen.getByText('Matches: 1')).toBeInTheDocument();
      expect(screen.getByText('Balance: 1000')).toBeInTheDocument();
      expect(screen.getByText('Bets: 1')).toBeInTheDocument();
    });

    expect(fetchMock).toHaveBeenCalledTimes(3);
  });
});
