/**
 * WebSocket Connection Tests
 * Verifies WebSocket functionality and React Testing Library setup
 */

import React from 'react';
import { render, waitFor, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import { testUtils } from '../src/test/setup';

// Mock React component that uses WebSocket
const MockWebSocketComponent = () => {
  const [connectionStatus, setConnectionStatus] = React.useState('disconnected');
  const [messages, setMessages] = React.useState<string[]>([]);

  React.useEffect(() => {
    const ws = new WebSocket(process.env.NEXT_PUBLIC_WEBSOCKET_URL!);
    
    ws.onopen = () => {
      setConnectionStatus('connected');
      // Send a test ping
      ws.send(JSON.stringify({ type: 'ping', timestamp: Date.now() }));
    };
    
    ws.onmessage = (event) => {
      const data = JSON.parse(event.data);
      setMessages(prev => [...prev, `${data.type}: ${data.timestamp || 'no timestamp'}`]);
    };
    
    ws.onclose = () => {
      setConnectionStatus('disconnected');
    };
    
    ws.onerror = () => {
      setConnectionStatus('error');
    };

    return () => {
      ws.close();
    };
  }, []);

  return (
    <div>
      <div data-testid="connection-status">Status: {connectionStatus}</div>
      <div data-testid="message-count">Messages: {messages.length}</div>
      <ul data-testid="messages-list">
        {messages.map((msg, index) => (
          <li key={index} data-testid={`message-${index}`}>{msg}</li>
        ))}
      </ul>
    </div>
  );
};

describe('WebSocket Integration Tests', () => {
  afterEach(() => {
    testUtils.cleanup();
  });

  it('should establish WebSocket connection', async () => {
    render(<MockWebSocketComponent />);
    
    // Initially disconnected
    expect(screen.getByTestId('connection-status')).toHaveTextContent('Status: disconnected');
    
    // Wait for connection to establish
    await waitFor(() => {
      expect(screen.getByTestId('connection-status')).toHaveTextContent('Status: connected');
    }, { timeout: 1000 });
  });

  it('should handle ping/pong messages', async () => {
    render(<MockWebSocketComponent />);
    
    // Wait for connection and message exchange
    await waitFor(() => {
      expect(screen.getByTestId('connection-status')).toHaveTextContent('Status: connected');
    }, { timeout: 1000 });
    
    // Wait for pong response
    await waitFor(() => {
      expect(screen.getByTestId('message-count')).toHaveTextContent('Messages: 1');
    }, { timeout: 1000 });
    
    // Check that pong message was received
    await waitFor(() => {
      const messageElement = screen.getByTestId('message-0');
      expect(messageElement).toHaveTextContent('pong:');
    }, { timeout: 500 });
  });

  it('should handle WebSocket environment variables', () => {
    // GI-18: Test environment variables are properly configured
    expect(process.env.NEXT_PUBLIC_WEBSOCKET_URL).toBeDefined();
    expect(process.env.NEXT_PUBLIC_WS_URL).toBeDefined();
    expect(process.env.NEXT_PUBLIC_API_URL).toBeDefined();
    
    // Validate URL format
    expect(process.env.NEXT_PUBLIC_WEBSOCKET_URL).toMatch(/^ws:\/\/.+/);
    expect(process.env.NEXT_PUBLIC_WS_URL).toMatch(/^ws:\/\/.+/);
    expect(process.env.NEXT_PUBLIC_API_URL).toMatch(/^https?:\/\/.+/);
  });

  it('should create mock WebSocket with testUtils', () => {
    const mockWs = testUtils.createMockWebSocketConnection('ws://test-url');
    expect(mockWs.url).toBe('ws://test-url');
    expect(mockWs.readyState).toBe(0); // CONNECTING initially
    
    // Wait for mock connection to open
    setTimeout(() => {
      expect(mockWs.readyState).toBe(1); // OPEN
    }, 50);
  });

  it('should mock API responses correctly', async () => {
    const testData = { success: true, data: 'test' };
    testUtils.mockApiResponse(testData, 200);
    
    const response = await fetch('/api/test');
    const data = await response.json();
    
    expect(response.ok).toBe(true);
    expect(response.status).toBe(200);
    expect(data).toEqual(testData);
  });
});
