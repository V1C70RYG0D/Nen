"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ResultsManager = void 0;
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
class ResultsManager {
    constructor(resultDir = path_1.default.join(process.cwd(), 'results')) {
        this.resultDir = resultDir;
        if (!fs_1.default.existsSync(this.resultDir)) {
            fs_1.default.mkdirSync(this.resultDir);
        }
    }
    saveResult(testName, data) {
        const resultPath = path_1.default.join(this.resultDir, `${testName}.json`);
        fs_1.default.writeFileSync(resultPath, JSON.stringify(data, null, 2));
    }
    getResult(testName) {
        const resultPath = path_1.default.join(this.resultDir, `${testName}.json`);
        return JSON.parse(fs_1.default.readFileSync(resultPath, 'utf-8'));
    }
}
exports.ResultsManager = ResultsManager;
exports.default = ResultsManager;
//# sourceMappingURL=ResultsManager.js.map