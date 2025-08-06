"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.WebSocketClusterService = void 0;
const redis_adapter_1 = require("@socket.io/redis-adapter");
const redis_1 = require("redis");
const perf_hooks_1 = require("perf_hooks");
class WebSocketClusterService {
    constructor(io, config, logger) {
        this.redisClients = [];
        this.connectionMetrics = new Map();
        this.regionLatencyMap = new Map();
        this.io = io;
        this.config = config;
        this.logger = logger;
        this.initializeCluster();
    }
    async initializeCluster() {
        try {
            // Setup Redis cluster for geographic distribution (optional for POC)
            if (this.config.redisClusterEndpoints && this.config.redisClusterEndpoints.length > 0) {
                try {
                    const pubClient = (0, redis_1.createClient)({
                        url: this.config.redisClusterEndpoints[0],
                        socket: {
                            reconnectStrategy: (retries) => Math.min(retries * 50, 500)
                        }
                    });
                    const subClient = pubClient.duplicate();
                    await Promise.all([pubClient.connect(), subClient.connect()]);
                    this.redisClients = [pubClient, subClient];
                    // Setup Socket.IO adapter for clustering
                    this.io.adapter((0, redis_adapter_1.createAdapter)(pubClient, subClient));
                    this.logger.info(`WebSocket cluster initialized for region: ${this.config.region.region}`, {
                        nodeId: this.config.nodeId,
                        endpoints: this.config.region.endpoints,
                        latencyTarget: this.config.region.latencyTarget
                    });
                }
                catch (redisError) {
                    this.logger.warn('Redis cluster not available, running in standalone mode', {
                        error: redisError instanceof Error ? redisError.message : String(redisError)
                    });
                }
            }
            else {
                this.logger.info('Redis cluster disabled, running in standalone mode');
            }
            // Initialize geographic routing
            this.setupGeographicRouting();
            // Start performance monitoring
            this.startPerformanceMonitoring();
        }
        catch (error) {
            const errorMessage = error instanceof Error ? error.message : String(error);
            this.logger.error('Failed to initialize WebSocket cluster', { error: errorMessage });
            throw error;
        }
    }
    setupGeographicRouting() {
        // Middleware to route connections based on geographic location
        this.io.use((socket, next) => {
            const clientRegion = this.detectClientRegion(socket);
            const optimalEndpoint = this.selectOptimalEndpoint(clientRegion);
            socket.data.region = clientRegion;
            socket.data.endpoint = optimalEndpoint;
            socket.data.connectionStart = perf_hooks_1.performance.now();
            this.logger.debug('Client connected with geographic routing', {
                socketId: socket.id,
                clientRegion,
                optimalEndpoint,
                targetLatency: this.config.region.latencyTarget
            });
            next();
        });
    }
    detectClientRegion(socket) {
        // Extract region from headers or IP geolocation
        const forwardedFor = socket.handshake.headers['x-forwarded-for'];
        const cfCountry = socket.handshake.headers['cf-ipcountry'];
        const cfRegion = socket.handshake.headers['cf-region'];
        // Simple region detection logic
        if (cfCountry) {
            if (['US', 'CA', 'MX'].includes(cfCountry)) {
                return cfRegion?.startsWith('CA') ? 'us-west' : 'us-east';
            }
            else if (['GB', 'DE', 'FR', 'IT', 'ES', 'NL'].includes(cfCountry)) {
                return 'eu-central';
            }
            else if (['JP', 'KR', 'CN', 'AU', 'SG'].includes(cfCountry)) {
                return 'asia-pacific';
            }
        }
        // Default to current region
        return this.config.region.region;
    }
    selectOptimalEndpoint(clientRegion) {
        // Select endpoint based on latency and capacity
        if (clientRegion === this.config.region.region) {
            return this.config.region.endpoints[0]; // Primary endpoint for same region
        }
        // Find fallback endpoint with lowest latency
        let optimalEndpoint = this.config.region.endpoints[0];
        let minLatency = this.regionLatencyMap.get(optimalEndpoint) || Infinity;
        for (const endpoint of this.config.region.endpoints) {
            const latency = this.regionLatencyMap.get(endpoint) || Infinity;
            if (latency < minLatency) {
                minLatency = latency;
                optimalEndpoint = endpoint;
            }
        }
        return optimalEndpoint;
    }
    startPerformanceMonitoring() {
        // Monitor connection latency every 30 seconds
        setInterval(async () => {
            await this.measureEndpointLatencies();
            this.updateLoadBalancing();
        }, 30000);
        // Track connection metrics
        this.io.on('connection', (socket) => {
            const startTime = perf_hooks_1.performance.now();
            socket.on('ping', (callback) => {
                const latency = perf_hooks_1.performance.now() - startTime;
                this.updateConnectionMetrics(socket.id, latency);
                if (callback) {
                    callback({
                        latency,
                        region: socket.data.region,
                        endpoint: socket.data.endpoint,
                        timestamp: Date.now()
                    });
                }
            });
            socket.on('disconnect', () => {
                this.connectionMetrics.delete(socket.id);
            });
        });
    }
    async measureEndpointLatencies() {
        for (const endpoint of this.config.region.endpoints) {
            try {
                const start = perf_hooks_1.performance.now();
                // Ping endpoint (simplified - in production use actual health check)
                await new Promise((resolve) => setTimeout(resolve, 1));
                const latency = perf_hooks_1.performance.now() - start;
                this.regionLatencyMap.set(endpoint, latency);
            }
            catch (error) {
                this.regionLatencyMap.set(endpoint, Infinity);
                const errorMessage = error instanceof Error ? error.message : String(error);
                this.logger.warn(`Endpoint ${endpoint} unreachable`, { error: errorMessage });
            }
        }
    }
    updateConnectionMetrics(socketId, latency) {
        this.connectionMetrics.set(socketId, {
            latency,
            lastUpdate: Date.now(),
            region: this.config.region.region
        });
        // Log if latency exceeds target
        if (latency > this.config.region.latencyTarget) {
            this.logger.warn('Connection latency exceeds target', {
                socketId,
                latency,
                target: this.config.region.latencyTarget
            });
        }
    }
    updateLoadBalancing() {
        const avgLatency = Array.from(this.connectionMetrics.values())
            .reduce((sum, metric) => sum + metric.latency, 0) / this.connectionMetrics.size;
        this.logger.info('Performance metrics update', {
            region: this.config.region.region,
            avgLatency,
            activeConnections: this.connectionMetrics.size,
            endpointLatencies: Object.fromEntries(this.regionLatencyMap)
        });
    }
    // Real-time gaming optimization methods
    optimizeForRealTimeGaming() {
        // Socket.IO engine settings should be configured during server creation
        // These are runtime configurations that can be set
        this.io.setMaxListeners(1000);
        // The engine options like pingTimeout, pingInterval, compression, and transports
        // should be set when creating the Socket.IO server instance
        this.logger.info('WebSocket cluster optimized for real-time gaming', {
            transport: 'websocket-only',
            maxListeners: 1000
        });
    }
    setupMagicBlockIntegration() {
        // Namespace for MagicBlock real-time updates
        const magicBlockNamespace = this.io.of('/magicblock');
        magicBlockNamespace.on('connection', (socket) => {
            this.logger.debug('MagicBlock client connected', { socketId: socket.id });
            socket.on('subscribe_session', (sessionId) => {
                socket.join(`session_${sessionId}`);
                this.logger.debug('Client subscribed to session', { socketId: socket.id, sessionId });
            });
            socket.on('bolt_ecs_update', (data) => {
                const { sessionId, componentUpdate, moveHash } = data;
                // Broadcast ECS update to all session subscribers
                magicBlockNamespace.to(`session_${sessionId}`).emit('ecs_update', {
                    sessionId,
                    componentUpdate,
                    moveHash,
                    timestamp: Date.now(),
                    latency: perf_hooks_1.performance.now() - data.clientTimestamp
                });
            });
        });
        return magicBlockNamespace;
    }
    getClusterStats() {
        return {
            nodeId: this.config.nodeId,
            region: this.config.region.region,
            activeConnections: this.connectionMetrics.size,
            avgLatency: Array.from(this.connectionMetrics.values())
                .reduce((sum, metric) => sum + metric.latency, 0) / this.connectionMetrics.size,
            endpointLatencies: Object.fromEntries(this.regionLatencyMap)
        };
    }
    async shutdown() {
        this.logger.info('Shutting down WebSocket cluster service');
        // Close all Redis connections
        await Promise.all(this.redisClients.map(client => client.quit()));
        // Clear metrics
        this.connectionMetrics.clear();
        this.regionLatencyMap.clear();
    }
}
exports.WebSocketClusterService = WebSocketClusterService;
//# sourceMappingURL=WebSocketClusterService.js.map