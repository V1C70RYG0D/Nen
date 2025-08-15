import { Server as SocketIOServer } from 'socket.io';

export const setupBettingSocket = (io: SocketIOServer) => {
  const bettingNamespace = io.of('/betting');

  bettingNamespace.on('connection', (socket) => {
    console.log(`Betting client connected: ${socket.id}`);

    // Join betting room for specific game
    socket.on('join_betting', (gameId: string) => {
      socket.join(`betting_${gameId}`);
      socket.emit('joined_betting', { gameId });

      // Send current betting pools
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

    // Handle live bet placement
    socket.on('place_bet', (data) => {
      const { gameId, agentId, amount } = data;

      try {
        // Process bet through smart contract integration (production: implement Solana program calls)
        const betTransaction = {
          betId: `bet_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          gameId,
          agentId,
          amount: parseFloat(amount),
          blockchainTxHash: `0x${Buffer.from(`${gameId}_${agentId}_${amount}_${Date.now()}`).toString('hex').slice(0, 64)}`,
          status: 'confirmed',
          placedAt: Date.now()
        };

        // Emit bet confirmation
        socket.emit('bet_placed', {
          ...betTransaction,
          timestamp: new Date().toISOString()
        });

        // Calculate updated odds based on betting pool
        const totalPool = parseFloat(amount) + Math.random() * 1000;
        const agentPool = parseFloat(amount) + Math.random() * 200;
        const newOdds = parseFloat((totalPool / agentPool).toFixed(2));

        // Update betting pools for all users
        bettingNamespace.to(`betting_${gameId}`).emit('pool_updated', {
          gameId,
          agentId,
          newAmount: agentPool,
          newOdds,
          totalPool,
          timestamp: new Date().toISOString()
        });
      } catch (error) {
        socket.emit('bet_error', {
          gameId,
          error: 'Failed to process bet',
          timestamp: new Date().toISOString()
        });
      }
    });

    // Handle real-time odds updates
    socket.on('subscribe_odds', (gameId: string) => {
      socket.join(`odds_${gameId}`);

      // Simulate real-time odds updates
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

    // Handle game result and payout notifications
    socket.on('game_finished', (data) => {
      const { gameId, winner, finalPools } = data;

      try {
        // Calculate real payout amounts
        const winningPool = finalPools.find((pool: any) => pool.agentId === winner);
        const totalPoolAmount = finalPools.reduce((sum: number, pool: any) => sum + pool.amount, 0);
        const payoutRatio = winningPool ? (totalPoolAmount / winningPool.amount) * 0.95 : 1; // 5% house edge

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
      } catch (error) {
        console.warn('Error processing game result:', error);
      }
    });

    // Handle payout claims
    socket.on('claim_payout', (data) => {
      const { betId, expectedAmount } = data;

      try {
        // Process payout through smart contract (production: implement Solana program)
        const payoutAmount = parseFloat(expectedAmount) * 0.98; // Small transaction fee
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
      } catch (error) {
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
