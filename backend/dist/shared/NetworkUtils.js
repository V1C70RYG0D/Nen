"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.NetworkUtils = void 0;
const dns_1 = __importDefault(require("dns"));
class NetworkUtils {
    static resolveDns(hostname) {
        return new Promise((resolve, reject) => {
            dns_1.default.lookup(hostname, (err, address) => {
                if (err)
                    reject(err);
                resolve(address);
            });
        });
    }
    static isValidIp(ip) {
        const ipRegex = /^(25[0-5]|2[0-4][0-9]|1[0-9]{2}|[1-9]?[0-9])(\.(?:25[0-5]|2[0-4][0-9]|1[0-9]{2}|[1-9]?[0-9])){3}$/;
        return ipRegex.test(ip);
    }
}
exports.NetworkUtils = NetworkUtils;
exports.default = NetworkUtils;
//# sourceMappingURL=NetworkUtils.js.map