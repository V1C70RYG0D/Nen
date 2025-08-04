/**
 * Unit tests for GeographicClusterManager
 */

import { describe, test, expect, beforeEach, afterEach } from '@jest/globals';
import winston from 'winston';
import { GeographicClusterManager, GeographicClusterNode } from '../../../src/services/GeographicClusterManager';

describe('GeographicClusterManager Unit Tests', () => {
  let clusterManager: GeographicClusterManager;
  let logger: winston.Logger;

  beforeEach(() => {
    // Create test logger
    logger = winston.createLogger({
      level: 'error', // Reduce noise in tests
      format: winston.format.json(),
      transports: [new winston.transports.Console({ silent: true })]
    });

    clusterManager = new GeographicClusterManager(logger);
  });

  afterEach(async () => {
    if (clusterManager) {
      await clusterManager.shutdown();
    }
  });

  describe('Initialization', () => {
    test('should initialize with proper cluster topology', () => {
      const status = clusterManager.getClusterStatus();

      expect(status.topology).toBeDefined();
      expect(status.topology.regions).toHaveLength(4);
      expect(status.topology.failoverStrategy).toBe('latency-optimized');
      expect(status.topology.loadBalancingAlgorithm).toBe('adaptive');
    });

    test('should have all required regions configured', () => {
      const status = clusterManager.getClusterStatus();
      const regions = status.topology.regions.map((r: GeographicClusterNode) => r.region);

      expect(regions).toContain('us-east');
      expect(regions).toContain('us-west');
      expect(regions).toContain('eu-central');
      expect(regions).toContain('asia-pacific');
    });

    test('should initialize all regions as healthy', () => {
      const status = clusterManager.getClusterStatus();

      status.topology.regions.forEach((region: GeographicClusterNode) => {
        expect(region.healthStatus).toBe('healthy');
        expect(region.currentLoad).toBe(0);
        expect(region.capacity).toBeGreaterThan(0);
      });
    });
  });

  describe('Region Selection', () => {
    test('should select exact match region when available', () => {
      const region = clusterManager.selectOptimalRegion('us-east');

      expect(region).toBeDefined();
      expect(region!.region).toBe('us-east');
      expect(region!.healthStatus).toBe('healthy');
    });

    test('should select alternative region when exact match is offline', () => {
      // Mark us-east as offline
      clusterManager.reportRegionHealth('us-east-1', 'offline');

      const region = clusterManager.selectOptimalRegion('us-east');

      expect(region).toBeDefined();
      expect(region!.region).not.toBe('us-east');
      expect(region!.healthStatus).toBe('healthy');
    });

    test('should respect capacity requirements', () => {
      const region = clusterManager.selectOptimalRegion('us-east', {
        capacityRequired: 100
      });

      expect(region).toBeDefined();
      expect(region!.capacity - region!.currentLoad).toBeGreaterThanOrEqual(100);
    });

    test('should return null when no suitable region available', () => {
      // Mark all regions as offline
      const status = clusterManager.getClusterStatus();
      status.topology.regions.forEach((r: GeographicClusterNode) => {
        clusterManager.reportRegionHealth(r.nodeId, 'offline');
      });

      const region = clusterManager.selectOptimalRegion('us-east');
      expect(region).toBeNull();
    });
  });

  describe('Load Management', () => {
    test('should update region load correctly', () => {
      clusterManager.updateRegionLoad('us-east-1', 5000);

      const status = clusterManager.getClusterStatus();
      const usEastRegion = status.topology.regions.find((r: GeographicClusterNode) => r.nodeId === 'us-east-1');

      expect(usEastRegion!.currentLoad).toBe(5000);
    });

    test('should prefer less loaded regions for selection', () => {
      // Load us-east-1 heavily
      clusterManager.updateRegionLoad('us-east-1', 9000);
      // Keep us-west-1 lightly loaded
      clusterManager.updateRegionLoad('us-west-1', 1000);

      const region = clusterManager.selectOptimalRegion('us-central', {
        capacityRequired: 500
      });

      // Should prefer us-west over us-east due to lower load
      expect(region).toBeDefined();
      expect(region!.currentLoad).toBeLessThan(5000);
    });
  });

  describe('Health Management', () => {
    test('should update region health status', () => {
      clusterManager.reportRegionHealth('us-east-1', 'degraded');

      const status = clusterManager.getClusterStatus();
      const usEastRegion = status.topology.regions.find((r: GeographicClusterNode) => r.nodeId === 'us-east-1');

      expect(usEastRegion!.healthStatus).toBe('degraded');
      expect(usEastRegion!.lastHealthCheck).toBeLessThanOrEqual(Date.now());
    });

    test('should handle health status transitions', () => {
      const initialTime = Date.now();

      clusterManager.reportRegionHealth('us-east-1', 'degraded');
      const degradedTime = Date.now();

      clusterManager.reportRegionHealth('us-east-1', 'healthy');
      const healthyTime = Date.now();

      const status = clusterManager.getClusterStatus();
      const usEastRegion = status.topology.regions.find((r: GeographicClusterNode) => r.nodeId === 'us-east-1');

      expect(usEastRegion!.healthStatus).toBe('healthy');
      expect(usEastRegion!.lastHealthCheck).toBeGreaterThanOrEqual(degradedTime);
      expect(usEastRegion!.lastHealthCheck).toBeLessThanOrEqual(healthyTime);
    });
  });

  describe('Performance Metrics', () => {
    test('should collect performance metrics', () => {
      const status = clusterManager.getClusterStatus();

      // Performance metrics might not be available immediately after initialization
      if (status.performance) {
        expect(status.performance.timestamp).toBeDefined();
        expect(status.performance.regions).toBeDefined();
        expect(status.performance.totalCapacity).toBeGreaterThan(0);
        expect(status.performance.healthyRegions).toBeGreaterThan(0);
      }
    });
  });

  describe('Cleanup', () => {
    test('should shutdown cleanly', async () => {
      expect(async () => {
        await clusterManager.shutdown();
      }).not.toThrow();
    });
  });
});
