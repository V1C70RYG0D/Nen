export declare class PerformanceMonitor {
    private measurements;
    startMeasurement(key: string): number;
    endMeasurement(key: string, startTime: number): number;
    getStatistics(key: string): {
        min: number;
        max: number;
        avg: number;
        p95: number;
    };
    reset(): void;
}
//# sourceMappingURL=PerformanceMonitor.d.ts.map