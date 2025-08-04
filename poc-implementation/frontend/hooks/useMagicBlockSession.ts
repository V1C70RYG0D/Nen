// MagicBlock session hook for real-time game state
import { useState, useEffect, useCallback, useRef } from 'react';
import type { MagicBlockSession, Move } from '@/types';

interface MagicBlockOptions {
  enabled?: boolean;
  maxLatency?: number;
  reconnectDelay?: number;
}

interface UseMagicBlockSessionHook {
  session: MagicBlockSession | null;
  isConnected: boolean;
  latency: number;
  submitMove: (move: Move) => Promise<void>;
  disconnect: () => void;
  error: string | null;
}

export const useMagicBlockSession = (
  matchId: string,
  options: MagicBlockOptions = {}
): UseMagicBlockSessionHook => {
  const {
    enabled = true,
    maxLatency = 50,
    reconnectDelay = 2000,
  } = options;

  const [session, setSession] = useState<MagicBlockSession | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [latency, setLatency] = useState(0);
  const [error, setError] = useState<string | null>(null);

  const wsRef = useRef<WebSocket | null>(null);
  const pingIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const lastPingTimeRef = useRef<number>(0);

  // Initialize MagicBlock WebSocket connection
  const connect = useCallback(() => {
    if (!enabled || !matchId) return;

    try {
      const wsUrl = process.env.NEXT_PUBLIC_MAGICBLOCK_URL || 'wss://magicblock.dev';
      const ws = new WebSocket(`${wsUrl}/session/${matchId}`);

      ws.onopen = () => {
        console.log('⚡ MagicBlock session connected');
        setIsConnected(true);
        setError(null);

        // Initialize session
        setSession({
          sessionId: `mb_${matchId}_${Date.now()}`,
          matchId,
          isConnected: true,
          latency: 0,
          playersConnected: 0,
          lastUpdate: new Date(),
        });

        // Start latency monitoring
        pingIntervalRef.current = setInterval(() => {
          if (ws.readyState === WebSocket.OPEN) {
            lastPingTimeRef.current = Date.now();
            ws.send(JSON.stringify({ type: 'ping', timestamp: lastPingTimeRef.current }));
          }
        }, 1000);
      };

      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);

          switch (data.type) {
            case 'pong':
              const newLatency = Date.now() - data.timestamp;
              setLatency(newLatency);

              // Update session with new latency
              setSession(prev => prev ? {
                ...prev,
                latency: newLatency,
                lastUpdate: new Date(),
              } : null);

              // Check if latency exceeds threshold
              if (newLatency > maxLatency) {
                console.warn(`⚡ High latency detected: ${newLatency}ms (max: ${maxLatency}ms)`);
              }
              break;

            case 'session_update':
              setSession(prev => prev ? {
                ...prev,
                playersConnected: data.playersConnected,
                lastUpdate: new Date(),
              } : null);
              break;

            case 'move_validated':
              console.log('⚡ Move validated by MagicBlock:', data);
              break;

            case 'error':
              console.error('⚡ MagicBlock error:', data.message);
              setError(data.message);
              break;

            default:
              console.log('⚡ Unknown MagicBlock message:', data);
          }
        } catch (err) {
          console.error('Failed to parse MagicBlock message:', err);
        }
      };

      ws.onerror = (error) => {
        console.error('⚡ MagicBlock WebSocket error:', error);
        setError('MagicBlock connection error');
      };

      ws.onclose = (event) => {
        console.log('⚡ MagicBlock session closed:', event.code, event.reason);
        setIsConnected(false);
        setSession(null);

        // Cleanup intervals
        if (pingIntervalRef.current) {
          clearInterval(pingIntervalRef.current);
          pingIntervalRef.current = null;
        }

        // Auto-reconnect if not a clean close
        if (event.code !== 1000 && enabled) {
          reconnectTimeoutRef.current = setTimeout(() => {
            console.log('⚡ Attempting MagicBlock reconnection...');
            connect();
          }, reconnectDelay);
        }
      };

      wsRef.current = ws;

    } catch (err: any) {
      console.error('Failed to connect to MagicBlock:', err);
      setError(err.message || 'Failed to connect to MagicBlock');
    }
  }, [enabled, matchId, maxLatency, reconnectDelay]);

  // Submit move through MagicBlock
  const submitMove = useCallback(async (move: Move): Promise<void> => {
    if (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) {
      throw new Error('MagicBlock session not connected');
    }

    try {
      const moveData = {
        type: 'submit_move',
        move,
        timestamp: Date.now(),
        sessionId: session?.sessionId,
      };

      // Send move to MagicBlock
      wsRef.current.send(JSON.stringify(moveData));

      // Wait for validation with timeout
      return new Promise((resolve, reject) => {
        const timeout = setTimeout(() => {
          reject(new Error('Move submission timeout'));
        }, 5000);

        const handleValidation = (event: MessageEvent) => {
          try {
            const data = JSON.parse(event.data);

            if (data.type === 'move_validated' && data.moveId === move.timestamp) {
              clearTimeout(timeout);
              wsRef.current?.removeEventListener('message', handleValidation);

              if (data.success) {
                resolve();
              } else {
                reject(new Error(data.error || 'Move validation failed'));
              }
            }
          } catch (err) {
            // Ignore parsing errors for other messages
          }
        };

        wsRef.current?.addEventListener('message', handleValidation);
      });

    } catch (err: any) {
      console.error('Failed to submit move to MagicBlock:', err);
      throw err;
    }
  }, [session?.sessionId]);

  // Disconnect from MagicBlock
  const disconnect = useCallback(() => {
    if (wsRef.current) {
      wsRef.current.close(1000, 'User disconnected');
      wsRef.current = null;
    }

    if (pingIntervalRef.current) {
      clearInterval(pingIntervalRef.current);
      pingIntervalRef.current = null;
    }

    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }

    setIsConnected(false);
    setSession(null);
    setError(null);
  }, []);

  // Initialize connection
  useEffect(() => {
    if (enabled && matchId) {
      connect();
    }

    return () => {
      disconnect();
    };
  }, [enabled, matchId, connect, disconnect]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      disconnect();
    };
  }, [disconnect]);

  return {
    session,
    isConnected,
    latency,
    submitMove,
    disconnect,
    error,
  };
};
