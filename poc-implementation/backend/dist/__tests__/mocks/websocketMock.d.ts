/**
 * Mock Implementation for WebSocket Connections
 * Updated to support Socket.IO client testing
 */
interface MockWebSocketInterface {
    url: string;
    readyState: number;
    _onopen?: () => void;
    _onmessage?: (event: {
        data: any;
    }) => void;
    _onclose?: () => void;
    onopen?: () => void;
    onmessage?: (event: {
        data: any;
    }) => void;
    onclose?: () => void;
}
declare class MockWebSocket implements MockWebSocketInterface {
    url: string;
    readyState: number;
    _onopen?: () => void;
    _onmessage?: (event: {
        data: any;
    }) => void;
    _onclose?: () => void;
    static CONNECTING: number;
    static OPEN: number;
    static CLOSING: number;
    static CLOSED: number;
    constructor(url: string);
    open(): void;
    send(data: any): void;
    close(): void;
    set onopen(callback: () => void);
    set onmessage(callback: (event: {
        data: any;
    }) => void);
    set onclose(callback: () => void);
    get onopen(): () => void;
    get onmessage(): (event: {
        data: any;
    }) => void;
    get onclose(): () => void;
}
export declare const createMockWebSocket: (url: string) => MockWebSocket;
/**
 * Mock WebSocket client for Socket.IO testing
 */
export declare function mockWebSocketClient(url: string, options?: any): any;
export default MockWebSocket;
//# sourceMappingURL=websocketMock.d.ts.map