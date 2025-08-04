import React from 'react';
import { render, screen } from '@testing-library/react';
import BettingInterface from '../../../components/BettingInterface/BettingInterface';

// Mock dependencies
jest.mock('@solana/wallet-adapter-react', () => ({
  useWallet: () => ({
    connected: true,
    publicKey: { toString: () => 'test-wallet-address' },
    connecting: false,
    disconnecting: false,
  }),
}));
jest.mock('../../../hooks/useBetting', () => () => ({
  pools: { total: 1000, agent1: 600, agent2: 400 },
  userBets: [],
  odds: { agent1: 1.67, agent2: 2.5 },
  isLoading: false,
  error: null,
  placeBet: jest.fn(),
  claimWinnings: jest.fn(),
  refetch: jest.fn(),
}));

const renderBettingInterface = () => {
  return render(<BettingInterface />);
};

describe('BettingInterface', () => {
  it('renders without crashing', () => {
    renderBettingInterface();
    expect(screen.getByText(/total pool/i)).toBeInTheDocument();
    expect(screen.getByText(/choose your fighter/i)).toBeInTheDocument();
    expect(screen.getByText(/bet amount/i)).toBeInTheDocument();
  });

  it('shows loading state when betting data is loading', () => {
    jest.mock('../../hooks/useBetting', () => () => ({
      pools: { total: 0, agent1: 0, agent2: 0 },
      userBets: [],
      odds: null,
      isLoading: true,
      error: null,
      placeBet: jest.fn(),
      claimWinnings: jest.fn(),
      refetch: jest.fn(),
    }));
    renderBettingInterface();
    expect(screen.getByText(/loading/i)).toBeInTheDocument();
  });

  it('displays error message if there is an error in fetching betting data', () => {
    jest.mock('../../hooks/useBetting', () => () => ({
      pools: null,
      userBets: [],
      odds: null,
      isLoading: false,
      error: 'Failed to fetch data',
      placeBet: jest.fn(),
      claimWinnings: jest.fn(),
      refetch: jest.fn(),
    }));
    renderBettingInterface();
    expect(screen.getByText(/failed to fetch data/i)).toBeInTheDocument();
  });

  it('renders user’s active bets', () => {
    jest.mock('../../hooks/useBetting', () => () => ({
      pools: { total: 1000, agent1: 600, agent2: 400 },
      userBets: [{
        id: 'b1',
        user: 'user1',
        matchId: 'match1',
        agent: 1,
        amount: 0.5,
        odds: 1.8,
        status: 'active',
        potentialPayout: 0.9,
        placedAt: new Date(Date.now() - 60000),
      }],
      odds: { agent1: 1.67, agent2: 2.5 },
      isLoading: false,
      error: null,
      placeBet: jest.fn(),
      claimWinnings: jest.fn(),
      refetch: jest.fn(),
    }));
    renderBettingInterface();
    expect(screen.getByText(/your active bets/i)).toBeInTheDocument();
    expect(screen.getByText(/agent 1/i)).toBeInTheDocument();
  });
});

