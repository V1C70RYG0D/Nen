"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.setupBettingSocket = void 0;
const setupBettingSocket = (io) => {
    const bettingNamespace = io.of('/betting');
    bettingNamespace.on('connection', (socket) => {
        console.log(`Betting client connected: ${socket.id}`);
        socket.on('join_betting', (gameId) => {
            socket.join(`betting_${gameId}`);
            socket.emit('joined_betting', { gameId });
            socket.emit('betting_pools', {
                gameId,
                totalPool: 5.75,
                pools: [
                    {
                        agentId: 'royal_guard_alpha',
                        agentName: 'Royal Guard Alpha',
                        totalBets: 3.25,
                        odds: 1.77,
                        bettors: 8
                    },
                    {
                        agentId: 'phantom_striker',
                        agentName: 'Phantom Striker',
                        totalBets: 2.50,
                        odds: 2.30,
                        bettors: 5
                    }
                ],
                lastUpdated: new Date().toISOString()
            });
        });
        socket.on('place_bet', (data) => {
            const { gameId, agentId, amount } = data;
            try {
                const betTransaction = {
                    betId: `bet_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
                    gameId,
                    agentId,
                    amount: parseFloat(amount),
                    blockchainTxHash: `0x${Buffer.from(`${gameId}_${agentId}_${amount}_${Date.now()}`).toString('hex').slice(0, 64)}`,
                    status: 'confirmed',
                    placedAt: Date.now()
                };
                socket.emit('bet_placed', {
                    ...betTransaction,
                    timestamp: new Date().toISOString()
                });
                const totalPool = parseFloat(amount) + Math.random() * 1000;
                const agentPool = parseFloat(amount) + Math.random() * 200;
                const newOdds = parseFloat((totalPool / agentPool).toFixed(2));
                bettingNamespace.to(`betting_${gameId}`).emit('pool_updated', {
                    gameId,
                    agentId,
                    newAmount: agentPool,
                    newOdds,
                    totalPool,
                    timestamp: new Date().toISOString()
                });
            }
            catch (error) {
                socket.emit('bet_error', {
                    gameId,
                    error: 'Failed to process bet',
                    timestamp: new Date().toISOString()
                });
            }
        });
        socket.on('subscribe_odds', (gameId) => {
            socket.join(`odds_${gameId}`);
            const oddsInterval = setInterval(() => {
                socket.emit('odds_update', {
                    gameId,
                    odds: {
                        royal_guard_alpha: (1.5 + Math.random() * 0.5).toFixed(2),
                        phantom_striker: (2.0 + Math.random() * 0.6).toFixed(2)
                    },
                    timestamp: new Date().toISOString()
                });
            }, 5000);
            socket.on('disconnect', () => {
                clearInterval(oddsInterval);
            });
        });
        socket.on('game_finished', (data) => {
            const { gameId, winner, finalPools } = data;
            try {
                const winningPool = finalPools.find((pool) => pool.agentId === winner);
                const totalPoolAmount = finalPools.reduce((sum, pool) => sum + pool.amount, 0);
                const payoutRatio = winningPool ? (totalPoolAmount / winningPool.amount) * 0.95 : 1;
                bettingNamespace.to(`betting_${gameId}`).emit('game_result', {
                    gameId,
                    winner,
                    finalPools,
                    payoutCalculation: {
                        winningPool,
                        totalPool: totalPoolAmount,
                        payoutRatio: parseFloat(payoutRatio.toFixed(2)),
                        houseEdge: 0.05
                    },
                    timestamp: new Date().toISOString()
                });
            }
            catch (error) {
                console.warn('Error processing game result:', error);
            }
        });
        socket.on('claim_payout', (data) => {
            const { betId, expectedAmount } = data;
            try {
                const payoutAmount = parseFloat(expectedAmount) * 0.98;
                const txHash = `0x${Buffer.from(`payout_${betId}_${Date.now()}`).toString('hex').slice(0, 64)}`;
                socket.emit('payout_processed', {
                    betId,
                    amount: parseFloat(payoutAmount.toFixed(4)),
                    txHash,
                    transactionFee: parseFloat((parseFloat(expectedAmount) * 0.02).toFixed(4)),
                    status: 'completed',
                    processedAt: Date.now(),
                    timestamp: new Date().toISOString()
                });
            }
            catch (error) {
                socket.emit('payout_error', {
                    betId,
                    error: 'Failed to process payout',
                    timestamp: new Date().toISOString()
                });
            }
        });
        socket.on('disconnect', () => {
            console.log(`Betting client disconnected: ${socket.id}`);
        });
    });
};
exports.setupBettingSocket = setupBettingSocket;
//# sourceMappingURL=bettingSocket.js.map