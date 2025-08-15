"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.config = exports.ConfigManager = void 0;
const dotenv_1 = __importDefault(require("dotenv"));
const path_1 = __importDefault(require("path"));
const joi_1 = __importDefault(require("joi"));
class ConfigManager {
    constructor() {
        dotenv_1.default.config({ path: path_1.default.resolve(process.cwd(), '.env') });
        this.config = this.validateConfig(process.env);
    }
    static getInstance() {
        if (!ConfigManager.instance) {
            ConfigManager.instance = new ConfigManager();
        }
        return ConfigManager.instance;
    }
    validateConfig(env) {
        const schema = joi_1.default.object({
            DB_HOST: joi_1.default.string().required(),
            DB_USER: joi_1.default.string().required(),
            DB_PASS: joi_1.default.string().required(),
            DB_NAME: joi_1.default.string().required(),
            LOG_LEVEL: joi_1.default.string().default('INFO'),
        }).unknown();
        const { error, value } = schema.validate(env);
        if (error) {
            throw new Error(`Config validation error: ${error.message}`);
        }
        return value;
    }
    get(key) {
        return this.config[key];
    }
}
exports.ConfigManager = ConfigManager;
exports.config = ConfigManager.getInstance();
exports.default = exports.config;
//# sourceMappingURL=ConfigManager.js.map