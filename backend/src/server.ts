import httpServer from './websockets/notificationServer';
import config from './config';

httpServer.listen(config.server.wsPort, () => {
  console.log(`WebSocket server is running on ws://${config.server.host}:${config.server.wsPort}`);
});
