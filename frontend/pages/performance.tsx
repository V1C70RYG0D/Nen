import React from 'react';
import { withWebVitalsTracking } from '../hooks/useWebVitals';
import PerformanceDashboard from '../components/Performance/PerformanceDashboard';

/**
 * Performance test page with Core Web Vitals tracking
 */
const PerformancePage: React.FC = () => {
  return (
    <div>
      <PerformanceDashboard />
    </div>
  );
};

// Export with automatic page tracking
export default withWebVitalsTracking(PerformancePage, 'performance-page', {
  enableLogging: true,
  sampleRate: 1.0, // Track 100% of sessions on this page
});
