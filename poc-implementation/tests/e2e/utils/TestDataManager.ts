import axios from 'axios';
import { randomUUID } from 'crypto';

interface TestUser {
  id?: string;
  username: string;
  email: string;
  password: string;
  walletAddress?: string;
}

interface TestGame {
  id?: string;
  player1Id: string;
  player2Id?: string;
  status: 'waiting' | 'active' | 'completed';
  betAmount?: number;
}

export class TestDataManager {
  private baseUrl: string;
  private createdUsers: TestUser[] = [];
  private createdGames: TestGame[] = [];

  constructor() {
    this.baseUrl = process.env.TEST_API_BASE_URL || process.env.PLAYWRIGHT_BASE_URL || (() => {
    })();
  }

  /**
   * Create a test user account
   */
  async createTestUser(userData?: Partial<TestUser>): Promise<TestUser> {
    const testEmailDomain = process.env.TEST_EMAIL_DOMAIN || process.env.DEV_EMAIL_DOMAIN || 'example.com';

    const defaultUser: TestUser = {
      username: `testuser_${randomUUID().slice(0, 8)}`,
      email: `test_${randomUUID().slice(0, 8)}@${testEmailDomain}`,
      password: 'TestPassword123!',
      ...userData
    };

    try {
      const response = await axios.post(`${this.baseUrl}/api/auth/register`, defaultUser);
      const createdUser = { ...defaultUser, id: response.data.user.id };
      this.createdUsers.push(createdUser);
      return createdUser;
    } catch (error) {
      console.error('Failed to create test user:', error);
      throw error;
    }
  }

  /**
   * Create multiple test users
   */
  async createTestUsers(count: number): Promise<TestUser[]> {
    const users: TestUser[] = [];
    for (let i = 0; i < count; i++) {
      const user = await this.createTestUser();
      users.push(user);
    }
    return users;
  }

  /**
   * Login test user and get auth token
   */
  async loginTestUser(user: TestUser): Promise<string> {
    try {
      const response = await axios.post(`${this.baseUrl}/api/auth/login`, {
        username: user.username,
        password: user.password
      });
      return response.data.token;
    } catch (error) {
      console.error('Failed to login test user:', error);
      throw error;
    }
  }

  /**
   * Create a test game
   */
  async createTestGame(gameData?: Partial<TestGame>): Promise<TestGame> {
    // Ensure we have at least one player
    if (!gameData?.player1Id && this.createdUsers.length === 0) {
      await this.createTestUser();
    }

    const defaultGame: TestGame = {
      player1Id: gameData?.player1Id || this.createdUsers[0].id!,
      status: 'waiting',
      betAmount: 0,
      ...gameData
    };

    try {
      // Get auth token for the player
      const player = this.createdUsers.find(u => u.id === defaultGame.player1Id);
      if (!player) throw new Error('Player not found');

      const token = await this.loginTestUser(player);

      const response = await axios.post(`${this.baseUrl}/api/games`, defaultGame, {
        headers: { Authorization: `Bearer ${token}` }
      });

      const createdGame = { ...defaultGame, id: response.data.game.id };
      this.createdGames.push(createdGame);
      return createdGame;
    } catch (error) {
      console.error('Failed to create test game:', error);
      throw error;
    }
  }

  /**
   * Seed database with initial test data
   */
  async seedTestData(): Promise<{
    users: TestUser[];
    games: TestGame[];
  }> {
    console.log('Seeding test data...');

    // Create test users
    const users = await this.createTestUsers(3);

    // Create test games
    const games: TestGame[] = [];

    // Create a waiting game
    const waitingGame = await this.createTestGame({
      player1Id: users[0].id!,
      status: 'waiting',
      betAmount: 100
    });
    games.push(waitingGame);

    // Create an active game
    const activeGame = await this.createTestGame({
      player1Id: users[1].id!,
      player2Id: users[2].id!,
      status: 'active',
      betAmount: 500
    });
    games.push(activeGame);

    console.log(`Created ${users.length} test users and ${games.length} test games`);

    return { users, games };
  }

  /**
   * Clean up all created test data
   */
  async cleanupTestData(): Promise<void> {
    console.log('Cleaning up test data...');

    // Delete games first (due to foreign key constraints)
    for (const game of this.createdGames) {
      try {
        await axios.delete(`${this.baseUrl}/api/games/${game.id}`);
      } catch (error) {
        console.warn(`Failed to delete game ${game.id}:`, error.message);
      }
    }

    // Delete users
    for (const user of this.createdUsers) {
      try {
        const token = await this.loginTestUser(user);
        await axios.delete(`${this.baseUrl}/api/users/${user.id}`, {
          headers: { Authorization: `Bearer ${token}` }
        });
      } catch (error) {
        console.warn(`Failed to delete user ${user.id}:`, error.message);
      }
    }

    // Clear arrays
    this.createdUsers = [];
    this.createdGames = [];

    console.log('Test data cleanup completed');
  }

  /**
   * Reset database to clean state
   */
  async resetDatabase(): Promise<void> {
    try {
      await axios.post(`${this.baseUrl}/api/test/reset-database`);
      console.log('Database reset completed');
    } catch (error) {
      console.error('Failed to reset database:', error);
      throw error;
    }
  }

  /**
   * Get created test users
   */
  getCreatedUsers(): TestUser[] {
    return [...this.createdUsers];
  }

  /**
   * Get created test games
   */
  getCreatedGames(): TestGame[] {
    return [...this.createdGames];
  }

  /**
   * Update game state
   */
  async updateGameState(gameId: string, updates: Partial<TestGame>): Promise<TestGame> {
    try {
      const response = await axios.patch(`${this.baseUrl}/api/games/${gameId}`, updates);

      // Update local record
      const gameIndex = this.createdGames.findIndex(g => g.id === gameId);
      if (gameIndex !== -1) {
        this.createdGames[gameIndex] = { ...this.createdGames[gameIndex], ...updates };
      }

      return response.data.game;
    } catch (error) {
      console.error('Failed to update game state:', error);
      throw error;
    }
  }

  /**
   * Create test wallet for user
   */
  async createTestWallet(userId: string): Promise<string> {
    try {
      const response = await axios.post(`${this.baseUrl}/api/test/create-wallet`, { userId });
      return response.data.walletAddress;
    } catch (error) {
      console.error('Failed to create test wallet:', error);
      throw error;
    }
  }

  /**
   * Fund test wallet with SOL
   */
  async fundTestWallet(walletAddress: string, amount: number = 1): Promise<void> {
    try {
      await axios.post(`${this.baseUrl}/api/test/fund-wallet`, {
        walletAddress,
        amount
      });
    } catch (error) {
      console.error('Failed to fund test wallet:', error);
      throw error;
    }
  }

  /**
   * Verify API health before running tests
   */
  async verifyApiHealth(): Promise<boolean> {
    try {
      const timeout = parseInt(process.env.TEST_TIMEOUT_SHORT || process.env.HTTP_TIMEOUT || process.env.DEFAULT_TEST_TIMEOUT_SHORT || process.env.DEFAULT_HTTP_TIMEOUT || (() => {
      })());
      const response = await axios.get(`${this.baseUrl}/health`, { timeout });
      return response.status === 200;
    } catch (error) {
      console.error('API health check failed:', error);
      return false;
    }
  }
}
