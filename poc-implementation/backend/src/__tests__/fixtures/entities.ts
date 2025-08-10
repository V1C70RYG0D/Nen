/**
 * Test Fixtures for Match, Player, and AI Agent Configurations
 */

interface MatchFixture {
  id: string;
  players: [string, string];
  status: 'pending' | 'active' | 'completed';
  winner?: string;
}

interface PlayerFixture {
  id: string;
  name: string;
  rating: number;
}

interface AIAgentFixture {
  id: string;
  level: number;
  strategy: string;
}

export const matchFixture: MatchFixture = {
  id: 'sample-match',
  players: ['player1', 'player2'],
  status: 'active',
};

export const playerFixture1: PlayerFixture = {
  id: 'player1',
  name: 'Alice',
  rating: 2000,
};

export const playerFixture2: PlayerFixture = {
  id: 'player2',
  name: 'Bob',
  rating: 1950,
};

export const aiAgentFixture: AIAgentFixture = {
  id: 'ai-agent-1',
  level: 10,
  strategy: 'aggressive',
};
