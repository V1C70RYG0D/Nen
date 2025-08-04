import { Router, Request, Response } from 'express';
import { logger } from '../server';

const router = Router();

// Interface for Core Web Vitals metrics
interface WebVitalMetric {
  name: string;
  value: number;
  rating: 'good' | 'needs-improvement' | 'poor';
  delta: number;
  id: string;
  entries: any[];
  navigationType: string;
  userId?: string;
  sessionId?: string;
  timestamp: number | string;
  userAgent: string;
  connection?: {
    effectiveType?: string;
    downlink?: number;
    rtt?: number;
  };
  source?: string;
  environment?: string;
}

interface AnalyticsData {
  totalMatches: number;
  totalAgents: number;
  totalVolume: string;
  averageMatchDuration: number;
  popularTimeSlots: { hour: number; matches: number }[];
  topPerformers: { name: string; winRate: number; matches: number }[];
  recentActivity: { date: string; matches: number; volume: string }[];
}

// GET /api/analytics
router.get('/', async (req: Request, res: Response) => {
  try {
    const { range = '30d' } = req.query;

    logger.info(`Fetching analytics for range: ${range}`);

    // Mock data for POC - replace with actual database queries and calculations
    const analytics: AnalyticsData = {
      totalMatches: 347,
      totalAgents: 23,
      totalVolume: '1,247.8 SOL',
      averageMatchDuration: 18.5,
      popularTimeSlots: [
        { hour: 14, matches: 45 },
        { hour: 15, matches: 52 },
        { hour: 16, matches: 48 },
        { hour: 17, matches: 41 },
        { hour: 18, matches: 39 },
        { hour: 19, matches: 35 },
        { hour: 20, matches: 33 }
      ],
      topPerformers: [
        { name: 'AlphaGungi Pro', winRate: 84.7, matches: 67 },
        { name: 'Strategic Master', winRate: 77.1, matches: 54 },
        { name: 'Royal Guard Alpha', winRate: 77.2, matches: 48 }
      ],
      recentActivity: [
        { date: '2025-07-30', matches: 23, volume: '45.2 SOL' },
        { date: '2025-07-29', matches: 31, volume: '67.8 SOL' },
        { date: '2025-07-28', matches: 28, volume: '52.1 SOL' },
        { date: '2025-07-27', matches: 19, volume: '38.4 SOL' },
        { date: '2025-07-26', matches: 35, volume: '71.3 SOL' }
      ]
    };

    res.json({
      success: true,
      analytics,
      range,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    logger.error('Error fetching analytics:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch analytics',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// POST /api/analytics/web-vitals
router.post('/web-vitals', async (req: Request, res: Response) => {
  try {
    const metric: WebVitalMetric = req.body;

    // Validate required fields
    if (!metric.name || typeof metric.value !== 'number' || !metric.id) {
      return res.status(400).json({
        success: false,
        error: 'Invalid metric data. Required fields: name, value, id'
      });
    }

    // Log the web vital metric
    logger.info('Core Web Vital received:', {
      name: metric.name,
      value: metric.value,
      rating: metric.rating,
      sessionId: metric.sessionId,
      userId: metric.userId,
      timestamp: metric.timestamp,
      userAgent: metric.userAgent ? metric.userAgent.substring(0, 100) + '...' : 'Unknown',
      connection: metric.connection
    });

    // Here you would typically:
    // 1. Store the metric in your database
    // 2. Process the data for analytics dashboards
    // 3. Trigger alerts if performance thresholds are exceeded
    // 4. Aggregate data for reporting

    // Example database storage (uncomment when you have a database set up):
    /*
    await storeWebVitalMetric({
      name: metric.name,
      value: metric.value,
      rating: metric.rating,
      sessionId: metric.sessionId,
      userId: metric.userId,
      timestamp: new Date(metric.timestamp),
      userAgent: metric.userAgent,
      connection: metric.connection,
      environment: metric.environment || 'production'
    });
    */

    // Check if performance is poor and potentially trigger alerts
    if (metric.rating === 'poor') {
      logger.warn(`Poor performance detected: ${metric.name} = ${metric.value}`, {
        sessionId: metric.sessionId,
        userId: metric.userId,
        threshold: getThresholdForMetric(metric.name)
      });
    }

    // Success response
    res.status(200).json({
      success: true,
      message: 'Web vital metric processed successfully',
      metricId: metric.id,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    logger.error('Error processing web vital metric:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to process web vital metric',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Helper function to get performance thresholds
function getThresholdForMetric(metricName: string): { good: number; poor: number } | null {
  const thresholds: Record<string, { good: number; poor: number }> = {
    'LCP': { good: 2500, poor: 4000 }, // Largest Contentful Paint (ms)
    'FID': { good: 100, poor: 300 },   // First Input Delay (ms)
    'CLS': { good: 0.1, poor: 0.25 },  // Cumulative Layout Shift
    'FCP': { good: 1800, poor: 3000 }, // First Contentful Paint (ms)
    'TTFB': { good: 800, poor: 1800 }, // Time to First Byte (ms)
    'INP': { good: 200, poor: 500 },   // Interaction to Next Paint (ms)
  };

  return thresholds[metricName] || null;
}

// GET /api/analytics/web-vitals - Get aggregated web vitals data
router.get('/web-vitals', async (req: Request, res: Response) => {
  try {
    const { timeRange = '24h', metricType, userId, sessionId } = req.query;

    logger.info(`Fetching web vitals analytics`, { timeRange, metricType, userId, sessionId });

    // Mock aggregated data - replace with actual database queries
    const webVitalsData = {
      summary: {
        totalSessions: 1247,
        uniqueUsers: 892,
        averagePerformanceScore: 78.5,
        timeRange
      },
      metrics: {
        LCP: { average: 2100, p95: 3200, good: 65, needsImprovement: 25, poor: 10 },
        FID: { average: 85, p95: 180, good: 82, needsImprovement: 13, poor: 5 },
        CLS: { average: 0.08, p95: 0.18, good: 78, needsImprovement: 16, poor: 6 },
        FCP: { average: 1650, p95: 2800, good: 71, needsImprovement: 20, poor: 9 },
        TTFB: { average: 520, p95: 1200, good: 85, needsImprovement: 11, poor: 4 }
      },
      trends: [
        { date: '2025-01-01', LCP: 2050, FID: 78, CLS: 0.07 },
        { date: '2025-01-02', LCP: 2150, FID: 82, CLS: 0.09 },
        { date: '2025-01-03', LCP: 2100, FID: 85, CLS: 0.08 }
      ],
      devices: {
        mobile: { sessions: 743, averageScore: 72.1 },
        desktop: { sessions: 384, averageScore: 87.3 },
        tablet: { sessions: 120, averageScore: 79.8 }
      }
    };

    res.json({
      success: true,
      data: webVitalsData,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    logger.error('Error fetching web vitals analytics:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch web vitals analytics',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

export default router;

