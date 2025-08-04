import React from 'react';
import { render, screen } from '@testing-library/react';
import { axe, toHaveNoViolations } from 'jest-axe';
import AIInterface from '@/components/AIInterface/AIInterface';
import { AIAgent, Move, GamePiece } from '@/types';

// Extend Jest matchers
expect.extend(toHaveNoViolations);

// Mock data for accessibility and integration tests
const mockGamePiece: GamePiece = {
  id: 'piece-1',
  type: 'Marshal',
  owner: 1,
  position: [3, 4],
  stackLevel: 1,
  canMove: true,
};

const mockMove: Move = {
  from: [3, 4],
  to: [5, 6],
  piece: mockGamePiece,
  timestamp: Date.now(),
  player: 1,
};

const mockAIAgent: AIAgent = {
  id: 'agent-test-1',
  name: 'AlphaKnight',
  owner: 'test-owner-public-key',
  elo: 1850,
  winRate: 0.742,
  gamesPlayed: 156,
  personality: 'Aggressive',
  avatar: 'AK',
  isForSale: false,
  price: 50,
  nftMintAddress: 'test-nft-mint-123',
  traits: {
    strategy: 85,
    adaptability: 70,
    aggression: 92,
    patience: 35,
    creativity: 78,
  },
};

describe('AIInterface Integration', () => {
  it('should handle mock AI vs Human gameplay interaction', async () => {
    const { container } = render(<AIInterface agent={mockAIAgent} currentMove={mockMove} />);

    // Ensure accessibility
    const results = await axe(container);
    expect(results).toHaveNoViolations();

    // Simulate gameplay interactions if needed
    // Example: Simulate a button click in the UI that handles a new move or game action.
    // Example: Simulate an API call to fetch real-time data.

    // Verify that display changes accordingly based on interactions
    expect(screen.getByText('AI Personality & Traits')).toBeInTheDocument();
  });
});

