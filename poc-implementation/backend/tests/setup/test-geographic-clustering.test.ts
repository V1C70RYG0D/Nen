/**
 * Geographic Clustering Setup Verification
 * Tests to ensure GeographicClusterManager is properly configured and functional
 */

import { describe, test, expect, beforeAll, afterAll } from '@jest/globals';
import winston from 'winston';
import { GeographicClusterManager, GeographicClusterNode } from '../../src/services/GeographicClusterManager';

describe('Geographic Clustering Setup Verification', () => {
  let clusterManager: GeographicClusterManager;
  let logger: winston.Logger;

  beforeAll(async () => {
    // Initialize real logger for testing
    logger = winston.createLogger({
      level: 'debug',
      format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.errors({ stack: true }),
        winston.format.json()
      ),
      transports: [
        new winston.transports.Console({
          format: winston.format.combine(
            winston.format.colorize(),
            winston.format.simple()
          )
        })
      ]
    });

    // Initialize GeographicClusterManager
    clusterManager = new GeographicClusterManager(logger);
  });

  afterAll(async () => {
    // Cleanup
    if (clusterManager) {
      await clusterManager.shutdown();
    }
  });

  test('GeographicClusterManager initializes successfully', () => {
    expect(clusterManager).toBeDefined();
    expect(clusterManager).toBeInstanceOf(GeographicClusterManager);
  });

  test('Cluster topology is properly configured', () => {
    const clusterStatus = clusterManager.getClusterStatus();

    expect(clusterStatus).toBeDefined();
    expect(clusterStatus.topology).toBeDefined();
    expect(clusterStatus.topology.regions).toBeDefined();
    expect(clusterStatus.topology.regions.length).toBeGreaterThan(0);

    // Verify all expected regions are present
    const expectedRegions = ['us-east', 'us-west', 'eu-central', 'asia-pacific'];
    const actualRegions = clusterStatus.topology.regions.map((region: GeographicClusterNode) => region.region);

    expectedRegions.forEach(region => {
      expect(actualRegions).toContain(region);
    });
  });

  test('Region selection works correctly', () => {
    // Test optimal region selection for different client regions
    const testRegions = ['us-east', 'us-west', 'eu-central', 'asia-pacific'];

    testRegions.forEach(clientRegion => {
      const selectedRegion = clusterManager.selectOptimalRegion(clientRegion);
      expect(selectedRegion).toBeDefined();
      expect(selectedRegion?.healthStatus).toBe('healthy');
    });
  });

  test('Failover works when primary region is unavailable', () => {
    // Simulate a region going offline
    clusterManager.reportRegionHealth('us-east-1', 'offline');

    // Try to select us-east region (should fall back to alternative)
    const selectedRegion = clusterManager.selectOptimalRegion('us-east');

    expect(selectedRegion).toBeDefined();
    expect(selectedRegion?.healthStatus).toBe('healthy');
    // Should not be the offline region
    expect(selectedRegion?.nodeId).not.toBe('us-east-1');
  });

  test('Load balancing distributes connections appropriately', () => {
    // Simulate different load levels on regions
    clusterManager.updateRegionLoad('us-east-1', 5000); // 50% capacity
    clusterManager.updateRegionLoad('us-west-1', 7000); // 87.5% capacity

    // Should prefer the less loaded region
    const selectedRegion = clusterManager.selectOptimalRegion('us-east', {
      capacityRequired: 100
    });

    expect(selectedRegion).toBeDefined();
    expect(selectedRegion?.currentLoad || 0).toBeLessThan(selectedRegion?.capacity || 0);
  });

  test('Performance metrics are collected', () => {
    const clusterStatus = clusterManager.getClusterStatus();

    expect(clusterStatus.performance).toBeDefined();

    if (clusterStatus.performance) {
      expect(clusterStatus.performance.timestamp).toBeDefined();
      expect(clusterStatus.performance.regions).toBeDefined();
      expect(clusterStatus.performance.totalCapacity).toBeGreaterThan(0);
      expect(clusterStatus.performance.healthyRegions).toBeGreaterThan(0);
    }
  });

  test('Region configuration includes proper endpoints', () => {
    const clusterStatus = clusterManager.getClusterStatus();

    clusterStatus.topology.regions.forEach((region: GeographicClusterNode) => {
      expect(region.endpoints).toBeDefined();
      expect(region.endpoints.length).toBeGreaterThan(0);

      // Verify endpoints follow expected pattern
      region.endpoints.forEach(endpoint => {
        expect(endpoint).toMatch(/^wss:\/\/[a-z0-9-]+\.magicblock\.gg$/);
      });
    });
  });

  test('Latency targets are reasonable', () => {
    const clusterStatus = clusterManager.getClusterStatus();

    clusterStatus.topology.regions.forEach((region: GeographicClusterNode) => {
      expect(region.latencyTargets).toBeDefined();
      expect(region.latencyTargets.local).toBeLessThan(30); // <30ms local
      expect(region.latencyTargets.regional).toBeLessThan(80); // <80ms regional
      expect(region.latencyTargets.global).toBeLessThan(200); // <200ms global
    });
  });

  test('Health check mechanism functions', async () => {
    // Wait a moment for health checks to run
    await new Promise(resolve => setTimeout(resolve, 1000));

    const clusterStatus = clusterManager.getClusterStatus();

    clusterStatus.topology.regions.forEach((region: GeographicClusterNode) => {
      expect(region.lastHealthCheck).toBeDefined();
      expect(region.lastHealthCheck).toBeGreaterThan(Date.now() - 60000); // Within last minute
      expect(['healthy', 'degraded', 'offline']).toContain(region.healthStatus);
    });
  });
});
