import { test, expect } from '@playwright/test';

// Example of a WebSocket test using Playwright and WS

// GI-18 Compliance: WebSocket endpoint externalized
const wsEndpoint = process.env.WS_URL || process.env.DEFAULT_WS_URL || (() => {
})();

let websocket;

test.describe('WebSocket Integration Tests', () => {

  test.beforeEach(async ({ page }) => {
    websocket = new WebSocket(wsEndpoint);
    await new Promise<void>((resolve, reject) => {
      websocket.onopen = () => resolve();
      websocket.onerror = (error) => reject(error);
    });
  });

  test.afterEach(() => {
    if (websocket) websocket.close();
  });

  test('should connect to WebSocket and receive initial message', async ({ page }) => {
    const messagePromise = new Promise<string>((resolve) => {
      websocket.onmessage = (event) => resolve(event.data);
    });

    const initialMessage = await messagePromise;
    expect(typeof initialMessage).toBe('string');
    expect(initialMessage).toContain('Welcome');
  });

  test('should send a valid message and receive a response', async ({ page }) => {
    const messagePromise = new Promise<string>((resolve) => {
      websocket.onmessage = (event) => resolve(event.data);
    });

    websocket.send(JSON.stringify({ action: 'ping' }));

    const responseMessage = await messagePromise;
    expect(typeof responseMessage).toBe('string');
    expect(responseMessage).toContain('pong');
  });
});

