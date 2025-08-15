import client from 'prom-client';
import express from 'express';
declare const register: client.Registry<"text/plain; version=0.0.4; charset=utf-8">;
declare function metricsMiddleware(req: express.Request, res: express.Response, next: express.NextFunction): void;
declare const businessMetrics: {
    recordBusinessError: (service: string, operation: string, category: string) => void;
    recordWebSocketConnection: (delta?: number) => void;
    recordWebSocketError: (errorType: string, event: string) => void;
    recordError: (service?: string) => void;
    recordRequest: (service?: string) => void;
};
declare const metricsApp: import("express-serve-static-core").Express;
export { metricsMiddleware, metricsApp, businessMetrics, register };
//# sourceMappingURL=metrics.d.ts.map