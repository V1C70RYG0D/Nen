import { Server as SocketIOServer } from 'socket.io';
import winston from 'winston';
declare const logger: winston.Logger;
declare const io: SocketIOServer<import("socket.io").DefaultEventsMap, import("socket.io").DefaultEventsMap, import("socket.io").DefaultEventsMap, any>;
export { io, logger };
//# sourceMappingURL=server-simplified.d.ts.map