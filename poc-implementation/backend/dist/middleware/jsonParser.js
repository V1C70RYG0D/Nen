"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.jsonParserWithErrorHandling = void 0;
const express_1 = __importDefault(require("express"));
const jsonParserWithErrorHandling = (req, res, next) => {
    express_1.default.json()(req, res, (err) => {
        if (err instanceof SyntaxError && 'body' in err) {
            res.status(400).json({
                success: false,
                message: 'Invalid JSON format',
                error: 'Malformed JSON in request body'
            });
            return;
        }
        next(err);
    });
};
exports.jsonParserWithErrorHandling = jsonParserWithErrorHandling;
//# sourceMappingURL=jsonParser.js.map