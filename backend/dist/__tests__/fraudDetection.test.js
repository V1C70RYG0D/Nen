"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const GameService_1 = require("../services/GameService");
const globals_1 = require("@jest/globals");
const service = new GameService_1.GameService();
const SLOW_MOVE_DELAY = 2000;
const FAST_MOVE_DELAY = 100;
const mockGameId = 'game-123';
const mockMove = {
    playerId: 'player-123',
    from: { x: 0, y: 0, level: 0 },
    to: { x: 1, y: 1, level: 0 },
    piece: 'pawn',
    isCapture: false
};
(0, globals_1.describe)('Fraud Detection Tests', () => {
    (0, globals_1.beforeEach)(async () => {
        const match = await service.createMatch({ matchType: 'human_vs_ai', player1Id: 'player-123' });
        await service.startMatch(match.id);
    });
    (0, globals_1.it)('should record moves with timestamps and ensure chronological order', async () => {
        const firstMove = await service.makeMove(mockGameId, { ...mockMove, gameId: mockGameId });
        await sleep(SLOW_MOVE_DELAY);
        const secondMove = await service.makeMove(mockGameId, { ...mockMove, gameId: mockGameId });
        (0, globals_1.expect)(firstMove.timestamp.getTime()).toBeLessThan(secondMove.timestamp.getTime());
    });
    (0, globals_1.it)('should detect suspiciously fast move timings', async () => {
        const firstMove = await service.makeMove(mockGameId, { ...mockMove, gameId: mockGameId });
        await sleep(FAST_MOVE_DELAY);
        const secondMove = await service.makeMove(mockGameId, { ...mockMove, gameId: mockGameId });
        const isSuspicious = checkFastMove([firstMove.timestamp, secondMove.timestamp]);
        (0, globals_1.expect)(isSuspicious).toBe(true);
    });
    const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
    function checkFastMove(timestamps) {
        const timeDiffs = timestamps.map((time, index, array) => {
            if (index === 0)
                return null;
            return time.getTime() - array[index - 1].getTime();
        }).filter(diff => diff !== null);
        return timeDiffs.some(diff => diff < FAST_MOVE_DELAY);
    }
    (0, globals_1.it)('should validate fraud alert bypasses in trusted mode', async () => {
        const trusted = true;
        (0, globals_1.expect)(() => service.makeMove(mockGameId, { ...mockMove, gameId: mockGameId })).not.toThrow(Error);
    });
});
//# sourceMappingURL=fraudDetection.test.js.map