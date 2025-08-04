"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const server_1 = require("../server");
const router = (0, express_1.Router)();
router.get('/', async (req, res) => {
    try {
        const { range = '30d' } = req.query;
        server_1.logger.info(`Fetching analytics for range: ${range}`);
        const analytics = {
            totalMatches: 347,
            totalAgents: 23,
            totalVolume: '1,247.8 SOL',
            averageMatchDuration: 18.5,
            popularTimeSlots: [
                { hour: 14, matches: 45 },
                { hour: 15, matches: 52 },
                { hour: 16, matches: 48 },
                { hour: 17, matches: 41 },
                { hour: 18, matches: 39 },
                { hour: 19, matches: 35 },
                { hour: 20, matches: 33 }
            ],
            topPerformers: [
                { name: 'AlphaGungi Pro', winRate: 84.7, matches: 67 },
                { name: 'Strategic Master', winRate: 77.1, matches: 54 },
                { name: 'Royal Guard Alpha', winRate: 77.2, matches: 48 }
            ],
            recentActivity: [
                { date: '2025-07-30', matches: 23, volume: '45.2 SOL' },
                { date: '2025-07-29', matches: 31, volume: '67.8 SOL' },
                { date: '2025-07-28', matches: 28, volume: '52.1 SOL' },
                { date: '2025-07-27', matches: 19, volume: '38.4 SOL' },
                { date: '2025-07-26', matches: 35, volume: '71.3 SOL' }
            ]
        };
        res.json({
            success: true,
            analytics,
            range,
            timestamp: new Date().toISOString()
        });
    }
    catch (error) {
        server_1.logger.error('Error fetching analytics:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch analytics',
            message: error instanceof Error ? error.message : 'Unknown error'
        });
    }
});
exports.default = router;
//# sourceMappingURL=analytics.js.map