"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.swaggerUi = exports.swaggerUiOptions = exports.specs = void 0;
const swagger_jsdoc_1 = __importDefault(require("swagger-jsdoc"));
const swagger_ui_express_1 = __importDefault(require("swagger-ui-express"));
exports.swaggerUi = swagger_ui_express_1.default;
const index_1 = __importDefault(require("./index"));
const options = {
    definition: {
        openapi: '3.0.0',
        info: {
            title: 'Nen Platform API',
            version: process.env.npm_package_version || '1.0.0',
            description: 'RESTful API for the Nen platform game and betting system'
        },
        servers: [
            {
                url: `http://${index_1.default.server.host}:${index_1.default.server.port}`,
                description: `${index_1.default.server.environment} server`
            }
        ],
        components: {
            securitySchemes: {
                bearerAuth: {
                    type: 'http',
                    scheme: 'bearer',
                    bearerFormat: 'JWT'
                }
            }
        }
    },
    apis: ['./src/routes/*.ts'] // Path to the API docs
};
exports.specs = (0, swagger_jsdoc_1.default)(options);
exports.swaggerUiOptions = {
    explorer: true
};
//# sourceMappingURL=swagger.js.map