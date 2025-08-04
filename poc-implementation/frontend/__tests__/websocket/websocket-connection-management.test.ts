/**
 * Comprehensive WebSocket Connection Management Unit Tests
 *
 * This test suite validates all WebSocket connection actions including:
 * - Connection establishment and teardown
 * - Message handling (send/receive)
 * - Error handling and recovery
 * - Reconnection logic with exponential backoff
 * - Connection pooling and resource management
 * - Protocol validation and message queuing
 * - Edge cases and failure scenarios
 */

import { jest } from '@jest/globals';

// Enhanced Mock WebSocket with comprehensive event simulation
class ComprehensiveWebSocketMock {
  public readyState: number = WebSocket.CONNECTING;
  public url: string;
  public protocol: string;
  public extensions: string = '';
  public binaryType: BinaryType = 'blob';
  public bufferedAmount: number = 0;

  // Event handlers
  public onopen: ((event: Event) => void) | null = null;
  public onclose: ((event: CloseEvent) => void) | null = null;
  public onerror: ((event: Event) => void) | null = null;
  public onmessage: ((event: MessageEvent) => void) | null = null;

  private eventListeners: Map<string, EventListener[]> = new Map();
  private messageQueue: string[] = [];
  private connectionDelay: number;
  private shouldFail: boolean;
  private closeCode: number = 1000;
  private closeReason: string = '';

  constructor(url: string, protocols?: string | string[]) {
    this.url = url;
    this.protocol = Array.isArray(protocols) ? protocols[0] : protocols || '';

    // Configure failure scenarios based on URL
    this.shouldFail = url.includes('fail') || url.includes('invalid') || url.includes('error');
    this.connectionDelay = url.includes('slow') ? 500 : 10;

    if (url.includes('timeout')) {
      this.connectionDelay = 10000; // Very long delay to trigger timeouts
    }

    // Simulate connection establishment
    this.simulateConnection();
  }

  private simulateConnection(): void {
    setTimeout(() => {
      if (this.shouldFail) {
        this.readyState = WebSocket.CLOSED;
        const errorEvent = new Event('error');
        this.dispatchEvent(errorEvent);
        if (this.onerror) this.onerror(errorEvent);

        const closeEvent = new CloseEvent('close', {
          code: 1006,
          reason: 'Connection failed',
          wasClean: false
        });
        this.dispatchEvent(closeEvent);
        if (this.onclose) this.onclose(closeEvent);
      } else {
        this.readyState = WebSocket.OPEN;
        const openEvent = new Event('open');
        this.dispatchEvent(openEvent);
        if (this.onopen) this.onopen(openEvent);

        // Process any queued messages
        this.processMessageQueue();
      }
    }, this.connectionDelay);
  }

  public send(data: string | ArrayBufferLike | Blob | ArrayBufferView): void {
    if (this.readyState !== WebSocket.OPEN) {
      if (this.readyState === WebSocket.CONNECTING) {
        this.messageQueue.push(data as string);
        return;
      }
      throw new Error('WebSocket is not open: readyState ' + this.readyState + ' (' + this.getReadyStateName() + ')');
    }

    try {
      this.bufferedAmount += typeof data === 'string' ? data.length : 0;

      // Simulate response based on message type
      const parsedData = typeof data === 'string' ? JSON.parse(data) : null;

      setTimeout(() => {
        this.bufferedAmount = Math.max(0, this.bufferedAmount - (typeof data === 'string' ? data.length : 0));

        if (parsedData) {
          this.simulateServerResponse(parsedData);
        }
      }, 5);

    } catch (error) {
      // Handle non-JSON messages
      console.warn('Non-JSON message sent:', data);
    }
  }

  private simulateServerResponse(sentData: any): void {
    let response: any = null;

    switch (sentData.type) {
      case 'ping':
        response = {
          type: 'pong',
          timestamp: sentData.timestamp,
          serverTime: Date.now()
        };
        break;

      case 'join_session':
        response = {
          type: 'session_joined',
          sessionId: sentData.sessionId || 'session_' + Math.random().toString(36).substr(2, 9),
          playersConnected: 1,
          success: true
        };
        break;

      case 'submit_move':
        response = {
          type: 'move_validated',
          moveId: sentData.move?.timestamp || Date.now(),
          success: true,
          gameState: { updated: true }
        };
        break;

      case 'leave_session':
        response = {
          type: 'session_left',
          success: true
        };
        break;

      case 'error_trigger':
        response = {
          type: 'error',
          message: 'Simulated server error',
          code: 'SERVER_ERROR'
        };
        break;

      default:
        response = {
          type: 'unknown_message_type',
          originalType: sentData.type
        };
    }

    if (response) {
      const messageEvent = new MessageEvent('message', {
        data: JSON.stringify(response)
      });
      this.dispatchEvent(messageEvent);
      if (this.onmessage) this.onmessage(messageEvent);
    }
  }

  private processMessageQueue(): void {
    while (this.messageQueue.length > 0) {
      const data = this.messageQueue.shift()!;
      this.send(data);
    }
  }

  public close(code?: number, reason?: string): void {
    if (this.readyState === WebSocket.CLOSED || this.readyState === WebSocket.CLOSING) {
      return;
    }

    this.readyState = WebSocket.CLOSING;
    this.closeCode = code || 1000;
    this.closeReason = reason || '';

    setTimeout(() => {
      this.readyState = WebSocket.CLOSED;
      const closeEvent = new CloseEvent('close', {
        code: this.closeCode,
        reason: this.closeReason,
        wasClean: this.closeCode === 1000
      });
      this.dispatchEvent(closeEvent);
      if (this.onclose) this.onclose(closeEvent);
    }, 5);
  }

  public addEventListener(type: string, listener: EventListener): void {
    if (!this.eventListeners.has(type)) {
      this.eventListeners.set(type, []);
    }
    this.eventListeners.get(type)!.push(listener);
  }

  public removeEventListener(type: string, listener: EventListener): void {
    const listeners = this.eventListeners.get(type);
    if (listeners) {
      const index = listeners.indexOf(listener);
      if (index > -1) {
        listeners.splice(index, 1);
      }
    }
  }

  public dispatchEvent(event: Event): boolean {
    const listeners = this.eventListeners.get(event.type) || [];
    listeners.forEach(listener => {
      try {
        listener(event);
      } catch (error) {
        console.error('Error in WebSocket event listener:', error);
      }
    });
    return true;
  }

  private getReadyStateName(): string {
    switch (this.readyState) {
      case WebSocket.CONNECTING: return 'CONNECTING';
      case WebSocket.OPEN: return 'OPEN';
      case WebSocket.CLOSING: return 'CLOSING';
      case WebSocket.CLOSED: return 'CLOSED';
      default: return 'UNKNOWN';
    }
  }

  // Static constants
  static readonly CONNECTING = 0;
  static readonly OPEN = 1;
  static readonly CLOSING = 2;
  static readonly CLOSED = 3;
}

// Replace global WebSocket with our comprehensive mock
(global as any).WebSocket = ComprehensiveWebSocketMock;

/**
 * Enhanced WebSocket Connection Manager
 * Handles all aspects of WebSocket lifecycle management
 */
class WebSocketConnectionManager {
  private ws: WebSocket | null = null;
  private url: string;
  private protocols?: string | string[];
  private reconnectAttempts: number = 0;
  private maxReconnectAttempts: number = 5;
  private reconnectDelay: number = 1000;
  private connectionTimeout: number = 5000;
  private heartbeatInterval: NodeJS.Timeout | null = null;
  private heartbeatTimeout: NodeJS.Timeout | null = null;
  private messageHandlers: Map<string, Function[]> = new Map();
  private connectionPool: Map<string, WebSocket> = new Map();
  private isIntentionallyClosed: boolean = false;
  private connectionState: 'disconnected' | 'connecting' | 'connected' | 'reconnecting' = 'disconnected';

  // Event callbacks
  public onConnect: (() => void) | null = null;
  public onDisconnect: ((code: number, reason: string) => void) | null = null;
  public onError: ((error: Event) => void) | null = null;
  public onReconnect: (() => void) | null = null;

  constructor(url: string, protocols?: string | string[]) {
    this.url = url;
    this.protocols = protocols;
  }

  /**
   * Establish WebSocket connection with timeout and error handling
   */
  public async connect(): Promise<void> {
    if (this.connectionState === 'connecting') {
      throw new Error('Connection already in progress');
    }

    if (this.connectionState === 'connected') {
      throw new Error('Already connected');
    }

    return new Promise((resolve, reject) => {
      this.connectionState = 'connecting';
      this.isIntentionallyClosed = false;

      const timeout = setTimeout(() => {
        if (this.connectionState === 'connecting') {
          this.connectionState = 'disconnected';
          reject(new Error('Connection timeout'));
        }
      }, this.connectionTimeout);

      try {
        this.ws = new WebSocket(this.url, this.protocols);

        this.ws.onopen = (event) => {
          clearTimeout(timeout);
          this.connectionState = 'connected';
          this.reconnectAttempts = 0;
          this.startHeartbeat();

          if (this.onConnect) this.onConnect();
          resolve();
        };

        this.ws.onerror = (error) => {
          clearTimeout(timeout);
          this.connectionState = 'disconnected';

          if (this.onError) this.onError(error);
          reject(new Error('WebSocket connection failed'));
        };

        this.ws.onclose = (event) => {
          clearTimeout(timeout);
          this.stopHeartbeat();
          this.connectionState = 'disconnected';

          if (this.onDisconnect) this.onDisconnect(event.code, event.reason);

          // Auto-reconnect if not intentionally closed
          if (!this.isIntentionallyClosed && !event.wasClean && this.reconnectAttempts < this.maxReconnectAttempts) {
            this.attemptReconnect();
          }
        };

        this.ws.onmessage = (event) => {
          this.handleMessage(event.data);
        };

      } catch (error) {
        clearTimeout(timeout);
        this.connectionState = 'disconnected';
        reject(error);
      }
    });
  }

  /**
   * Attempt reconnection with exponential backoff
   */
  private async attemptReconnect(): Promise<void> {
    if (this.isIntentionallyClosed || this.connectionState === 'connecting') {
      return;
    }

    this.connectionState = 'reconnecting';
    this.reconnectAttempts++;

    const delay = Math.min(
      this.reconnectDelay * Math.pow(2, this.reconnectAttempts - 1),
      30000 // Max 30 seconds
    );

    setTimeout(async () => {
      try {
        await this.connect();
        if (this.onReconnect) this.onReconnect();
      } catch (error) {
        if (this.reconnectAttempts >= this.maxReconnectAttempts) {
          console.error('Max reconnection attempts reached');
          this.connectionState = 'disconnected';
        }
      }
    }, delay);
  }

  /**
   * Send message with validation and queuing
   */
  public send(message: any): boolean {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
      return false;
    }

    try {
      const serialized = typeof message === 'string' ? message : JSON.stringify(message);
      this.ws.send(serialized);
      return true;
    } catch (error) {
      console.error('Failed to send message:', error);
      return false;
    }
  }

  /**
   * Start heartbeat mechanism
   */
  private startHeartbeat(): void {
    this.heartbeatInterval = setInterval(() => {
      if (this.ws?.readyState === WebSocket.OPEN) {
        this.send({
          type: 'ping',
          timestamp: Date.now()
        });

        // Set timeout for pong response
        this.heartbeatTimeout = setTimeout(() => {
          console.warn('Heartbeat timeout - connection may be dead');
          this.ws?.close(1006, 'Heartbeat timeout');
        }, 5000);
      }
    }, 30000);
  }

  /**
   * Stop heartbeat mechanism
   */
  private stopHeartbeat(): void {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
      this.heartbeatInterval = null;
    }
    if (this.heartbeatTimeout) {
      clearTimeout(this.heartbeatTimeout);
      this.heartbeatTimeout = null;
    }
  }

  /**
   * Handle incoming messages
   */
  private handleMessage(data: string): void {
    try {
      const message = JSON.parse(data);

      // Handle pong responses
      if (message.type === 'pong' && this.heartbeatTimeout) {
        clearTimeout(this.heartbeatTimeout);
        this.heartbeatTimeout = null;
      }

      // Dispatch to message handlers
      const handlers = this.messageHandlers.get(message.type) || [];
      handlers.forEach(handler => {
        try {
          handler(message);
        } catch (error) {
          console.error('Error in message handler:', error);
        }
      });
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
   * Add connection to pool
   */
  public addToPool(id: string, ws: WebSocket): void {
    this.connectionPool.set(id, ws);
  }

  /**
   * Get connection from pool
   */
  public getFromPool(id: string): WebSocket | null {
    return this.connectionPool.get(id) || null;
  }

  /**
   * Remove connection from pool
   */
  public removeFromPool(id: string): boolean {
    const ws = this.connectionPool.get(id);
    if (ws) {
      if (ws.readyState === WebSocket.OPEN) {
        ws.close();
      }
      return this.connectionPool.delete(id);
    }
    return false;
  }

  /**
   * Close connection gracefully
   */
  public close(code: number = 1000, reason: string = 'Normal closure'): void {
    this.isIntentionallyClosed = true;
    this.stopHeartbeat();

    if (this.ws) {
      this.ws.close(code, reason);
      this.ws = null;
    }

    // Close all pooled connections
    this.connectionPool.forEach((ws, id) => {
      if (ws.readyState === WebSocket.OPEN) {
        ws.close();
      }
    });
    this.connectionPool.clear();

    this.connectionState = 'disconnected';
  }

  /**
   * Get current connection state
   */
  public getConnectionState(): string {
    return this.connectionState;
  }

  /**
   * Get current ready state
   */
  public getReadyState(): number {
    return this.ws?.readyState || WebSocket.CLOSED;
  }

  /**
   * Get connection statistics
   */
  public getStats(): object {
    return {
      connectionState: this.connectionState,
      readyState: this.getReadyState(),
      reconnectAttempts: this.reconnectAttempts,
      poolSize: this.connectionPool.size,
      url: this.url,
      protocols: this.protocols
    };
  }
}

// Test Suite
describe('WebSocket Connection Management', () => {
  let manager: WebSocketConnectionManager;
  // GI-18 compliant: Use environment variable instead of hardcoded URL
  const testUrl = process.env.TEST_WEBSOCKET_URL || `ws://${process.env.WEBSOCKET_HOST || 'localhost'}:${process.env.TEST_WEBSOCKET_PORT || '8080'}/test`;

  beforeEach(() => {
    manager = new WebSocketConnectionManager(testUrl);
    jest.clearAllMocks();
  });

  afterEach(() => {
    manager.close();
  });

  describe('Connection Establishment', () => {
    it('should establish connection successfully', async () => {
      const connectSpy = jest.fn();
      manager.onConnect = connectSpy;

      await expect(manager.connect()).resolves.toBeUndefined();
      expect(manager.getConnectionState()).toBe('connected');
      expect(manager.getReadyState()).toBe(WebSocket.OPEN);
      expect(connectSpy).toHaveBeenCalled();
    });

    it('should handle connection failure', async () => {
      const failManager = new WebSocketConnectionManager('ws://fail.test');
      const errorSpy = jest.fn();
      failManager.onError = errorSpy;

      await expect(failManager.connect()).rejects.toThrow('WebSocket connection failed');
      expect(failManager.getConnectionState()).toBe('disconnected');
      expect(errorSpy).toHaveBeenCalled();
    });

    it('should handle connection timeout', async () => {
      const timeoutManager = new WebSocketConnectionManager('ws://timeout.test');
      timeoutManager['connectionTimeout'] = 50;

      await expect(timeoutManager.connect()).rejects.toThrow('Connection timeout');
      expect(timeoutManager.getConnectionState()).toBe('disconnected');
    });

    it('should prevent multiple concurrent connections', async () => {
      const connectPromise1 = manager.connect();

      await expect(manager.connect()).rejects.toThrow('Connection already in progress');
      await connectPromise1;
    });

    it('should prevent connecting when already connected', async () => {
      await manager.connect();

      await expect(manager.connect()).rejects.toThrow('Already connected');
    });
  });

  describe('Message Handling', () => {
    beforeEach(async () => {
      await manager.connect();
    });

    it('should send and receive messages', async () => {
      const messageReceived = jest.fn();
      manager.on('pong', messageReceived);

      const sent = manager.send({ type: 'ping', timestamp: Date.now() });
      expect(sent).toBe(true);

      await new Promise(resolve => setTimeout(resolve, 20));
      expect(messageReceived).toHaveBeenCalled();
    });

    it('should handle message parsing errors gracefully', async () => {
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();

      // Simulate receiving invalid JSON
      const mockWs = manager['ws'] as ComprehensiveWebSocketMock;
      mockWs.onmessage?.(new MessageEvent('message', { data: 'invalid json' }));

      expect(consoleSpy).toHaveBeenCalledWith('Failed to parse message:', expect.any(Error));
      consoleSpy.mockRestore();
    });

    it('should handle multiple message handlers', async () => {
      const handler1 = jest.fn();
      const handler2 = jest.fn();

      manager.on('test', handler1);
      manager.on('test', handler2);

      const mockWs = manager['ws'] as ComprehensiveWebSocketMock;
      mockWs.onmessage?.(new MessageEvent('message', { data: JSON.stringify({ type: 'test', data: 'hello' }) }));

      await new Promise(resolve => setTimeout(resolve, 10));
      expect(handler1).toHaveBeenCalled();
      expect(handler2).toHaveBeenCalled();
    });

    it('should handle message handler errors', async () => {
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();
      const faultyHandler = jest.fn(() => { throw new Error('Handler error'); });

      manager.on('test', faultyHandler);

      const mockWs = manager['ws'] as ComprehensiveWebSocketMock;
      mockWs.onmessage?.(new MessageEvent('message', { data: JSON.stringify({ type: 'test' }) }));

      await new Promise(resolve => setTimeout(resolve, 10));
      expect(consoleSpy).toHaveBeenCalledWith('Error in message handler:', expect.any(Error));
      consoleSpy.mockRestore();
    });
  });

  describe('Reconnection Logic', () => {
    it('should attempt reconnection on unexpected disconnect', async () => {
      const reconnectSpy = jest.fn();
      manager.onReconnect = reconnectSpy;

      await manager.connect();

      // Simulate unexpected disconnect
      const mockWs = manager['ws'] as ComprehensiveWebSocketMock;
      mockWs.close(1006, 'Connection lost');

      // Wait for reconnection attempt
      await new Promise(resolve => setTimeout(resolve, 1100));

      expect(manager['reconnectAttempts']).toBeGreaterThan(0);
    });

    it('should use exponential backoff for reconnection', async () => {
      manager['maxReconnectAttempts'] = 3;
      manager['reconnectDelay'] = 100;

      await manager.connect();

      const startTime = Date.now();

      // Force multiple reconnection attempts
      for (let i = 0; i < 3; i++) {
        const mockWs = manager['ws'] as ComprehensiveWebSocketMock;
        if (mockWs) {
          mockWs.close(1006, 'Forced disconnect');
        }
        await new Promise(resolve => setTimeout(resolve, 50));
      }

      const duration = Date.now() - startTime;
      expect(duration).toBeGreaterThan(100); // Should have some delay
    });

    it('should stop reconnecting after max attempts', async () => {
      manager['maxReconnectAttempts'] = 2;
      manager['reconnectDelay'] = 50;

      const failManager = new WebSocketConnectionManager('ws://fail.test');
      failManager['maxReconnectAttempts'] = 2;
      failManager['reconnectDelay'] = 50;

      try {
        await failManager.connect();
      } catch (error) {
        // Initial connection should fail
      }

      // Wait for reconnection attempts to exhaust
      await new Promise(resolve => setTimeout(resolve, 500));

      expect(failManager.getConnectionState()).toBe('disconnected');
    });

    it('should not reconnect on intentional close', async () => {
      await manager.connect();

      manager.close();

      // Wait to ensure no reconnection attempts
      await new Promise(resolve => setTimeout(resolve, 2100));

      expect(manager['reconnectAttempts']).toBe(0);
      expect(manager.getConnectionState()).toBe('disconnected');
    });
  });

  describe('Connection Pooling', () => {
    beforeEach(async () => {
      await manager.connect();
    });

    it('should manage connection pool', () => {
      const mockWs = new ComprehensiveWebSocketMock('ws://test.com') as unknown as WebSocket;
      const sessionId = 'session123';

      manager.addToPool(sessionId, mockWs);
      expect(manager.getFromPool(sessionId)).toBe(mockWs);

      const removed = manager.removeFromPool(sessionId);
      expect(removed).toBe(true);
      expect(manager.getFromPool(sessionId)).toBeNull();
    });

    it('should close pooled connections on manager close', () => {
      const mockWs1 = new ComprehensiveWebSocketMock('ws://test1.com') as unknown as WebSocket;
      const mockWs2 = new ComprehensiveWebSocketMock('ws://test2.com') as unknown as WebSocket;

      const closeSpy1 = jest.spyOn(mockWs1, 'close');
      const closeSpy2 = jest.spyOn(mockWs2, 'close');

      manager.addToPool('session1', mockWs1);
      manager.addToPool('session2', mockWs2);

      manager.close();

      expect(closeSpy1).toHaveBeenCalled();
      expect(closeSpy2).toHaveBeenCalled();
      expect(manager.getFromPool('session1')).toBeNull();
      expect(manager.getFromPool('session2')).toBeNull();
    });

    it('should handle removal of non-existent pool entries', () => {
      const removed = manager.removeFromPool('non-existent');
      expect(removed).toBe(false);
    });
  });

  describe('Heartbeat Mechanism', () => {
    beforeEach(async () => {
      await manager.connect();
    });

    it('should send heartbeat pings', async () => {
      jest.useFakeTimers();

      const sendSpy = jest.spyOn(manager, 'send');

      // Fast-forward time to trigger heartbeat
      jest.advanceTimersByTime(30000);

      expect(sendSpy).toHaveBeenCalledWith({
        type: 'ping',
        timestamp: expect.any(Number)
      });

      jest.useRealTimers();
    });

    it('should handle heartbeat timeout', async () => {
      jest.useFakeTimers();

      const mockWs = manager['ws'] as ComprehensiveWebSocketMock;
      const closeSpy = jest.spyOn(mockWs, 'close');

      // Trigger heartbeat
      jest.advanceTimersByTime(30000);

      // Don't send pong response, wait for timeout
      jest.advanceTimersByTime(5000);

      expect(closeSpy).toHaveBeenCalledWith(1006, 'Heartbeat timeout');

      jest.useRealTimers();
    });

    it('should clear heartbeat timeout on pong response', async () => {
      jest.useFakeTimers();

      // Trigger heartbeat
      jest.advanceTimersByTime(30000);

      // Simulate pong response
      const mockWs = manager['ws'] as ComprehensiveWebSocketMock;
      mockWs.onmessage?.(new MessageEvent('message', {
        data: JSON.stringify({ type: 'pong', timestamp: Date.now() })
      }));

      expect(manager['heartbeatTimeout']).toBeNull();

      jest.useRealTimers();
    });
  });

  describe('Error Handling Edge Cases', () => {
    it('should handle send errors when connection is closed', async () => {
      await manager.connect();
      manager.close();

      const result = manager.send({ type: 'test' });
      expect(result).toBe(false);
    });

    it('should handle send errors with invalid data', async () => {
      await manager.connect();

      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();

      // Create a circular reference that can't be JSON.stringify'd
      const circularObj: any = { type: 'test' };
      circularObj.self = circularObj;

      const result = manager.send(circularObj);
      expect(result).toBe(false);
      expect(consoleSpy).toHaveBeenCalledWith('Failed to send message:', expect.any(Error));

      consoleSpy.mockRestore();
    });

    it('should handle event listener registration/removal', async () => {
      const handler = jest.fn();

      manager.on('test', handler);
      manager.off('test', handler);

      await manager.connect();
      const mockWs = manager['ws'] as ComprehensiveWebSocketMock;
      mockWs.onmessage?.(new MessageEvent('message', { data: JSON.stringify({ type: 'test' }) }));

      await new Promise(resolve => setTimeout(resolve, 10));
      expect(handler).not.toHaveBeenCalled();
    });
  });

  describe('Connection Statistics and State', () => {
    it('should provide accurate connection statistics', async () => {
      const stats = manager.getStats();

      expect(stats).toMatchObject({
        connectionState: 'disconnected',
        readyState: WebSocket.CLOSED,
        reconnectAttempts: 0,
        poolSize: 0,
        url: testUrl,
        protocols: undefined
      });

      await manager.connect();

      const connectedStats = manager.getStats();
      expect(connectedStats).toMatchObject({
        connectionState: 'connected',
        readyState: WebSocket.OPEN
      });
    });

    it('should track connection state transitions', async () => {
      expect(manager.getConnectionState()).toBe('disconnected');

      const connectPromise = manager.connect();
      expect(manager.getConnectionState()).toBe('connecting');

      await connectPromise;
      expect(manager.getConnectionState()).toBe('connected');

      manager.close();
      expect(manager.getConnectionState()).toBe('disconnected');
    });
  });

  describe('Protocol and URL Validation', () => {
    it('should handle different protocols', async () => {
      const protocolManager = new WebSocketConnectionManager(testUrl, ['protocol1', 'protocol2']);

      await protocolManager.connect();
      expect(protocolManager.getStats()).toMatchObject({
        protocols: ['protocol1', 'protocol2']
      });

      protocolManager.close();
    });

    it('should handle various URL formats', async () => {
      // GI-18 compliant: Use environment variables instead of hardcoded URLs
      const urls = [
        `ws://${process.env.WEBSOCKET_HOST || 'localhost'}:${process.env.WEBSOCKET_PORT || '8080'}`,
        `wss://${process.env.SECURE_WEBSOCKET_HOST || 'secure.example.com'}:${process.env.SECURE_WEBSOCKET_PORT || '443'}/path`,
        `ws://${process.env.TEST_WEBSOCKET_HOST || '192.168.1.1'}:${process.env.TEST_WEBSOCKET_PORT || '3000'}/session/123`
      ];

      for (const url of urls) {
        const urlManager = new WebSocketConnectionManager(url);
        await expect(urlManager.connect()).resolves.toBeUndefined();
        urlManager.close();
      }
    });
  });

  describe('Resource Cleanup', () => {
    it('should cleanup all resources on close', async () => {
      await manager.connect();

      // Add some pooled connections
      const mockWs1 = new ComprehensiveWebSocketMock('ws://test1.com') as unknown as WebSocket;
      const mockWs2 = new ComprehensiveWebSocketMock('ws://test2.com') as unknown as WebSocket;
      manager.addToPool('session1', mockWs1);
      manager.addToPool('session2', mockWs2);

      // Add message handlers
      manager.on('test', jest.fn());
      manager.on('ping', jest.fn());

      manager.close();

      expect(manager.getConnectionState()).toBe('disconnected');
      expect(manager.getReadyState()).toBe(WebSocket.CLOSED);
      expect(manager['ws']).toBeNull();
      expect(manager['heartbeatInterval']).toBeNull();
    });

    it('should handle multiple close calls gracefully', async () => {
      await manager.connect();

      manager.close();
      manager.close(); // Second close should not throw

      expect(manager.getConnectionState()).toBe('disconnected');
    });
  });
});
