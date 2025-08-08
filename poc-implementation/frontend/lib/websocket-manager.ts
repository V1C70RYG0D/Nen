/**
 * WebSocket Manager for Real-time Match Updates
 * Handles connection lifecycle, reconnection, and message routing
 * Following GI guidelines for error handling and production readiness
 */

import { io, Socket } from 'socket.io-client';
import { apiConfig, wsConfig } from './api-config';
import { MatchUpdate, MatchWebSocketEvent } from '@/types/match';

export interface WebSocketManagerConfig {
  autoReconnect?: boolean;
  maxReconnectAttempts?: number;
  reconnectInterval?: number;
  heartbeatInterval?: number;
  enableLogging?: boolean;
}

export interface WebSocketEventHandlers {
  onConnect?: () => void;
  onDisconnect?: (reason: string) => void;
  onReconnect?: (attemptNumber: number) => void;
  onReconnectFailed?: () => void;
  onError?: (error: Error) => void;
  onMatchUpdate?: (update: MatchUpdate) => void;
  onMessage?: (event: MatchWebSocketEvent) => void;
}

export class WebSocketManager {
  private socket: Socket | null = null;
  private config: Required<WebSocketManagerConfig>;
  private handlers: WebSocketEventHandlers;
  private isConnecting = false;
  private reconnectAttempts = 0;
  private heartbeatTimer: NodeJS.Timeout | null = null;
  private subscriptions = new Set<string>();
  private connectionStartTime: number | null = null;

  constructor(
    config: WebSocketManagerConfig = {},
    handlers: WebSocketEventHandlers = {}
  ) {
    this.config = {
      autoReconnect: true,
      maxReconnectAttempts: wsConfig.reconnectionAttempts,
      reconnectInterval: wsConfig.reconnectionDelay,
      heartbeatInterval: wsConfig.heartbeatInterval,
      enableLogging: process.env.NODE_ENV === 'development',
      ...config,
    };
    this.handlers = handlers;
  }

  private log(message: string, level: 'info' | 'warn' | 'error' = 'info', ...args: any[]) {
    if (this.config.enableLogging) {
      console[level](`[WebSocketManager] ${message}`, ...args);
    }
  }

  private setupSocketListeners(socket: Socket) {
    socket.on('connect', () => {
      this.log('Connected to WebSocket server');
      this.reconnectAttempts = 0;
      this.connectionStartTime = Date.now();
      this.startHeartbeat();
      
      // Re-subscribe to all channels
      this.subscriptions.forEach(channel => {
        socket.emit('subscribe', { channel });
      });
      
      this.handlers.onConnect?.();
    });

    socket.on('disconnect', (reason) => {
      this.log('Disconnected from WebSocket server', 'warn', reason);
      this.stopHeartbeat();
      this.connectionStartTime = null;
      this.handlers.onDisconnect?.(reason);
      
      if (this.config.autoReconnect && reason !== 'io client disconnect') {
        this.scheduleReconnect();
      }
    });

    socket.on('reconnect', (attemptNumber) => {
      this.log(`Reconnected after ${attemptNumber} attempts`);
      this.handlers.onReconnect?.(attemptNumber);
    });

    socket.on('reconnect_failed', () => {
      this.log('Reconnection failed after maximum attempts', 'error');
      this.handlers.onReconnectFailed?.();
    });

    socket.on('connect_error', (error) => {
      this.log('Connection error', 'error', error);
      this.handlers.onError?.(error);
    });

    // Handle match-specific events
    socket.on('match_update', (data: MatchUpdate) => {
      this.log('Received match update', 'info', data.matchId, data.type);
      this.handlers.onMatchUpdate?.(data);
      this.handlers.onMessage?.({ type: 'match_update', data });
    });

    socket.on('new_match', (data: any) => {
      this.log('New match available', 'info', data.id);
      this.handlers.onMessage?.({ type: 'new_match', data });
    });

    socket.on('match_ended', (data: any) => {
      this.log('Match ended', 'info', data.matchId);
      this.handlers.onMessage?.({ type: 'match_ended', data });
    });

    socket.on('betting_closed', (data: any) => {
      this.log('Betting closed for match', 'info', data.matchId);
      this.handlers.onMessage?.({ type: 'betting_closed', data });
    });

    socket.on('viewer_joined', (data: any) => {
      this.handlers.onMessage?.({ type: 'viewer_joined', data });
    });

    socket.on('viewer_left', (data: any) => {
      this.handlers.onMessage?.({ type: 'viewer_left', data });
    });

    socket.on('error', (data: any) => {
      this.log('Server error', 'error', data);
      this.handlers.onMessage?.({ type: 'error', data });
    });

    // Handle pong responses for heartbeat
    socket.on('pong', () => {
      // Heartbeat acknowledged
    });
  }

  private startHeartbeat() {
    if (this.heartbeatTimer) {
      clearInterval(this.heartbeatTimer);
    }

    this.heartbeatTimer = setInterval(() => {
      if (this.socket?.connected) {
        this.socket.emit('ping');
      }
    }, this.config.heartbeatInterval);
  }

  private stopHeartbeat() {
    if (this.heartbeatTimer) {
      clearInterval(this.heartbeatTimer);
      this.heartbeatTimer = null;
    }
  }

  private scheduleReconnect() {
    if (this.reconnectAttempts >= this.config.maxReconnectAttempts) {
      this.log('Maximum reconnection attempts reached', 'error');
      return;
    }

    this.reconnectAttempts++;
    const delay = Math.min(
      this.config.reconnectInterval * Math.pow(2, this.reconnectAttempts - 1),
      wsConfig.maxReconnectionDelay
    );

    this.log(`Scheduling reconnection attempt ${this.reconnectAttempts} in ${delay}ms`);

    setTimeout(() => {
      if (!this.socket?.connected && this.config.autoReconnect) {
        this.connect();
      }
    }, delay);
  }

  connect(): Promise<void> {
    return new Promise((resolve, reject) => {
      if (this.isConnecting) {
        this.log('Connection already in progress');
        return;
      }

      if (this.socket?.connected) {
        this.log('Already connected');
        resolve();
        return;
      }

      this.isConnecting = true;
      this.log(`Connecting to WebSocket server: ${apiConfig.wsUrl}`);

      try {
        this.socket = io(apiConfig.wsUrl, {
          transports: ['websocket'],
          upgrade: true,
          reconnection: false, // We handle reconnection manually
          timeout: 10000,
          forceNew: true,
          autoConnect: false,
        });

        this.setupSocketListeners(this.socket);

        // Set up connection timeout
        const connectionTimeout = setTimeout(() => {
          if (this.isConnecting) {
            this.isConnecting = false;
            const error = new Error('Connection timeout');
            this.log('Connection timeout', 'error');
            reject(error);
          }
        }, 10000);

        this.socket.once('connect', () => {
          clearTimeout(connectionTimeout);
          this.isConnecting = false;
          resolve();
        });

        this.socket.once('connect_error', (error) => {
          clearTimeout(connectionTimeout);
          this.isConnecting = false;
          reject(error);
        });

        this.socket.connect();
      } catch (error) {
        this.isConnecting = false;
        this.log('Failed to create socket connection', 'error', error);
        reject(error);
      }
    });
  }

  disconnect(): void {
    this.log('Disconnecting from WebSocket server');
    this.config.autoReconnect = false;
    this.stopHeartbeat();
    
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }
    
    this.subscriptions.clear();
    this.isConnecting = false;
    this.reconnectAttempts = 0;
    this.connectionStartTime = null;
  }

  subscribe(channel: string): void {
    this.subscriptions.add(channel);
    
    if (this.socket?.connected) {
      this.log(`Subscribing to channel: ${channel}`);
      this.socket.emit('subscribe', { channel });
    } else {
      this.log(`Queuing subscription for channel: ${channel}`);
    }
  }

  unsubscribe(channel: string): void {
    this.subscriptions.delete(channel);
    
    if (this.socket?.connected) {
      this.log(`Unsubscribing from channel: ${channel}`);
      this.socket.emit('unsubscribe', { channel });
    }
  }

  emit(event: string, data: any): void {
    if (this.socket?.connected) {
      this.socket.emit(event, data);
    } else {
      this.log(`Cannot emit ${event}: not connected`, 'warn');
    }
  }

  // Status getters
  get isConnected(): boolean {
    return this.socket?.connected || false;
  }

  get connectionState(): 'disconnected' | 'connecting' | 'connected' {
    if (this.isConnecting) return 'connecting';
    if (this.socket?.connected) return 'connected';
    return 'disconnected';
  }

  get connectionUptime(): number {
    if (!this.connectionStartTime) return 0;
    return Date.now() - this.connectionStartTime;
  }

  get subscribedChannels(): string[] {
    return Array.from(this.subscriptions);
  }

  // Health check
  healthCheck(): Promise<boolean> {
    return new Promise((resolve) => {
      if (!this.socket?.connected) {
        resolve(false);
        return;
      }

      const timeout = setTimeout(() => resolve(false), 5000);
      
      this.socket.once('pong', () => {
        clearTimeout(timeout);
        resolve(true);
      });
      
      this.socket.emit('ping');
    });
  }

  // Update handlers
  updateHandlers(newHandlers: Partial<WebSocketEventHandlers>): void {
    this.handlers = { ...this.handlers, ...newHandlers };
  }

  // Get connection statistics
  getStats() {
    return {
      isConnected: this.isConnected,
      connectionState: this.connectionState,
      uptime: this.connectionUptime,
      reconnectAttempts: this.reconnectAttempts,
      subscribedChannels: this.subscribedChannels.length,
      channels: this.subscribedChannels,
    };
  }
}

// Export singleton instance
export const webSocketManager = new WebSocketManager();
