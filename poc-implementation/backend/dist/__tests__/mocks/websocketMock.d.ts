/**
 * Mock Implementation for WebSocket Connections
 * Updated to support Socket.IO client testing
 */
declare class MockWebSocket {
    constructor(url: any);
    open(): void;
    send(data: any): void;
    close(): void;
    set onopen(callback: any);
    set onmessage(callback: any);
    set onclose(callback: any);
    get onopen(): any;
    get onmessage(): any;
    get onclose(): any;
}
export declare const createMockWebSocket: (url: any) => MockWebSocket;
/**
 * Mock WebSocket client for Socket.IO testing
 */
export declare function mockWebSocketClient(url: string, options?: any): Socket;
export default MockWebSocket;
//# sourceMappingURL=websocketMock.d.ts.map