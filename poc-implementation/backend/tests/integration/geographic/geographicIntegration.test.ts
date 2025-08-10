// Integration test for geographic utilities

import { addMockLatency, resetRegionLoad, mockRegionOffline } from '../../utils/geographic/geographicUtils';
import { GeographicClusterManager } from '../../../src/services/GeographicClusterManager';
import winston from 'winston';

const logger = winston.createLogger({
  level: 'info',
  format: winston.format.simple(),
  transports: [new winston.transports.Console()]
});

const clusterManager = new GeographicClusterManager(logger);
const testRegion = clusterManager.getClusterStatus().topology.regions.find(region => region.region === 'us-east');

if (testRegion) {
  describe('Geographic Utilities Integration Tests', () => {
    it('should add mock latency to region', () => {
      addMockLatency(testRegion, 100);
      expect(testRegion.latencyTargets.local).toBe(100);
      expect(testRegion.latencyTargets.regional).toBe(115);
      expect(testRegion.latencyTargets.global).toBe(130);
    });

    it('should reset region load', () => {
      testRegion.currentLoad = 500;
      resetRegionLoad(testRegion);
      expect(testRegion.currentLoad).toBe(0);
    });

    it('should mock region offline', () => {
      mockRegionOffline(testRegion);
      expect(testRegion.healthStatus).toBe('offline');
    });
  });
}
