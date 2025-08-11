"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const devnet_match_registry_1 = require("../services/devnet-match-registry");
const router = (0, express_1.Router)();
// GET /api/devnet/matches - Real devnet matches, odds, agent metadata, pools
router.get('/matches', async (req, res) => {
    try {
        const matches = await (0, devnet_match_registry_1.fetchActiveDevnetMatches)();
        res.json({
            success: true,
            data: matches,
            count: matches.length,
            message: 'Fetched real devnet matches, odds, agent metadata, pools.'
        });
    }
    catch (error) {
        res.status(500).json({
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error',
            message: 'Failed to fetch devnet matches.'
        });
    }
});
// GET /api/devnet/matches/:id - Single devnet match by ID
router.get('/matches/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const matches = await (0, devnet_match_registry_1.fetchActiveDevnetMatches)();
        const match = matches.find(m => m.id === id);
        if (!match) {
            return res.status(404).json({ success: false, error: 'Match not found' });
        }
        return res.json({ success: true, data: match });
    }
    catch (error) {
        res.status(500).json({
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error',
            message: 'Failed to fetch devnet match.'
        });
    }
});
exports.default = router;
//# sourceMappingURL=devnet.js.map