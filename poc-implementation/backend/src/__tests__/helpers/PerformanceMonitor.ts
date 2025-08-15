export class PerformanceMonitor {
  private measurements: { [key: string]: number[] } = {};

  startMeasurement(key: string): number {
    return performance.now();
  }

  endMeasurement(key: string, startTime: number): number {
    const duration = performance.now() - startTime;
    if (!this.measurements[key]) {
      this.measurements[key] = [];
    }
    this.measurements[key].push(duration);
    return duration;
  }

  getStatistics(key: string): { min: number; max: number; avg: number; p95: number } {
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

  reset(): void {
    this.measurements = {};
  }
}

