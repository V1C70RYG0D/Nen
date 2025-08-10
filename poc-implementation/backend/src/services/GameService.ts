// Game Service with MagicBlock Integration
import { logger } from '../utils/logger';
import { query, transaction } from '../utils/database';
import { CacheService } from '../utils/redis';
import { v4 as uuidv4 } from 'uuid';

export interface GameState {
  id: string;
  board: (string | null)[][];
  stacks: Record<string, string[]>; // position -> piece stack
  currentPlayer: 'player1' | 'player2';
  moveHistory: GameMove[];
  status: 'pending' | 'active' | 'completed' | 'cancelled';
  winner?: 'player1' | 'player2' | 'draw';
  createdAt: Date;
  updatedAt: Date;
}

export interface GameMove {
  id: string;
  gameId: string;
  playerId: string;
  from: { x: number; y: number; level: number };
  to: { x: number; y: number; level: number };
  piece: string;
  timestamp: Date;
  moveNumber: number;
  isCapture: boolean;
  capturedPiece?: string;
}

export interface MatchData {
  id: string;
  matchType: 'ai_vs_ai' | 'human_vs_ai' | 'human_vs_human';
  status: 'pending' | 'active' | 'completed' | 'cancelled';
  player1Id?: string;
  player2Id?: string;
  aiAgent1Id?: string;
  aiAgent2Id?: string;
  winnerId?: string;
  winnerType?: 'user' | 'ai';
  magicblockSessionId?: string;
  gameState?: GameState;
  bettingPoolSol: number;
  isBettingActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export class GameService {
  private cache: CacheService;

  constructor() {
    this.cache = new CacheService();
  }

  // Create a new match
  async createMatch(matchData: Partial<MatchData>): Promise<MatchData> {
    try {
      const matchId = uuidv4();
      const gameState = this.initializeGameState(matchId);

      const match: MatchData = {
        id: matchId,
        matchType: matchData.matchType || 'ai_vs_ai',
        status: 'pending',
        player1Id: matchData.player1Id,
        player2Id: matchData.player2Id,
        aiAgent1Id: matchData.aiAgent1Id,
        aiAgent2Id: matchData.aiAgent2Id,
        gameState,
        bettingPoolSol: 0,
        isBettingActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      // Store in database
      await query(`
        INSERT INTO matches (
          id, match_type, status, player1_id, player2_id,
          ai_agent1_id, ai_agent2_id, board_state,
          betting_pool_sol, is_betting_active
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
      `, [
        match.id, match.matchType, match.status, match.player1Id, match.player2Id,
        match.aiAgent1Id, match.aiAgent2Id, JSON.stringify(match.gameState),
        match.bettingPoolSol, match.isBettingActive
      ]);

      // Cache for quick access
      await this.cache.set(`match:${matchId}`, match, 3600);

      logger.info('Match created successfully', { matchId, matchType: match.matchType });
      return match;
    } catch (error) {
      logger.error('Error creating match:', error);
      throw new Error('Failed to create match');
    }
  }

  // Start a match (for AI vs AI)
  async startMatch(matchId: string): Promise<MatchData> {
    try {
      const match = await this.getMatch(matchId);
      if (!match) {
        throw new Error('Match not found');
      }

      if (match.status !== 'pending') {
        throw new Error('Match already started or completed');
      }

      // Update match status
      match.status = 'active';
      match.updatedAt = new Date();

      // Update database
      await query(`
        UPDATE matches
        SET status = $1, updated_at = $2, session_start_time = $2
        WHERE id = $3
      `, [match.status, match.updatedAt, matchId]);

      // Update cache
      await this.cache.set(`match:${matchId}`, match, 3600);

      // For AI vs AI matches, start the game loop
      if (match.matchType === 'ai_vs_ai') {
        this.runAIMatch(match).catch(error => {
          logger.error('Error in AI match execution:', error);
        });
      }

      logger.info('Match started successfully', { matchId });
      return match;
    } catch (error) {
      logger.error('Error starting match:', error);
      throw error;
    }
  }

  // Get match data
  async getMatch(matchId: string): Promise<MatchData | null> {
    try {
      // Try cache first
      const cached = await this.cache.get<MatchData>(`match:${matchId}`);
      if (cached) {
        return cached;
      }

      // Query database
      const rows = await query(`
        SELECT * FROM matches WHERE id = $1
      `, [matchId]);

      if (rows.length === 0) {
        return null;
      }

      const row = rows[0];
      const match: MatchData = {
        id: row.id,
        matchType: row.match_type,
        status: row.status,
        player1Id: row.player1_id,
        player2Id: row.player2_id,
        aiAgent1Id: row.ai_agent1_id,
        aiAgent2Id: row.ai_agent2_id,
        winnerId: row.winner_id,
        winnerType: row.winner_type,
        magicblockSessionId: row.magicblock_session_id,
        gameState: row.board_state,
        bettingPoolSol: parseFloat(row.betting_pool_sol || '0'),
        isBettingActive: row.is_betting_active,
        createdAt: row.created_at,
        updatedAt: row.updated_at,
      };

      // Cache result
      await this.cache.set(`match:${matchId}`, match, 3600);

      return match;
    } catch (error) {
      logger.error('Error getting match:', error);
      throw error;
    }
  }

  // Get active matches for betting
  async getActiveMatches(): Promise<MatchData[]> {
    try {
      const cacheKey = 'matches:active';
      const cached = await this.cache.get<MatchData[]>(cacheKey);

      if (cached) {
        return cached;
      }

      let matches: MatchData[] = [];

      try {
        const rows = await query(`
          SELECT * FROM matches
          WHERE status IN ('pending', 'active')
          ORDER BY created_at DESC
          LIMIT 20
        `);

        matches = rows.map(row => ({
          id: row.id,
          matchType: row.match_type,
          status: row.status,
          player1Id: row.player1_id,
          player2Id: row.player2_id,
          aiAgent1Id: row.ai_agent1_id,
          aiAgent2Id: row.ai_agent2_id,
          winnerId: row.winner_id,
          winnerType: row.winner_type,
          magicblockSessionId: row.magicblock_session_id,
          gameState: row.board_state,
          bettingPoolSol: parseFloat(row.betting_pool_sol || '0'),
          isBettingActive: row.is_betting_active,
          createdAt: row.created_at,
          updatedAt: row.updated_at,
        }));
      } catch (dbError) {
        logger.error('Database query failed:', dbError);

        // Return empty array for production reliability - no fallback data
        matches = [];
        throw new Error(`Database connection failed: ${dbError instanceof Error ? dbError.message : 'Unknown error'}`);
      }
            updatedAt: new Date(),
      // Cache for 1 minute
      await this.cache.set(cacheKey, matches, 60);

      return matches;
    } catch (error) {
      logger.error('Error getting active matches:', error);
      throw error;
    }
  }

  // Make a move in a game
  async makeMove(gameId: string, move: Omit<GameMove, 'id' | 'timestamp' | 'moveNumber'>): Promise<GameMove> {
    try {
      const match = await this.getMatch(gameId);
      if (!match || !match.gameState) {
        throw new Error('Match or game state not found');
      }

      if (match.status !== 'active') {
        throw new Error('Match is not active');
      }

      // Validate move
      const isValidMove = this.validateMove(match.gameState, move);
      if (!isValidMove) {
        throw new Error('Invalid move');
      }

      // Create move record
      const gameMove: GameMove = {
        id: uuidv4(),
        gameId,
        playerId: move.playerId,
        from: move.from,
        to: move.to,
        piece: move.piece,
        timestamp: new Date(),
        moveNumber: match.gameState.moveHistory.length + 1,
        isCapture: move.isCapture,
        capturedPiece: move.capturedPiece,
      };

      // Apply move to game state
      this.applyMove(match.gameState, gameMove);

      // Check for game end
      const gameResult = this.checkGameEnd(match.gameState);
      if (gameResult.isGameOver) {
        match.status = 'completed';
        match.winnerId = gameResult.winner;
        match.winnerType = gameResult.winnerType as 'user' | 'ai';
      }

      // Update database
      await transaction(async (client) => {
        // Update match
        await client.query(`
          UPDATE matches
          SET board_state = $1, status = $2, winner_id = $3, winner_type = $4, updated_at = $5
          WHERE id = $6
        `, [
          JSON.stringify(match.gameState),
          match.status,
          match.winnerId,
          match.winnerType,
          new Date(),
          gameId
        ]);

        // Insert move record
        await client.query(`
          INSERT INTO moves (
            id, match_id, player_id, from_position, to_position,
            piece_type, move_number, is_capture, captured_piece
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
        `, [
          gameMove.id, gameId, gameMove.playerId,
          JSON.stringify(gameMove.from), JSON.stringify(gameMove.to),
          gameMove.piece, gameMove.moveNumber, gameMove.isCapture, gameMove.capturedPiece
        ]);
      });

      // Update cache
      await this.cache.set(`match:${gameId}`, match, 3600);

      logger.info('Move made successfully', { gameId, moveId: gameMove.id });
      return gameMove;
    } catch (error) {
      logger.error('Error making move:', error);
      throw error;
    }
  }

  // Run an AI vs AI match
  private async runAIMatch(match: MatchData): Promise<void> {
    try {
      if (!match.gameState) {
        throw new Error('Game state not initialized');
      }

      logger.info('Starting AI vs AI match', { matchId: match.id });

      let gameState = match.gameState;
      while (match.status === 'active' && gameState.status === 'active') {
        // Simulate AI thinking time
        await new Promise(resolve => setTimeout(resolve, 1000 + Math.random() * 2000));

        // Get AI move
        const currentPlayer = gameState.currentPlayer;
        const aiAgentId = currentPlayer === 'player1' ? match.aiAgent1Id : match.aiAgent2Id;

        if (!aiAgentId) {
          throw new Error('AI agent not found');
        }

        const aiMove = await this.getAIMove(gameState, aiAgentId);
        if (!aiMove) {
          logger.warn('AI could not generate move, ending game', { matchId: match.id });
          break;
        }

        // Make the move
        await this.makeMove(match.id, aiMove);

        // Refresh match data
        const updatedMatch = await this.getMatch(match.id);
        if (updatedMatch && updatedMatch.gameState) {
          match = updatedMatch;
          gameState = updatedMatch.gameState;
        }
      }

logger.info('AI vs AI match completed', { matchId: match.id, winner: match.winnerId });

      // Update ELO ratings after match completion
      const { ELORatingService } = await import('./ELORatingService');
      const eloRatingService = new ELORatingService();
      if (match.winnerId) {
        const player1Wins = match.winnerId === match.player1Id;
        await eloRatingService.updateRatings(
          match.player1Id!,
          match.player2Id!,
          match.id,
          player1Wins ? 'player1_wins' : 'player2_wins'
        );
      } else {
        // Handle the draw case
        await eloRatingService.updateRatings(
          match.player1Id!,
          match.player2Id!,
          match.id,
          'draw'
        );
      }
    } catch (error) {
      logger.error('Error in AI match execution:', error);

      // Mark match as cancelled on error
      await query(`
        UPDATE matches SET status = 'cancelled', updated_at = $1 WHERE id = $2
      `, [new Date(), match.id]);
    }
  }

  // Initialize a new game state
  private initializeGameState(gameId: string): GameState {
    const board: (string | null)[][] = Array(9).fill(null).map(() => Array(9).fill(null));

    return {
      id: gameId,
      board,
      stacks: {},
      currentPlayer: 'player1',
      moveHistory: [],
      status: 'pending',
      createdAt: new Date(),
      updatedAt: new Date(),
    };
  }

  // Validate a move (simplified)
  private validateMove(gameState: GameState, move: Omit<GameMove, 'id' | 'timestamp' | 'moveNumber'>): boolean {
    // Basic validation - in production, implement full Gungi rules
    const { from, to } = move;

    // Check bounds
    if (from.x < 0 || from.x >= 9 || from.y < 0 || from.y >= 9 ||
        to.x < 0 || to.x >= 9 || to.y < 0 || to.y >= 9) {
      return false;
    }

    // Check if piece exists at from position
    const fromKey = `${from.x},${from.y}`;
    const stack = gameState.stacks[fromKey];
    if (!stack || stack.length <= from.level) {
      return false;
    }

    return true;
  }

  // Apply a move to the game state
  private applyMove(gameState: GameState, move: GameMove): void {
    const { from, to } = move;
    const fromKey = `${from.x},${from.y}`;
    const toKey = `${to.x},${to.y}`;

    // Move piece from source to destination
    const sourceStack = gameState.stacks[fromKey] || [];
    const piece = sourceStack[from.level];

    if (piece) {
      // Remove from source
      sourceStack.splice(from.level, 1);
      if (sourceStack.length === 0) {
        delete gameState.stacks[fromKey];
      } else {
        gameState.stacks[fromKey] = sourceStack;
      }

      // Add to destination
      const destStack = gameState.stacks[toKey] || [];
      destStack[to.level] = piece;
      gameState.stacks[toKey] = destStack;
    }

    // Add move to history
    gameState.moveHistory.push(move);

    // Switch players
    gameState.currentPlayer = gameState.currentPlayer === 'player1' ? 'player2' : 'player1';
    gameState.updatedAt = new Date();
  }

  // Check if game has ended
  private checkGameEnd(gameState: GameState): { isGameOver: boolean; winner?: string; winnerType?: string } {
    // Simplified end game detection - in production, implement full Gungi rules
    const moveCount = gameState.moveHistory.length;

    // End game after 100 moves for demo purposes
    if (moveCount >= 100) {
      return {
        isGameOver: true,
        winner: gameState.currentPlayer === 'player1' ? 'player2' : 'player1',
        winnerType: 'ai'
      };
    }

    return { isGameOver: false };
  }

  // Get AI move (simplified)
  private async getAIMove(gameState: GameState, aiAgentId: string): Promise<Omit<GameMove, 'id' | 'timestamp' | 'moveNumber'> | null> {
    try {
      // Simulate AI move generation
      await new Promise(resolve => setTimeout(resolve, 500));

      // Generate a random valid move for demo
      const validMoves = this.generateValidMoves(gameState);
      if (validMoves.length === 0) {
        return null;
      }

      const randomMove = validMoves[Math.floor(Math.random() * validMoves.length)];

      return {
        gameId: gameState.id,
        playerId: aiAgentId,
        from: randomMove.from,
        to: randomMove.to,
        piece: randomMove.piece,
        isCapture: false,
      };
    } catch (error) {
      logger.error('Error generating AI move:', error);
      return null;
    }
  }

  // Generate valid moves (simplified)
  private generateValidMoves(gameState: GameState): Array<{
    from: { x: number; y: number; level: number };
    to: { x: number; y: number; level: number };
    piece: string;
  }> {
    const moves: Array<{
      from: { x: number; y: number; level: number };
      to: { x: number; y: number; level: number };
      piece: string;
    }> = [];

    // Generate random moves for demo
    for (let i = 0; i < 10; i++) {
      moves.push({
        from: { x: Math.floor(Math.random() * 9), y: Math.floor(Math.random() * 9), level: 0 },
        to: { x: Math.floor(Math.random() * 9), y: Math.floor(Math.random() * 9), level: 0 },
        piece: 'pawn'
      });
    }

    return moves;
  }

  // Additional methods required by GameController
  // Following GI #2: Real implementations with actual database operations

  /**
   * Get available games configuration
   */
  async getAvailableGames(): Promise<any[]> {
    try {
      const games = [
        {
          id: 'gungi',
          name: 'Gungi',
          description: 'Strategic board game from Hunter x Hunter',
          players: { min: 2, max: 2 },
          difficulty: ['easy', 'medium', 'hard', 'expert'],
          betLimits: {
            min: 0.01,
            max: 10.0,
            currency: 'SOL'
          },
          estimatedDuration: '15-45 minutes',
          category: 'strategy'
        }
      ];

      logger.info('Retrieved available games', { count: games.length });
      return games;
    } catch (error) {
      logger.error('Error getting available games:', error);
      throw new Error('Failed to retrieve available games');
    }
  }

  /**
   * Get match by ID (alias for getMatch)
   */
  async getMatchById(matchId: string): Promise<MatchData | null> {
    return this.getMatch(matchId);
  }

  /**
   * Execute a move with validation and state updates
   */
  async executeMove(matchId: string, playerId: string, move: any): Promise<{
    valid: boolean;
    error?: string;
    gameState?: GameState;
    nextPlayerType?: 'human' | 'ai';
    nextPlayerId?: string;
    moveNumber?: number;
  }> {
    try {
      const match = await this.getMatch(matchId);
      if (!match) {
        return { valid: false, error: 'Match not found' };
      }

      if (match.status !== 'active') {
        return { valid: false, error: 'Match is not active' };
      }

      // Validate it's the player's turn
      const gameState = match.gameState!;
      if ((gameState.currentPlayer === 'player1' && match.player1Id !== playerId) ||
          (gameState.currentPlayer === 'player2' && match.player2Id !== playerId)) {
        return { valid: false, error: 'Not your turn' };
      }

      // Create and validate the move
      const gameMove: Omit<GameMove, 'id' | 'timestamp' | 'moveNumber'> = {
        gameId: matchId,
        playerId,
        from: move.from,
        to: move.to,
        piece: move.piece,
        isCapture: move.isCapture || false,
        capturedPiece: move.capturedPiece
      };

      if (!this.validateMove(gameState, gameMove)) {
        return { valid: false, error: 'Invalid move' };
      }

      // Execute the move
      const executedMove = await this.makeMove(matchId, gameMove);

      // Get updated game state
      const updatedMatch = await this.getMatch(matchId);

      // Determine next player
      const nextPlayerType = gameState.currentPlayer === 'player1' ?
        (match.aiAgent2Id ? 'ai' : 'human') :
        (match.aiAgent1Id ? 'ai' : 'human');

      const nextPlayerId = gameState.currentPlayer === 'player1' ?
        (match.player2Id || match.aiAgent2Id) :
        (match.player1Id || match.aiAgent1Id);

      return {
        valid: true,
        gameState: updatedMatch?.gameState,
        nextPlayerType,
        nextPlayerId,
        moveNumber: executedMove.moveNumber
      };
    } catch (error) {
      logger.error('Error executing move:', error);
      return { valid: false, error: 'Failed to execute move' };
    }
  }

  /**
   * Get matches for a specific player
   */
  async getPlayerMatches(playerId: string, limit: number = 20, offset: number = 0): Promise<MatchData[]> {
    try {
      const rows = await query(`
        SELECT m.*, g.board_state, g.current_player, g.status as game_status
        FROM matches m
        LEFT JOIN games g ON m.id = g.match_id
        WHERE m.player1_id = $1 OR m.player2_id = $1
        ORDER BY m.created_at DESC
        LIMIT $2 OFFSET $3
      `, [playerId, limit, offset]);

      const matches: MatchData[] = rows.map((row: any) => ({
        id: row.id,
        matchType: row.match_type,
        status: row.status,
        player1Id: row.player1_id,
        player2Id: row.player2_id,
        aiAgent1Id: row.ai_agent1_id,
        aiAgent2Id: row.ai_agent2_id,
        winnerId: row.winner_id,
        winnerType: row.winner_type,
        magicblockSessionId: row.magicblock_session_id,
        gameState: row.board_state ? JSON.parse(row.board_state) : undefined,
        bettingPoolSol: parseFloat(row.betting_pool_sol) || 0,
        isBettingActive: row.is_betting_active,
        createdAt: new Date(row.created_at),
        updatedAt: new Date(row.updated_at)
      }));

      logger.info('Retrieved player matches', { playerId, count: matches.length });
      return matches;
    } catch (error) {
      logger.error('Error getting player matches:', error);
      throw new Error('Failed to retrieve player matches');
    }
  }

  /**
   * Surrender/forfeit a match
   */
  async surrenderMatch(matchId: string, playerId: string): Promise<{
    matchId: string;
    winnerId: string;
    reason: string;
  }> {
    try {
      const match = await this.getMatch(matchId);
      if (!match) {
        throw new Error('Match not found');
      }

      if (match.status !== 'active') {
        throw new Error('Match is not active');
      }

      // Determine winner (opposite player)
      const winnerId = match.player1Id === playerId ? match.player2Id : match.player1Id;
      const winnerType = match.player1Id === playerId ?
        (match.aiAgent2Id ? 'ai' : 'user') :
        (match.aiAgent1Id ? 'ai' : 'user');

      // Update match status
      await query(`
        UPDATE matches
        SET status = 'completed',
            winner_id = $2,
            winner_type = $3,
            updated_at = CURRENT_TIMESTAMP
        WHERE id = $1
      `, [matchId, winnerId, winnerType]);

      // Update game state
      if (match.gameState) {
        match.gameState.status = 'completed';
        match.gameState.winner = match.player1Id === playerId ? 'player2' : 'player1';

        await query(`
          UPDATE matches
          SET board_state = $2
          WHERE id = $1
        `, [matchId, JSON.stringify(match.gameState)]);
      }

      logger.info('Match surrendered', { matchId, playerId, winnerId });
      return {
        matchId,
        winnerId: winnerId || '',
        reason: 'surrender'
      };
    } catch (error) {
      logger.error('Error surrendering match:', error);
      throw new Error('Failed to surrender match');
    }
  }
}
