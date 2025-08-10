"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const logger_1 = require("../utils/logger");
// Load JS service via require to avoid TS type config changes
// eslint-disable-next-line @typescript-eslint/no-var-requires
const devnetRegistry = require('../services/devnet-match-registry.js');
const router = (0, express_1.Router)();
// GET /devnet/matches - real on-chain backed list via memos
router.get('/matches', async (_req, res) => {
    try {
        const items = await devnetRegistry.fetchActiveDevnetMatches();
        res.json({ success: true, data: items, count: items.length });
    }
    catch (error) {
        logger_1.logger.error('devnet matches error', error);
        res.status(500).json({ success: false, error: 'Failed to fetch devnet matches', message: error.message });
    }
});
exports.default = router;
//# sourceMappingURL=devnet.js.map