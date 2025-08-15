"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ReportGenerator = void 0;
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
class ReportGenerator {
    static generate(reportData, reportName) {
        const timestamp = new Date().toISOString();
        const reportPath = path_1.default.join(process.cwd(), 'reports', `${reportName}-${timestamp}.json`);
        fs_1.default.writeFileSync(reportPath, JSON.stringify(reportData, null, 2));
    }
}
exports.ReportGenerator = ReportGenerator;
exports.default = ReportGenerator;
//# sourceMappingURL=ReportGenerator.js.map