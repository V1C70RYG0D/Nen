"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createMockWebSocket = void 0;
exports.mockWebSocketClient = mockWebSocketClient;
const socket_io_client_1 = require("socket.io-client");
class MockWebSocket {
    constructor(url) {
        this.url = url;
        this.readyState = MockWebSocket.CONNECTING;
    }
    open() {
        this.readyState = MockWebSocket.OPEN;
        if (this.onopen)
            this.onopen({});
    }
    send(data) {
        if (this.readyState === MockWebSocket.OPEN) {
            if (this.onmessage)
                this.onmessage({ data });
        }
    }
    close() {
        this.readyState = MockWebSocket.CLOSED;
        if (this.onclose)
            this.onclose({});
    }
    set onopen(callback) { this._onopen = callback; }
    set onmessage(callback) { this._onmessage = callback; }
    set onclose(callback) { this._onclose = callback; }
    get onopen() { return this._onopen; }
    get onmessage() { return this._onmessage; }
    get onclose() { return this._onclose; }
}
MockWebSocket.CONNECTING = 0;
MockWebSocket.OPEN = 1;
MockWebSocket.CLOSING = 2;
MockWebSocket.CLOSED = 3;
const createMockWebSocket = (url) => new MockWebSocket(url);
exports.createMockWebSocket = createMockWebSocket;
function mockWebSocketClient(url, options = {}) {
    return (0, socket_io_client_1.io)(url, {
        transports: ['websocket'],
        forceNew: true,
        timeout: 5000,
        ...options
    });
}
exports.default = MockWebSocket;
//# sourceMappingURL=websocketMock.js.map