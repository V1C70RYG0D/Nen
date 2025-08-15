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
// GET /devnet/agents/:mint/verify-commitment?expected=hex
router.get('/agents/:mint/verify-commitment', async (req, res) => {
    try {
        const { mint } = req.params;
        const { expected } = req.query;
        if (!mint || !expected) {
            return res.status(400).json({ success: false, error: 'mint and expected are required' });
        }
        const training = require('../services/training-devnet.js');
        const result = await training.verifyModelCommitmentOnChain({ agentMint: mint, expectedCommitment: String(expected) });
        res.json({ success: true, result });
    }
    catch (error) {
        logger_1.logger.error('verify-commitment error', error);
        res.status(500).json({ success: false, error: error.message });
    }
});
exports.default = router;
//# sourceMappingURL=devnet.js.map