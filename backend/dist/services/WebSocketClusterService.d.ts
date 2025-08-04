import { Server as SocketIOServer } from 'socket.io';
import winston from 'winston';
export interface GeographicRegion {
    region: 'us-east' | 'us-west' | 'eu-central' | 'asia-pacific';
    endpoints: string[];
    latencyTarget: number;
    fallbackRegions: string[];
}
export interface ClusterConfig {
    nodeId: string;
    region: GeographicRegion;
    redisClusterEndpoints: string[];
    maxConnections: number;
    loadBalancingStrategy: 'round-robin' | 'latency-based' | 'capacity-based';
}
export declare class WebSocketClusterService {
    private io;
    private config;
    private logger;
    private redisClients;
    private connectionMetrics;
    private regionLatencyMap;
    constructor(io: SocketIOServer, config: ClusterConfig, logger: winston.Logger);
    private initializeCluster;
    private setupGeographicRouting;
    private detectClientRegion;
    private selectOptimalEndpoint;
    private startPerformanceMonitoring;
    private measureEndpointLatencies;
    private updateConnectionMetrics;
    private updateLoadBalancing;
    optimizeForRealTimeGaming(): void;
    setupMagicBlockIntegration(): import("socket.io").Namespace<import("socket.io").DefaultEventsMap, import("socket.io").DefaultEventsMap, import("socket.io").DefaultEventsMap, any>;
    getClusterStats(): {
        nodeId: string;
        region: "us-east" | "us-west" | "eu-central" | "asia-pacific";
        activeConnections: number;
        avgLatency: number;
        endpointLatencies: {
            [k: string]: number;
        };
    };
    shutdown(): Promise<void>;
}
//# sourceMappingURL=WebSocketClusterService.d.ts.map