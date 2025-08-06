import { useEffect, useState } from 'react';
import { io, Socket } from 'socket.io-client';

interface Piece {
  id: string;
  type: string;
  owner: 1 | 2;
  position: [number, number];
  stackLevel: number;
}

interface BoardState {
  pieces: Piece[];
  currentPlayer: 1 | 2;
  moveCount: number;
  gameStatus: 'active' | 'completed';
}

export const useGameState = (matchId: string) => {
  const [socket, setSocket] = useState<Socket | null>(null);
  const [boardState, setBoardState] = useState<BoardState | null>(null);
  const [currentPlayer, setCurrentPlayer] = useState<1 | 2>(1);
  const [isConnected, setIsConnected] = useState(false);
  const [latency, setLatency] = useState(0);
  const [gameHistory, setGameHistory] = useState<any[]>([]);

  useEffect(() => {
    if (!matchId) return;

    // Connect to WebSocket server
    const socketInstance = io(process.env.NEXT_PUBLIC_WS_URL || 'ws://localhost:3001', {
      query: { matchId },
      transports: ['websocket'],
    });

    socketInstance.on('connect', () => {
      setIsConnected(true);
      console.log('Connected to match:', matchId);
    });

    socketInstance.on('boardState', (state: BoardState) => {
      setBoardState(state);
      setCurrentPlayer(state.currentPlayer);
    });

    socketInstance.on('move', (move: any) => {
      setGameHistory(prev => [...prev, move]);
    });

    socketInstance.on('latency', (ms: number) => {
      setLatency(ms);
    });

    socketInstance.on('disconnect', () => {
      setIsConnected(false);
    });

    setSocket(socketInstance);

    // Cleanup
    return () => {
      socketInstance.disconnect();
    };
  }, [matchId]);

  return {
    boardState,
    currentPlayer,
    isConnected,
    latency,
    gameHistory,
    socket,
  };
}; 