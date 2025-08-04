// Game state hook for real-time Gungi matches with MagicBlock integration
import { useEffect, useState, useRef, useCallback } from 'react';
import { io, Socket } from 'socket.io-client';
import type { BoardState, Move, GamePiece } from '@/types';

interface UseGameStateOptions {
  enableMagicBlock?: boolean;
  autoReconnect?: boolean;
  maxReconnectAttempts?: number;
}

interface GameStateHook {
  boardState: BoardState | null;
  currentPlayer: 1 | 2;
  gameHistory: Move[];
  isConnected: boolean;
  latency: number;
  error: string | null;
  submitMove: (move: Move) => Promise<void>;
  reconnect: () => void;
  disconnect: () => void;
}

export const useGameState = (
  matchId: string,
  options: UseGameStateOptions = {}
): GameStateHook => {
  const {
    enableMagicBlock = true,
    autoReconnect = true,
    maxReconnectAttempts = 3,
  } = options;

  const [socket, setSocket] = useState<Socket | null>(null);
  const [boardState, setBoardState] = useState<BoardState | null>(null);
  const [currentPlayer, setCurrentPlayer] = useState<1 | 2>(1);
  const [gameHistory, setGameHistory] = useState<Move[]>([]);
  const [isConnected, setIsConnected] = useState(false);
  const [latency, setLatency] = useState(0);
  const [error, setError] = useState<string | null>(null);

  const reconnectAttemptsRef = useRef(0);
  const latencyIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const pingTimeRef = useRef<number>(0);

  // Calculate latency
  const measureLatency = useCallback(() => {
    if (!socket || !isConnected) return;

    pingTimeRef.current = Date.now();
    socket.emit('ping');
  }, [socket, isConnected]);

  // Initialize socket connection
  const connect = useCallback(() => {
    if (!matchId) return;

    const wsUrl = enableMagicBlock
      ? process.env.NEXT_PUBLIC_MAGICBLOCK_URL || 'wss://magicblock.dev'
      : process.env.NEXT_PUBLIC_WS_URL || 'ws://localhost:3001';

    const socketInstance = io(wsUrl, {
      query: {
        matchId,
        enableMagicBlock: enableMagicBlock.toString(),
      },
      transports: ['websocket'],
      timeout: 5000,
    });

    // Connection events
    socketInstance.on('connect', () => {
      console.log(`🎮 Connected to ${enableMagicBlock ? 'MagicBlock' : 'WebSocket'} for match:`, matchId);
      setIsConnected(true);
      setError(null);
      reconnectAttemptsRef.current = 0;

      // Start latency monitoring
      latencyIntervalRef.current = setInterval(measureLatency, 2000);
    });

    socketInstance.on('disconnect', () => {
      console.log('🔌 Disconnected from game server');
      setIsConnected(false);

      if (latencyIntervalRef.current) {
        clearInterval(latencyIntervalRef.current);
        latencyIntervalRef.current = null;
      }

      // Auto-reconnect logic
      if (autoReconnect && reconnectAttemptsRef.current < maxReconnectAttempts) {
        setTimeout(() => {
          reconnectAttemptsRef.current++;
          connect();
        }, 2000 * reconnectAttemptsRef.current);
      }
    });

    // Game state events
    socketInstance.on('boardState', (state: BoardState) => {
      console.log('📋 Board state updated:', state);
      setBoardState(state);
      setCurrentPlayer(state.currentPlayer);
    });

    socketInstance.on('move', (move: Move) => {
      console.log('♟️ Move received:', move);
      setGameHistory(prev => [...prev, move]);

      // Update board state if move affects current state
      setBoardState(prev => {
        if (!prev) return prev;

        // Simple move application (in real implementation, this would be more complex)
        const newPieces = prev.pieces.map(piece => {
          if (piece.position[0] === move.from[0] && piece.position[1] === move.from[1]) {
            return { ...piece, position: move.to };
          }
          return piece;
        });

        return {
          ...prev,
          pieces: newPieces,
          currentPlayer: prev.currentPlayer === 1 ? 2 : 1,
          moveCount: prev.moveCount + 1,
          lastMove: move,
        };
      });
    });

    // Latency measurement
    socketInstance.on('pong', () => {
      const now = Date.now();
      const newLatency = now - pingTimeRef.current;
      setLatency(newLatency);
    });

    // Error handling
    socketInstance.on('error', (err: any) => {
      console.error('🚨 Socket error:', err);
      setError(err.message || 'Connection error');
    });

    // MagicBlock specific events
    if (enableMagicBlock) {
      socketInstance.on('magicblock:validated', (data: any) => {
        console.log('⚡ MagicBlock validation:', data);
      });

      socketInstance.on('magicblock:error', (err: any) => {
        console.error('⚡ MagicBlock error:', err);
        setError(`MagicBlock error: ${err.message}`);
      });
    }

    setSocket(socketInstance);
  }, [matchId, enableMagicBlock, autoReconnect, maxReconnectAttempts, measureLatency]);

  // Submit move with error handling and retry logic
  const submitMove = useCallback(async (move: Move) => {
    if (!socket || !isConnected) {
      throw new Error('Not connected to game server');
    }

    try {
      if (enableMagicBlock) {
        // MagicBlock submission with <50ms target
        const startTime = Date.now();

        await new Promise<void>((resolve, reject) => {
          const timeout = setTimeout(() => {
            reject(new Error('Move submission timeout'));
          }, 5000);

          socket.emit('magicblock:submitMove', move, (response: any) => {
            clearTimeout(timeout);

            const processingTime = Date.now() - startTime;
            console.log(`⚡ MagicBlock move processed in ${processingTime}ms`);

            if (response.success) {
              resolve();
            } else {
              reject(new Error(response.error || 'Move submission failed'));
            }
          });
        });
      } else {
        // Standard WebSocket submission
        socket.emit('submitMove', move);
      }
    } catch (error) {
      console.error('Failed to submit move:', error);
      throw error;
    }
  }, [socket, isConnected, enableMagicBlock]);

  // Manual reconnect
  const reconnect = useCallback(() => {
    if (socket) {
      socket.disconnect();
    }
    reconnectAttemptsRef.current = 0;
    connect();
  }, [socket, connect]);

  // Disconnect
  const disconnect = useCallback(() => {
    if (socket) {
      socket.disconnect();
      setSocket(null);
    }
    setIsConnected(false);

    if (latencyIntervalRef.current) {
      clearInterval(latencyIntervalRef.current);
      latencyIntervalRef.current = null;
    }
  }, [socket]);

  // Initialize connection
  useEffect(() => {
    connect();

    return () => {
      disconnect();
    };
  }, [matchId]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (latencyIntervalRef.current) {
        clearInterval(latencyIntervalRef.current);
      }
    };
  }, []);

  return {
    boardState,
    currentPlayer,
    gameHistory,
    isConnected,
    latency,
    error,
    submitMove,
    reconnect,
    disconnect,
  };
};
