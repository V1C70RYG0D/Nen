/**
 * Demo Game Service - Provides Mock Data for Quick Start
 * This provides working demo data for the arena page while the full service is being developed
 */

class DemoGameService {
  constructor() {
    // Mock data for demonstration
    this.demoMatches = [
      {
        matchId: 'match-001',
        player1: { name: 'Royal Guard Alpha', elo: 1850 },
        player2: { name: 'Phantom Striker', elo: 1920 },
        status: 'active',
        spectators: Math.floor(Math.random() * 20) + 5,
        currentMove: Math.floor(Math.random() * 50) + 10,
        gameState: {
          currentMove: Math.floor(Math.random() * 50) + 10,
          currentPlayer: Math.random() > 0.5 ? 1 : 2,
          board: Array(9).fill(null).map(() => Array(9).fill(null))
        },
        bettingPool: 42.5,
        lastUpdate: new Date().toISOString()
      },
      {
        matchId: 'match-002',
        player1: { name: 'Azure Tactician', elo: 1780 },
        player2: { name: 'Crimson Beast', elo: 1865 },
        status: 'active',
        spectators: Math.floor(Math.random() * 15) + 8,
        currentMove: Math.floor(Math.random() * 30) + 5,
        gameState: {
          currentMove: Math.floor(Math.random() * 30) + 5,
          currentPlayer: Math.random() > 0.5 ? 1 : 2,
          board: Array(9).fill(null).map(() => Array(9).fill(null))
        },
        bettingPool: 28.3,
        lastUpdate: new Date().toISOString()
      },
      {
        matchId: 'match-003',
        player1: { name: 'Silent Hunter', elo: 1990 },
        player2: { name: 'Iron Wall', elo: 1845 },
        status: 'waiting',
        spectators: Math.floor(Math.random() * 10) + 2,
        currentMove: 0,
        gameState: {
          currentMove: 0,
          currentPlayer: 1,
          board: Array(9).fill(null).map(() => Array(9).fill(null))
        },
        bettingPool: 15.7,
        lastUpdate: new Date().toISOString()
      }
    ];
  }

  async getActiveMatches() {
    // Simulate some processing time
    await new Promise(resolve => setTimeout(resolve, 50));

    // Update random values for each call to simulate live data
    return this.demoMatches.map(match => ({
      ...match,
      spectators: Math.floor(Math.random() * 20) + 5,
      currentMove: match.status === 'active' ? Math.floor(Math.random() * 50) + 10 : 0,
      lastUpdate: new Date().toISOString()
    }));
  }

  async createMatch(matchData) {
    await new Promise(resolve => setTimeout(resolve, 100));

    const newMatch = {
      matchId: `match-${Date.now()}`,
      player1: matchData.player1 || { name: 'New Player 1', elo: 1500 },
      player2: matchData.player2 || { name: 'New Player 2', elo: 1500 },
      status: 'waiting',
      spectators: 0,
      currentMove: 0,
      gameState: {
        currentMove: 0,
        currentPlayer: 1,
        board: Array(9).fill(null).map(() => Array(9).fill(null))
      },
      bettingPool: 0,
      lastUpdate: new Date().toISOString()
    };

    this.demoMatches.push(newMatch);
    return newMatch;
  }

  async getMatchById(matchId) {
    await new Promise(resolve => setTimeout(resolve, 50));

    const match = this.demoMatches.find(m => m.matchId === matchId);
    if (!match) {
      return null;
    }

    // Return with updated live data
    return {
      ...match,
      spectators: Math.floor(Math.random() * 20) + 5,
      gameState: {
        ...match.gameState,
        currentMove: match.status === 'active' ? Math.floor(Math.random() * 50) + 10 : 0,
        currentPlayer: Math.random() > 0.5 ? 1 : 2
      },
      lastUpdate: new Date().toISOString()
    };
  }

  async getAvailableAgents() {
    await new Promise(resolve => setTimeout(resolve, 50));

    return [
      { id: 'agent-001', name: 'Royal Guard Alpha', elo: 1850, status: 'available' },
      { id: 'agent-002', name: 'Phantom Striker', elo: 1920, status: 'available' },
      { id: 'agent-003', name: 'Azure Tactician', elo: 1780, status: 'busy' },
      { id: 'agent-004', name: 'Crimson Beast', elo: 1865, status: 'available' },
      { id: 'agent-005', name: 'Silent Hunter', elo: 1990, status: 'training' },
      { id: 'agent-006', name: 'Iron Wall', elo: 1845, status: 'available' }
    ];
  }
}

module.exports = DemoGameService;
