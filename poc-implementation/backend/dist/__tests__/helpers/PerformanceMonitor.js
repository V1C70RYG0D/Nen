"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.PerformanceMonitor = void 0;
class PerformanceMonitor {
    constructor() {
        this.measurements = {};
    }
    startMeasurement(key) {
        return performance.now();
    }
    endMeasurement(key, startTime) {
        const duration = performance.now() - startTime;
        if (!this.measurements[key]) {
            this.measurements[key] = [];
        }
        this.measurements[key].push(duration);
        return duration;
    }
    getStatistics(key) {
        const measurements = this.measurements[key] || [];
        if (measurements.length === 0) {
            return { min: 0, max: 0, avg: 0, p95: 0 };
        }
        const sorted = [...measurements].sort((a, b) => a - b);
        const p95Index = Math.floor(sorted.length * 0.95);
        return {
            min: sorted[0],
            max: sorted[sorted.length - 1],
            avg: measurements.reduce((a, b) => a + b, 0) / measurements.length,
            p95: sorted[p95Index]
        };
    }
    reset() {
        this.measurements = {};
    }
}
exports.PerformanceMonitor = PerformanceMonitor;
//# sourceMappingURL=PerformanceMonitor.js.map