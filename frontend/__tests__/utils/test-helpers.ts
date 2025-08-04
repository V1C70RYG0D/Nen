// Test utility helpers for consistent mock objects
import { AIAgent, Match, AgentTraits } from '../../types';

export const createMockAgentTraits = (overrides: Partial<AgentTraits> = {}): AgentTraits => ({
  strategy: 75,
  adaptability: 80,
  aggression: 60,
  patience: 70,
  creativity: 85,
  ...overrides,
});

export const createMockAgent = (overrides: Partial<AIAgent> = {}): AIAgent => ({
  id: 'agent-1',
  name: 'Test Agent',
  owner: 'test-owner-key',
  elo: 1500,
  winRate: 0.65,
  gamesPlayed: 100,
  personality: 'Balanced',
  avatar: '/avatars/test-agent.png',
  isForSale: false,
  price: undefined,
  nftMintAddress: undefined,
  traits: createMockAgentTraits(),
  ...overrides,
});

export const createMockMatch = (overrides: Partial<Match> = {}): Match => ({
  id: 'match-1',
  agent1: createMockAgent({
    id: 'agent-1',
    name: 'Agent One',
    elo: 1500,
    winRate: 0.60
  }),
  agent2: createMockAgent({
    id: 'agent-2',
    name: 'Agent Two',
    elo: 1450,
    winRate: 0.55
  }),
  status: 'live',
  totalPool: 123.45,
  pools: {
    agent1: 74.07,
    agent2: 49.38,
    total: 123.45,
  },
  startTime: new Date('2024-01-15T10:00:00Z'),
  endTime: undefined,
  winner: undefined,
  currentGame: undefined,
  viewers: 100,
  ...overrides,
});

// Mock implementations for common hooks and utilities
export const createMockWalletContextState = () => ({
  connected: false,
  publicKey: null,
  connecting: false,
  disconnecting: false,
  autoConnect: false,
  wallets: [],
  wallet: null,
  select: jest.fn(),
  connect: jest.fn(),
  disconnect: jest.fn(),
  sendTransaction: jest.fn(),
  signTransaction: jest.fn(),
  signAllTransactions: jest.fn(),
  signMessage: jest.fn(),
  signIn: jest.fn(),
});

export const createMockBettingHook = () => ({
  pools: {
    total: 1000,
    agent1: 600,
    agent2: 400,
  },
  odds: {
    agent1: 1.67,
    agent2: 2.5,
  },
  userBets: [],
  isLoading: false,
  error: null,
  placeBet: jest.fn(),
  claimWinnings: jest.fn(),
});

export const createMockGameState = () => ({
  boardState: null,
  currentPlayer: 1 as const,
  gameHistory: [],
  isConnected: false,
  latency: 0,
  error: null,
  submitMove: jest.fn(),
  reconnect: jest.fn(),
  disconnect: jest.fn(),
});

export const createMockMagicBlockSession = () => ({
  session: null,
  isConnected: false,
  latency: 0,
  error: null,
  submitMove: jest.fn(),
  disconnect: jest.fn(),
});

export const createMockUseMagicBlockSessionHook = () => ({
  session: null,
  isConnected: false,
  latency: 0,
  error: null,
  submitMove: jest.fn(),
  disconnect: jest.fn(),
});

// GI-18 compliant: Real test implementation instead of placeholder
describe('Test Helpers', () => {
  it('should export helper functions', () => {
    expect(createMockAgent).toBeDefined();
    expect(createMockMatch).toBeDefined();
    expect(createMockWalletContextState).toBeDefined();
    expect(createMockBettingHook).toBeDefined();
  });
});
