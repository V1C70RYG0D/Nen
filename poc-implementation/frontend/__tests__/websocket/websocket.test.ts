import { jest } from '@jest/globals';

// Mock WebSocket for testing
class MockWebSocket {
  public readyState: number = WebSocket.CONNECTING;
  public url: string;
  public onopen: ((event: Event) => void) | null = null;
  public onclose: ((event: CloseEvent) => void) | null = null;
  public onerror: ((event: Event) => void) | null = null;
  public onmessage: ((event: MessageEvent) => void) | null = null;

  constructor(url: string, protocols?: string | string[]) {
    this.url = url;

    // Simulate connection delay
    setTimeout(() => {
      if (this.url.includes('invalid')) {
        this.readyState = WebSocket.CLOSED;
        this.onerror?.(new Event('error'));
      } else {
        this.readyState = WebSocket.OPEN;
        this.onopen?.(new Event('open'));
      }
    }, 10);
  }

  send(data: string | ArrayBufferLike | Blob | ArrayBufferView): void {
    if (this.readyState === WebSocket.OPEN) {
      // Echo back the message for testing
      setTimeout(() => {
        this.onmessage?.(new MessageEvent('message', { data }));
      }, 5);
    }
  }

  close(code?: number, reason?: string): void {
    this.readyState = WebSocket.CLOSED;
    setTimeout(() => {
      this.onclose?.(new CloseEvent('close', { code: code || 1000, reason }));
    }, 5);
  }

  addEventListener(type: string, listener: EventListener): void {
    if (type === 'open') this.onopen = listener;
    if (type === 'close') this.onclose = listener;
    if (type === 'error') this.onerror = listener;
    if (type === 'message') this.onmessage = listener;
  }

  removeEventListener(type: string, listener: EventListener): void {
    if (type === 'open') this.onopen = null;
    if (type === 'close') this.onclose = null;
    if (type === 'error') this.onerror = null;
    if (type === 'message') this.onmessage = null;
  }
}

// Mock global WebSocket
global.WebSocket = MockWebSocket as any;

/**
 * MagicBlock WebSocket Client for real-time gaming sessions
 */
class MagicBlockWebSocketClient {
  private ws: WebSocket | null = null;
  private url: string;
  private reconnectAttempts: number = 0;
  private maxReconnectAttempts: number = 5;
  private reconnectDelay: number = 1000;
  private connectionTimeout: number = 5000;
  private heartbeatInterval: NodeJS.Timeout | null = null;
  private connectionPool: Map<string, WebSocket> = new Map();
  private messageHandlers: Map<string, Function[]> = new Map();

  constructor(url: string) {
    this.url = url;
  }

  /**
   * Establish WebSocket connection to MagicBlock session
   */
  public async connect(): Promise<void> {
    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error('Connection timeout'));
      }, this.connectionTimeout);

      try {
        this.ws = new WebSocket(this.url, ['magicblock-protocol']);

        this.ws.onopen = (event) => {
          clearTimeout(timeout);
          this.reconnectAttempts = 0;
          this.startHeartbeat();
          resolve();
        };

        this.ws.onerror = (event) => {
          clearTimeout(timeout);
          reject(new Error('WebSocket connection failed'));
        };

        this.ws.onclose = (event) => {
          this.stopHeartbeat();
          if (!event.wasClean && this.reconnectAttempts < this.maxReconnectAttempts) {
            this.attemptReconnect();
          }
        };

        this.ws.onmessage = (event) => {
          this.handleMessage(event.data);
        };

      } catch (error) {
        clearTimeout(timeout);
        reject(error);
      }
    });
  }

  /**
   * Handle connection failures with exponential backoff
   */
  private async attemptReconnect(): Promise<void> {
    this.reconnectAttempts++;
    const delay = this.reconnectDelay * Math.pow(2, this.reconnectAttempts - 1);

    setTimeout(async () => {
      try {
        await this.connect();
      } catch (error) {
        if (this.reconnectAttempts >= this.maxReconnectAttempts) {
          console.error('Max reconnection attempts reached');
        }
      }
    }, delay);
  }

  /**
   * Start heartbeat to detect connection issues
   */
  private startHeartbeat(): void {
    this.heartbeatInterval = setInterval(() => {
      if (this.ws?.readyState === WebSocket.OPEN) {
        this.send({ type: 'ping', timestamp: Date.now() });
      }
    }, 30000);
  }

  /**
   * Stop heartbeat interval
   */
  private stopHeartbeat(): void {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
      this.heartbeatInterval = null;
    }
  }

  /**
   * Send message with validation
   */
  public send(message: any): boolean {
    if (this.ws?.readyState === WebSocket.OPEN) {
      try {
        const validatedMessage = this.validateMessage(message);
        this.ws.send(JSON.stringify(validatedMessage));
        return true;
      } catch (error) {
        console.error('Failed to send message:', error);
        return false;
      }
    }
    return false;
  }

  /**
   * Validate message format for MagicBlock protocol
   */
  private validateMessage(message: any): any {
    if (!message || typeof message !== 'object') {
      throw new Error('Invalid message format');
    }

    if (!message.type) {
      throw new Error('Message must have a type');
    }

    // MagicBlock protocol validation
    const validTypes = ['move', 'join_session', 'leave_session', 'ping', 'pong'];
    if (!validTypes.includes(message.type)) {
      throw new Error(`Invalid message type: ${message.type}`);
    }

    return {
      ...message,
      timestamp: message.timestamp || Date.now(),
      sessionId: message.sessionId || null
    };
  }

  /**
   * Handle incoming messages
   */
  private handleMessage(data: string): void {
    try {
      const message = JSON.parse(data);
      const handlers = this.messageHandlers.get(message.type) || [];
      handlers.forEach(handler => handler(message));
    } catch (error) {
      console.error('Failed to parse message:', error);
    }
  }

  /**
   * Register message handler
   */
  public on(messageType: string, handler: Function): void {
    if (!this.messageHandlers.has(messageType)) {
      this.messageHandlers.set(messageType, []);
    }
    this.messageHandlers.get(messageType)!.push(handler);
  }

  /**
   * Unregister message handler
   */
  public off(messageType: string, handler: Function): void {
    const handlers = this.messageHandlers.get(messageType);
    if (handlers) {
      const index = handlers.indexOf(handler);
      if (index > -1) {
        handlers.splice(index, 1);
      }
    }
  }

  /**
   * Get connection from pool or create new one
   */
  public getPooledConnection(sessionId: string): WebSocket | null {
    return this.connectionPool.get(sessionId) || null;
  }

  /**
   * Add connection to pool
   */
  public addToPool(sessionId: string, ws: WebSocket): void {
    this.connectionPool.set(sessionId, ws);
  }

  /**
   * Remove connection from pool
   */
  public removeFromPool(sessionId: string): void {
    const ws = this.connectionPool.get(sessionId);
    if (ws) {
      ws.close();
      this.connectionPool.delete(sessionId);
    }
  }

  /**
   * Gracefully close connection
   */
  public close(): void {
    this.stopHeartbeat();
    if (this.ws) {
      this.ws.close(1000, 'Client disconnect');
      this.ws = null;
    }
    // Close all pooled connections
    this.connectionPool.forEach((ws, sessionId) => {
      ws.close();
    });
    this.connectionPool.clear();
  }

  /**
   * Get current connection state
   */
  public getReadyState(): number {
    return this.ws?.readyState || WebSocket.CLOSED;
  }
}

describe('MagicBlock WebSocket Client', () => {
  let client: MagicBlockWebSocketClient;
  const mockUrl = 'wss://magicblock.local:8080/session/test123';

  beforeEach(() => {
    client = new MagicBlockWebSocketClient(mockUrl);
    jest.clearAllMocks();
  });

  afterEach(() => {
    client.close();
  });

  describe('Connection Management', () => {
    test('should establish connection successfully', async () => {
      await expect(client.connect()).resolves.toBeUndefined();
      expect(client.getReadyState()).toBe(WebSocket.OPEN);
    });

    test('should handle connection failures', async () => {
      const failClient = new MagicBlockWebSocketClient('wss://invalid.url');

      await expect(failClient.connect()).rejects.toThrow('WebSocket connection failed');
    });

    test('should handle connection timeout', async () => {
      // Extend timeout for this test
      const timeoutClient = new MagicBlockWebSocketClient('wss://slow.server');
      timeoutClient['connectionTimeout'] = 50; // 50ms timeout

      await expect(timeoutClient.connect()).rejects.toThrow('Connection timeout');
    });

    test('should reconnect automatically on connection loss', async () => {
      await client.connect();
      expect(client.getReadyState()).toBe(WebSocket.OPEN);

      // Simulate connection loss
      const mockWs = client['ws'] as MockWebSocket;
      mockWs.readyState = WebSocket.CLOSED;
      mockWs.onclose?.(new CloseEvent('close', { wasClean: false }));

      // Wait for reconnection attempt
      await new Promise(resolve => setTimeout(resolve, 1100));

      // Should attempt to reconnect
      expect(client['reconnectAttempts']).toBeGreaterThan(0);
    }, 10000);
  });

  describe('Message Handling', () => {
    beforeEach(async () => {
      await client.connect();
    });

    test('should handle message parsing', async () => {
      const testMessage = { type: 'move', data: { from: 'a1', to: 'a2' } };
      let receivedMessage: any = null;

      client.on('move', (message: any) => {
        receivedMessage = message;
      });

      // Simulate receiving a message
      const mockWs = client['ws'] as MockWebSocket;
      mockWs.onmessage?.(new MessageEvent('message', {
        data: JSON.stringify(testMessage)
      }));

      await new Promise(resolve => setTimeout(resolve, 10));
      expect(receivedMessage).toEqual(testMessage);
    });

    test('should validate message format', () => {
      const validMessage = { type: 'move', sessionId: 'test123' };
      expect(client.send(validMessage)).toBe(true);

      const invalidMessage = { data: 'invalid' };
      expect(client.send(invalidMessage)).toBe(false);
    });

    test('should handle invalid JSON messages', async () => {
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

      await client.connect();
      const mockWs = client['ws'] as MockWebSocket;
      mockWs.onmessage?.(new MessageEvent('message', { data: 'invalid json' }));

      expect(consoleSpy).toHaveBeenCalledWith('Failed to parse message:', expect.any(Error));
      consoleSpy.mockRestore();
    });
  });

  describe('Connection Pooling', () => {
    test('should manage connection pool', () => {
      const sessionId = 'session123';
      const mockWs = new MockWebSocket('wss://test.com') as unknown as WebSocket;

      client.addToPool(sessionId, mockWs);
      expect(client.getPooledConnection(sessionId)).toBe(mockWs);

      client.removeFromPool(sessionId);
      expect(client.getPooledConnection(sessionId)).toBeNull();
    });

    test('should close all pooled connections on cleanup', () => {
      const sessionId1 = 'session1';
      const sessionId2 = 'session2';
      const mockWs1 = new MockWebSocket('wss://test1.com') as unknown as WebSocket;
      const mockWs2 = new MockWebSocket('wss://test2.com') as unknown as WebSocket;

      const closeSpy1 = jest.spyOn(mockWs1, 'close');
      const closeSpy2 = jest.spyOn(mockWs2, 'close');

      client.addToPool(sessionId1, mockWs1);
      client.addToPool(sessionId2, mockWs2);

      client.close();

      expect(closeSpy1).toHaveBeenCalled();
      expect(closeSpy2).toHaveBeenCalled();
    });
  });

  describe('Message Event Handlers', () => {
    test('should register and unregister event handlers', async () => {
      await client.connect();

      let messageReceived = false;
      const handler = () => { messageReceived = true; };

      client.on('test', handler);

      // Simulate message
      const mockWs = client['ws'] as MockWebSocket;
      mockWs.onmessage?.(new MessageEvent('message', {
        data: JSON.stringify({ type: 'test' })
      }));

      await new Promise(resolve => setTimeout(resolve, 10));
      expect(messageReceived).toBe(true);

      // Unregister handler
      messageReceived = false;
      client.off('test', handler);

      mockWs.onmessage?.(new MessageEvent('message', {
        data: JSON.stringify({ type: 'test' })
      }));

      await new Promise(resolve => setTimeout(resolve, 10));
      expect(messageReceived).toBe(false);
    });
  });

  describe('Graceful Connection Termination', () => {
    test('should close connection gracefully', async () => {
      await client.connect();
      const mockWs = client['ws'] as MockWebSocket;
      const closeSpy = jest.spyOn(mockWs, 'close');

      client.close();

      expect(closeSpy).toHaveBeenCalledWith(1000, 'Client disconnect');
      expect(client['ws']).toBeNull();
    });

    test('should stop heartbeat on close', async () => {
      await client.connect();
      const clearIntervalSpy = jest.spyOn(global, 'clearInterval');

      client.close();

      expect(clearIntervalSpy).toHaveBeenCalled();
    });
  });

  describe('Heartbeat Mechanism', () => {
    test('should send ping messages for heartbeat', async () => {
      jest.useFakeTimers();

      await client.connect();
      const sendSpy = jest.spyOn(client, 'send');

      // Fast-forward time to trigger heartbeat
      jest.advanceTimersByTime(30000);

      expect(sendSpy).toHaveBeenCalledWith({
        type: 'ping',
        timestamp: expect.any(Number)
      });

      jest.useRealTimers();
    });
  });

  describe('Protocol Validation', () => {
    beforeEach(async () => {
      await client.connect();
    });

    test('should accept valid MagicBlock message types', () => {
      const validTypes = ['move', 'join_session', 'leave_session', 'ping', 'pong'];

      validTypes.forEach(type => {
        expect(client.send({ type, sessionId: 'test' })).toBe(true);
      });
    });

    test('should reject invalid message types', () => {
      expect(client.send({ type: 'invalid_type' })).toBe(false);
    });

    test('should add timestamp to messages if missing', () => {
      const message = { type: 'move', sessionId: 'test' };
      const sendSpy = jest.spyOn(client['ws']!, 'send');

      client.send(message);

      const sentData = JSON.parse(sendSpy.mock.calls[0][0] as string);
      expect(sentData.timestamp).toBeDefined();
      expect(typeof sentData.timestamp).toBe('number');
    });
  });
});
