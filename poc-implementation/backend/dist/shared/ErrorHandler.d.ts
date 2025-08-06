interface ErrorWithStatus extends Error {
    status?: number;
}
export declare class ErrorHandler {
    static handleError(err: ErrorWithStatus): void;
}
export default ErrorHandler;
//# sourceMappingURL=ErrorHandler.d.ts.map