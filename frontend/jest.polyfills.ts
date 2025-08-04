// jest.polyfills.ts
import { TextEncoder, TextDecoder } from 'util';

// Add Node.js TextEncoder/TextDecoder polyfills
global.TextEncoder = TextEncoder as any;
global.TextDecoder = TextDecoder as any;

// Add WebSocket mock
class MockWebSocket {
  onopen: ((event: Event) => void) | null = null;
  onmessage: ((event: MessageEvent) => void) | null = null;
  onerror: ((event: Event) => void) | null = null;
  onclose: ((event: CloseEvent) => void) | null = null;
  readyState: number = WebSocket.CONNECTING;
  private eventListeners: { [key: string]: EventListener[] } = {};
  private url: string;

  constructor(url: string) {
    this.url = url;
    this.eventListeners = {};

    // Mock WebSocket behavior - connect after a short delay
    setTimeout(() => {
      this.readyState = WebSocket.OPEN;
      if (this.onopen) {
        this.onopen(new Event('open'));
      }
      this.dispatchEvent(new Event('open'));
    }, 0);
  }

  send(data: string) {
    // Mock send behavior
    try {
      const parsedData = JSON.parse(data);
      if (parsedData.type === 'ping') {
        // Simulate pong response
        setTimeout(() => {
          const pongMessage = {
            type: 'pong',
            timestamp: parsedData.timestamp,
          };
          this.mockReceiveMessage(JSON.stringify(pongMessage));
        }, 1);
      }

      if (parsedData.type === 'submit_move') {
        // Simulate move validation response
        setTimeout(() => {
          const validationMessage = {
            type: 'move_validated',
            moveId: parsedData.move.timestamp,
            success: true,
          };
          this.mockReceiveMessage(JSON.stringify(validationMessage));
        }, 10);
      }
    } catch (e) {
      // Ignore parsing errors
    }
  }

  close(code?: number, reason?: string) {
    this.readyState = WebSocket.CLOSED;
    const closeEvent = new CloseEvent('close', { code: code || 1000, reason: reason || '' });
    if (this.onclose) {
      this.onclose(closeEvent);
    }
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
    if (this.onmessage) {
      this.onmessage(messageEvent);
    }
    this.dispatchEvent(messageEvent);
  }

  static CONNECTING = 0;
  static OPEN = 1;
  static CLOSING = 2;
  static CLOSED = 3;
}

global.WebSocket = MockWebSocket as any;

// Mock matchMedia
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
}));

// Mock HTMLCanvasElement.getContext for jest-axe
HTMLCanvasElement.prototype.getContext = jest.fn().mockImplementation((contextType) => {
  if (contextType === '2d') {
    return {
      fillRect: jest.fn(),
      clearRect: jest.fn(),
      getImageData: jest.fn(() => ({ data: new Array(4) })),
      putImageData: jest.fn(),
      createImageData: jest.fn(() => ({ data: new Array(4) })),
      setTransform: jest.fn(),
      drawImage: jest.fn(),
      save: jest.fn(),
      fillText: jest.fn(),
      restore: jest.fn(),
      beginPath: jest.fn(),
      moveTo: jest.fn(),
      lineTo: jest.fn(),
      closePath: jest.fn(),
      stroke: jest.fn(),
      translate: jest.fn(),
      scale: jest.fn(),
      rotate: jest.fn(),
      arc: jest.fn(),
      fill: jest.fn(),
      measureText: jest.fn(() => ({ width: 0 })),
      transform: jest.fn(),
      rect: jest.fn(),
      clip: jest.fn(),
    };
  }
  return null;
});
