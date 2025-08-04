import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import AIInterface from '@/components/AIInterface/AIInterface';
import { AIAgent, Move, GamePiece } from '@/types';

// Mock data for testing
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

const mockDefensiveAgent: AIAgent = {
  id: 'agent-test-2',
  name: 'Guardian',
  owner: 'test-owner-2',
  elo: 1650,
  winRate: 0.684,
  gamesPlayed: 203,
  personality: 'Defensive',
  avatar: 'GD',
  isForSale: true,
  price: 75,
  traits: {
    strategy: 90,
    adaptability: 88,
    aggression: 25,
    patience: 95,
    creativity: 60,
  },
};

describe('AIInterface', () => {
  describe('Component Rendering', () => {
    it('should render without crashing with valid props', () => {
      render(<AIInterface agent={mockAIAgent} currentMove={mockMove} />);
      
      expect(screen.getByText('AI Personality & Traits')).toBeInTheDocument();
      expect(screen.getByText('Current Move Calculation')).toBeInTheDocument();
    });

    it('should apply custom className when provided', () => {
      const customClass = 'custom-test-class';
      const { container } = render(
        <AIInterface agent={mockAIAgent} currentMove={mockMove} className={customClass} />
      );
      
      const aiInterfaceElement = container.querySelector('.ai-interface');
      expect(aiInterfaceElement).toHaveClass(customClass);
    });

    it('should have default styling classes', () => {
      const { container } = render(
        <AIInterface agent={mockAIAgent} currentMove={mockMove} />
      );
      
      const aiInterfaceElement = container.querySelector('.ai-interface');
      expect(aiInterfaceElement).toHaveClass('bg-space-800', 'rounded-lg', 'p-6');
    });
  });

  describe('AI Agent Information Display', () => {
    it('should display basic agent information correctly', () => {
      render(<AIInterface agent={mockAIAgent} currentMove={mockMove} />);
      
      expect(screen.getByText('AlphaKnight')).toBeInTheDocument();
      expect(screen.getByText('Aggressive')).toBeInTheDocument();
      expect(screen.getByText('1850')).toBeInTheDocument();
      expect(screen.getByText('74.20%')).toBeInTheDocument();
    });

    it('should display agent traits with correct values', () => {
      render(<AIInterface agent={mockAIAgent} currentMove={mockMove} />);
      
      expect(screen.getByText('strategy')).toBeInTheDocument();
      expect(screen.getByText('85')).toBeInTheDocument();
      expect(screen.getByText('adaptability')).toBeInTheDocument();
      expect(screen.getByText('70')).toBeInTheDocument();
      expect(screen.getByText('aggression')).toBeInTheDocument();
      expect(screen.getByText('92')).toBeInTheDocument();
      expect(screen.getByText('patience')).toBeInTheDocument();
      expect(screen.getByText('35')).toBeInTheDocument();
      expect(screen.getByText('creativity')).toBeInTheDocument();
      expect(screen.getByText('78')).toBeInTheDocument();
    });

    it('should capitalize personality type correctly', () => {
      render(<AIInterface agent={mockDefensiveAgent} currentMove={mockMove} />);
      
      const personalityElement = screen.getByText('Defensive');
      expect(personalityElement).toHaveClass('capitalize');
    });

    it('should format win rate as percentage with 2 decimal places', () => {
      render(<AIInterface agent={mockDefensiveAgent} currentMove={mockMove} />);
      
      expect(screen.getByText('68.40%')).toBeInTheDocument();
    });
  });

  describe('Current Move Display', () => {
    it('should display move information correctly', () => {
      render(<AIInterface agent={mockAIAgent} currentMove={mockMove} />);
      
      expect(screen.getByText('Marshal')).toBeInTheDocument();
    });

    it('should convert coordinates to chess notation correctly', () => {
      render(<AIInterface agent={mockAIAgent} currentMove={mockMove} />);
      
      // From position [3, 4] should display as E4 (column 4 = E, row 3+1 = 4)
      expect(screen.getByText('E4')).toBeInTheDocument();
      // To position [5, 6] should display as G6 (column 6 = G, row 5+1 = 6)
      expect(screen.getByText('G6')).toBeInTheDocument();
    });

    it('should handle edge case coordinates correctly', () => {
      const edgeCaseMove: Move = {
        ...mockMove,
        from: [0, 0],
        to: [7, 7],
      };

      render(<AIInterface agent={mockAIAgent} currentMove={edgeCaseMove} />);
      
      // [0, 0] should be A1, [7, 7] should be H8
      expect(screen.getByText('A1')).toBeInTheDocument();
      expect(screen.getByText('H8')).toBeInTheDocument();
    });
  });

  describe('Performance Statistics', () => {
    it('should display ELO rating prominently', () => {
      render(<AIInterface agent={mockAIAgent} currentMove={mockMove} />);
      
      const eloElement = screen.getByText('1850');
      expect(eloElement).toHaveClass('font-bold');
    });

    it('should handle different ELO ranges', () => {
      const lowEloAgent = { ...mockAIAgent, elo: 1200 };
      const highEloAgent = { ...mockAIAgent, elo: 2400 };

      const { rerender } = render(<AIInterface agent={lowEloAgent} currentMove={mockMove} />);
      expect(screen.getByText('1200')).toBeInTheDocument();

      rerender(<AIInterface agent={highEloAgent} currentMove={mockMove} />);
      expect(screen.getByText('2400')).toBeInTheDocument();
    });

    it('should handle win rates at boundaries correctly', () => {
      const perfectAgent = { ...mockAIAgent, winRate: 1.0 };
      const zeroWinAgent = { ...mockAIAgent, winRate: 0.0 };

      const { rerender } = render(<AIInterface agent={perfectAgent} currentMove={mockMove} />);
      expect(screen.getByText('100.00%')).toBeInTheDocument();

      rerender(<AIInterface agent={zeroWinAgent} currentMove={mockMove} />);
      expect(screen.getByText('0.00%')).toBeInTheDocument();
    });
  });

  describe('Trait Analysis', () => {
    it('should display all trait categories', () => {
      render(<AIInterface agent={mockAIAgent} currentMove={mockMove} />);
      
      const expectedTraits = ['strategy', 'adaptability', 'aggression', 'patience', 'creativity'];
      expectedTraits.forEach(trait => {
        expect(screen.getByText(trait)).toBeInTheDocument();
      });
    });

    it('should handle extreme trait values', () => {
      const extremeAgent: AIAgent = {
        ...mockAIAgent,
        traits: {
          strategy: 1,
          adaptability: 100,
          aggression: 50,
          patience: 25,
          creativity: 75,
        },
      };

      render(<AIInterface agent={extremeAgent} currentMove={mockMove} />);
      
      expect(screen.getByText('1')).toBeInTheDocument();
      expect(screen.getByText('100')).toBeInTheDocument();
    });
  });

  describe('Different Piece Types', () => {
    it('should display different piece types correctly', () => {
      const pieceTypes = ['Marshal', 'General', 'Lieutenant', 'Major', 'Minor', 'Pawn', 'Bow', 'Cannon', 'Fort'];
      
      pieceTypes.forEach(pieceType => {
        const testPiece: GamePiece = { ...mockGamePiece, type: pieceType as any };
        const testMove: Move = { ...mockMove, piece: testPiece };
        
        const { rerender } = render(<AIInterface agent={mockAIAgent} currentMove={testMove} />);
        expect(screen.getByText(pieceType)).toBeInTheDocument();
      });
    });
  });

  describe('Personality Types', () => {
    it('should display different personality types correctly', () => {
      const personalityTypes = ['Aggressive', 'Defensive', 'Balanced', 'Tactical', 'Unpredictable'];
      
      personalityTypes.forEach(personality => {
        const testAgent = { ...mockAIAgent, personality: personality as any };
        
        const { rerender } = render(<AIInterface agent={testAgent} currentMove={mockMove} />);
        expect(screen.getByText(personality)).toBeInTheDocument();
      });
    });
  });

  describe('Responsive Design Elements', () => {
    it('should have proper grid layout for traits', () => {
      const { container } = render(<AIInterface agent={mockAIAgent} currentMove={mockMove} />);
      
      const traitsGrid = container.querySelector('.grid-cols-2');
      expect(traitsGrid).toBeInTheDocument();
      expect(traitsGrid).toHaveClass('gap-2');
    });

    it('should have flex layout for main sections', () => {
      const { container } = render(<AIInterface agent={mockAIAgent} currentMove={mockMove} />);
      
      const flexContainers = container.querySelectorAll('.flex');
      expect(flexContainers.length).toBeGreaterThan(0);
    });
  });

  describe('Data Validation', () => {
    it('should handle missing optional properties gracefully', () => {
      const minimalAgent: AIAgent = {
        id: 'minimal-agent',
        name: 'Minimal',
        owner: 'owner',
        elo: 1500,
        winRate: 0.5,
        gamesPlayed: 10,
        personality: 'Balanced',
        avatar: 'M',
        isForSale: false,
        traits: {
          strategy: 50,
          adaptability: 50,
          aggression: 50,
          patience: 50,
          creativity: 50,
        },
      };

      expect(() => {
        render(<AIInterface agent={minimalAgent} currentMove={mockMove} />);
      }).not.toThrow();
    });

    it('should handle decimal win rates correctly', () => {
      const decimalAgent = { ...mockAIAgent, winRate: 0.12345 };
      
      render(<AIInterface agent={decimalAgent} currentMove={mockMove} />);
      expect(screen.getByText('12.35%')).toBeInTheDocument();
    });
  });

  describe('Color and Styling', () => {
    it('should apply correct text color classes', () => {
      const { container } = render(<AIInterface agent={mockAIAgent} currentMove={mockMove} />);
      
      expect(container.querySelector('.text-gray-300')).toBeInTheDocument();
      expect(container.querySelector('.text-gray-400')).toBeInTheDocument();
      expect(container.querySelector('.text-enhancement-400')).toBeInTheDocument();
    });

    it('should apply correct background classes', () => {
      const { container } = render(<AIInterface agent={mockAIAgent} currentMove={mockMove} />);
      
      expect(container.querySelector('.bg-space-800')).toBeInTheDocument();
      expect(container.querySelector('.bg-space-700')).toBeInTheDocument();
    });
  });

  describe('Text Formatting', () => {
    it('should apply bold formatting to important values', () => {
      render(<AIInterface agent={mockAIAgent} currentMove={mockMove} />);
      
      const boldElements = screen.getAllByText((content, element) => {
        return element?.classList.contains('font-bold') || false;
      });
      
      expect(boldElements.length).toBeGreaterThan(0);
    });

    it('should capitalize trait names', () => {
      const { container } = render(<AIInterface agent={mockAIAgent} currentMove={mockMove} />);
      
      const capitalizedElements = container.querySelectorAll('.capitalize');
      expect(capitalizedElements.length).toBeGreaterThan(0);
    });
  });

  describe('Component Structure', () => {
    it('should have proper section headers', () => {
      render(<AIInterface agent={mockAIAgent} currentMove={mockMove} />);
      
      const personalityHeader = screen.getByRole('heading', { name: /AI Personality & Traits/i });
      const moveHeader = screen.getByRole('heading', { name: /Current Move Calculation/i });
      
      expect(personalityHeader).toBeInTheDocument();
      expect(moveHeader).toBeInTheDocument();
    });

    it('should have correct heading hierarchy', () => {
      render(<AIInterface agent={mockAIAgent} currentMove={mockMove} />);
      
      const h2Element = screen.getByRole('heading', { level: 2 });
      const h3Element = screen.getByRole('heading', { level: 3 });
      
      expect(h2Element).toBeInTheDocument();
      expect(h3Element).toBeInTheDocument();
    });
  });

  // Additional test cases to achieve 100% coverage
  describe('Extended Edge Cases for 100% Coverage', () => {
    it('should handle agent with missing optional fields', () => {
      const minimalAgent: AIAgent = {
        id: 'minimal-1',
        name: 'BasicBot',
        owner: 'minimal-owner',
        elo: 1000,
        winRate: 0.5,
        gamesPlayed: 1,
        personality: 'Balanced',
        avatar: 'BB',
        isForSale: false,
        traits: {
          strategy: 50,
          adaptability: 50,
          aggression: 50,
          patience: 50,
          creativity: 50,
        },
      };

      expect(() => {
        render(<AIInterface agent={minimalAgent} currentMove={mockMove} />);
      }).not.toThrow();
    });

    it('should render with various move coordinates covering all board positions', () => {
      const edgeCoordinatesTests = [
        { from: [0, 0], to: [8, 8] }, // corner to corner
        { from: [4, 4], to: [0, 8] }, // center to edge
        { from: [8, 0], to: [0, 0] }, // edge to corner
        { from: [7, 3], to: [2, 6] }, // arbitrary positions
      ];

      edgeCoordinatesTests.forEach(coords => {
        const testMove: Move = {
          ...mockMove,
          from: coords.from as [number, number],
          to: coords.to as [number, number],
        };

        const { rerender } = render(<AIInterface agent={mockAIAgent} currentMove={testMove} />);
        
        // Verify coordinate conversion
        const fromCoord = String.fromCharCode(65 + coords.from[1]) + (coords.from[0] + 1);
        const toCoord = String.fromCharCode(65 + coords.to[1]) + (coords.to[0] + 1);
        
        expect(screen.getByText(fromCoord)).toBeInTheDocument();
        expect(screen.getByText(toCoord)).toBeInTheDocument();
        
        rerender(<div />); // Clean up for next iteration
      });
    });

    it('should handle extreme trait values and elo ratings', () => {
      const extremeAgent: AIAgent = {
        ...mockAIAgent,
        elo: 3000, // Very high ELO
        winRate: 0.999, // Near perfect win rate
        traits: {
          strategy: 100,
          adaptability: 1,
          aggression: 100,
          patience: 1,
          creativity: 50,
        },
      };

      render(<AIInterface agent={extremeAgent} currentMove={mockMove} />);
      
      expect(screen.getByText('3000')).toBeInTheDocument();
      expect(screen.getByText('99.90%')).toBeInTheDocument();
      expect(screen.getAllByText('100')).toHaveLength(2); // strategy and aggression both 100
      expect(screen.getAllByText('1')).toHaveLength(2); // adaptability and patience both 1
    });

    it('should handle all possible piece types', () => {
      const allPieceTypes: Array<typeof mockGamePiece.type> = [
        'Marshal', 'General', 'Lieutenant', 'Major', 'Minor', 
        'Pawn', 'Bow', 'Cannon', 'Fort'
      ];

      allPieceTypes.forEach(pieceType => {
        const testPiece: GamePiece = { ...mockGamePiece, type: pieceType };
        const testMove: Move = { ...mockMove, piece: testPiece };
        
        const { rerender } = render(<AIInterface agent={mockAIAgent} currentMove={testMove} />);
        expect(screen.getByText(pieceType)).toBeInTheDocument();
        
        rerender(<div />); // Clean up
      });
    });

    it('should handle all personality types', () => {
      const allPersonalities: Array<typeof mockAIAgent.personality> = [
        'Aggressive', 'Defensive', 'Balanced', 'Tactical', 'Unpredictable'
      ];

      allPersonalities.forEach(personality => {
        const testAgent = { ...mockAIAgent, personality };
        
        const { rerender } = render(<AIInterface agent={testAgent} currentMove={mockMove} />);
        expect(screen.getByText(personality)).toBeInTheDocument();
        
        rerender(<div />); // Clean up
      });
    });

    it('should render with zero win rate and games played', () => {
      const newAgent: AIAgent = {
        ...mockAIAgent,
        winRate: 0.0,
        gamesPlayed: 0,
        elo: 1200,
      };

      render(<AIInterface agent={newAgent} currentMove={mockMove} />);
      
      expect(screen.getByText('0.00%')).toBeInTheDocument();
      expect(screen.getByText('1200')).toBeInTheDocument();
    });

    it('should handle component without crashing when className is empty string', () => {
      render(<AIInterface agent={mockAIAgent} currentMove={mockMove} className="" />);
      
      expect(screen.getByText('AI Personality & Traits')).toBeInTheDocument();
    });

    it('should handle component without crashing when className is undefined', () => {
      render(<AIInterface agent={mockAIAgent} currentMove={mockMove} />);
      
      expect(screen.getByText('AI Personality & Traits')).toBeInTheDocument();
    });

    it('should render all trait labels correctly', () => {
      render(<AIInterface agent={mockAIAgent} currentMove={mockMove} />);
      
      const expectedTraits = ['strategy', 'adaptability', 'aggression', 'patience', 'creativity'];
      expectedTraits.forEach(trait => {
        expect(screen.getByText(trait)).toBeInTheDocument();
      });
    });

    it('should handle moves with stack level information', () => {
      const stackedPiece: GamePiece = {
        ...mockGamePiece,
        stackLevel: 3,
        position: [5, 2],
      };
      
      const stackMove: Move = {
        ...mockMove,
        piece: stackedPiece,
        from: [5, 2],
        to: [6, 3],
      };

      render(<AIInterface agent={mockAIAgent} currentMove={stackMove} />);
      
      expect(screen.getByText('C6')).toBeInTheDocument(); // from position
      expect(screen.getByText('D7')).toBeInTheDocument(); // to position
    });
  });
});
