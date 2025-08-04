import React, { useEffect, useState } from 'react';
import { useWebVitals } from '../../hooks/useWebVitals';
import { getWebVitalThresholds } from '../../utils/webVitals';

/**
 * Performance dashboard for displaying Web Vitals
 */
const PerformanceDashboard: React.FC = () => {
  const { trackPageLoad, trackCustomEvent, trackUserInteraction, isTracking } = useWebVitals({
    endpoint: '/api/analytics/web-vitals',
    enableLogging: process.env.NODE_ENV === 'development',
  });

  const [metrics, setMetrics] = useState<any[]>([]);
  const thresholds = getWebVitalThresholds();

  useEffect(() => {
    trackPageLoad('PerformanceDashboard');
  }, [trackPageLoad]);

  const handleButtonClick = () => {
    trackUserInteraction('click', 'actionButton');
    trackCustomEvent('dashboard.interaction', performance.now());
  };

  const handleLoadTest = () => {
    const startTime = performance.now();
    
    // Simulate a heavy operation
    setTimeout(() => {
      const endTime = performance.now();
      const duration = endTime - startTime;
      trackCustomEvent('simulated.operation', duration);
    }, Math.random() * 1000 + 500);
  };

  return (
    <div className="p-6 bg-gray-900 text-white min-h-screen">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold mb-6">Core Web Vitals Dashboard</h1>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
          <div className="bg-gray-800 p-4 rounded-lg">
            <h3 className="text-lg font-semibold mb-2">Tracking Status</h3>
            <div className={`inline-block px-3 py-1 rounded-full text-sm ${
              isTracking ? 'bg-green-600 text-white' : 'bg-red-600 text-white'
            }`}>
              {isTracking ? '✓ Active' : '✗ Inactive'}
            </div>
          </div>
          
          <div className="bg-gray-800 p-4 rounded-lg">
            <h3 className="text-lg font-semibold mb-2">LCP Threshold</h3>
            <p className="text-sm text-gray-300">
              Good: &lt; {thresholds.LCP.good}ms<br/>
              Poor: &gt; {thresholds.LCP.poor}ms
            </p>
          </div>
          
          <div className="bg-gray-800 p-4 rounded-lg">
            <h3 className="text-lg font-semibold mb-2">FID Threshold</h3>
            <p className="text-sm text-gray-300">
              Good: &lt; {thresholds.FID.good}ms<br/>
              Poor: &gt; {thresholds.FID.poor}ms
            </p>
          </div>
        </div>
        
        <div className="bg-gray-800 p-6 rounded-lg mb-6">
          <h2 className="text-xl font-semibold mb-4">Test Performance Tracking</h2>
          <div className="space-x-4">
            <button 
              onClick={handleButtonClick}
              className="bg-blue-600 hover:bg-blue-700 px-4 py-2 rounded transition-colors"
            >
              Track Click Event
            </button>
            <button 
              onClick={handleLoadTest}
              className="bg-green-600 hover:bg-green-700 px-4 py-2 rounded transition-colors"
            >
              Simulate Load Test
            </button>
          </div>
        </div>
        
        <div className="bg-gray-800 p-6 rounded-lg">
          <h2 className="text-xl font-semibold mb-4">Core Web Vitals Info</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <h3 className="font-medium text-blue-400 mb-2">Largest Contentful Paint (LCP)</h3>
              <p className="text-sm text-gray-300">
                Measures loading performance. Good user experience is when LCP occurs within 2.5 seconds.
              </p>
            </div>
            <div>
              <h3 className="font-medium text-green-400 mb-2">First Input Delay (FID)</h3>
              <p className="text-sm text-gray-300">
                Measures interactivity. Good user experience is when FID is less than 100 milliseconds.
              </p>
            </div>
            <div>
              <h3 className="font-medium text-purple-400 mb-2">Cumulative Layout Shift (CLS)</h3>
              <p className="text-sm text-gray-300">
                Measures visual stability. Good user experience is when CLS is less than 0.1.
              </p>
            </div>
            <div>
              <h3 className="font-medium text-yellow-400 mb-2">First Contentful Paint (FCP)</h3>
              <p className="text-sm text-gray-300">
                Measures when the first text or image is painted. Good user experience is when FCP occurs within 1.8 seconds.
              </p>
            </div>
          </div>
        </div>
        
        {process.env.NODE_ENV === 'development' && (
          <div className="mt-6 bg-yellow-900 border border-yellow-600 p-4 rounded-lg">
            <h3 className="font-semibold text-yellow-200 mb-2">Development Mode</h3>
            <p className="text-sm text-yellow-100">
              Web Vitals tracking is active with detailed logging. Check the browser console for real-time metrics.
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default PerformanceDashboard;
