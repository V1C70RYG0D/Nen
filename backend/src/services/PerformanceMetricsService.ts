/**
 * Performance Metrics Service
 * Comprehensive monitoring system for key performance metrics including:
 * - Session metrics
 * - Game generation performance
 * - Memory/resource tracking
 * - Win rate calculations
 *
 * Following GI #2: Real implementations with actual database operations
 * Following GI #18: No hardcoding, externalized configuration
 * Following GI #20: Robust error handling and logging
 */

import client, { Counter, Histogram, Gauge, Summary, register } from 'prom-client';
import { logger } from '../middleware/logger';
import { config } from '../config';
import { query, transaction } from '../utils/database';
import { CacheService } from '../utils/redis';
import * as os from 'os';
import * as process from 'process';

interface SessionMetric {
  sessionId: string;
  userId?: string;
  startTime: Date;
  endTime?: Date;
  duration?: number;
  activityCount: number;
  gameMatches: number;
  betsPlaced: number;
  ipAddress?: string;
  userAgent?: string;
}

interface GameGenerationMetric {
  gameId: string;
  generationType: 'ai_vs_ai' | 'human_vs_ai' | 'human_vs_human';
  startTime: Date;
  endTime?: Date;
  generationDuration?: number;
  aiDifficulty?: string;
  moveCount: number;
  totalMoves?: number;
  completed: boolean;
  winner?: string;
  winnerType?: 'user' | 'ai';
}

interface WinRateData {
  player?: string;
  aiAgent?: string;
  wins: number;
  losses: number;
  draws: number;
  totalGames: number;
  winRate: number;
  averageGameDuration: number;
}

interface ResourceMetrics {
  timestamp: Date;
  cpuUsage: number;
  memoryUsage: number;
  memoryPercent: number;
  diskUsage?: number;
  networkConnections: number;
  activeWebSockets?: number;
}

export class PerformanceMetricsService {
  private cache: CacheService;

  // Prometheus metrics
  private sessionDurationHistogram: Histogram<string>;
  private sessionCounter: Counter<string>;
  private activeSessionsGauge: Gauge<string>;

  private gameGenerationDurationHistogram: Histogram<string>;
  private gameGenerationCounter: Counter<string>;
  private aiMoveGenerationSummary: Summary<string>;

  private memoryUsageGauge: Gauge<string>;
  private cpuUsageGauge: Gauge<string>;
  private diskUsageGauge: Gauge<string>;
  private networkConnectionsGauge: Gauge<string>;

  private winRateGauge: Gauge<string>;
  private gameOutcomeCounter: Counter<string>;
  private matchDurationHistogram: Histogram<string>;

  constructor() {
    this.cache = new CacheService();
    this.initializeMetrics();
    this.startResourceMonitoring();
  }

  private initializeMetrics(): void {
    // Session Metrics
    this.sessionDurationHistogram = new Histogram({
      name: 'nen_session_duration_seconds',
      help: 'Duration of user sessions in seconds',
      labelNames: ['user_type', 'session_type'],
      buckets: [30, 60, 300, 900, 1800, 3600, 7200] // 30s to 2h
    });

    this.sessionCounter = new Counter({
      name: 'nen_sessions_total',
      help: 'Total number of user sessions',
      labelNames: ['user_type', 'outcome']
    });

    this.activeSessionsGauge = new Gauge({
      name: 'nen_active_sessions',
      help: 'Number of currently active sessions',
      labelNames: ['user_type']
    });

    // Game Generation Metrics
    this.gameGenerationDurationHistogram = new Histogram({
      name: 'nen_game_generation_duration_seconds',
      help: 'Duration of game generation in seconds',
      labelNames: ['game_type', 'ai_difficulty'],
      buckets: [0.1, 0.5, 1, 2, 5, 10, 30] // 100ms to 30s
    });

    this.gameGenerationCounter = new Counter({
      name: 'nen_games_generated_total',
      help: 'Total number of games generated',
      labelNames: ['game_type', 'outcome']
    });

    this.aiMoveGenerationSummary = new Summary({
      name: 'nen_ai_move_generation_seconds',
      help: 'Time taken to generate AI moves',
      labelNames: ['ai_agent', 'difficulty'],
      percentiles: [0.5, 0.9, 0.95, 0.99]
    });

    // Resource Metrics
    this.memoryUsageGauge = new Gauge({
      name: 'nen_memory_usage_bytes',
      help: 'Memory usage in bytes',
      labelNames: ['type']
    });

    this.cpuUsageGauge = new Gauge({
      name: 'nen_cpu_usage_percent',
      help: 'CPU usage percentage',
      labelNames: ['core']
    });

    this.diskUsageGauge = new Gauge({
      name: 'nen_disk_usage_bytes',
      help: 'Disk usage in bytes',
      labelNames: ['mount']
    });

    this.networkConnectionsGauge = new Gauge({
      name: 'nen_network_connections',
      help: 'Number of network connections',
      labelNames: ['state']
    });

    // Win Rate Metrics
    this.winRateGauge = new Gauge({
      name: 'nen_win_rate_percent',
      help: 'Win rate percentage',
      labelNames: ['player_type', 'player_id', 'difficulty']
    });

    this.gameOutcomeCounter = new Counter({
      name: 'nen_game_outcomes_total',
      help: 'Total game outcomes',
      labelNames: ['outcome', 'player_type', 'match_type']
    });

    this.matchDurationHistogram = new Histogram({
      name: 'nen_match_duration_seconds',
      help: 'Duration of matches in seconds',
      labelNames: ['match_type', 'outcome'],
      buckets: [60, 300, 900, 1800, 3600, 7200] // 1m to 2h
    });

    logger.info('Performance metrics initialized successfully');
  }

  // Session Metrics
  async trackSessionStart(sessionId: string, userId?: string, metadata?: any): Promise<void> {
    try {
      const sessionMetric: SessionMetric = {
        sessionId,
        userId,
        startTime: new Date(),
        activityCount: 0,
        gameMatches: 0,
        betsPlaced: 0,
        ipAddress: metadata?.ipAddress,
        userAgent: metadata?.userAgent
      };

      // Store in database
      await query(`
        INSERT INTO session_metrics (
          session_id, user_id, start_time, activity_count,
          game_matches, bets_placed, ip_address, user_agent
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      `, [
        sessionId, userId, sessionMetric.startTime, 0,
        0, 0, metadata?.ipAddress, metadata?.userAgent
      ]);

      // Cache for quick access
      await this.cache.set(`session:${sessionId}`, sessionMetric, 7200);

      // Update Prometheus metrics
      const userType = userId ? 'registered' : 'anonymous';
      this.sessionCounter.inc({ user_type: userType, outcome: 'started' });
      this.activeSessionsGauge.inc({ user_type: userType });

      logger.info('Session tracking started', { sessionId, userId });
    } catch (error) {
      logger.error('Error tracking session start:', error);
      throw error;
    }
  }

  async trackSessionActivity(sessionId: string, activityType: string, metadata?: any): Promise<void> {
    try {
      // Get session from cache or database
      let session = await this.cache.get<SessionMetric>(`session:${sessionId}`);

      if (!session) {
        const rows = await query('SELECT * FROM session_metrics WHERE session_id = $1', [sessionId]);
        if (rows.length === 0) {
          logger.warn('Session not found for activity tracking', { sessionId });
          return;
        }
        session = this.mapSessionFromDB(rows[0]);
      }

      // Update activity count
      session.activityCount++;

      if (activityType === 'game_match') {
        session.gameMatches++;
      } else if (activityType === 'bet_placed') {
        session.betsPlaced++;
      }

      // Update database
      await query(`
        UPDATE session_metrics
        SET activity_count = $2, game_matches = $3, bets_placed = $4, updated_at = CURRENT_TIMESTAMP
        WHERE session_id = $1
      `, [sessionId, session.activityCount, session.gameMatches, session.betsPlaced]);

      // Update cache
      await this.cache.set(`session:${sessionId}`, session, 7200);

      logger.debug('Session activity tracked', { sessionId, activityType, count: session.activityCount });
    } catch (error) {
      logger.error('Error tracking session activity:', error);
    }
  }

  async trackSessionEnd(sessionId: string): Promise<void> {
    try {
      const session = await this.cache.get<SessionMetric>(`session:${sessionId}`);
      if (!session) {
        logger.warn('Session not found for end tracking', { sessionId });
        return;
      }

      const endTime = new Date();
      const duration = Math.floor((endTime.getTime() - session.startTime.getTime()) / 1000);

      // Update database
      await query(`
        UPDATE session_metrics
        SET end_time = $2, duration = $3, updated_at = CURRENT_TIMESTAMP
        WHERE session_id = $1
      `, [sessionId, endTime, duration]);

      // Update Prometheus metrics
      const userType = session.userId ? 'registered' : 'anonymous';
      this.sessionDurationHistogram.observe({ user_type: userType, session_type: 'normal' }, duration);
      this.sessionCounter.inc({ user_type: userType, outcome: 'completed' });
      this.activeSessionsGauge.dec({ user_type: userType });

      // Clean up cache
      await this.cache.del(`session:${sessionId}`);

      logger.info('Session tracking ended', { sessionId, duration });
    } catch (error) {
      logger.error('Error tracking session end:', error);
    }
  }

  // Game Generation Metrics
  async trackGameGenerationStart(gameId: string, generationType: string, aiDifficulty?: string): Promise<void> {
    try {
      const gameMetric: GameGenerationMetric = {
        gameId,
        generationType: generationType as any,
        startTime: new Date(),
        moveCount: 0,
        completed: false,
        aiDifficulty
      };

      // Store in database
      await query(`
        INSERT INTO game_generation_metrics (
          game_id, generation_type, start_time, move_count,
          completed, ai_difficulty
        ) VALUES ($1, $2, $3, $4, $5, $6)
      `, [gameId, generationType, gameMetric.startTime, 0, false, aiDifficulty]);

      // Cache for tracking
      await this.cache.set(`game_gen:${gameId}`, gameMetric, 3600);

      logger.info('Game generation tracking started', { gameId, generationType, aiDifficulty });
    } catch (error) {
      logger.error('Error tracking game generation start:', error);
      throw error;
    }
  }

  async trackGameGenerationMove(gameId: string, moveNumber: number, aiGenerationTime?: number): Promise<void> {
    try {
      let gameMetric = await this.cache.get<GameGenerationMetric>(`game_gen:${gameId}`);

      if (!gameMetric) {
        const rows = await query('SELECT * FROM game_generation_metrics WHERE game_id = $1', [gameId]);
        if (rows.length === 0) return;
        gameMetric = this.mapGameMetricFromDB(rows[0]);
      }

      gameMetric.moveCount = moveNumber;

      // Track AI move generation time if provided
      if (aiGenerationTime && gameMetric.generationType !== 'human_vs_human') {
        this.aiMoveGenerationSummary.observe(
          { ai_agent: 'default', difficulty: gameMetric.aiDifficulty || 'medium' },
          aiGenerationTime
        );
      }

      // Update database
      await query(`
        UPDATE game_generation_metrics
        SET move_count = $2, updated_at = CURRENT_TIMESTAMP
        WHERE game_id = $1
      `, [gameId, moveNumber]);

      // Update cache
      await this.cache.set(`game_gen:${gameId}`, gameMetric, 3600);

      logger.debug('Game generation move tracked', { gameId, moveNumber });
    } catch (error) {
      logger.error('Error tracking game generation move:', error);
    }
  }

  async trackGameGenerationEnd(gameId: string, winner?: string, winnerType?: string): Promise<void> {
    try {
      const gameMetric = await this.cache.get<GameGenerationMetric>(`game_gen:${gameId}`);
      if (!gameMetric) {
        logger.warn('Game generation metric not found for end tracking', { gameId });
        return;
      }

      const endTime = new Date();
      const duration = Math.floor((endTime.getTime() - gameMetric.startTime.getTime()) / 1000);

      // Update database
      await query(`
        UPDATE game_generation_metrics
        SET end_time = $2, generation_duration = $3, completed = $4,
            winner = $5, winner_type = $6, total_moves = $7, updated_at = CURRENT_TIMESTAMP
        WHERE game_id = $1
      `, [gameId, endTime, duration, true, winner, winnerType, gameMetric.moveCount]);

      // Update Prometheus metrics
      this.gameGenerationDurationHistogram.observe(
        { game_type: gameMetric.generationType, ai_difficulty: gameMetric.aiDifficulty || 'none' },
        duration
      );

      this.gameGenerationCounter.inc({ game_type: gameMetric.generationType, outcome: 'completed' });

      this.gameOutcomeCounter.inc({
        outcome: winner ? 'win' : 'draw',
        player_type: winnerType || 'unknown',
        match_type: gameMetric.generationType
      });

      this.matchDurationHistogram.observe(
        { match_type: gameMetric.generationType, outcome: winner ? 'win' : 'draw' },
        duration
      );

      // Clean up cache
      await this.cache.del(`game_gen:${gameId}`);

      logger.info('Game generation tracking ended', { gameId, duration, winner });
    } catch (error) {
      logger.error('Error tracking game generation end:', error);
    }
  }

  // Win Rate Calculations
  async calculateWinRates(playerId?: string, aiAgentId?: string, timeframe?: string): Promise<WinRateData[]> {
    try {
      let timeCondition = '';
      const params: any[] = [];
      let paramIndex = 1;

      if (timeframe) {
        timeCondition = `AND created_at >= NOW() - INTERVAL '${timeframe}'`;
      }

      let query_text = `
        SELECT
          player1_id, player2_id, ai_agent1_id, ai_agent2_id,
          winner_id, winner_type, match_type,
          EXTRACT(EPOCH FROM (updated_at - created_at)) as duration
        FROM matches
        WHERE status = 'completed' ${timeCondition}
      `;

      if (playerId) {
        query_text += ` AND (player1_id = $${paramIndex} OR player2_id = $${paramIndex})`;
        params.push(playerId);
        paramIndex++;
      }

      if (aiAgentId) {
        query_text += ` AND (ai_agent1_id = $${paramIndex} OR ai_agent2_id = $${paramIndex})`;
        params.push(aiAgentId);
      }

      const rows = await query(query_text, params);
      const winRateMap = new Map<string, WinRateData>();

      // Process results
      rows.forEach((row: any) => {
        const players = [
          { id: row.player1_id, type: 'user' },
          { id: row.player2_id, type: 'user' },
          { id: row.ai_agent1_id, type: 'ai' },
          { id: row.ai_agent2_id, type: 'ai' }
        ].filter(p => p.id);

        players.forEach(player => {
          const key = `${player.type}:${player.id}`;

          if (!winRateMap.has(key)) {
            winRateMap.set(key, {
              [player.type === 'user' ? 'player' : 'aiAgent']: player.id,
              wins: 0,
              losses: 0,
              draws: 0,
              totalGames: 0,
              winRate: 0,
              averageGameDuration: 0
            });
          }

          const stats = winRateMap.get(key)!;
          stats.totalGames++;

          if (row.winner_id === player.id) {
            stats.wins++;
          } else if (row.winner_id) {
            stats.losses++;
          } else {
            stats.draws++;
          }

          // Update average duration
          const previousAvg = stats.averageGameDuration;
          stats.averageGameDuration = (previousAvg * (stats.totalGames - 1) + row.duration) / stats.totalGames;
        });
      });

      // Calculate win rates and update Prometheus metrics
      const results: WinRateData[] = Array.from(winRateMap.values()).map(stats => {
        stats.winRate = stats.totalGames > 0 ? (stats.wins / stats.totalGames) * 100 : 0;

        // Update Prometheus metric
        const playerType = stats.player ? 'user' : 'ai';
        const playerId = stats.player || stats.aiAgent || 'unknown';
        this.winRateGauge.set(
          { player_type: playerType, player_id: playerId, difficulty: 'all' },
          stats.winRate
        );

        return stats;
      });

      logger.info('Win rates calculated', { count: results.length, timeframe });
      return results;
    } catch (error) {
      logger.error('Error calculating win rates:', error);
      throw error;
    }
  }

  // Resource Monitoring
  private startResourceMonitoring(): void {
    // Monitor system resources every 30 seconds
    setInterval(async () => {
      try {
        await this.collectResourceMetrics();
      } catch (error) {
        logger.error('Error collecting resource metrics:', error);
      }
    }, 30000);

    logger.info('Resource monitoring started');
  }

  private async collectResourceMetrics(): Promise<void> {
    try {
      const memUsage = process.memoryUsage();
      const cpuUsage = process.cpuUsage();

      // Memory metrics
      this.memoryUsageGauge.set({ type: 'rss' }, memUsage.rss);
      this.memoryUsageGauge.set({ type: 'heap_used' }, memUsage.heapUsed);
      this.memoryUsageGauge.set({ type: 'heap_total' }, memUsage.heapTotal);
      this.memoryUsageGauge.set({ type: 'external' }, memUsage.external);

      // CPU metrics (simplified)
      const cpuPercent = (cpuUsage.user + cpuUsage.system) / 1000000; // Convert to seconds
      this.cpuUsageGauge.set({ core: 'total' }, cpuPercent);

      // System metrics
      const freeMem = os.freemem();
      const totalMem = os.totalmem();
      const memoryPercent = ((totalMem - freeMem) / totalMem) * 100;

      this.memoryUsageGauge.set({ type: 'system_used' }, totalMem - freeMem);
      this.memoryUsageGauge.set({ type: 'system_free' }, freeMem);

      // Store in database for historical analysis
      const resourceMetric: ResourceMetrics = {
        timestamp: new Date(),
        cpuUsage: cpuPercent,
        memoryUsage: memUsage.heapUsed,
        memoryPercent,
        networkConnections: 0 // Would need additional system calls to get actual value
      };

      await query(`
        INSERT INTO resource_metrics (
          timestamp, cpu_usage, memory_usage, memory_percent, network_connections
        ) VALUES ($1, $2, $3, $4, $5)
      `, [
        resourceMetric.timestamp, resourceMetric.cpuUsage,
        resourceMetric.memoryUsage, resourceMetric.memoryPercent,
        resourceMetric.networkConnections
      ]);

      logger.debug('Resource metrics collected', {
        memoryMB: Math.round(memUsage.heapUsed / 1024 / 1024),
        memoryPercent: Math.round(memoryPercent * 100) / 100
      });
    } catch (error) {
      logger.error('Error collecting resource metrics:', error);
    }
  }

  // Analytics and Reporting
  async getPerformanceReport(timeframe: string = '24h'): Promise<any> {
    try {
      const [sessionStats, gameStats, resourceStats, winRates] = await Promise.all([
        this.getSessionStatistics(timeframe),
        this.getGameGenerationStatistics(timeframe),
        this.getResourceStatistics(timeframe),
        this.calculateWinRates(undefined, undefined, timeframe)
      ]);

      const report = {
        timeframe,
        generated_at: new Date(),
        sessions: sessionStats,
        games: gameStats,
        resources: resourceStats,
        winRates: winRates.slice(0, 10), // Top 10
        summary: {
          total_sessions: sessionStats.total,
          active_sessions: sessionStats.active,
          total_games: gameStats.total,
          completed_games: gameStats.completed,
          average_game_duration: gameStats.averageDuration,
          system_health: this.getSystemHealthStatus(resourceStats)
        }
      };

      logger.info('Performance report generated', { timeframe });
      return report;
    } catch (error) {
      logger.error('Error generating performance report:', error);
      throw error;
    }
  }

  private async getSessionStatistics(timeframe: string): Promise<any> {
    const rows = await query(`
      SELECT
        COUNT(*) as total,
        COUNT(CASE WHEN end_time IS NULL THEN 1 END) as active,
        AVG(duration) as avg_duration,
        SUM(activity_count) as total_activities,
        SUM(game_matches) as total_game_matches,
        SUM(bets_placed) as total_bets
      FROM session_metrics
      WHERE start_time >= NOW() - INTERVAL '${timeframe}'
    `);

    return rows[0] || {};
  }

  private async getGameGenerationStatistics(timeframe: string): Promise<any> {
    const rows = await query(`
      SELECT
        COUNT(*) as total,
        COUNT(CASE WHEN completed = true THEN 1 END) as completed,
        AVG(generation_duration) as avg_duration,
        AVG(total_moves) as avg_moves,
        generation_type,
        COUNT(*) as type_count
      FROM game_generation_metrics
      WHERE start_time >= NOW() - INTERVAL '${timeframe}'
      GROUP BY generation_type
    `);

    return {
      total: rows.reduce((sum, row) => sum + parseInt(row.type_count), 0),
      completed: rows.reduce((sum, row) => sum + parseInt(row.completed), 0),
      averageDuration: rows.length > 0 ? rows.reduce((sum, row) => sum + (parseFloat(row.avg_duration) || 0), 0) / rows.length : 0,
      byType: rows
    };
  }

  private async getResourceStatistics(timeframe: string): Promise<any> {
    const rows = await query(`
      SELECT
        AVG(cpu_usage) as avg_cpu,
        MAX(cpu_usage) as max_cpu,
        AVG(memory_usage) as avg_memory,
        MAX(memory_usage) as max_memory,
        AVG(memory_percent) as avg_memory_percent
      FROM resource_metrics
      WHERE timestamp >= NOW() - INTERVAL '${timeframe}'
    `);

    return rows[0] || {};
  }

  private getSystemHealthStatus(resourceStats: any): string {
    const avgCpu = parseFloat(resourceStats.avg_cpu) || 0;
    const avgMemoryPercent = parseFloat(resourceStats.avg_memory_percent) || 0;

    if (avgCpu > 80 || avgMemoryPercent > 85) {
      return 'critical';
    } else if (avgCpu > 60 || avgMemoryPercent > 70) {
      return 'warning';
    } else {
      return 'healthy';
    }
  }

  // Helper methods
  private mapSessionFromDB(row: any): SessionMetric {
    return {
      sessionId: row.session_id,
      userId: row.user_id,
      startTime: new Date(row.start_time),
      endTime: row.end_time ? new Date(row.end_time) : undefined,
      duration: row.duration,
      activityCount: row.activity_count,
      gameMatches: row.game_matches,
      betsPlaced: row.bets_placed,
      ipAddress: row.ip_address,
      userAgent: row.user_agent
    };
  }

  private mapGameMetricFromDB(row: any): GameGenerationMetric {
    return {
      gameId: row.game_id,
      generationType: row.generation_type,
      startTime: new Date(row.start_time),
      endTime: row.end_time ? new Date(row.end_time) : undefined,
      generationDuration: row.generation_duration,
      aiDifficulty: row.ai_difficulty,
      moveCount: row.move_count,
      totalMoves: row.total_moves,
      completed: row.completed,
      winner: row.winner,
      winnerType: row.winner_type
    };
  }
}

export const performanceMetricsService = new PerformanceMetricsService();
