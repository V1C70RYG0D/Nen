import { Server as SocketIOServer } from 'socket.io';
import { WebSocketClusterService } from '../services/WebSocketClusterService';
import { MagicBlockBOLTService } from '../services/MagicBlockBOLTService';
import { GeographicClusterManager } from '../services/GeographicClusterManager';
import winston from 'winston';
export declare const setupEnhancedGameSocket: (io: SocketIOServer, clusterService: WebSocketClusterService, magicBlockService: MagicBlockBOLTService, clusterManager: GeographicClusterManager, logger: winston.Logger) => import("socket.io").Namespace<import("socket.io").DefaultEventsMap, import("socket.io").DefaultEventsMap, import("socket.io").DefaultEventsMap, any>;
//# sourceMappingURL=gameSocket.d.ts.map