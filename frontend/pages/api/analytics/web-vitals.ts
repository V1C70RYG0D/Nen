/**
 * API endpoint for Core Web Vitals tracking
 * Receives performance metrics from the frontend and sends them to the backend analytics service
 */

import type { NextApiRequest, NextApiResponse } from 'next';
import { EnhancedMetric } from '../../../utils/webVitals';

/**
 * Environment configuration
 */
const BACKEND_API_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:3001';
const API_KEY = process.env.ANALYTICS_API_KEY || 'dev-api-key';

/**
 * Response interface
 */
interface ApiResponse {
  success: boolean;
  message?: string;
  error?: string;
}

/**
 * Validate the incoming metric data
 */
const validateMetric = (metric: any): metric is EnhancedMetric => {
  return (
    metric &&
    typeof metric.name === 'string' &&
    typeof metric.value === 'number' &&
    typeof metric.rating === 'string' &&
    typeof metric.delta === 'number' &&
    typeof metric.id === 'string' &&
    Array.isArray(metric.entries) &&
    typeof metric.timestamp === 'number' &&
    typeof metric.userAgent === 'string'
  );
};

/**
 * Send metric to backend analytics service
 */
const sendToBackend = async (metric: EnhancedMetric): Promise<boolean> => {
  try {
    const response = await fetch(`${BACKEND_API_URL}/api/analytics/web-vitals`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${API_KEY}`,
        'X-Source': 'frontend-web-vitals',
      },
      body: JSON.stringify({
        ...metric,
        source: 'web-vitals',
        environment: process.env.NODE_ENV,
        timestamp: new Date(metric.timestamp).toISOString(),
      }),
    });

    if (!response.ok) {
      console.error(`Backend responded with status: ${response.status}`);
      return false;
    }

    return true;
  } catch (error) {
    console.error('Error sending metric to backend:', error);
    return false;
  }
};

/**
 * Log metric for development debugging
 */
const logMetricForDevelopment = (metric: EnhancedMetric): void => {
  if (process.env.NODE_ENV === 'development') {
    console.log('🎯 Web Vital received:', {
      name: metric.name,
      value: metric.value,
      rating: metric.rating,
      delta: metric.delta,
      timestamp: new Date(metric.timestamp).toISOString(),
      userAgent: metric.userAgent.substring(0, 50) + '...',
      sessionId: metric.sessionId,
      userId: metric.userId,
    });
  }
};

/**
 * Main API handler
 */
export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<ApiResponse>
) {
  // Only allow POST requests
  if (req.method !== 'POST') {
    return res.status(405).json({
      success: false,
      error: 'Method not allowed. Only POST requests are accepted.',
    });
  }

  try {
    const metric = req.body;

    // Validate the incoming metric data
    if (!validateMetric(metric)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid metric data structure',
      });
    }

    // Log for development
    logMetricForDevelopment(metric);

    // Attempt to send to backend
    const backendSuccess = await sendToBackend(metric);

    if (!backendSuccess) {
      // Even if backend fails, we don't want to fail the client request
      // This ensures web vitals tracking doesn't affect user experience
      console.warn('Failed to send metric to backend, but continuing...');
    }

    // Always return success to avoid impacting client performance
    return res.status(200).json({
      success: true,
      message: 'Web vital metric processed successfully',
    });

  } catch (error) {
    console.error('Error processing web vital metric:', error);

    // Return success even on error to avoid impacting client performance
    return res.status(200).json({
      success: true,
      message: 'Metric processing completed with warnings',
    });
  }
}

/**
 * Runtime configuration for API route
 */
export const config = {
  api: {
    bodyParser: {
      sizeLimit: '1mb',
    },
  },
};
