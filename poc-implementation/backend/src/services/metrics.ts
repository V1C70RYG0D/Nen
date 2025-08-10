import client, { Counter, Histogram, Gauge } from 'prom-client';
import express from 'express';
import { errorMetrics } from '../utils/logger';

// Initialize registry and default metrics
const register = new client.Registry();
client.collectDefaultMetrics({ register });

// Register error metrics from logger
register.registerMetric(errorMetrics.totalErrors);
register.registerMetric(errorMetrics.errorRate);
register.registerMetric(errorMetrics.logVolume);

// Define HTTP request metrics
const httpRequestDuration = new Histogram({
  name: 'http_request_duration_seconds',
  help: 'Duration of HTTP requests in seconds',
  labelNames: ['method', 'route', 'code'],
  registers: [register]
});

const httpRequestCount = new Counter({
  name: 'http_requests_total',
  help: 'Total number of HTTP requests',
  labelNames: ['method', 'route', 'code'],
  registers: [register]
});

// Error rate specific metrics
const httpErrorCount = new Counter({
  name: 'http_errors_total',
  help: 'Total number of HTTP errors (4xx and 5xx)',
  labelNames: ['method', 'route', 'code', 'error_type'],
  registers: [register]
});

const errorRateGauge = new Gauge({
  name: 'current_error_rate',
  help: 'Current error rate percentage over time windows',
  labelNames: ['service', 'time_window'],
  registers: [register]
});

// Business logic errors
const businessErrors = new Counter({
  name: 'business_logic_errors_total',
  help: 'Total number of business logic errors',
  labelNames: ['service', 'operation', 'error_category'],
  registers: [register]
});

// Custom business metrics
const customMetric = new Counter({
  name: 'custom_business_metric',
  help: 'Custom business metric specific to Nen',
  registers: [register]
});

// WebSocket connection metrics
const websocketConnections = new Gauge({
  name: 'websocket_connections_active',
  help: 'Number of active WebSocket connections',
  registers: [register]
});

const websocketErrors = new Counter({
  name: 'websocket_errors_total',
  help: 'Total number of WebSocket errors',
  labelNames: ['error_type', 'event'],
  registers: [register]
});

// Express middleware to measure request durations and count
function metricsMiddleware(req: express.Request, res: express.Response, next: express.NextFunction): void {
  const end = httpRequestDuration.startTimer();

  res.on('finish', () => {
    const labels = { method: req.method, route: req.route?.path || req.path, code: res.statusCode };

    // Track all requests
    httpRequestCount.inc(labels);
    end(labels);

    // Track HTTP errors (4xx and 5xx)
    if (res.statusCode >= 400) {
      const errorType = res.statusCode >= 500 ? 'server_error' : 'client_error';
      httpErrorCount.inc({ ...labels, error_type: errorType });
    }
  });

  next();
}

// Calculate and update error rates periodically
class ErrorRateCalculator {
  private errorCounts: Map<string, number> = new Map();
  private totalCounts: Map<string, number> = new Map();

  constructor() {
    // Update error rates every 30 seconds
    setInterval(() => this.calculateRates(), 30000);
  }

  private calculateRates(): void {
    const services = ['nen-backend']; // Add more services as needed
    const timeWindows = ['1m', '5m', '15m'];

    for (const service of services) {
      for (const window of timeWindows) {
        const errorCount = this.errorCounts.get(`${service}_${window}`) || 0;
        const totalCount = this.totalCounts.get(`${service}_${window}`) || 0;

        const rate = totalCount > 0 ? (errorCount / totalCount) * 100 : 0;
        errorRateGauge.set({ service, time_window: window }, rate);

        // Reset counters for next calculation
        this.errorCounts.set(`${service}_${window}`, 0);
        this.totalCounts.set(`${service}_${window}`, 0);
      }
    }
  }

  recordError(service: string = 'nen-backend'): void {
    const timeWindows = ['1m', '5m', '15m'];
    for (const window of timeWindows) {
      const key = `${service}_${window}`;
      this.errorCounts.set(key, (this.errorCounts.get(key) || 0) + 1);
    }
  }

  recordRequest(service: string = 'nen-backend'): void {
    const timeWindows = ['1m', '5m', '15m'];
    for (const window of timeWindows) {
      const key = `${service}_${window}`;
      this.totalCounts.set(key, (this.totalCounts.get(key) || 0) + 1);
    }
  }
}

const errorRateCalculator = new ErrorRateCalculator();

// Enhanced metrics for business logic
const businessMetrics = {
  recordBusinessError: (service: string, operation: string, category: string) => {
    businessErrors.inc({ service, operation, error_category: category });
  },

  recordWebSocketConnection: (delta: number = 1) => {
    websocketConnections.inc(delta);
  },

  recordWebSocketError: (errorType: string, event: string) => {
    websocketErrors.inc({ error_type: errorType, event });
  },

  recordError: (service?: string) => {
    errorRateCalculator.recordError(service);
  },

  recordRequest: (service?: string) => {
    errorRateCalculator.recordRequest(service);
  }
};

// Health check endpoint
const healthCheck = {
  healthy: new Gauge({
    name: 'app_health_status',
    help: 'Application health status (1 = healthy, 0 = unhealthy)',
    registers: [register]
  })
};

// Set initial health status
healthCheck.healthy.set(1);

// Expose metrics endpoint
const metricsApp = express();

metricsApp.get('/metrics', async (req, res) => {
  res.set('Content-Type', register.contentType);
  res.end(await register.metrics());
});

metricsApp.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    version: process.env.npm_package_version || '1.0.0'
  });
});

export { metricsMiddleware, metricsApp, businessMetrics, register };
