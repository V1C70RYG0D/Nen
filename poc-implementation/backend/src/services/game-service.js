/**
 * Game Service - Quick Start Wrapper
 * Provides simplified interface for quick-start backend

 */

const GameService = require('./GameService');

class QuickStartGameService {
  constructor() {
    this.gameService = new GameService();
  }

  async getActiveMatches() {
    try {
      // Delegate to main game service
      return await this.gameService.getActiveMatches();
    } catch (error) {
      console.error('QuickStart GameService error:', error);
      // Fallback to basic structure instead of mock data
      return [];
    }
  }

  async createMatch(matchData) {
    try {
      return await this.gameService.createMatch(matchData);
    } catch (error) {
      console.error('QuickStart GameService createMatch error:', error);
      throw new Error('Failed to create match');
    }
  }

  async getMatchById(matchId) {
    try {
      return await this.gameService.getMatchById(matchId);
    } catch (error) {
      console.error('QuickStart GameService getMatchById error:', error);
      return null;
    }
  }
}

module.exports = QuickStartGameService;
