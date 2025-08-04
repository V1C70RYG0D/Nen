import { act } from 'react';
import { renderHook } from '@testing-library/react';
import { useMagicBlockSession } from '@/hooks/useMagicBlockSession';
import type { Move } from '@/types';

const mockMatchId = 'mock-match-id';

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

describe('useMagicBlockSession', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should initialize with correct default state', () => {
    const { result } = renderHook(() => useMagicBlockSession(mockMatchId, { enabled: false }));

    expect(result.current.session).toBeNull();
    expect(result.current.isConnected).toBe(false);
    expect(result.current.latency).toBe(0);
    expect(result.current.error).toBeNull();
    expect(typeof result.current.submitMove).toBe('function');
    expect(typeof result.current.disconnect).toBe('function');
  });

  it('should handle successful connection', async () => {
    const { result } = renderHook(() => useMagicBlockSession(mockMatchId));

    // Wait for connection to be established
    await act(async () => {
      await new Promise(resolve => setTimeout(resolve, 10));
    });

    expect(result.current.isConnected).toBe(true);
    expect(result.current.session).toMatchObject({
      sessionId: expect.stringContaining('mb_'),
      matchId: mockMatchId,
      isConnected: true,
      latency: 0,
      playersConnected: 0,
      lastUpdate: expect.any(Date),
    });
  });

  it('should handle disconnection', async () => {
    const { result } = renderHook(() => useMagicBlockSession(mockMatchId));

    // Wait for connection
    await act(async () => {
      await new Promise(resolve => setTimeout(resolve, 10));
    });

    // Disconnect
    act(() => {
      result.current.disconnect();
    });

    expect(result.current.isConnected).toBe(false);
    expect(result.current.session).toBeNull();
  });

  it('should handle move submission when connected', async () => {
    const { result } = renderHook(() => useMagicBlockSession(mockMatchId));

    // Wait for connection
    await act(async () => {
      await new Promise(resolve => setTimeout(resolve, 10));
    });

    // Submit move
    await act(async () => {
      await expect(result.current.submitMove(mockMove)).resolves.toBeUndefined();
    });
  });

  it('should handle move submission when disconnected', async () => {
    const { result } = renderHook(() => useMagicBlockSession(mockMatchId, { enabled: false }));

    await act(async () => {
      await expect(result.current.submitMove(mockMove)).rejects.toThrow('MagicBlock session not connected');
    });
  });

  it('should handle latency updates', async () => {
    const { result } = renderHook(() => useMagicBlockSession(mockMatchId));

    // Wait for connection and latency update
    await act(async () => {
      await new Promise(resolve => setTimeout(resolve, 1100)); // Wait for ping interval
    });

    expect(result.current.latency).toBeGreaterThanOrEqual(0);
  });

  it('should handle options correctly', () => {
    const options = {
      enabled: false,
      maxLatency: 100,
      reconnectDelay: 5000,
    };

    const { result } = renderHook(() => useMagicBlockSession(mockMatchId, options));

    expect(result.current.isConnected).toBe(false);
    expect(result.current.session).toBeNull();
  });

  it('should warn about high latency', async () => {
    const consoleSpy = jest.spyOn(console, 'warn').mockImplementation();
    const { result } = renderHook(() => useMagicBlockSession(mockMatchId, { maxLatency: 1 }));

    // Wait for connection and potential latency warning
    await act(async () => {
      await new Promise(resolve => setTimeout(resolve, 1100));
    });

expect(consoleSpy).toHaveBeenCalled();
    consoleSpy.mockRestore();
  });

  it('should handle server-sent errors', async () => {
    const { result } = renderHook(() => useMagicBlockSession(mockMatchId));

    // Wait for connection
    await act(async () => {
      await new Promise(resolve => setTimeout(resolve, 10));
    });

    // Simulate server error message
    const errorMessage = 'Test server error';
    const mockWs = result.current.session!.ws as MockWebSocket;

    act(() => {
      mockWs.onmessage?.(new MessageEvent('message', { data: JSON.stringify({ type: 'error', message: errorMessage }) }));
    });

    // Ensure error state is updated
    expect(result.current.error).toBe(errorMessage);
  });
});
