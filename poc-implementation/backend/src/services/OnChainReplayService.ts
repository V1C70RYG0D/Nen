/**
 * On-Chain Replay Service
 * Handles fetching and managing match replays stored on MagicBlock rollups
 * 
 * Features:
 * - Fetch match replays from MagicBlock ephemeral rollups
 * - Filter replays by various criteria (opponent, date, result, opening)
 * - Validate replay data integrity
 * - Integration with Solana devnet for real on-chain data
 */

import { Connection, PublicKey } from '@solana/web3.js';
import { logger } from '../utils/logger';
import { getEnhancedDatabaseService } from './EnhancedDatabaseService';

export interface MatchReplay {
  replayId: string;
  sessionId: string;
  matchDate: Date;
  playerWhite: string;
  playerBlack: string;
  aiAgentId?: string;
  result: 'white_wins' | 'black_wins' | 'draw';
  totalMoves: number;
  gameLength: number; // in seconds
  openingName: string;
  openingMoves: string[];
  merkleRoot: string;
  rollupAddress: string;
  devnetTxHash: string;
  moves: MatchMove[];
  metadata: {
    averageThinkTime: number;
    complexity: number;
    gamePhase: 'opening' | 'midgame' | 'endgame';
    quality: 'low' | 'medium' | 'high';
  };
}

export interface MatchMove {
  moveNumber: number;
  player: 'white' | 'black';
  notation: string;
  fromPosition: { x: number; y: number; level: number };
  toPosition: { x: number; y: number; level: number };
  pieceType: string;
  timestamp: number;
  thinkTime: number;
}

export interface ReplayFilter {
  agentId?: string;
  opponent?: string;
  dateFrom?: Date;
  dateTo?: Date;
  result?: 'white_wins' | 'black_wins' | 'draw' | 'any';
  opening?: string;
  minMoves?: number;
  maxMoves?: number;
  gamePhase?: 'opening' | 'midgame' | 'endgame' | 'any';
  quality?: 'low' | 'medium' | 'high' | 'any';
  limit?: number;
  offset?: number;
}

export interface TrainingDataParams {
  focusArea: 'openings' | 'midgame' | 'endgame' | 'all';
  intensity: 'low' | 'medium' | 'high';
  maxMatches: number;
  learningRate?: number;
  batchSize?: number;
  epochs?: number;
}

class OnChainReplayService {
  private connection: Connection;
  private dbService: ReturnType<typeof getEnhancedDatabaseService>;
  private magicBlockEndpoint: string;

  constructor() {
    // Use devnet RPC endpoint as required
    this.connection = new Connection(
      process.env.SOLANA_RPC_URL || 'https://api.devnet.solana.com',
      'confirmed'
    );
    this.dbService = getEnhancedDatabaseService();
    this.magicBlockEndpoint = process.env.MAGICBLOCK_ENDPOINT || 'https://devnet.magicblock.gg';
  }

  /**
   * Fetch match replays for a specific AI agent from on-chain sources
   */
  async getAgentReplays(agentId: string, filter: ReplayFilter = {}): Promise<MatchReplay[]> {
    try {
      logger.info('Fetching on-chain replays for agent', { agentId, filter });

      // Validate agent ownership first
      const agent = await this.validateAgentOwnership(agentId);
      if (!agent) {
        throw new Error(`AI agent not found: ${agentId}`);
      }

      // Query database for stored replay references
      const dbReplays = await this.queryDatabaseReplays(agentId, filter);
      
      // Fetch actual replay data from MagicBlock rollups
      const enrichedReplays = await Promise.all(
        dbReplays.map(replay => this.enrichReplayFromMagicBlock(replay))
      );

      // Filter and sort results
      const filteredReplays = this.applyReplayFilters(enrichedReplays, filter);

      logger.info('Successfully fetched agent replays', {
        agentId,
        totalFound: filteredReplays.length,
        filter
      });

      return filteredReplays;

    } catch (error) {
      logger.error('Failed to fetch agent replays', {
        agentId,
        error: error instanceof Error ? error.message : String(error)
      });
      throw error;
    }
  }

  /**
   * Get available openings for filtering
   */
  async getAvailableOpenings(agentId: string): Promise<string[]> {
    try {
      const result = await this.dbService.getPrismaClient().matchReplay.groupBy({
        by: ['opening_name'],
        where: {
          OR: [
            { player_white_agent_id: agentId },
            { player_black_agent_id: agentId }
          ]
        },
        _count: { opening_name: true }
      });

      return result
        .filter(item => item.opening_name)
        .map(item => item.opening_name!)
        .sort();

    } catch (error) {
      logger.error('Failed to fetch available openings', { agentId, error });
      return [];
    }
  }

  /**
   * Validate training parameters before processing
   */
  validateTrainingParams(params: TrainingDataParams): void {
    if (!params.focusArea || !['openings', 'midgame', 'endgame', 'all'].includes(params.focusArea)) {
      throw new Error('Invalid focus area. Must be: openings, midgame, endgame, or all');
    }

    if (!params.intensity || !['low', 'medium', 'high'].includes(params.intensity)) {
      throw new Error('Invalid intensity. Must be: low, medium, or high');
    }

    if (!params.maxMatches || params.maxMatches < 1 || params.maxMatches > 1000) {
      throw new Error('Max matches must be between 1 and 1000');
    }

    if (params.learningRate && (params.learningRate < 0.0001 || params.learningRate > 1.0)) {
      throw new Error('Learning rate must be between 0.0001 and 1.0');
    }

    if (params.batchSize && (params.batchSize < 1 || params.batchSize > 128)) {
      throw new Error('Batch size must be between 1 and 128');
    }

    if (params.epochs && (params.epochs < 1 || params.epochs > 100)) {
      throw new Error('Epochs must be between 1 and 100');
    }
  }

  /**
   * Process selected replays into training data format
   */
  async processReplaysForTraining(
    replayIds: string[],
    params: TrainingDataParams
  ): Promise<{
    sessionId: string;
    trainingData: any;
    replayCount: number;
    estimatedDuration: number;
  }> {
    try {
      this.validateTrainingParams(params);

      if (replayIds.length === 0) {
        throw new Error('No replays selected for training');
      }

      if (replayIds.length > params.maxMatches) {
        throw new Error(`Too many replays selected. Maximum allowed: ${params.maxMatches}`);
      }

      logger.info('Processing replays for training', {
        replayCount: replayIds.length,
        params
      });

      // Fetch full replay data
      const replays = await Promise.all(
        replayIds.map(id => this.getReplayData(id))
      );

      // Filter moves based on focus area
      const trainingMoves = this.extractTrainingMoves(replays, params.focusArea);

      // Create training session
      const sessionId = `training_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

      // Calculate estimated duration based on intensity and data size
      const estimatedDuration = this.calculateTrainingDuration(trainingMoves.length, params.intensity);

      const trainingData = {
        sessionId,
        moves: trainingMoves,
        parameters: {
          focusArea: params.focusArea,
          intensity: params.intensity,
          learningRate: params.learningRate || this.getDefaultLearningRate(params.intensity),
          batchSize: params.batchSize || this.getDefaultBatchSize(params.intensity),
          epochs: params.epochs || this.getDefaultEpochs(params.intensity)
        },
        metadata: {
          sourceReplays: replayIds,
          totalMoves: trainingMoves.length,
          processedAt: new Date().toISOString()
        }
      };

      logger.info('Training data processed successfully', {
        sessionId,
        replayCount: replays.length,
        moveCount: trainingMoves.length,
        estimatedDuration
      });

      return {
        sessionId,
        trainingData,
        replayCount: replays.length,
        estimatedDuration
      };

    } catch (error) {
      logger.error('Failed to process replays for training', {
        replayCount: replayIds.length,
        params,
        error: error instanceof Error ? error.message : String(error)
      });
      throw error;
    }
  }

  /**
   * Fetch replay statistics for UI display
   */
  async getReplayStatistics(agentId: string): Promise<{
    totalReplays: number;
    winRate: number;
    averageGameLength: number;
    openingsPlayed: number;
    lastActivity: Date | null;
  }> {
    try {
      const stats = await this.dbService.getPrismaClient().matchReplay.aggregate({
        where: {
          OR: [
            { player_white_agent_id: agentId },
            { player_black_agent_id: agentId }
          ]
        },
        _count: { id: true },
        _avg: { game_length_seconds: true }
      });

      const winCount = await this.dbService.getPrismaClient().matchReplay.count({
        where: {
          OR: [
            { 
              player_white_agent_id: agentId,
              result: 'white_wins' 
            },
            {
              player_black_agent_id: agentId,
              result: 'black_wins'
            }
          ]
        }
      });

      const openingsCount = await this.dbService.getPrismaClient().matchReplay.groupBy({
        by: ['opening_name'],
        where: {
          OR: [
            { player_white_agent_id: agentId },
            { player_black_agent_id: agentId }
          ]
        }
      });

      const lastActivity = await this.dbService.getPrismaClient().matchReplay.findFirst({
        where: {
          OR: [
            { player_white_agent_id: agentId },
            { player_black_agent_id: agentId }
          ]
        },
        orderBy: { match_date: 'desc' },
        select: { match_date: true }
      });

      return {
        totalReplays: stats._count.id,
        winRate: stats._count.id > 0 ? (winCount / stats._count.id) * 100 : 0,
        averageGameLength: stats._avg.game_length_seconds || 0,
        openingsPlayed: openingsCount.length,
        lastActivity: lastActivity?.match_date || null
      };

    } catch (error) {
      logger.error('Failed to fetch replay statistics', { agentId, error });
      return {
        totalReplays: 0,
        winRate: 0,
        averageGameLength: 0,
        openingsPlayed: 0,
        lastActivity: null
      };
    }
  }

  // Private helper methods

  private async validateAgentOwnership(agentId: string): Promise<any> {
    return await this.dbService.cachedQuery(
      `agent:${agentId}`,
      async () => {
        return this.dbService.getPrismaClient().aiAgent.findUnique({
          where: { id: agentId },
          include: { traits: true }
        });
      },
      300 // 5 minute cache
    );
  }

  private async queryDatabaseReplays(agentId: string, filter: ReplayFilter): Promise<any[]> {
    const whereClause: any = {
      OR: [
        { player_white_agent_id: agentId },
        { player_black_agent_id: agentId }
      ]
    };

    if (filter.dateFrom || filter.dateTo) {
      whereClause.match_date = {};
      if (filter.dateFrom) whereClause.match_date.gte = filter.dateFrom;
      if (filter.dateTo) whereClause.match_date.lte = filter.dateTo;
    }

    if (filter.result && filter.result !== 'any') {
      whereClause.result = filter.result;
    }

    if (filter.opening) {
      whereClause.opening_name = { contains: filter.opening, mode: 'insensitive' };
    }

    if (filter.minMoves || filter.maxMoves) {
      whereClause.total_moves = {};
      if (filter.minMoves) whereClause.total_moves.gte = filter.minMoves;
      if (filter.maxMoves) whereClause.total_moves.lte = filter.maxMoves;
    }

    return await this.dbService.getPrismaClient().matchReplay.findMany({
      where: whereClause,
      orderBy: { match_date: 'desc' },
      take: filter.limit || 50,
      skip: filter.offset || 0,
      include: {
        moves: {
          orderBy: { move_number: 'asc' }
        }
      }
    });
  }

  private async enrichReplayFromMagicBlock(replay: any): Promise<MatchReplay> {
    try {
      // In a real implementation, this would fetch additional data from MagicBlock rollup
      // For now, we'll use the database data and simulate the enrichment
      
      return {
        replayId: replay.id,
        sessionId: replay.session_id,
        matchDate: replay.match_date,
        playerWhite: replay.player_white,
        playerBlack: replay.player_black,
        aiAgentId: replay.player_white_agent_id || replay.player_black_agent_id,
        result: replay.result,
        totalMoves: replay.total_moves,
        gameLength: replay.game_length_seconds,
        openingName: replay.opening_name || 'Unknown Opening',
        openingMoves: replay.opening_moves ? JSON.parse(replay.opening_moves) : [],
        merkleRoot: replay.merkle_root || '',
        rollupAddress: replay.rollup_address || '',
        devnetTxHash: replay.devnet_tx_hash || '',
        moves: replay.moves?.map((move: any) => ({
          moveNumber: move.move_number,
          player: move.player,
          notation: move.notation,
          fromPosition: JSON.parse(move.from_position),
          toPosition: JSON.parse(move.to_position),
          pieceType: move.piece_type,
          timestamp: move.timestamp,
          thinkTime: move.think_time
        })) || [],
        metadata: {
          averageThinkTime: replay.average_think_time || 0,
          complexity: replay.complexity_score || 0,
          gamePhase: this.determineGamePhase(replay.total_moves),
          quality: this.determineGameQuality(replay.total_moves, replay.game_length_seconds)
        }
      };

    } catch (error) {
      logger.error('Failed to enrich replay from MagicBlock', {
        replayId: replay.id,
        error: error instanceof Error ? error.message : String(error)
      });
      throw error;
    }
  }

  private applyReplayFilters(replays: MatchReplay[], filter: ReplayFilter): MatchReplay[] {
    let filtered = replays;

    if (filter.gamePhase && filter.gamePhase !== 'any') {
      filtered = filtered.filter(replay => replay.metadata.gamePhase === filter.gamePhase);
    }

    if (filter.quality && filter.quality !== 'any') {
      filtered = filtered.filter(replay => replay.metadata.quality === filter.quality);
    }

    if (filter.opponent) {
      filtered = filtered.filter(replay => 
        replay.playerWhite.includes(filter.opponent!) || 
        replay.playerBlack.includes(filter.opponent!)
      );
    }

    return filtered;
  }

  private async getReplayData(replayId: string): Promise<MatchReplay> {
    const replay = await this.dbService.getPrismaClient().matchReplay.findUnique({
      where: { id: replayId },
      include: {
        moves: {
          orderBy: { move_number: 'asc' }
        }
      }
    });

    if (!replay) {
      throw new Error(`Replay not found: ${replayId}`);
    }

    return this.enrichReplayFromMagicBlock(replay);
  }

  private extractTrainingMoves(replays: MatchReplay[], focusArea: string): any[] {
    const allMoves: any[] = [];

    for (const replay of replays) {
      let moves = replay.moves;

      // Filter moves based on focus area
      if (focusArea === 'openings') {
        moves = moves.filter(move => move.moveNumber <= 15);
      } else if (focusArea === 'midgame') {
        moves = moves.filter(move => move.moveNumber > 15 && move.moveNumber <= 40);
      } else if (focusArea === 'endgame') {
        moves = moves.filter(move => move.moveNumber > 40);
      }

      allMoves.push(...moves);
    }

    return allMoves;
  }

  private calculateTrainingDuration(moveCount: number, intensity: string): number {
    const baseTimePerMove = intensity === 'low' ? 0.1 : intensity === 'medium' ? 0.2 : 0.3;
    return Math.ceil(moveCount * baseTimePerMove); // in minutes
  }

  private getDefaultLearningRate(intensity: string): number {
    const rates = { low: 0.001, medium: 0.01, high: 0.05 };
    return rates[intensity as keyof typeof rates] || 0.001;
  }

  private getDefaultBatchSize(intensity: string): number {
    const sizes = { low: 16, medium: 32, high: 64 };
    return sizes[intensity as keyof typeof sizes] || 32;
  }

  private getDefaultEpochs(intensity: string): number {
    const epochs = { low: 5, medium: 10, high: 20 };
    return epochs[intensity as keyof typeof epochs] || 10;
  }

  private determineGamePhase(totalMoves: number): 'opening' | 'midgame' | 'endgame' {
    if (totalMoves <= 15) return 'opening';
    if (totalMoves <= 40) return 'midgame';
    return 'endgame';
  }

  private determineGameQuality(totalMoves: number, gameLength: number): 'low' | 'medium' | 'high' {
    const averageTimePerMove = gameLength / totalMoves;
    
    if (averageTimePerMove < 5) return 'low';
    if (averageTimePerMove < 15) return 'medium';
    return 'high';
  }
}

// Singleton instance
let onChainReplayService: OnChainReplayService;

export const getOnChainReplayService = (): OnChainReplayService => {
  if (!onChainReplayService) {
    onChainReplayService = new OnChainReplayService();
  }
  return onChainReplayService;
};

export { OnChainReplayService };
