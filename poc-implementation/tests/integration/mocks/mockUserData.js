/**
 * Mock User Data for Integration Testing
 * Provides standardized test data for user-related operations
 */

const { v4: uuidv4 } = require('uuid');

const mockUserData = {
  newUser: {
    username: `testuser_${Date.now()}`,
    email: `test${Date.now()}@example.com`,
    password: 'SecureTestPassword123!',
    firstName: 'Test',
    lastName: 'User',
    dateOfBirth: '1990-01-01',
    country: 'US',
    preferredLanguage: 'en'
  },

  existingUser: {
    id: uuidv4(),
    username: 'existing_user',
    email: 'existing@example.com',
    firstName: 'Existing',
    lastName: 'User',
    isVerified: true,
    createdAt: new Date('2024-01-01T00:00:00Z').toISOString(),
    lastLoginAt: new Date().toISOString()
  },

  adminUser: {
    id: uuidv4(),
    username: 'admin_user',
    email: 'admin@example.com',
    role: 'admin',
    permissions: ['read', 'write', 'delete', 'admin'],
    isVerified: true
  },

  gameData: {
    testGame: {
      id: 'test-game',
      name: 'Test Gungi Game',
      status: 'waiting',
      maxPlayers: 2,
      currentPlayers: 1,
      gameType: 'ranked',
      settings: {
        timeLimit: 1800, // 30 minutes
        allowSpectators: true,
        isPrivate: false
      }
    },

    gameMove: {
      from: { x: 0, y: 0 },
      to: { x: 1, y: 0 },
      piece: 'pawn',
      timestamp: new Date().toISOString(),
      moveNumber: 1
    }
  },

  walletData: {
    testWallet: {
      publicKey: '11111111111111111111111111111112',
      balance: 100000000, // 0.1 SOL in lamports
      tokens: [
        {
          mint: 'So11111111111111111111111111111111111111112',
          amount: 1000000,
          decimals: 6
        }
      ]
    }
  },

  notifications: {
    gameInvite: {
      type: 'game_invite',
      title: 'Game Invitation',
      message: 'You have been invited to a Gungi match',
      data: {
        gameId: 'test-game',
        invitedBy: 'existing_user'
      },
      priority: 'high'
    },

    systemNotification: {
      type: 'system',
      title: 'Maintenance Notice',
      message: 'Scheduled maintenance in 1 hour',
      priority: 'medium'
    }
  },

  errorScenarios: {
    invalidCredentials: {
      username: 'nonexistent',
      password: 'wrongpassword'
    },

    malformedData: {
      username: null,
      email: 'invalid-email',
      password: '123' // Too short
    },

    duplicateUser: {
      username: 'existing_user',
      email: 'existing@example.com',
      password: 'AnyPassword123!'
    }
  },

  performanceTestData: {
    bulkUsers: Array.from({ length: 100 }, (_, i) => ({
      username: `perftest_user_${i}`,
      email: `perftest${i}@example.com`,
      password: 'PerfTestPassword123!',
      firstName: `PerfTest${i}`,
      lastName: 'User'
    })),

    stressTestGameMoves: Array.from({ length: 50 }, (_, i) => ({
      from: { x: Math.floor(i / 9), y: i % 9 },
      to: { x: Math.floor((i + 1) / 9), y: (i + 1) % 9 },
      piece: ['pawn', 'lance', 'knight', 'silver', 'gold'][i % 5],
      timestamp: new Date(Date.now() + i * 1000).toISOString(),
      moveNumber: i + 1
    }))
  }
};

module.exports = mockUserData;
