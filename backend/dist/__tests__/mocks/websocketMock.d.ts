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
export declare function mockWebSocketClient(url: string, options?: any): Socket;
export default MockWebSocket;
//# sourceMappingURL=websocketMock.d.ts.map