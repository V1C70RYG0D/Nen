/**
 * Mock Implementation for WebSocket Connections
 * Updated to support Socket.IO client testing
 */

import { Socket } from "socket.io-client";

interface MockWebSocketInterface {
  url: string;
  readyState: number;
  _onopen?: () => void;
  _onmessage?: (event: { data: any }) => void;
  _onclose?: () => void;
  onopen?: () => void;
  onmessage?: (event: { data: any }) => void;
  onclose?: () => void;
}

class MockWebSocket implements MockWebSocketInterface {
  url: string;
  readyState: number;
  _onopen?: () => void;
  _onmessage?: (event: { data: any }) => void;
  _onclose?: () => void;
  
  static CONNECTING = 0;
  static OPEN = 1;
  static CLOSING = 2;
  static CLOSED = 3;

  constructor(url: string) {
    this.url = url;
    this.readyState = MockWebSocket.CONNECTING;
  }

  // Simulate WebSocket connection opening
  open() {
    this.readyState = MockWebSocket.OPEN;
    if (this.onopen) this.onopen(); // Trigger open event
  }

  // Simulate receiving a message
  send(data: any) {
    if (this.readyState === MockWebSocket.OPEN) {
      if (this.onmessage) this.onmessage({ data });
    }
  }

  // Simulate WebSocket closure
  close() {
    this.readyState = MockWebSocket.CLOSED;
    if (this.onclose) this.onclose();
  }

  // Attach event listeners
  set onopen(callback: () => void) { this._onopen = callback; }
  set onmessage(callback: (event: { data: any }) => void) { this._onmessage = callback; }
  set onclose(callback: () => void) { this._onclose = callback; }

  get onopen() { return this._onopen || (() => {}) }
  get onmessage() { return this._onmessage || (() => {}) }
  get onclose() { return this._onclose || (() => {}) }
}

// Named export for creating new mock WebSocket instances
export const createMockWebSocket = (url: string) => new MockWebSocket(url);

/**
 * Mock WebSocket client for Socket.IO testing
 */
export function mockWebSocketClient(url: string, options: any = {}): any {
  // Return a mock socket object since we can't import Socket.IO client in a server environment
  return {
    connect: jest.fn(),
    disconnect: jest.fn(),
    emit: jest.fn(),
    on: jest.fn(),
    off: jest.fn(),
    id: 'mock-socket-id',
    connected: true,
    ...options
  };
}

export default MockWebSocket;
