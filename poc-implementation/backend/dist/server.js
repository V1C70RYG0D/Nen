"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.logger = void 0;
const notificationServer_1 = __importDefault(require("./websockets/notificationServer"));
const config_1 = __importDefault(require("./config"));
const logger_1 = require("./utils/logger");
Object.defineProperty(exports, "logger", { enumerable: true, get: function () { return logger_1.logger; } });
// Default to port 3002 if wsPort is not defined or NaN
const wsPort = (!isNaN(config_1.default.server.wsPort) && config_1.default.server.wsPort) ? config_1.default.server.wsPort : 3002;
notificationServer_1.default.listen(wsPort, () => {
    logger_1.logger.info(`WebSocket server is running on ws://${config_1.default.server.host}:${wsPort}`);
});
//# sourceMappingURL=server.js.map