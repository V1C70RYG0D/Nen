import winston from 'winston';

export interface GeographicClusterNode {
  nodeId: string;
  region: 'us-east' | 'us-west' | 'eu-central' | 'asia-pacific';
  endpoints: string[];
  capacity: number;
  currentLoad: number;
  latencyTargets: {
    local: number; // <20ms for same region
    regional: number; // <50ms for adjacent regions
    global: number; // <100ms for distant regions
  };
  healthStatus: 'healthy' | 'degraded' | 'offline';
  lastHealthCheck: number;
}

export interface ClusterTopology {
  regions: GeographicClusterNode[];
  routingTable: Map<string, string[]>; // region -> preferred routes
  failoverStrategy: 'nearest' | 'capacity-based' | 'latency-optimized';
  loadBalancingAlgorithm: 'round-robin' | 'weighted' | 'adaptive';
}

export class GeographicClusterManager {
  private logger: winston.Logger;
  private clusterTopology: ClusterTopology;
  private healthCheckInterval: NodeJS.Timeout | null = null;
  private performanceMonitoringInterval: NodeJS.Timeout | null = null;
  private routingCache: Map<string, string> = new Map();
  private performanceMetrics: Map<number, any> = new Map();

  constructor(logger: winston.Logger) {
    this.logger = logger;
    this.clusterTopology = this.initializeClusterTopology();
    this.startHealthChecking();
    this.startPerformanceMonitoring();
  }

  private initializeClusterTopology(): ClusterTopology {
    const regions: GeographicClusterNode[] = [
      {
        nodeId: 'us-east-1',
        region: 'us-east',
        endpoints: [
          'wss://us-east-1a.magicblock.gg',
          'wss://us-east-1b.magicblock.gg',
          'wss://us-east-1c.magicblock.gg'
        ],
        capacity: 10000,
        currentLoad: 0,
        latencyTargets: {
          local: 15,
          regional: 45,
          global: 85
        },
        healthStatus: 'healthy',
        lastHealthCheck: Date.now()
      },
      {
        nodeId: 'us-west-1',
        region: 'us-west',
        endpoints: [
          'wss://us-west-1a.magicblock.gg',
          'wss://us-west-1b.magicblock.gg',
          'wss://us-west-1c.magicblock.gg'
        ],
        capacity: 8000,
        currentLoad: 0,
        latencyTargets: {
          local: 18,
          regional: 50,
          global: 90
        },
        healthStatus: 'healthy',
        lastHealthCheck: Date.now()
      },
      {
        nodeId: 'eu-central-1',
        region: 'eu-central',
        endpoints: [
          'wss://eu-central-1a.magicblock.gg',
          'wss://eu-central-1b.magicblock.gg',
          'wss://eu-central-1c.magicblock.gg'
        ],
        capacity: 12000,
        currentLoad: 0,
        latencyTargets: {
          local: 20,
          regional: 60,
          global: 120
        },
        healthStatus: 'healthy',
        lastHealthCheck: Date.now()
      },
      {
        nodeId: 'asia-pacific-1',
        region: 'asia-pacific',
        endpoints: [
          'wss://ap-southeast-1a.magicblock.gg',
          'wss://ap-southeast-1b.magicblock.gg',
          'wss://ap-northeast-1a.magicblock.gg'
        ],
        capacity: 6000,
        currentLoad: 0,
        latencyTargets: {
          local: 25,
          regional: 70,
          global: 150
        },
        healthStatus: 'healthy',
        lastHealthCheck: Date.now()
      }
    ];

    const routingTable = new Map([
      ['us-east', ['us-west', 'eu-central', 'asia-pacific']],
      ['us-west', ['us-east', 'asia-pacific', 'eu-central']],
      ['eu-central', ['us-east', 'us-west', 'asia-pacific']],
      ['asia-pacific', ['us-west', 'us-east', 'eu-central']]
    ]);

    return {
      regions,
      routingTable,
      failoverStrategy: 'latency-optimized',
      loadBalancingAlgorithm: 'adaptive'
    };
  }

  public selectOptimalRegion(
    clientRegion: string,
    sessionRequirements?: {
      latencyThreshold?: number;
      capacityRequired?: number;
      preferredRegions?: string[];
    }
  ): GeographicClusterNode | null {
    const requirements = {
      latencyThreshold: 50,
      capacityRequired: 1,
      ...sessionRequirements
    };

    // First try exact region match
    const exactMatch = this.clusterTopology.regions.find(
      region => region.region === clientRegion &&
      region.healthStatus === 'healthy' &&
      (region.capacity - region.currentLoad) >= requirements.capacityRequired
    );

    if (exactMatch) {
      this.logger.debug('Selected exact region match', {
        clientRegion,
        selectedRegion: exactMatch.region,
        nodeId: exactMatch.nodeId
      });
      return exactMatch;
    }

    // Find best alternative based on strategy
    const alternatives = this.findAlternativeRegions(clientRegion, requirements);

    if (alternatives.length === 0) {
      this.logger.warn('No suitable regions found', { clientRegion, requirements });
      return null;
    }

    const selected = alternatives[0];
    this.logger.info('Selected alternative region', {
      clientRegion,
      selectedRegion: selected.region,
      nodeId: selected.nodeId,
      expectedLatency: this.calculateExpectedLatency(clientRegion, selected.region)
    });

    return selected;
  }

  private findAlternativeRegions(
    clientRegion: string,
    requirements: any
  ): GeographicClusterNode[] {
    const preferredRoutes = this.clusterTopology.routingTable.get(clientRegion) || [];

    const alternatives = this.clusterTopology.regions
      .filter(region =>
        region.healthStatus === 'healthy' &&
        (region.capacity - region.currentLoad) >= requirements.capacityRequired &&
        region.region !== clientRegion
      )
      .map(region => ({
        region,
        priority: this.calculateRegionPriority(clientRegion, region, preferredRoutes),
        expectedLatency: this.calculateExpectedLatency(clientRegion, region.region)
      }))
      .filter(alt => alt.expectedLatency <= requirements.latencyThreshold)
      .sort((a, b) => {
        // Sort by priority first, then by latency
        if (a.priority !== b.priority) return b.priority - a.priority;
        return a.expectedLatency - b.expectedLatency;
      });

    return alternatives.map(alt => alt.region);
  }

  private calculateRegionPriority(
    clientRegion: string,
    targetRegion: GeographicClusterNode,
    preferredRoutes: string[]
  ): number {
    let priority = 0;

    // Base priority on preferred routing
    const routeIndex = preferredRoutes.indexOf(targetRegion.region);
    if (routeIndex !== -1) {
      priority += (preferredRoutes.length - routeIndex) * 10;
    }

    // Capacity bonus
    const capacityRatio = (targetRegion.capacity - targetRegion.currentLoad) / targetRegion.capacity;
    priority += capacityRatio * 20;

    // Health bonus
    if (targetRegion.healthStatus === 'healthy') priority += 15;

    return priority;
  }

  private calculateExpectedLatency(fromRegion: string, toRegion: string): number {
    // Simplified latency calculation based on geographic distance
    const latencyMatrix: { [key: string]: { [key: string]: number } } = {
      'us-east': {
        'us-west': 70,
        'eu-central': 90,
        'asia-pacific': 180
      },
      'us-west': {
        'us-east': 70,
        'eu-central': 140,
        'asia-pacific': 120
      },
      'eu-central': {
        'us-east': 90,
        'us-west': 140,
        'asia-pacific': 200
      },
      'asia-pacific': {
        'us-east': 180,
        'us-west': 120,
        'eu-central': 200
      }
    };

    return latencyMatrix[fromRegion]?.[toRegion] || 250;
  }

  public updateRegionLoad(nodeId: string, currentLoad: number): void {
    const region = this.clusterTopology.regions.find(r => r.nodeId === nodeId);
    if (region) {
      region.currentLoad = currentLoad;
      this.logger.debug('Updated region load', {
        nodeId,
        currentLoad,
        capacity: region.capacity,
        utilization: (currentLoad / region.capacity * 100).toFixed(2) + '%'
      });
    }
  }

  public reportRegionHealth(nodeId: string, healthStatus: 'healthy' | 'degraded' | 'offline'): void {
    const region = this.clusterTopology.regions.find(r => r.nodeId === nodeId);
    if (region) {
      const previousStatus = region.healthStatus;
      region.healthStatus = healthStatus;
      region.lastHealthCheck = Date.now();

      if (previousStatus !== healthStatus) {
        this.logger.warn('Region health status changed', {
          nodeId,
          previousStatus,
          newStatus: healthStatus,
          region: region.region
        });

        // Clear routing cache when health changes
        this.routingCache.clear();
      }
    }
  }

  private startHealthChecking(): void {
    this.healthCheckInterval = setInterval(async () => {
      await this.performHealthChecks();
    }, 30000); // Check every 30 seconds
  }

  private async performHealthChecks(): Promise<void> {
    const healthPromises = this.clusterTopology.regions.map(async (region) => {
      try {
        // Simulate health check (in production, ping actual endpoints)
        const healthCheckResult = await this.pingRegionEndpoints(region.endpoints);

        this.reportRegionHealth(
          region.nodeId,
          healthCheckResult.allHealthy ? 'healthy' :
          healthCheckResult.anyHealthy ? 'degraded' : 'offline'
        );

        return {
          nodeId: region.nodeId,
          region: region.region,
          status: region.healthStatus,
          responseTime: healthCheckResult.avgResponseTime
        };

      } catch (error) {
        this.reportRegionHealth(region.nodeId, 'offline');
        this.logger.error('Health check failed', {
          nodeId: region.nodeId,
          error: error instanceof Error ? error.message : String(error)
        });
        return null;
      }
    });

    const results = await Promise.all(healthPromises);
    const healthyRegions = results.filter(r => r?.status === 'healthy').length;

    this.logger.info('Health check completed', {
      totalRegions: this.clusterTopology.regions.length,
      healthyRegions,
      degradedRegions: results.filter(r => r?.status === 'degraded').length,
      offlineRegions: results.filter(r => r?.status === 'offline').length
    });
  }

  private async pingRegionEndpoints(endpoints: string[]): Promise<{
    allHealthy: boolean;
    anyHealthy: boolean;
    avgResponseTime: number;
  }> {
    // Simplified endpoint health check
    const pingPromises = endpoints.map(async (endpoint) => {
      const start = Date.now();
      try {
        // In production, make actual WebSocket connection test
        await new Promise(resolve => setTimeout(resolve, Math.random() * 50));
        return {
          endpoint,
          healthy: Math.random() > 0.05, // 95% success rate simulation
          responseTime: Date.now() - start
        };
      } catch {
        return {
          endpoint,
          healthy: false,
          responseTime: Date.now() - start
        };
      }
    });

    const results = await Promise.all(pingPromises);
    const healthyCount = results.filter(r => r.healthy).length;
    const avgResponseTime = results.reduce((sum, r) => sum + r.responseTime, 0) / results.length;

    return {
      allHealthy: healthyCount === endpoints.length,
      anyHealthy: healthyCount > 0,
      avgResponseTime
    };
  }

  private startPerformanceMonitoring(): void {
    this.performanceMonitoringInterval = setInterval(() => {
      this.collectPerformanceMetrics();
    }, 60000); // Collect metrics every minute
  }

  private collectPerformanceMetrics(): void {
    const metrics = {
      timestamp: Date.now(),
      regions: this.clusterTopology.regions.map(region => ({
        nodeId: region.nodeId,
        region: region.region,
        utilization: region.currentLoad / region.capacity,
        healthStatus: region.healthStatus,
        lastHealthCheck: region.lastHealthCheck
      })),
      totalCapacity: this.clusterTopology.regions.reduce((sum, r) => sum + r.capacity, 0),
      totalLoad: this.clusterTopology.regions.reduce((sum, r) => sum + r.currentLoad, 0),
      healthyRegions: this.clusterTopology.regions.filter(r => r.healthStatus === 'healthy').length
    };

    this.performanceMetrics.set(Date.now(), metrics);

    // Keep only last 24 hours of metrics
    const cutoff = Date.now() - (24 * 60 * 60 * 1000);
    for (const [timestamp] of this.performanceMetrics) {
      if (timestamp < cutoff) {
        this.performanceMetrics.delete(timestamp);
      }
    }

    this.logger.debug('Performance metrics collected', {
      totalUtilization: (metrics.totalLoad / metrics.totalCapacity * 100).toFixed(2) + '%',
      healthyRegions: metrics.healthyRegions,
      totalRegions: this.clusterTopology.regions.length
    });
  }

  public getClusterStatus() {
    return {
      topology: this.clusterTopology,
      performance: Array.from(this.performanceMetrics.values()).slice(-1)[0],
      routing: Object.fromEntries(this.routingCache)
    };
  }

  public async shutdown(): Promise<void> {
    this.logger.info('Shutting down geographic cluster manager');

    if (this.healthCheckInterval) {
      clearInterval(this.healthCheckInterval);
      this.healthCheckInterval = null;
    }

    if (this.performanceMonitoringInterval) {
      clearInterval(this.performanceMonitoringInterval);
      this.performanceMonitoringInterval = null;
    }

    this.routingCache.clear();
    this.performanceMetrics.clear();
  }
}
