/**
 * Mock Implementation for WebSocket Connections
 * Updated to support Socket.IO client testing
 */

import { io, Socket } from "socket.io-client";

class MockWebSocket {
  constructor(url) {
    this.url = url;
    this.readyState = MockWebSocket.CONNECTING;
  }

  // Simulate WebSocket connection opening
  open() {
    this.readyState = MockWebSocket.OPEN;
    if (this.onopen) this.onopen({}); // Trigger open event
  }

  // Simulate receiving a message
  send(data) {
    if (this.readyState === MockWebSocket.OPEN) {
      if (this.onmessage) this.onmessage({ data });
    }
  }

  // Simulate WebSocket closure
  close() {
    this.readyState = MockWebSocket.CLOSED;
    if (this.onclose) this.onclose({});
  }

  // Attach event listeners
  set onopen(callback) { this._onopen = callback; }
  set onmessage(callback) { this._onmessage = callback; }
  set onclose(callback) { this._onclose = callback; }

  get onopen() { return this._onopen }
  get onmessage() { return this._onmessage }
  get onclose() { return this._onclose }
}

MockWebSocket.CONNECTING = 0;
MockWebSocket.OPEN = 1;
MockWebSocket.CLOSING = 2;
MockWebSocket.CLOSED = 3;

// Named export for creating new mock WebSocket instances
export const createMockWebSocket = (url) => new MockWebSocket(url);

/**
 * Mock WebSocket client for Socket.IO testing
 */
export function mockWebSocketClient(url: string, options: any = {}): Socket {
  return io(url, {
    transports: ['websocket'],
    forceNew: true,
    timeout: 5000,
    ...options
  });
}

export default MockWebSocket;
