import httpServer from './websockets/notificationServer';
import config from './config';
import { logger } from './utils/logger';

// Export logger for use in other modules
export { logger };

// Default to port 3002 if wsPort is not defined or NaN
const wsPort = (!isNaN(config.server.wsPort) && config.server.wsPort) ? config.server.wsPort : 3002;

httpServer.listen(wsPort, () => {
  logger.info(`WebSocket server is running on ws://${config.server.host}:${wsPort}`);
});
