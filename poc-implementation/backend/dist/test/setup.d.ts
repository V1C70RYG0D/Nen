/**
 * Backend Test Setup
 * Configures testing environment for backend services including WebSocket and database mocking
 */
export declare const cleanup: () => void;
export declare const testUtils: {
    mockRedisClient: {
        get: import("jest-mock").Mock<import("jest-mock").UnknownFunction>;
        set: import("jest-mock").Mock<import("jest-mock").UnknownFunction>;
        del: import("jest-mock").Mock<import("jest-mock").UnknownFunction>;
        exists: import("jest-mock").Mock<import("jest-mock").UnknownFunction>;
        expire: import("jest-mock").Mock<import("jest-mock").UnknownFunction>;
        flushall: import("jest-mock").Mock<import("jest-mock").UnknownFunction>;
        quit: import("jest-mock").Mock<import("jest-mock").UnknownFunction>;
        connect: import("jest-mock").Mock<import("jest-mock").UnknownFunction>;
        disconnect: import("jest-mock").Mock<import("jest-mock").UnknownFunction>;
        on: import("jest-mock").Mock<import("jest-mock").UnknownFunction>;
        off: import("jest-mock").Mock<import("jest-mock").UnknownFunction>;
    };
    mockSocket: {
        id: string;
        emit: import("jest-mock").Mock<import("jest-mock").UnknownFunction>;
        on: import("jest-mock").Mock<import("jest-mock").UnknownFunction>;
        off: import("jest-mock").Mock<import("jest-mock").UnknownFunction>;
        join: import("jest-mock").Mock<import("jest-mock").UnknownFunction>;
        leave: import("jest-mock").Mock<import("jest-mock").UnknownFunction>;
        disconnect: import("jest-mock").Mock<import("jest-mock").UnknownFunction>;
        connected: boolean;
        handshake: {
            auth: {
                [key: string]: any;
            };
            headers: {
                [key: string]: any;
            };
            query: {
                [key: string]: any;
            };
        };
    };
    mockIo: {
        emit: import("jest-mock").Mock<import("jest-mock").UnknownFunction>;
        on: import("jest-mock").Mock<import("jest-mock").UnknownFunction>;
        off: import("jest-mock").Mock<import("jest-mock").UnknownFunction>;
        to: import("jest-mock").Mock<import("jest-mock").UnknownFunction>;
        in: import("jest-mock").Mock<import("jest-mock").UnknownFunction>;
        use: import("jest-mock").Mock<import("jest-mock").UnknownFunction>;
        engine: {
            generateId: import("jest-mock").Mock<() => string>;
        };
    };
    cleanup: () => void;
};
export default testUtils;
//# sourceMappingURL=setup.d.ts.map