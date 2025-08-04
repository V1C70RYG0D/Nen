import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useWallet } from '@solana/wallet-adapter-react';
import { useBetting } from '@/hooks/useBetting';
import { BettingPanel } from '@/components/BettingPanel/BettingPanel';
import type { AIAgent, Bet } from '@/types';
import { createMockAgent } from '../../utils/test-helpers';
import each from 'jest-each';

// Mock dependencies
jest.mock('@/hooks/useBetting');
jest.mock('@solana/wallet-adapter-react');
jest.mock('@/utils/format', () => ({
  formatSOL: jest.fn((value: number) => `${(value / 1000000000).toFixed(3)} SOL`),
  formatPercentage: jest.fn((value: number) => `${(value * 100).toFixed(1)}%`),
  shortenAddress: jest.fn((addr: string) => `${addr.slice(0, 4)}...${addr.slice(-4)}`),
}));
jest.mock('@/utils/validation', () => ({
  validateSOLAmount: jest.fn((amount: string) => ({
    isValid: !!amount && !isNaN(parseFloat(amount)) && parseFloat(amount) > 0,
    sanitizedValue: amount && !isNaN(parseFloat(amount)) ? parseFloat(amount) : undefined,
    error: !amount ? 'Amount is required' : isNaN(parseFloat(amount)) ? 'Invalid number format' : parseFloat(amount) <= 0 ? 'Amount must be greater than 0' : undefined
  })),
  validateBetAmount: jest.fn(() => ({ isValid: true })),
}));
jest.mock('@/utils/theme', () => ({
  getAuraGlow: jest.fn(() => '0 0 20px rgba(255, 255, 255, 0.5)'),
}));
jest.mock('framer-motion', () => ({
  motion: {
    div: ({ children, whileHover, whileTap, initial, animate, transition, ...props }: any) => <div {...props}>{children}</div>,
    button: ({ children, whileHover, whileTap, initial, animate, transition, ...props }: any) => <button {...props}>{children}</button>,
    p: ({ children, whileHover, whileTap, initial, animate, transition, ...props }: any) => <p {...props}>{children}</p>,
  },
}));

const mockUseBetting = useBetting as jest.MockedFunction<typeof useBetting>;
const mockUseWallet = useWallet as jest.MockedFunction<typeof useWallet>;

const mockBettingData = {
  pools: { total: 1000, agent1: 600, agent2: 400 },
  userBets: [],
  odds: { agent1: 1.67, agent2: 2.5 },
  isLoading: false,
  error: null,
  placeBet: jest.fn(),
  claimWinnings: jest.fn(),
  refetch: jest.fn(),
};

const mockWalletData = {
  connected: true,
  publicKey: { toString: () => 'test-wallet-address' },
  connecting: false,
  disconnecting: false,
};

const mockAgent1: AIAgent = {
  id: 'agent1',
  name: 'Hunter Agent',
  owner: 'owner1',
  elo: 1500,
  winRate: 0.75,
  gamesPlayed: 100,
  personality: 'Aggressive',
  avatar: '🔥',
  isForSale: false,
  traits: {
    strategy: 85,
    adaptability: 70,
    aggression: 90,
    patience: 40,
    creativity: 65,
  },
};

const mockAgent2: AIAgent = {
  id: 'agent2',
  name: 'Strategist Agent',
  owner: 'owner2',
  elo: 1600,
  winRate: 0.68,
  gamesPlayed: 120,
  personality: 'Tactical',
  avatar: '🧠',
  isForSale: false,
  traits: {
    strategy: 95,
    adaptability: 80,
    aggression: 30,
    patience: 90,
    creativity: 75,
  },
};

describe('BettingPanel', () => {
  beforeEach(() => {
    mockUseBetting.mockReturnValue(mockBettingData);
    mockUseWallet.mockReturnValue(mockWalletData);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('Rendering', () => {
    it('should render the betting panel with header', () => {
      render(<BettingPanel matchId="test-match" agent1={createMockAgent({ id: 'a1', name: 'Agent 1' })} agent2={createMockAgent({ id: 'a2', name: 'Agent 2' })} />);
      
      expect(screen.getByText('Place Your Bet')).toBeInTheDocument();
      expect(screen.getByText('Total Pool')).toBeInTheDocument();
      expect(screen.getByText('Choose Your Fighter')).toBeInTheDocument();
      expect(screen.getByText('Bet Amount')).toBeInTheDocument();
    });

    it('should display odds correctly', () => {
      render(<BettingPanel matchId="test-match" agent1={createMockAgent({ id: 'a1', name: 'Agent 1' })} agent2={createMockAgent({ id: 'a2', name: 'Agent 2' })} />);
      
      expect(screen.getByText('1.67x')).toBeInTheDocument();
      expect(screen.getByText('2.50x')).toBeInTheDocument(); // Component shows 2 decimal places
    });
  });

  describe('User Interaction', () => {  
    each([
      {
        connected: true,
        betAmount: '1.0',
        selectedAgent: 'Hunter Agent',
        agentNumber: 1,
        expectedResult: true,
        errorMessage: ''
      },
      {
        connected: false,
        betAmount: '2.0',
        selectedAgent: 'Strategist Agent',
        agentNumber: 2,
        expectedResult: false,
        errorMessage: 'Connect Wallet to Bet'
      },
      {
        connected: true,
        betAmount: '',
        selectedAgent: 'Hunter Agent',
        agentNumber: 1,
        expectedResult: false,
        errorMessage: 'Enter Valid Amount'
      }
    ]).describe('Parameterized Bet Test: connected=%s, betAmount=%s, selectedAgent=%s', (
      { connected, betAmount, selectedAgent, agentNumber, expectedResult, errorMessage }
    ) => {
      it(
        `should ${expectedResult ? 'successfully place' : 'not place'} bet with amount ${betAmount} on ${selectedAgent}`,
        async () => {
          const user = userEvent.setup();
          mockUseWallet.mockReturnValue({ ...mockWalletData, connected });
          const { placeBet } = mockBettingData;

          render(
            <BettingPanel
              matchId="test-match"
              agent1={mockAgent1}
              agent2={mockAgent2}
            />
          );

          if (betAmount) {
            const betInput = screen.getByPlaceholderText('Enter amount...');
            await user.type(betInput, betAmount);
          }

          // Use aria-label to find the agent selection button
          const selectedAgentElement = screen.getByLabelText(new RegExp(selectedAgent));
          await user.click(selectedAgentElement);

          // Check if expected button text is present
          if (connected && betAmount && expectedResult) {
            const placeBetButton = screen.getByText(new RegExp(`Place Bet.*${betAmount}.*SOL`));
            await user.click(placeBetButton);
          } else if (!connected) {
            const connectButton = screen.getByText('Connect Wallet to Bet');
            await user.click(connectButton);
          } else if (!betAmount || !expectedResult) {
            // Button should show the appropriate message
            const button = screen.getByRole('button', { name: /place bet|enter valid|select an agent|connect wallet/i });
            if (button) await user.click(button);
          }

          if (expectedResult) {
            await waitFor(() => {
              expect(placeBet).toHaveBeenCalledWith(
                expect.objectContaining({
                  matchId: 'test-match',
                  agent: agentNumber,
                  amount: parseFloat(betAmount)
                })
              );
            });
          } else {
            expect(placeBet).not.toHaveBeenCalled();
            if (errorMessage) {
              expect(screen.getByText(errorMessage)).toBeInTheDocument();
            }
          }
        }
      );
    });
    it('should handle bet amount input and selection', async () => {
      const user = userEvent.setup();
      mockUseWallet.mockReturnValue(mockWalletData);
      render(<BettingPanel matchId="test-match" agent1={createMockAgent({ id: 'a1', name: 'Agent 1' })} agent2={createMockAgent({ id: 'a2', name: 'Agent 2' })} />);

      const betInput = screen.getByPlaceholderText('Enter amount...');
      await user.type(betInput, '1.25');

      expect(betInput).toHaveValue('1.25');

      // Button should show "Select an Agent" since no agent is selected yet
      const selectAgentButton = screen.getByText('Select an Agent');
      expect(selectAgentButton).toBeInTheDocument();
    });

    it('should handle agent selection', async () => {
      const user = userEvent.setup();
      render(<BettingPanel matchId="test-match" agent1={createMockAgent({ id: 'a1', name: 'Agent 1' })} agent2={createMockAgent({ id: 'a2', name: 'Agent 2' })} />);

      const agent1Button = screen.getByLabelText(/Select Agent 1/);
      await user.click(agent1Button);

      expect(agent1Button).toHaveClass('ring-2'); // Check if selection ring appears on the button itself
    });

    it('should handle bet placement', async () => {
      const user = userEvent.setup();
      const { placeBet } = mockBettingData;
      render(<BettingPanel matchId="test-match" agent1={createMockAgent({ id: 'a1', name: 'Agent 1' })} agent2={createMockAgent({ id: 'a2', name: 'Agent 2' })} />);

      // Input amount and select an agent
      const betInput = screen.getByPlaceholderText('Enter amount...');
      await user.type(betInput, '1.0');

      const agent1Button = screen.getByLabelText(/Select Agent 1/);
      await user.click(agent1Button);

      // Button shows formatted amount with .000 format
      const placeBetButton = screen.getByText(new RegExp('Place Bet.*1\.000.*SOL'));
      await user.click(placeBetButton);

      await waitFor(() => {
        expect(placeBet).toHaveBeenCalledWith(expect.objectContaining({
          matchId: 'test-match',
          agent: 1,
          amount: 1.0,
        }));
      });
    });

    it('should display error messages', () => {
      mockUseBetting.mockReturnValue({ ...mockBettingData, error: 'Error placing bet' });
      render(<BettingPanel matchId="test-match" agent1={createMockAgent({ id: 'a1', name: 'Agent 1' })} agent2={createMockAgent({ id: 'a2', name: 'Agent 2' })} />);

      expect(screen.getByText('Error placing bet')).toBeInTheDocument();
    });

    it('should render user bets', () => {
      mockUseBetting.mockReturnValue({
        ...mockBettingData,
        userBets: [{
          id: 'b1',
          user: 'user1',
          matchId: 'test-match',
          agent: 1,
          amount: 0.5,
          odds: 1.8,
          status: 'active',
          potentialPayout: 0.9,
          placedAt: new Date(Date.now() - 60000),
        }],
      });
      render(<BettingPanel matchId="test-match" agent1={createMockAgent({ id: 'a1', name: 'Agent 1' })} agent2={createMockAgent({ id: 'a2', name: 'Agent 2' })} />);
      
      expect(screen.getByText('Your Active Bets')).toBeInTheDocument();
      // The component shows "Agent 1 - 0.000 SOL" due to formatSOL mock
      expect(screen.getByText(/Agent 1.*0\.000.*SOL/)).toBeInTheDocument();
    });
  });

  describe('Error Handling', () => {
    it('should not submit bet when not connected', async () => {
      const user = userEvent.setup();
      // Override wallet to be disconnected
      mockUseWallet.mockReturnValue({ ...mockWalletData, connected: false });
      render(<BettingPanel matchId="test-match" agent1={createMockAgent({ id: 'a1', name: 'Agent 1' })} agent2={createMockAgent({ id: 'a2', name: 'Agent 2' })} />);

      const placeBetButton = screen.getByText('Connect Wallet to Bet');
      await user.click(placeBetButton);

      await waitFor(() => {
        const { placeBet } = mockBettingData;
        expect(placeBet).not.toHaveBeenCalled();
      });
    });
  });
  describe('Error Message Tests', () => {
    it('should display descriptive error messages', async () => {
      mockUseBetting.mockReturnValue({ ...mockBettingData, error: 'Error placing bet' });
      render(<BettingPanel matchId="test-match" agent1={mockAgent1} agent2={mockAgent2} />);
      expect(screen.getByText('Error placing bet')).toBeInTheDocument();
    });
  });

  describe('Loading State Tests', () => {
    it('should show loading spinner during bet submission', async () => {
      mockUseBetting.mockReturnValue({ ...mockBettingData, isLoading: true });
      render(<BettingPanel matchId="test-match" agent1={mockAgent1} agent2={mockAgent2} />);
      
      // The loading spinner appears in the button when submitting
      expect(screen.getByText('Placing Bet...')).toBeInTheDocument();
      const { container } = render(<BettingPanel matchId="test-match" agent1={mockAgent1} agent2={mockAgent2} />);
      expect(container.querySelector('.nen-spinner')).toBeInTheDocument();
    });
  });

  describe('Success Confirmation Tests', () => {
    it('should display success alert on successful bet placement', async () => {
      const user = userEvent.setup();
      window.alert = jest.fn();
      render(<BettingPanel matchId="test-match" agent1={mockAgent1} agent2={mockAgent2} />);
      
      // Mock successful placement by creating a valid state first
      const betInput = screen.getByPlaceholderText('Enter amount...');
      await user.type(betInput, '1.0');
      
      const agent1Button = screen.getByLabelText(/Select Hunter Agent/);
      await user.click(agent1Button);
      
      const placeBetButton = screen.getByText(/Place Bet.*1\.000.*SOL/);
      await user.click(placeBetButton);

      await waitFor(() => {
        expect(window.alert).toHaveBeenCalledWith('Bet placed successfully!');
      });
    });
  });

  describe('Instructional Guidance Tests', () => {
    it('should guide users to connect wallet when it is not connected', async () => {
      mockUseWallet.mockReturnValue({ ...mockWalletData, connected: false });
      render(<BettingPanel matchId="test-match" agent1={mockAgent1} agent2={mockAgent2} />);
      const connectButton = screen.getByText('Connect Wallet to Bet');
      expect(connectButton).toBeDisabled(); // Button should be disabled to prevent interaction
    });
  });
});
