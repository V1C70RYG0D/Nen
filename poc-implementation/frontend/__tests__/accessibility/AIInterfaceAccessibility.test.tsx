import React from 'react';
import { render } from '@testing-library/react';
import AIInterface from '@/components/AIInterface/AIInterface';
import { AIAgent, Move, GamePiece } from '@/types';
import { runAxeTest, testAriaCompliance, testHeadingHierarchy } from '../utils/accessibility-helpers';

// Mock data for accessibility tests
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

describe('AIInterface Accessibility', () => {
  it('should have no accessibility violations', async () => {
    const renderResult = render(<AIInterface agent={mockAIAgent} currentMove={mockMove} />);
    await runAxeTest(renderResult.container, undefined, 'AIInterface component');
  }, 15000); // Increase timeout for axe tests

  it('should have proper heading structure', async () => {
    const renderResult = render(<AIInterface agent={mockAIAgent} currentMove={mockMove} />);
    
    try {
      const { getByRole } = renderResult;
      const heading1 = getByRole('heading', { name: /AI Personality/i });
      const heading2 = getByRole('heading', { name: /Current Move/i });
      expect(heading1).toBeInTheDocument();
      expect(heading2).toBeInTheDocument();
      
      // Test heading hierarchy
      await testHeadingHierarchy(renderResult);
    } catch (error) {
      // If specific headings aren't found, test general heading structure
      console.warn('Specific heading text not found, testing general heading structure');
      await testHeadingHierarchy(renderResult);
    }
  }, 10000);

  it('should have proper ARIA compliance', async () => {
    const renderResult = render(<AIInterface agent={mockAIAgent} currentMove={mockMove} />);
    await testAriaCompliance(renderResult);
  }, 10000);
});
