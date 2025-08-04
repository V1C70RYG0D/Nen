/**
 * React hook for Core Web Vitals tracking
 * Provides utilities for tracking performance metrics and custom events
 */

import React, { useEffect, useCallback, useRef } from 'react';
import { initWebVitals, trackCustomMetric, WebVitalsConfig } from '../utils/webVitals';

/**
 * Hook return type
 */
interface UseWebVitalsReturn {
  trackCustomEvent: (name: string, value: number) => void;
  trackPageLoad: (pageName: string) => void;
  trackUserInteraction: (interactionType: string, element: string) => void;
  isTracking: boolean;
}

/**
 * Web Vitals React Hook
 */
export const useWebVitals = (config?: Partial<WebVitalsConfig>): UseWebVitalsReturn => {
  const initializeTimestamp = useRef<number>(Date.now());
  const isInitialized = useRef<boolean>(false);
  const pageLoadTracked = useRef<boolean>(false);

  /**
   * Initialize web vitals tracking on mount
   */
  useEffect(() => {
    if (!isInitialized.current) {
      initWebVitals({
        ...config,
        sessionId: config?.sessionId || `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      });
      isInitialized.current = true;
    }
  }, [config]);

  /**
   * Track custom events with performance timing
   */
  const trackCustomEvent = useCallback((name: string, value: number) => {
    trackCustomMetric(`custom.${name}`, value, config);
  }, [config]);

  /**
   * Track page load performance
   */
  const trackPageLoad = useCallback((pageName: string) => {
    if (pageLoadTracked.current) return;
    
    const loadTime = Date.now() - initializeTimestamp.current;
    trackCustomMetric(`page.load.${pageName}`, loadTime, config);
    pageLoadTracked.current = true;
  }, [config]);

  /**
   * Track user interactions with timing
   */
  const trackUserInteraction = useCallback((interactionType: string, element: string) => {
    const interactionTime = Date.now();
    const timeSinceLoad = interactionTime - initializeTimestamp.current;
    
    trackCustomMetric(
      `interaction.${interactionType}.${element}`,
      timeSinceLoad,
      config
    );
  }, [config]);

  /**
   * Track component mount performance
   */
  useEffect(() => {
    const mountTime = Date.now() - initializeTimestamp.current;
    trackCustomMetric('react.component.mount', mountTime, config);
  }, [config, trackCustomEvent]);

  return {
    trackCustomEvent,
    trackPageLoad,
    trackUserInteraction,
    isTracking: isInitialized.current,
  };
};

/**
 * Higher-order component for automatic page tracking
 */
export const withWebVitalsTracking = <P extends object>(
  WrappedComponent: React.ComponentType<P>,
  pageName: string,
  config?: Partial<WebVitalsConfig>
) => {
  const WithWebVitalsComponent = (props: P) => {
    const { trackPageLoad } = useWebVitals(config);

    useEffect(() => {
      trackPageLoad(pageName);
    }, [trackPageLoad]);

    return <WrappedComponent {...props} />;
  };

  WithWebVitalsComponent.displayName = `withWebVitalsTracking(${WrappedComponent.displayName || WrappedComponent.name})`;

  return WithWebVitalsComponent;
};

/**
 * Hook for tracking specific performance boundaries
 */
export const usePerformanceBoundary = (boundaryName: string, config?: Partial<WebVitalsConfig>) => {
  const startTime = useRef<number>(0);
  const { trackCustomEvent } = useWebVitals(config);

  const startMeasurement = useCallback(() => {
    startTime.current = performance.now();
  }, []);

  const endMeasurement = useCallback((eventName?: string) => {
    if (startTime.current > 0) {
      const duration = performance.now() - startTime.current;
      const finalEventName = eventName || boundaryName;
      trackCustomEvent(`boundary.${finalEventName}`, duration);
      startTime.current = 0;
    }
  }, [boundaryName, trackCustomEvent]);

  return {
    startMeasurement,
    endMeasurement,
  };
};

export default useWebVitals;
