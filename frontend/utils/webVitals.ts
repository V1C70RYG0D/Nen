/**
 * Core Web Vitals tracking utility
 * Tracks performance metrics and sends them to the backend for analytics
 */

import { Metric } from 'web-vitals';

/**
 * Network Information API type definition
 */
interface NetworkInformation {
  effectiveType?: '2g' | '3g' | '4g' | 'slow-2g';
  downlink?: number;
  rtt?: number;
  saveData?: boolean;
}

/**
 * Enhanced metric interface with additional context
 */
interface EnhancedMetric extends Metric {
  userId?: string;
  sessionId?: string;
  timestamp: number;
  userAgent: string;
  connection?: NetworkInformation;
}

/**
 * Configuration for web vitals tracking
 */
interface WebVitalsConfig {
  endpoint: string;
  enableLogging: boolean;
  sessionId?: string;
  userId?: string;
  sampleRate: number;
}

/**
 * Default configuration
 */
const defaultConfig: WebVitalsConfig = {
  endpoint: '/api/analytics/web-vitals',
  enableLogging: process.env.NODE_ENV === 'development',
  sampleRate: 1.0, // Track 100% of sessions by default
};

/**
 * Generate a unique session ID
 */
const generateSessionId = (): string => {
  return `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
};

/**
 * Get network information if available
 */
const getNetworkInfo = (): NetworkInformation | undefined => {
  if (typeof navigator !== 'undefined' && 'connection' in navigator) {
    return (navigator as any).connection;
  }
  return undefined;
};

/**
 * Check if we should track this session based on sample rate
 */
const shouldTrack = (sampleRate: number): boolean => {
  return Math.random() < sampleRate;
};

/**
 * Send metric data to analytics endpoint
 */
const sendToAnalytics = async (metric: EnhancedMetric, config: WebVitalsConfig): Promise<void> => {
  try {
    const response = await fetch(config.endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(metric),
      keepalive: true,
    });

    if (!response.ok) {
      console.warn(`Failed to send web vital metric: ${response.statusText}`);
    }

    if (config.enableLogging) {
      console.log('📊 Web Vital tracked:', {
        name: metric.name,
        value: metric.value,
        rating: metric.rating,
        delta: metric.delta,
      });
    }
  } catch (error) {
    if (config.enableLogging) {
      console.error('Error sending web vital metric:', error);
    }
  }
};

/**
 * Create enhanced metric with additional context
 */
const createEnhancedMetric = (
  metric: Metric,
  config: WebVitalsConfig
): EnhancedMetric => {
  return {
    ...metric,
    userId: config.userId,
    sessionId: config.sessionId || generateSessionId(),
    timestamp: Date.now(),
    userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : '',
    connection: getNetworkInfo(),
  };
};

/**
 * Initialize web vitals tracking
 */
export const initWebVitals = (customConfig?: Partial<WebVitalsConfig>) => {
  const config = { ...defaultConfig, ...customConfig };

  // Only track if sampling allows it
  if (!shouldTrack(config.sampleRate)) {
    return;
  }

  // Only run in browser environment
  if (typeof window === 'undefined') {
    return;
  }

  // Dynamically import web-vitals to avoid SSR issues
  import('web-vitals').then(({ onCLS, onFCP, onLCP, onTTFB, onINP }) => {
    const handleMetric = (metric: Metric) => {
      const enhancedMetric = createEnhancedMetric(metric, config);
      sendToAnalytics(enhancedMetric, config);
    };

    // Track all Core Web Vitals
    onCLS(handleMetric);
    onFCP(handleMetric);
    onLCP(handleMetric);
    onTTFB(handleMetric);

    // Track Interaction to Next Paint (INP) - newer metric replacing FID
    if (onINP) {
      onINP(handleMetric);
    }
  }).catch((error) => {
    if (config.enableLogging) {
      console.error('Failed to load web-vitals library:', error);
    }
  });
};

/**
 * Custom hook for tracking specific user interactions
 */
export const trackCustomMetric = (
  name: string,
  value: number,
  customConfig?: Partial<WebVitalsConfig>
) => {
  const config = { ...defaultConfig, ...customConfig };

  const customMetric: EnhancedMetric = {
    name: name as any,
    value,
    rating: value < 100 ? 'good' : value < 300 ? 'needs-improvement' : 'poor',
    delta: value,
    id: `custom_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    entries: [],
    navigationType: 'navigate',
    userId: config.userId,
    sessionId: config.sessionId || generateSessionId(),
    timestamp: Date.now(),
    userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : '',
    connection: getNetworkInfo(),
  };

  sendToAnalytics(customMetric, config);
};

/**
 * Get thresholds for Core Web Vitals
 */
export const getWebVitalThresholds = () => {
  return {
    LCP: { good: 2500, poor: 4000 }, // Largest Contentful Paint (ms)
    FID: { good: 100, poor: 300 },   // First Input Delay (ms)
    CLS: { good: 0.1, poor: 0.25 },  // Cumulative Layout Shift
    FCP: { good: 1800, poor: 3000 }, // First Contentful Paint (ms)
    TTFB: { good: 800, poor: 1800 }, // Time to First Byte (ms)
    INP: { good: 200, poor: 500 },   // Interaction to Next Paint (ms)
  };
};

/**
 * Next.js compatible report handler
 */
export const reportWebVitals = (metric: Metric) => {
  const config = defaultConfig;
  const enhancedMetric = createEnhancedMetric(metric, config);
  sendToAnalytics(enhancedMetric, config);
};

export type { WebVitalsConfig, EnhancedMetric };
