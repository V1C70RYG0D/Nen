import express from 'express';
export declare class ExpressOptimizationService {
    private requestPool;
    private precomputedResponses;
    constructor();
    private preComputeCommonResponses;
    applyFinalOptimizations(app: express.Application): void;
    getOptimizationStats(): {
        precomputedResponses: number;
        requestPoolSize: number;
    };
}
//# sourceMappingURL=ExpressOptimizationService.d.ts.map