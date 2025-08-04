/**
 * Betting Service - Quick Start Wrapper
 * Provides simplified interface for quick-start backend

 */

const BettingService = require('./BettingService');

class QuickStartBettingService {
  constructor() {
    try {
      this.bettingService = new BettingService();
    } catch (error) {
      console.error('Betting Service initialization error:', error);
      this.bettingService = null;
    }
  }

  async getPoolByMatchId(matchId) {
    try {
      if (this.bettingService) {
        return await this.bettingService.getPoolByMatchId(matchId);
      }

      // Return null if service unavailable - will trigger 404
      return null;
    } catch (error) {
      console.error('QuickStart BettingService error:', error);
      return null;
    }
  }
}

module.exports = QuickStartBettingService;
