/**
 * Helper Functions for Common Test Operations
 */

import { GameStateGenerator } from './GameStateGenerator';
import { matchFixture, playerFixture1, playerFixture2, aiAgentFixture } from '../fixtures/entities';

export function createMockMatch(): any {
  return { ...matchFixture, id: 'mock-match', winner: 'player1' };
}

export function transitionGameState(phase: 'opening' | 'midgame' | 'endgame'): any {
  switch (phase) {
    case 'midgame':
      return GameStateGenerator.createMidgameState();
    case 'endgame':
      return GameStateGenerator.createEndgameState();
    default:
      return GameStateGenerator.createInitialState();
  }
}

export function createMockPlayer(id: string): any {
  if (id === 'player1') return playerFixture1;
  if (id === 'player2') return playerFixture2;
  return { id, name: `Unknown ${id}`, rating: 1000 };
}

export function createMockAIAgent(): any {
  return aiAgentFixture;
}

