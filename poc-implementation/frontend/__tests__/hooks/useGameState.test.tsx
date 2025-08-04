import { act } from 'react';
import { renderHook } from '@testing-library/react';
import { useGameState } from '@/hooks/useGameState';
import type { BoardState, Move, GamePiece } from '@/types';

// Mock socket.io-client
const mockSocket = {
  on: jest.fn(),
  emit: jest.fn(),
  disconnect: jest.fn(),
};

jest.mock('socket.io-client', () => ({
  io: jest.fn(() => mockSocket),
}));

const mockMatchId = 'mock-match-id';

const mockBoardState: BoardState = {
  pieces: [
    {
      id: 'piece1',
      type: 'Pawn',
      owner: 1,
      position: [0, 0],
      stackLevel: 0,
      canMove: true,
    },
  ],
  currentPlayer: 1,
  moveCount: 0,
  gamePhase: 'playing',
};

const mockMove: Move = {
  from: [0, 0],
  to: [1, 1],
  piece: {
    id: '1',
    type: 'Pawn',
    owner: 1,
    position: [0, 0],
    stackLevel: 0,
    canMove: true,
  },
  timestamp: Date.now(),
  player: 1,
};

describe('useGameState', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockSocket.on.mockImplementation((event: string, callback: Function) => {
      if (event === 'connect') {
        setTimeout(() => callback(), 0);
      }
      if (event === 'pong') {
        setTimeout(() => callback(), 0);
      }
    });
  });

  it('should initialize with correct default state', () => {
    const { result } = renderHook(() => useGameState(mockMatchId));

    expect(result.current.boardState).toBeNull();
    expect(result.current.currentPlayer).toBe(1);
    expect(result.current.gameHistory).toEqual([]);
    expect(result.current.isConnected).toBe(false);
    expect(result.current.latency).toBe(0);
    expect(result.current.error).toBeNull();
    expect(typeof result.current.submitMove).toBe('function');
    expect(typeof result.current.reconnect).toBe('function');
    expect(typeof result.current.disconnect).toBe('function');
  });

  it('should handle successful connection', async () => {
    const { result } = renderHook(() => useGameState(mockMatchId));

    // Simulate connection
    await act(async () => {
      const connectCallback = mockSocket.on.mock.calls.find(call => call[0] === 'connect')?.[1];
      if (connectCallback) {
        connectCallback();
      }
    });

    expect(result.current.isConnected).toBe(true);
  });

  it('should handle board state updates', async () => {
    const { result } = renderHook(() => useGameState(mockMatchId));

    await act(async () => {
      const boardStateCallback = mockSocket.on.mock.calls.find(call => call[0] === 'boardState')?.[1];
      if (boardStateCallback) {
        boardStateCallback(mockBoardState);
      }
    });

    expect(result.current.boardState).toEqual(mockBoardState);
    expect(result.current.currentPlayer).toBe(mockBoardState.currentPlayer);
  });

  it('should handle move updates', async () => {
    const { result } = renderHook(() => useGameState(mockMatchId));

    await act(async () => {
      const moveCallback = mockSocket.on.mock.calls.find(call => call[0] === 'move')?.[1];
      if (moveCallback) {
        moveCallback(mockMove);
      }
    });

    expect(result.current.gameHistory).toContain(mockMove);
  });

  it('should handle latency measurement', async () => {
    const { result } = renderHook(() => useGameState(mockMatchId));

    await act(async () => {
      const pongCallback = mockSocket.on.mock.calls.find(call => call[0] === 'pong')?.[1];
      if (pongCallback) {
        pongCallback();
      }
    });

    expect(result.current.latency).toBeGreaterThanOrEqual(0);
  });

  it('should handle errors', async () => {
    // Setup mock to avoid automatic connect callback
    mockSocket.on.mockImplementation((event: string, callback: Function) => {
      if (event === 'pong') {
        setTimeout(() => callback(), 0);
      }
      // Don't auto-trigger connect to avoid clearing error state
    });
    
    const { result } = renderHook(() => useGameState(mockMatchId));
    const errorMessage = 'Connection failed';

    await act(async () => {
      const errorCallback = mockSocket.on.mock.calls.find(call => call[0] === 'error')?.[1];
      if (errorCallback) {
        errorCallback({ message: errorMessage });
      }

      // Ensure the error state is updated correctly
      await new Promise(resolve => setTimeout(resolve, 100));
    });

    expect(result.current.error).toBe(errorMessage);
  });

  it('should handle move submission when connected', async () => {
    const { result } = renderHook(() => useGameState(mockMatchId));

    // First connect
    await act(async () => {
      const connectCallback = mockSocket.on.mock.calls.find(call => call[0] === 'connect')?.[1];
      if (connectCallback) {
        connectCallback();
      }
    });

    // Then submit move
    mockSocket.emit.mockImplementation((event, move, callback) => {
      if (event === 'magicblock:submitMove' && callback) {
        setTimeout(() => callback({ success: true }), 0);
      }
    });

    await act(async () => {
      await result.current.submitMove(mockMove);
    });

    expect(mockSocket.emit).toHaveBeenCalledWith('magicblock:submitMove', mockMove, expect.any(Function));
  });

  it('should throw error when submitting move while disconnected', async () => {
    const { result } = renderHook(() => useGameState(mockMatchId));

    await act(async () => {
      await expect(result.current.submitMove(mockMove)).rejects.toThrow('Not connected to game server');
    });
  });

  it('should disconnect properly', () => {
    const { result } = renderHook(() => useGameState(mockMatchId));

    act(() => {
      result.current.disconnect();
    });

    expect(mockSocket.disconnect).toHaveBeenCalled();
  });
});
