import winston from 'winston';
export interface GeographicClusterNode {
    nodeId: string;
    region: 'us-east' | 'us-west' | 'eu-central' | 'asia-pacific';
    endpoints: string[];
    capacity: number;
    currentLoad: number;
    latencyTargets: {
        local: number;
        regional: number;
        global: number;
    };
    healthStatus: 'healthy' | 'degraded' | 'offline';
    lastHealthCheck: number;
}
export interface ClusterTopology {
    regions: GeographicClusterNode[];
    routingTable: Map<string, string[]>;
    failoverStrategy: 'nearest' | 'capacity-based' | 'latency-optimized';
    loadBalancingAlgorithm: 'round-robin' | 'weighted' | 'adaptive';
}
export declare class GeographicClusterManager {
    private logger;
    private clusterTopology;
    private healthCheckInterval;
    private performanceMonitoringInterval;
    private routingCache;
    private performanceMetrics;
    constructor(logger: winston.Logger);
    private initializeClusterTopology;
    selectOptimalRegion(clientRegion: string, sessionRequirements?: {
        latencyThreshold?: number;
        capacityRequired?: number;
        preferredRegions?: string[];
    }): GeographicClusterNode | null;
    private findAlternativeRegions;
    private calculateRegionPriority;
    private calculateExpectedLatency;
    updateRegionLoad(nodeId: string, currentLoad: number): void;
    reportRegionHealth(nodeId: string, healthStatus: 'healthy' | 'degraded' | 'offline'): void;
    private startHealthChecking;
    private performHealthChecks;
    private pingRegionEndpoints;
    private startPerformanceMonitoring;
    private collectPerformanceMetrics;
    getClusterStatus(): {
        topology: ClusterTopology;
        performance: any;
        routing: {
            [k: string]: string;
        };
    };
    shutdown(): Promise<void>;
}
//# sourceMappingURL=GeographicClusterManager.d.ts.map