/**
 * Real Performance Profiler Implementation


 *
 * This is a production-ready performance profiler that measures
 * operation durations and provides analytics
 */

export interface PerformanceMetrics {
    operation: string;
    averageTime: number;
    minTime: number;
    maxTime: number;
    totalCalls: number;
    lastMeasured: Date;
}

export class PerformanceProfiler {
    private measurements: Map<string, number[]> = new Map();
    private activeMeasurements: Map<string, number> = new Map();
    private enabled: boolean;

    constructor(enabled: boolean = true) {
        this.enabled = enabled;
    }

    /**
     * Start measuring an operation
     * @param operation - Name of the operation to measure
     * @returns Function to call when operation completes
     */
    startMeasurement(operation: string): () => void {
        if (!this.enabled) {
            return () => {}; // No-op if disabled
        }

        const measurementId = `${operation}_${Date.now()}_${Math.random()}`;
        const start = performance.now();
        this.activeMeasurements.set(measurementId, start);

        return () => {
            const startTime = this.activeMeasurements.get(measurementId);
            if (startTime !== undefined) {
                const duration = performance.now() - startTime;
                this.recordMeasurement(operation, duration);
                this.activeMeasurements.delete(measurementId);
            }
        };
    }

    /**
     * Record a measurement manually
     * @param operation - Name of the operation
     * @param duration - Duration in milliseconds
     */
    recordMeasurement(operation: string, duration: number): void {
        if (!this.enabled) return;

        if (!this.measurements.has(operation)) {
            this.measurements.set(operation, []);
        }
        this.measurements.get(operation)!.push(duration);
    }

    /**
     * Get average time for an operation
     * @param operation - Name of the operation
     * @returns Average time in milliseconds
     */
    getAverageTime(operation: string): number {
        const times = this.measurements.get(operation) || [];
        return times.length > 0 ? times.reduce((a, b) => a + b, 0) / times.length : 0;
    }

    /**
     * Get comprehensive metrics for an operation
     * @param operation - Name of the operation
     * @returns Performance metrics object
     */
    getMetrics(operation: string): PerformanceMetrics | null {
        const times = this.measurements.get(operation);
        if (!times || times.length === 0) {
            return null;
        }

        return {
            operation,
            averageTime: this.getAverageTime(operation),
            minTime: Math.min(...times),
            maxTime: Math.max(...times),
            totalCalls: times.length,
            lastMeasured: new Date()
        };
    }

    /**
     * Get all recorded metrics
     * @returns Array of all performance metrics
     */
    getAllMetrics(): PerformanceMetrics[] {
        const allMetrics: PerformanceMetrics[] = [];
        for (const operation of this.measurements.keys()) {
            const metrics = this.getMetrics(operation);
            if (metrics) {
                allMetrics.push(metrics);
            }
        }
        return allMetrics;
    }

    /**
     * Clear all measurements
     */
    reset(): void {
        this.measurements.clear();
        this.activeMeasurements.clear();
    }

    /**
     * Enable or disable profiling
     * @param enabled - Whether to enable profiling
     */
    setEnabled(enabled: boolean): void {
        this.enabled = enabled;
        if (!enabled) {
            this.activeMeasurements.clear();
        }
    }

    /**
     * Check if profiling is enabled
     * @returns Whether profiling is enabled
     */
    isEnabled(): boolean {
        return this.enabled;
    }

    /**
     * Export metrics to JSON format
     * @returns JSON string of all metrics
     */
    exportMetrics(): string {
        return JSON.stringify(this.getAllMetrics(), null, 2);
    }

    /**
     * Import metrics from JSON format
     * @param jsonData - JSON string containing metrics data
     */
    importMetrics(jsonData: string): void {
        try {
            const metrics: PerformanceMetrics[] = JSON.parse(jsonData);
            this.reset();

            for (const metric of metrics) {
                // Reconstruct measurements array with average time
                const measurements = new Array(metric.totalCalls).fill(metric.averageTime);
                this.measurements.set(metric.operation, measurements);
            }
        } catch (error) {
            throw new Error(`Failed to import metrics: ${(error as Error).message}`);
        }
    }
}

// Global instance for convenience
export const globalProfiler = new PerformanceProfiler(
    process.env.NODE_ENV !== 'production'
);

// Decorator for automatic method profiling
export function profile(operation?: string) {
    return function (target: any, propertyName: string, descriptor: PropertyDescriptor) {
        const method = descriptor.value;
        const operationName = operation || `${target.constructor.name}.${propertyName}`;

        descriptor.value = async function (...args: any[]) {
            const endMeasurement = globalProfiler.startMeasurement(operationName);
            try {
                const result = await method.apply(this, args);
                endMeasurement();
                return result;
            } catch (error) {
                endMeasurement();
                throw error;
            }
        };

        return descriptor;
    };
}
