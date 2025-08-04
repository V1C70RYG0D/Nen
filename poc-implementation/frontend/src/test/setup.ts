/**
 * Frontend Test Setup
 * Configures React Testing Library, WebSocket mocking, and browser environment for testing

 */

import '@testing-library/jest-dom';
import { configure } from '@testing-library/react';
import { toHaveNoViolations } from 'jest-axe';
import { TextEncoder, TextDecoder } from 'util';
import { config } from 'dotenv';
import path from 'path';


config({ path: path.join(__dirname, '../../../config/test.env') });
config({ path: path.join(__dirname, '../../../config/constants.env') });

// Extend Jest matchers for accessibility testing
(expect as any).extend(toHaveNoViolations);

// Configure React Testing Library
configure({
  testIdAttribute: 'data-testid',
  // Configure RTL to be more strict about queries
  getElementError: (message, container) => {
    const error = new Error([
      message,
      '\nHere is the debug output:',
      '\nDOM Debug:',
      require('@testing-library/react').prettyDOM(container)
    ].join('\n'));
    error.name = 'TestingLibraryElementError';
    error.stack = undefined;
    return error;
  },
});

// Add Node.js polyfills for browser APIs
global.TextEncoder = TextEncoder as any;
global.TextDecoder = TextDecoder as any;


// Load from test.env file, fallback to empty string to avoid hardcoding
if (!process.env.NEXT_PUBLIC_API_URL) {
  console.warn('NEXT_PUBLIC_API_URL not found in environment, please check config/test.env');
}
if (!process.env.NEXT_PUBLIC_WS_URL) {
  console.warn('NEXT_PUBLIC_WS_URL not found in environment, please check config/test.env');
}
if (!process.env.NEXT_PUBLIC_WEBSOCKET_URL) {
  console.warn('NEXT_PUBLIC_WEBSOCKET_URL not found in environment, please check config/test.env');
}
if (!process.env.NEXT_PUBLIC_SOLANA_RPC_URL) {
  console.warn('NEXT_PUBLIC_SOLANA_RPC_URL not found in environment, please check config/test.env');
}
if (!process.env.NEXT_PUBLIC_RPC_URL) {
  console.warn('NEXT_PUBLIC_RPC_URL not found in environment, please check config/test.env');
}
if (!process.env.NEXT_PUBLIC_PROGRAM_ID) {
  console.warn('NEXT_PUBLIC_PROGRAM_ID not found in environment, please check config/test.env');
}

// Mock WebSocket with enhanced functionality for frontend tests
class MockWebSocket {
  private eventListeners: { [key: string]: EventListener[] } = {};
  private messageQueue: string[] = [];
  private isConnected = false;

  constructor(public url: string) {
    this.readyState = MockWebSocket.CONNECTING;

    // Simulate connection after short delay
    setTimeout(() => {
      this.readyState = MockWebSocket.OPEN;
      this.isConnected = true;

      const openEvent = new Event('open');
      if (this.onopen) this.onopen(openEvent);
      this.dispatchEvent(openEvent);

      // Process any queued messages
      this.processMessageQueue();
    }, 10);
  }

  readyState: number = MockWebSocket.CONNECTING;
  onopen: ((event: Event) => void) | null = null;
  onmessage: ((event: MessageEvent) => void) | null = null;
  onerror: ((event: Event) => void) | null = null;
  onclose: ((event: CloseEvent) => void) | null = null;

  send(data: string) {
    if (!this.isConnected) {
      this.messageQueue.push(data);
      return;
    }

    // Simulate server responses for testing
    try {
      const parsedData = JSON.parse(data);

      // Handle ping/pong
      if (parsedData.type === 'ping') {
        setTimeout(() => {
          this.mockReceiveMessage(JSON.stringify({
            type: 'pong',
            timestamp: parsedData.timestamp
          }));
        }, 5);
      }

      // Handle game moves
      if (parsedData.type === 'submit_move') {
        setTimeout(() => {
          this.mockReceiveMessage(JSON.stringify({
            type: 'move_validated',
            moveId: parsedData.move?.timestamp || Date.now(),
            success: true,
            gameState: 'updated'
          }));
        }, 50);
      }

      // Handle join game
      if (parsedData.type === 'join_game') {
        setTimeout(() => {
          this.mockReceiveMessage(JSON.stringify({
            type: 'game_joined',
            gameId: parsedData.gameId,
            playerId: 'test-player-id',
            success: true
          }));
        }, 20);
      }

    } catch (e) {
      // Ignore JSON parsing errors for non-JSON messages
    }
  }

  close(code?: number, reason?: string) {
    this.readyState = MockWebSocket.CLOSED;
    this.isConnected = false;

    const closeEvent = new CloseEvent('close', {
      code: code || 1000,
      reason: reason || 'Normal closure'
    });

    if (this.onclose) this.onclose(closeEvent);
    this.dispatchEvent(closeEvent);
  }

  addEventListener(type: string, listener: EventListener) {
    if (!this.eventListeners[type]) {
      this.eventListeners[type] = [];
    }
    this.eventListeners[type].push(listener);
  }

  removeEventListener(type: string, listener: EventListener) {
    if (this.eventListeners[type]) {
      const index = this.eventListeners[type].indexOf(listener);
      if (index > -1) {
        this.eventListeners[type].splice(index, 1);
      }
    }
  }

  dispatchEvent(event: Event): boolean {
    const listeners = this.eventListeners[event.type] || [];
    listeners.forEach(listener => {
      try {
        listener(event);
      } catch (e) {
        console.error('Error in WebSocket event listener:', e);
      }
    });
    return true;
  }

  private mockReceiveMessage(data: string) {
    const messageEvent = new MessageEvent('message', { data });
    if (this.onmessage) this.onmessage(messageEvent);
    this.dispatchEvent(messageEvent);
  }

  private processMessageQueue() {
    while (this.messageQueue.length > 0) {
      const data = this.messageQueue.shift()!;
      this.send(data);
    }
  }

  static CONNECTING = 0;
  static OPEN = 1;
  static CLOSING = 2;
  static CLOSED = 3;
}

global.WebSocket = MockWebSocket as any;

// Mock fetch for API calls
global.fetch = jest.fn(() =>
  Promise.resolve({
    ok: true,
    status: 200,
    json: () => Promise.resolve({ success: true }),
    text: () => Promise.resolve('OK'),
    headers: new Headers(),
    redirected: false,
    statusText: 'OK',
    type: 'default',
    url: '',
    clone: jest.fn(),
    body: null,
    bodyUsed: false,
    arrayBuffer: () => Promise.resolve(new ArrayBuffer(0)),
    blob: () => Promise.resolve(new Blob()),
    formData: () => Promise.resolve(new FormData()),
  })
) as jest.Mock;

// Mock matchMedia for responsive design tests
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: jest.fn().mockImplementation(query => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: jest.fn(), // deprecated
    removeListener: jest.fn(), // deprecated
    addEventListener: jest.fn(),
    removeEventListener: jest.fn(),
    dispatchEvent: jest.fn(),
  })),
});

// Mock ResizeObserver
global.ResizeObserver = jest.fn().mockImplementation(() => ({
  observe: jest.fn(),
  unobserve: jest.fn(),
  disconnect: jest.fn(),
}));

// Mock IntersectionObserver
global.IntersectionObserver = jest.fn().mockImplementation(() => ({
  observe: jest.fn(),
  unobserve: jest.fn(),
  disconnect: jest.fn(),
  root: null,
  rootMargin: '',
  thresholds: [],
}));

// Mock localStorage
const localStorageMock = {
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
  clear: jest.fn(),
  length: 0,
  key: jest.fn(),
};
global.localStorage = localStorageMock;

// Mock sessionStorage
const sessionStorageMock = {
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
  clear: jest.fn(),
  length: 0,
  key: jest.fn(),
};
global.sessionStorage = sessionStorageMock;

// Mock Next.js router
const mockRouter = {
  push: jest.fn(),
  replace: jest.fn(),
  back: jest.fn(),
  forward: jest.fn(),
  reload: jest.fn(),
  prefetch: jest.fn(),
  pathname: '/',
  route: '/',
  asPath: '/',
  query: {},
  isReady: true,
  events: {
    on: jest.fn(),
    off: jest.fn(),
    emit: jest.fn(),
  },
};

jest.mock('next/router', () => ({
  useRouter: () => mockRouter,
  __esModule: true,
}));

// Mock Solana wallet adapter
jest.mock('@solana/wallet-adapter-react', () => ({
  useWallet: () => ({
    connected: false,
    connecting: false,
    disconnect: jest.fn(),
    publicKey: null,
    signTransaction: jest.fn(),
    signAllTransactions: jest.fn(),
    wallet: null,
  }),
  useConnection: () => ({
    connection: {
      getAccountInfo: jest.fn(),
      getBalance: jest.fn(),
      confirmTransaction: jest.fn(),
      sendTransaction: jest.fn(),
    },
  }),
}));

// Console mocking for cleaner test output
const originalConsole = global.console;
global.console = {
  ...originalConsole,
  warn: jest.fn(),
  error: jest.fn(),
  // Uncomment to silence logs during tests
  // log: jest.fn(),
  // info: jest.fn(),
  // debug: jest.fn(),
};

// Test utilities for cleanup and common operations
export const testUtils = {
  mockWebSocket: MockWebSocket,
  mockRouter,
  localStorageMock,
  sessionStorageMock,
  cleanup: () => {
    jest.clearAllMocks();
    localStorageMock.clear();
    sessionStorageMock.clear();
    global.console = originalConsole;
  },

  createMockWebSocketConnection: (url?: string) => {
    const wsUrl = url || process.env.TEST_MOCK_WS_URL;
    if (!wsUrl) {
      throw new Error('WebSocket URL not provided and TEST_MOCK_WS_URL not set in environment');
    }
    return new MockWebSocket(wsUrl);
  },
  // Helper for testing API responses
  mockApiResponse: (data: any, status = 200) => {
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: status >= 200 && status < 300,
      status,
      json: () => Promise.resolve(data),
      text: () => Promise.resolve(JSON.stringify(data)),
    });
  },
};

export default testUtils;
