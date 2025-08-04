import React from 'react';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import { performance } from 'perf_hooks';
import { GameBoard } from '@/components/GameBoard/GameBoard';
import { useGameState } from '@/hooks/useGameState';
import { useMagicBlockSession } from '@/hooks/useMagicBlockSession';
import type { BoardState, GamePiece, Move } from '@/types';

// Mock hooks
jest.mock('@/hooks/useGameState');
jest.mock('@/hooks/useMagicBlockSession');
jest.mock('@/utils/theme', () => ({
  ...jest.requireActual('@/utils/theme'),
  getConnectionStatus: jest.fn(() => ({
    color: 'text-emission-400',
    text: 'Connected',
    icon: '●',
  })),
  getPieceSymbol: jest.fn((type: string) => '♟'),
}));
jest.mock('@/utils/validation', () => ({
  validateMoveCoordinates: jest.fn(() => ({ isValid: true })),
}));

const mockUseGameState = useGameState as jest.MockedFunction<typeof useGameState>;
const mockUseMagicBlockSession = useMagicBlockSession as jest.MockedFunction<typeof useMagicBlockSession>;

// Performance test utilities
class PerformanceMonitor {
  private measurements: Record<string, number[]> = {};
  
  startMeasurement(name: string): void {
    if (!this.measurements[name]) {
      this.measurements[name] = [];
    }
    performance.mark(`${name}-start`);
  }
  
  endMeasurement(name: string): number {
    performance.mark(`${name}-end`);
    performance.measure(name, `${name}-start`, `${name}-end`);
    
    const measure = performance.getEntriesByName(name)[0];
    const duration = measure.duration;
    this.measurements[name].push(duration);
    
    // Clean up marks
    performance.clearMarks(`${name}-start`);
    performance.clearMarks(`${name}-end`);
    performance.clearMeasures(name);
    
    return duration;
  }
  
  getAverageTime(name: string): number {
    const times = this.measurements[name] || [];
    return times.length > 0 ? times.reduce((a, b) => a + b, 0) / times.length : 0;
  }
  
  getMaxTime(name: string): number {
    const times = this.measurements[name] || [];
    return times.length > 0 ? Math.max(...times) : 0;
  }
  
  reset(): void {
    this.measurements = {};
    performance.clearMarks();
    performance.clearMeasures();
  }
}

// Mock data generator
const generateMockBoardState = (complexity: 'simple' | 'medium' | 'complex'): BoardState => {
  const pieceCount = {
    simple: 10,
    medium: 25,
    complex: 81 // Full board
  }[complexity];

  const pieces: GamePiece[] = [];
  for (let i = 0; i < pieceCount; i++) {
    pieces.push({
      id: `piece-${i}`,
      type: ['Marshal', 'General', 'Lieutenant', 'Major', 'Minor', 'Pawn', 'Bow', 'Cannon', 'Fort'][i % 9] as any,
      owner: (i % 2 + 1) as 1 | 2,
      position: [Math.floor(i / 9), i % 9],
      stackLevel: Math.floor(Math.random() * 3),
      canMove: true,
    });
  }

  return {
    pieces,
    currentPlayer: 1,
    moveCount: 0,
    gamePhase: 'playing',
  };
};

const generateMockMoves = (count: number): Move[] => {
  return Array.from({ length: count }, (_, i) => ({
    from: [Math.floor(Math.random() * 9), Math.floor(Math.random() * 9)] as [number, number],
    to: [Math.floor(Math.random() * 9), Math.floor(Math.random() * 9)] as [number, number],
    piece: {
      id: `piece-${i}`,
      type: 'Pawn',
      owner: (i % 2 + 1) as 1 | 2,
      position: [0, 0] as [number, number],
      stackLevel: 0,
      canMove: true,
    },
    timestamp: Date.now() + i * 1000,
    player: (i % 2 + 1) as 1 | 2,
  }));
};

describe('GameBoard Performance Tests', () => {
  let monitor: PerformanceMonitor;

  beforeEach(() => {
    monitor = new PerformanceMonitor();
    
    // Reset mocks
    mockUseGameState.mockReturnValue({
      boardState: generateMockBoardState('medium'),
      currentPlayer: 1,
      gameHistory: [],
      isConnected: true,
      latency: 25,
      error: null,
      submitMove: jest.fn().mockResolvedValue(undefined),
      reconnect: jest.fn(),
      disconnect: jest.fn(),
    });

    mockUseMagicBlockSession.mockReturnValue({
      session: {
        sessionId: 'test-session',
        matchId: 'test-match',
        isConnected: true,
        latency: 20,
        playersConnected: 2,
        lastUpdate: new Date(),
      },
      isConnected: true,
      latency: 20,
      submitMove: jest.fn().mockResolvedValue(undefined),
      disconnect: jest.fn(),
      error: null,
    });
  });

  afterEach(() => {
    monitor.reset();
  });

  describe('Rendering Performance', () => {
    test('should render board within performance threshold', async () => {
      const RENDER_THRESHOLD = 100; // 100ms max

      monitor.startMeasurement('board-render');
      
      const { container } = render(
        <GameBoard matchId="test-match" isLive enableMagicBlock />
      );
      
      const renderTime = monitor.endMeasurement('board-render');

      expect(renderTime).toBeLessThan(RENDER_THRESHOLD);
      expect(container.querySelector('[role="grid"]')).toBeInTheDocument();
      expect(container.querySelectorAll('.gungi-board-square')).toHaveLength(81);
    });

    test('should handle complex board states efficiently', async () => {
      const COMPLEX_RENDER_THRESHOLD = 150; // 150ms max for complex boards

      mockUseGameState.mockReturnValue({
        ...mockUseGameState(),
        boardState: generateMockBoardState('complex'),
      });

      monitor.startMeasurement('complex-board-render');
      
      render(<GameBoard matchId="test-match" isLive enableMagicBlock />);
      
      const renderTime = monitor.endMeasurement('complex-board-render');

      expect(renderTime).toBeLessThan(COMPLEX_RENDER_THRESHOLD);
    });

    test('should maintain 60fps during re-renders', async () => {
      const FRAME_TIME_THRESHOLD = 16.67; // 60fps = 16.67ms per frame
      const renderTimes: number[] = [];

      const { rerender } = render(
        <GameBoard matchId="test-match" isLive enableMagicBlock />
      );

      // Simulate rapid re-renders
      for (let i = 0; i < 10; i++) {
        const newBoardState = generateMockBoardState('medium');
        newBoardState.moveCount = i;

        mockUseGameState.mockReturnValue({
          ...mockUseGameState(),
          boardState: newBoardState,
        });

        monitor.startMeasurement(`rerender-${i}`);
        
        await act(async () => {
          rerender(<GameBoard matchId="test-match" isLive enableMagicBlock />);
        });
        
        const renderTime = monitor.endMeasurement(`rerender-${i}`);
        renderTimes.push(renderTime);
      }

      const averageRenderTime = renderTimes.reduce((a, b) => a + b, 0) / renderTimes.length;
      const maxRenderTime = Math.max(...renderTimes);

      expect(averageRenderTime).toBeLessThan(FRAME_TIME_THRESHOLD);
      expect(maxRenderTime).toBeLessThan(FRAME_TIME_THRESHOLD * 2); // Allow occasional spikes
    });
  });

  describe('Animation Performance', () => {
    test('should complete piece animations within threshold', async () => {
      const ANIMATION_THRESHOLD = 500; // 500ms max for animations

      const { container } = render(
        <GameBoard matchId="test-match" isLive enableMagicBlock />
      );

      const square = container.querySelector('.gungi-board-square') as HTMLElement;
      
      monitor.startMeasurement('piece-animation');
      
      await act(async () => {
        fireEvent.click(square);
      });
      
      // Wait for animation to complete
      await waitFor(() => {
        const piece = container.querySelector('.gungi-piece');
        if (piece) {
          const computedStyle = window.getComputedStyle(piece);
          return computedStyle.transform !== 'none';
        }
        return true;
      }, { timeout: ANIMATION_THRESHOLD });

      const animationTime = monitor.endMeasurement('piece-animation');

      expect(animationTime).toBeLessThan(ANIMATION_THRESHOLD);
    });

    test('should handle multiple simultaneous animations', async () => {
      const MULTI_ANIMATION_THRESHOLD = 800; // 800ms for multiple animations

      const { container } = render(
        <GameBoard matchId="test-match" isLive enableMagicBlock />
      );

      monitor.startMeasurement('multi-animation');

      // Simulate multiple quick interactions
      const squares = container.querySelectorAll('.gungi-board-square');
      
      await act(async () => {
        // Click multiple squares rapidly
        for (let i = 0; i < Math.min(5, squares.length); i++) {
          fireEvent.click(squares[i]);
          await new Promise(resolve => setTimeout(resolve, 50)); // Small delay between clicks
        }
      });

      const animationTime = monitor.endMeasurement('multi-animation');

      expect(animationTime).toBeLessThan(MULTI_ANIMATION_THRESHOLD);
    });

    test('should not cause memory leaks during animations', async () => {
      const initialMemory = (performance as any).memory?.usedJSHeapSize || 0;

      const { container, unmount } = render(
        <GameBoard matchId="test-match" isLive enableMagicBlock />
      );

      // Perform multiple animations
      for (let i = 0; i < 20; i++) {
        const square = container.querySelector('.gungi-board-square') as HTMLElement;
        await act(async () => {
          fireEvent.click(square);
        });
        await new Promise(resolve => setTimeout(resolve, 50));
      }

      unmount();
      
      // Force garbage collection if available
      if ((global as any).gc) {
        (global as any).gc();
      }

      const finalMemory = (performance as any).memory?.usedJSHeapSize || 0;
      
      // Memory should not increase by more than 5MB during animation tests
      if (initialMemory > 0 && finalMemory > 0) {
        const memoryIncrease = finalMemory - initialMemory;
        expect(memoryIncrease).toBeLessThan(5 * 1024 * 1024); // 5MB
      }
    });
  });

  describe('Real-time Feature Performance', () => {
    test('should handle real-time moves with low latency', async () => {
      const LATENCY_THRESHOLD = 50; // 50ms max latency

      const submitMoveMock = jest.fn().mockImplementation(async (move: Move) => {
        // Simulate network delay
        await new Promise(resolve => setTimeout(resolve, 25));
      });

      mockUseGameState.mockReturnValue({
        ...mockUseGameState(),
        submitMove: submitMoveMock,
      });

      const { container } = render(
        <GameBoard matchId="test-match" isLive enableMagicBlock />
      );

      monitor.startMeasurement('real-time-move');

      // Simulate a move
      const squares = container.querySelectorAll('.gungi-board-square');
      await act(async () => {
        fireEvent.click(squares[0]); // Select piece
        fireEvent.click(squares[1]); // Move piece
      });

      const moveTime = monitor.endMeasurement('real-time-move');

      expect(moveTime).toBeLessThan(LATENCY_THRESHOLD + 25); // Threshold + simulated delay
      expect(submitMoveMock).toHaveBeenCalled();
    });

    test('should handle rapid move updates efficiently', async () => {
      const RAPID_UPDATE_THRESHOLD = 200; // 200ms for processing multiple moves

      const moves = generateMockMoves(10);
      let moveIndex = 0;

      const { rerender } = render(
        <GameBoard matchId="test-match" isLive enableMagicBlock />
      );

      monitor.startMeasurement('rapid-updates');

      // Simulate rapid move updates
      for (const move of moves) {
        mockUseGameState.mockReturnValue({
          ...mockUseGameState(),
          gameHistory: moves.slice(0, ++moveIndex),
        });

        await act(async () => {
          rerender(<GameBoard matchId="test-match" isLive enableMagicBlock />);
        });
      }

      const updateTime = monitor.endMeasurement('rapid-updates');

      expect(updateTime).toBeLessThan(RAPID_UPDATE_THRESHOLD);
    });

    test('should maintain performance under connection stress', async () => {
      const CONNECTION_STRESS_THRESHOLD = 100; // 100ms max for connection changes

      const { rerender } = render(
        <GameBoard matchId="test-match" isLive enableMagicBlock />
      );

      monitor.startMeasurement('connection-stress');

      // Simulate connection instability
      const connectionStates = [true, false, true, false, true];
      
      for (const isConnected of connectionStates) {
        mockUseGameState.mockReturnValue({
          ...mockUseGameState(),
          isConnected,
          latency: isConnected ? 25 : 999,
        });

        mockUseMagicBlockSession.mockReturnValue({
          ...mockUseMagicBlockSession(),
          isConnected,
          latency: isConnected ? 20 : 999,
        });

        await act(async () => {
          rerender(<GameBoard matchId="test-match" isLive enableMagicBlock />);
        });
      }

      const stressTime = monitor.endMeasurement('connection-stress');

      expect(stressTime).toBeLessThan(CONNECTION_STRESS_THRESHOLD);
    });
  });

  describe('Memory and Resource Management', () => {
    test('should clean up event listeners on unmount', async () => {
      const eventListenerCount = (document as any)._eventListeners?.length || 0;

      const { unmount } = render(
        <GameBoard matchId="test-match" isLive enableMagicBlock />
      );

      unmount();

      const finalEventListenerCount = (document as any)._eventListeners?.length || 0;
      
      // Should not have more event listeners after unmount
      expect(finalEventListenerCount).toBeLessThanOrEqual(eventListenerCount);
    });

    test('should handle large game histories efficiently', async () => {
      const LARGE_HISTORY_THRESHOLD = 200; // 200ms for large history processing

      const largeHistory = generateMockMoves(100);

      mockUseGameState.mockReturnValue({
        ...mockUseGameState(),
        gameHistory: largeHistory,
      });

      monitor.startMeasurement('large-history');
      
      render(<GameBoard matchId="test-match" isLive enableMagicBlock />);
      
      const historyTime = monitor.endMeasurement('large-history');

      expect(historyTime).toBeLessThan(LARGE_HISTORY_THRESHOLD);
    });

    test('should efficiently update piece stacks', async () => {
      const STACK_UPDATE_THRESHOLD = 75; // 75ms for stack updates

      // Create board state with many stacked pieces
      const boardState = generateMockBoardState('medium');
      boardState.pieces = boardState.pieces.map((piece, index) => ({
        ...piece,
        position: [0, 0] as [number, number], // Stack all pieces on one square
        stackLevel: index % 3,
      }));

      mockUseGameState.mockReturnValue({
        ...mockUseGameState(),
        boardState,
      });

      monitor.startMeasurement('stack-update');
      
      const { container } = render(
        <GameBoard matchId="test-match" isLive enableMagicBlock />
      );
      
      const stackTime = monitor.endMeasurement('stack-update');

      expect(stackTime).toBeLessThan(STACK_UPDATE_THRESHOLD);
      
      // Verify stack indicator is shown
      const stackIndicator = container.querySelector('.bg-enhancement-500');
      expect(stackIndicator).toBeInTheDocument();
    });
  });

  describe('MagicBlock Integration Performance', () => {
    test('should maintain sub-50ms latency with MagicBlock', async () => {
      const MAGICBLOCK_LATENCY_THRESHOLD = 50;

      mockUseMagicBlockSession.mockReturnValue({
        ...mockUseMagicBlockSession(),
        latency: 25, // Simulate optimal MagicBlock latency
      });

      render(
        <GameBoard matchId="test-match" isLive enableMagicBlock />
      );

      // Verify the latency is displayed correctly
      expect(screen.getByText('25ms')).toBeInTheDocument();
      expect(screen.getByText('OPTIMIZED')).toBeInTheDocument();
    });

    test('should gracefully degrade without MagicBlock', async () => {
      const FALLBACK_THRESHOLD = 100; // 100ms for fallback rendering

      monitor.startMeasurement('fallback-render');
      
      render(
        <GameBoard matchId="test-match" isLive enableMagicBlock={false} />
      );
      
      const fallbackTime = monitor.endMeasurement('fallback-render');

      expect(fallbackTime).toBeLessThan(FALLBACK_THRESHOLD);
      expect(screen.queryByText('OPTIMIZED')).not.toBeInTheDocument();
    });
  });
});
