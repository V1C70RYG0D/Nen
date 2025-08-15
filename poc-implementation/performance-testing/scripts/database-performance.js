#!/usr/bin/env node

const { performance } = require('perf_hooks');
const fs = require('fs');
const path = require('path');

/**
 * Database Performance Testing Script
 * 
 * Tests:
 * - Query execution times
 * - Connection pooling efficiency
 * - Index effectiveness
 * - Concurrent query handling
 * - Transaction performance
 * - Memory usage during operations
 */

class DatabasePerformanceTester {
  constructor(options = {}) {
    this.config = {
      databaseUrl: options.databaseUrl || process.env.DATABASE_URL || 'postgresql://localhost:5432/nen_db',
      testDuration: options.testDuration || 60000, // 1 minute
      concurrency: options.concurrency || 10,
      outputDir: options.outputDir || path.join(__dirname, '../reports'),
      ...options
    };

    this.results = {
      queries: [],
      connections: [],
      transactions: [],
      indexes: []
    };

    this.startTime = Date.now();
  }

  /**
   * Run all database performance tests
   */
  async runAll() {
    console.log('🗄️  Starting Database Performance Testing');
    console.log('=' .repeat(50));

    try {
      // Initialize database connection (mock for POC)
      await this.initializeDatabase();

      // Run test suites
      await this.testQueryPerformance();
      await this.testConnectionPooling();
      await this.testIndexEffectiveness();
      await this.testConcurrentQueries();
      await this.testTransactionPerformance();

      // Generate report
      await this.generateReport();

      console.log('✅ Database performance testing completed');

    } catch (error) {
      console.error('❌ Database performance testing failed:', error);
      throw error;
    }
  }

  /**
   * Initialize database connection (mock implementation)
   */
  async initializeDatabase() {
    console.log('🔌 Initializing database connection...');
    
    // Mock database initialization
    this.db = {
      query: async (sql, params) => {
        // Simulate query execution time
        const executionTime = Math.random() * 100 + 10; // 10-110ms
        await new Promise(resolve => setTimeout(resolve, executionTime));
        
        return {
          rows: this.generateMockData(sql),
          executionTime,
          rowCount: Math.floor(Math.random() * 1000)
        };
      },
      
      getConnection: async () => {
        // Simulate connection acquisition time
        const acquisitionTime = Math.random() * 50 + 5; // 5-55ms
        await new Promise(resolve => setTimeout(resolve, acquisitionTime));
        
        return {
          query: this.db.query,
          release: () => Promise.resolve(),
          acquisitionTime
        };
      },
      
      transaction: async (callback) => {
        const startTime = performance.now();
        try {
          const result = await callback();
          return {
            result,
            duration: performance.now() - startTime
          };
        } catch (error) {
          throw error;
        }
      }
    };

    console.log('  ✅ Database connection initialized');
  }

  /**
   * Test query performance with various scenarios
   */
  async testQueryPerformance() {
    console.log('\n📊 Testing Query Performance...');

    const queries = [
      {
        name: 'Simple SELECT',
        sql: 'SELECT id, username, email FROM users WHERE id = $1',
        params: [1],
        category: 'basic'
      },
      {
        name: 'Complex JOIN',
        sql: `
          SELECT g.id, g.game_type, u1.username as white_player, u2.username as black_player,
                 COUNT(m.id) as move_count
          FROM games g
          JOIN users u1 ON g.white_player_id = u1.id
          JOIN users u2 ON g.black_player_id = u2.id
          LEFT JOIN moves m ON g.id = m.game_id
          WHERE g.status = $1
          GROUP BY g.id, g.game_type, u1.username, u2.username
          ORDER BY g.created_at DESC
          LIMIT $2
        `,
        params: ['active', 50],
        category: 'complex'
      },
      {
        name: 'Aggregation Query',
        sql: `
          SELECT u.username, 
                 COUNT(g.id) as games_played,
                 AVG(CASE WHEN g.winner_id = u.id THEN 1 ELSE 0 END) as win_rate,
                 AVG(g.duration_seconds) as avg_game_duration
          FROM users u
          LEFT JOIN games g ON (u.id = g.white_player_id OR u.id = g.black_player_id)
          WHERE g.status = 'completed'
          GROUP BY u.id, u.username
          HAVING COUNT(g.id) > $1
          ORDER BY win_rate DESC, games_played DESC
        `,
        params: [10],
        category: 'aggregation'
      },
      {
        name: 'Full Text Search',
        sql: `
          SELECT g.id, g.game_type, g.pgn_notation,
                 ts_rank(to_tsvector('english', g.pgn_notation), plainto_tsquery($1)) as rank
          FROM games g
          WHERE to_tsvector('english', g.pgn_notation) @@ plainto_tsquery($1)
          ORDER BY rank DESC
          LIMIT $2
        `,
        params: ['opening gambits', 25],
        category: 'search'
      },
      {
        name: 'Leaderboard Query',
        sql: `
          WITH user_stats AS (
            SELECT u.id, u.username,
                   COUNT(g.id) as total_games,
                   SUM(CASE WHEN g.winner_id = u.id THEN 1 ELSE 0 END) as wins,
                   AVG(CASE WHEN g.winner_id = u.id THEN 1 ELSE 0 END) as win_rate,
                   MAX(g.created_at) as last_game
            FROM users u
            LEFT JOIN games g ON (u.id = g.white_player_id OR u.id = g.black_player_id)
            WHERE g.created_at > NOW() - INTERVAL '30 days'
            GROUP BY u.id, u.username
          )
          SELECT * FROM user_stats
          WHERE total_games >= $1
          ORDER BY win_rate DESC, total_games DESC
          LIMIT $2
        `,
        params: [5, 100],
        category: 'leaderboard'
      }
    ];

    for (const queryTest of queries) {
      console.log(`  🔍 Testing: ${queryTest.name}`);
      
      const iterations = queryTest.category === 'complex' ? 10 : 50;
      const times = [];
      
      for (let i = 0; i < iterations; i++) {
        const startTime = performance.now();
        try {
          const result = await this.db.query(queryTest.sql, queryTest.params);
          const endTime = performance.now();
          const executionTime = endTime - startTime;
          
          times.push(executionTime);
          
          this.results.queries.push({
            name: queryTest.name,
            category: queryTest.category,
            executionTime,
            rowCount: result.rowCount,
            iteration: i + 1,
            timestamp: new Date().toISOString()
          });
          
        } catch (error) {
          console.error(`    ❌ Query failed on iteration ${i + 1}:`, error.message);
          times.push(null);
        }
      }
      
      const validTimes = times.filter(t => t !== null);
      if (validTimes.length > 0) {
        const avg = validTimes.reduce((sum, t) => sum + t, 0) / validTimes.length;
        const min = Math.min(...validTimes);
        const max = Math.max(...validTimes);
        const p95 = this.percentile(validTimes.sort((a, b) => a - b), 95);
        
        console.log(`    ⏱️  Avg: ${avg.toFixed(2)}ms, Min: ${min.toFixed(2)}ms, Max: ${max.toFixed(2)}ms, P95: ${p95.toFixed(2)}ms`);
      }
    }
  }

  /**
   * Test connection pooling performance
   */
  async testConnectionPooling() {
    console.log('\n🏊 Testing Connection Pooling...');

    const poolSizes = [5, 10, 25, 50];
    
    for (const poolSize of poolSizes) {
      console.log(`  📊 Testing pool size: ${poolSize}`);
      
      // Simulate concurrent connection requests
      const connectionPromises = Array(poolSize * 2).fill(null).map(async (_, index) => {
        const startTime = performance.now();
        
        try {
          const connection = await this.db.getConnection();
          const acquisitionTime = performance.now() - startTime;
          
          // Simulate work with connection
          await connection.query('SELECT 1', []);
          
          // Release connection
          await connection.release();
          
          return {
            poolSize,
            acquisitionTime,
            index,
            success: true
          };
          
        } catch (error) {
          return {
            poolSize,
            acquisitionTime: null,
            index,
            success: false,
            error: error.message
          };
        }
      });
      
      const results = await Promise.allSettled(connectionPromises);
      const successfulResults = results
        .filter(r => r.status === 'fulfilled' && r.value.success)
        .map(r => r.value);
      
      if (successfulResults.length > 0) {
        const avgAcquisitionTime = successfulResults.reduce((sum, r) => sum + r.acquisitionTime, 0) / successfulResults.length;
        const maxAcquisitionTime = Math.max(...successfulResults.map(r => r.acquisitionTime));
        
        console.log(`    ⏱️  Avg acquisition: ${avgAcquisitionTime.toFixed(2)}ms, Max: ${maxAcquisitionTime.toFixed(2)}ms`);
        console.log(`    ✅ Success rate: ${(successfulResults.length / connectionPromises.length * 100).toFixed(1)}%`);
        
        this.results.connections.push({
          poolSize,
          avgAcquisitionTime,
          maxAcquisitionTime,
          successRate: successfulResults.length / connectionPromises.length,
          totalRequests: connectionPromises.length,
          timestamp: new Date().toISOString()
        });
      }
    }
  }

  /**
   * Test index effectiveness
   */
  async testIndexEffectiveness() {
    console.log('\n🔍 Testing Index Effectiveness...');

    const indexTests = [
      {
        name: 'Primary Key Lookup',
        withIndex: 'SELECT * FROM games WHERE id = $1',
        withoutIndex: 'SELECT * FROM games WHERE CAST(id AS TEXT) = CAST($1 AS TEXT)', // Force table scan
        params: [12345]
      },
      {
        name: 'User Email Lookup',
        withIndex: 'SELECT * FROM users WHERE email = $1',
        withoutIndex: 'SELECT * FROM users WHERE LOWER(email) = LOWER($1)', // May not use index
        params: ['test@example.com']
      },
      {
        name: 'Game Status Filter',
        withIndex: 'SELECT * FROM games WHERE status = $1',
        withoutIndex: 'SELECT * FROM games WHERE status || \'\' = $1', // Force table scan
        params: ['active']
      },
      {
        name: 'Date Range Query',
        withIndex: 'SELECT * FROM games WHERE created_at BETWEEN $1 AND $2',
        withoutIndex: 'SELECT * FROM games WHERE EXTRACT(epoch FROM created_at) BETWEEN EXTRACT(epoch FROM $1::timestamp) AND EXTRACT(epoch FROM $2::timestamp)',
        params: ['2024-01-01', '2024-12-31']
      }
    ];

    for (const test of indexTests) {
      console.log(`  📊 Testing: ${test.name}`);
      
      // Test with index
      const withIndexTimes = [];
      for (let i = 0; i < 20; i++) {
        const startTime = performance.now();
        await this.db.query(test.withIndex, test.params);
        const endTime = performance.now();
        withIndexTimes.push(endTime - startTime);
      }
      
      // Test without index (simulated)
      const withoutIndexTimes = [];
      for (let i = 0; i < 20; i++) {
        const startTime = performance.now();
        await this.db.query(test.withoutIndex, test.params);
        const endTime = performance.now();
        withoutIndexTimes.push(endTime - startTime);
      }
      
      const avgWithIndex = withIndexTimes.reduce((sum, t) => sum + t, 0) / withIndexTimes.length;
      const avgWithoutIndex = withoutIndexTimes.reduce((sum, t) => sum + t, 0) / withoutIndexTimes.length;
      const improvement = ((avgWithoutIndex - avgWithIndex) / avgWithoutIndex) * 100;
      
      console.log(`    ⚡ With index: ${avgWithIndex.toFixed(2)}ms`);
      console.log(`    🐌 Without index: ${avgWithoutIndex.toFixed(2)}ms`);
      console.log(`    📈 Improvement: ${improvement.toFixed(1)}%`);
      
      this.results.indexes.push({
        name: test.name,
        avgWithIndex,
        avgWithoutIndex,
        improvement,
        timestamp: new Date().toISOString()
      });
    }
  }

  /**
   * Test concurrent query handling
   */
  async testConcurrentQueries() {
    console.log('\n⚡ Testing Concurrent Query Handling...');

    const concurrencyLevels = [5, 10, 25, 50];
    
    for (const concurrency of concurrencyLevels) {
      console.log(`  📊 Testing ${concurrency} concurrent queries`);
      
      const queries = Array(concurrency).fill(null).map((_, index) => ({
        sql: `
          SELECT g.id, g.game_type, COUNT(m.id) as move_count
          FROM games g
          LEFT JOIN moves m ON g.id = m.game_id
          WHERE g.id = $1
          GROUP BY g.id, g.game_type
        `,
        params: [index + 1]
      }));
      
      const startTime = performance.now();
      
      const queryPromises = queries.map(async (query, index) => {
        const queryStart = performance.now();
        try {
          const result = await this.db.query(query.sql, query.params);
          const queryEnd = performance.now();
          
          return {
            index,
            executionTime: queryEnd - queryStart,
            rowCount: result.rowCount,
            success: true
          };
        } catch (error) {
          return {
            index,
            executionTime: null,
            success: false,
            error: error.message
          };
        }
      });
      
      const results = await Promise.allSettled(queryPromises);
      const endTime = performance.now();
      const totalTime = endTime - startTime;
      
      const successfulResults = results
        .filter(r => r.status === 'fulfilled' && r.value.success)
        .map(r => r.value);
      
      if (successfulResults.length > 0) {
        const avgQueryTime = successfulResults.reduce((sum, r) => sum + r.executionTime, 0) / successfulResults.length;
        const throughput = successfulResults.length / (totalTime / 1000); // queries per second
        
        console.log(`    ⏱️  Total time: ${totalTime.toFixed(2)}ms`);
        console.log(`    🚀 Throughput: ${throughput.toFixed(2)} queries/sec`);
        console.log(`    📊 Avg query time: ${avgQueryTime.toFixed(2)}ms`);
        console.log(`    ✅ Success rate: ${(successfulResults.length / concurrency * 100).toFixed(1)}%`);
      }
    }
  }

  /**
   * Test transaction performance
   */
  async testTransactionPerformance() {
    console.log('\n💳 Testing Transaction Performance...');

    const transactionTests = [
      {
        name: 'Simple Transaction',
        operations: [
          'INSERT INTO users (username, email) VALUES ($1, $2)',
          'UPDATE user_stats SET games_played = games_played + 1 WHERE user_id = $1'
        ]
      },
      {
        name: 'Complex Transaction',
        operations: [
          'INSERT INTO games (white_player_id, black_player_id, game_type) VALUES ($1, $2, $3)',
          'INSERT INTO moves (game_id, player_id, move_notation, position) VALUES ($1, $2, $3, $4)',
          'UPDATE users SET total_games = total_games + 1 WHERE id IN ($1, $2)',
          'UPDATE game_stats SET active_games = active_games + 1'
        ]
      }
    ];

    for (const test of transactionTests) {
      console.log(`  💾 Testing: ${test.name}`);
      
      const iterations = 30;
      const times = [];
      
      for (let i = 0; i < iterations; i++) {
        try {
          const result = await this.db.transaction(async () => {
            // Simulate transaction operations
            for (const operation of test.operations) {
              await this.db.query(operation, [i + 1, i + 2, 'test_data']);
            }
            return { success: true };
          });
          
          times.push(result.duration);
          
          this.results.transactions.push({
            name: test.name,
            duration: result.duration,
            operations: test.operations.length,
            iteration: i + 1,
            timestamp: new Date().toISOString()
          });
          
        } catch (error) {
          console.error(`    ❌ Transaction failed on iteration ${i + 1}:`, error.message);
          times.push(null);
        }
      }
      
      const validTimes = times.filter(t => t !== null);
      if (validTimes.length > 0) {
        const avg = validTimes.reduce((sum, t) => sum + t, 0) / validTimes.length;
        const min = Math.min(...validTimes);
        const max = Math.max(...validTimes);
        
        console.log(`    ⏱️  Avg: ${avg.toFixed(2)}ms, Min: ${min.toFixed(2)}ms, Max: ${max.toFixed(2)}ms`);
        console.log(`    📊 Operations per transaction: ${test.operations.length}`);
        console.log(`    ✅ Success rate: ${(validTimes.length / iterations * 100).toFixed(1)}%`);
      }
    }
  }

  /**
   * Generate mock data based on query type
   */
  generateMockData(sql) {
    if (sql.includes('users')) {
      return [
        { id: 1, username: 'testuser1', email: 'test1@example.com' },
        { id: 2, username: 'testuser2', email: 'test2@example.com' }
      ];
    } else if (sql.includes('games')) {
      return [
        { id: 1, game_type: 'gungi', status: 'active', created_at: new Date() },
        { id: 2, game_type: 'chess', status: 'completed', created_at: new Date() }
      ];
    }
    return [{ result: 'mock_data' }];
  }

  /**
   * Calculate percentile
   */
  percentile(sortedArray, percentile) {
    const index = (percentile / 100) * (sortedArray.length - 1);
    const lower = Math.floor(index);
    const upper = Math.ceil(index);
    const weight = index - lower;
    
    if (lower === upper) {
      return sortedArray[lower];
    }
    
    return sortedArray[lower] * (1 - weight) + sortedArray[upper] * weight;
  }

  /**
   * Generate comprehensive database performance report
   */
  async generateReport() {
    console.log('\n📊 Generating Database Performance Report...');

    const endTime = Date.now();
    const totalDuration = endTime - this.startTime;

    const report = {
      metadata: {
        timestamp: new Date().toISOString(),
        duration: totalDuration,
        configuration: this.config
      },
      summary: {
        totalQueries: this.results.queries.length,
        avgQueryTime: this.calculateAverageQueryTime(),
        connectionPooling: this.summarizeConnectionPooling(),
        indexEffectiveness: this.summarizeIndexEffectiveness(),
        transactionPerformance: this.summarizeTransactionPerformance()
      },
      detailedResults: this.results,
      recommendations: this.generateRecommendations()
    };

    // Save report
    const reportFile = path.join(this.config.outputDir, `database-performance-${Date.now()}.json`);
    fs.writeFileSync(reportFile, JSON.stringify(report, null, 2));

    // Generate markdown report
    const markdownFile = path.join(this.config.outputDir, `database-performance-${Date.now()}.md`);
    fs.writeFileSync(markdownFile, this.generateMarkdownReport(report));

    console.log(`📋 Database performance report saved:`);
    console.log(`   JSON: ${reportFile}`);
    console.log(`   Markdown: ${markdownFile}`);
  }

  calculateAverageQueryTime() {
    if (this.results.queries.length === 0) return 0;
    const totalTime = this.results.queries.reduce((sum, q) => sum + q.executionTime, 0);
    return totalTime / this.results.queries.length;
  }

  summarizeConnectionPooling() {
    if (this.results.connections.length === 0) return null;
    
    const avgAcquisitionTimes = this.results.connections.map(c => c.avgAcquisitionTime);
    const avgSuccessRates = this.results.connections.map(c => c.successRate);
    
    return {
      avgAcquisitionTime: avgAcquisitionTimes.reduce((sum, t) => sum + t, 0) / avgAcquisitionTimes.length,
      avgSuccessRate: avgSuccessRates.reduce((sum, r) => sum + r, 0) / avgSuccessRates.length
    };
  }

  summarizeIndexEffectiveness() {
    if (this.results.indexes.length === 0) return null;
    
    const improvements = this.results.indexes.map(i => i.improvement);
    return {
      avgImprovement: improvements.reduce((sum, i) => sum + i, 0) / improvements.length,
      bestImprovement: Math.max(...improvements),
      worstImprovement: Math.min(...improvements)
    };
  }

  summarizeTransactionPerformance() {
    if (this.results.transactions.length === 0) return null;
    
    const durations = this.results.transactions.map(t => t.duration);
    return {
      avgDuration: durations.reduce((sum, d) => sum + d, 0) / durations.length,
      minDuration: Math.min(...durations),
      maxDuration: Math.max(...durations)
    };
  }

  generateRecommendations() {
    const recommendations = [];
    
    // Query performance recommendations
    const avgQueryTime = this.calculateAverageQueryTime();
    if (avgQueryTime > 100) {
      recommendations.push({
        category: 'Query Performance',
        priority: 'High',
        issue: `Average query time is ${avgQueryTime.toFixed(2)}ms`,
        recommendation: 'Consider query optimization, adding indexes, or caching frequently accessed data'
      });
    }
    
    // Connection pooling recommendations
    const connectionSummary = this.summarizeConnectionPooling();
    if (connectionSummary && connectionSummary.avgSuccessRate < 0.95) {
      recommendations.push({
        category: 'Connection Pooling',
        priority: 'Medium',
        issue: `Connection success rate is ${(connectionSummary.avgSuccessRate * 100).toFixed(1)}%`,
        recommendation: 'Consider increasing connection pool size or optimizing connection usage patterns'
      });
    }
    
    // Index effectiveness recommendations
    const indexSummary = this.summarizeIndexEffectiveness();
    if (indexSummary && indexSummary.avgImprovement < 50) {
      recommendations.push({
        category: 'Index Optimization',
        priority: 'Medium',
        issue: `Average index improvement is only ${indexSummary.avgImprovement.toFixed(1)}%`,
        recommendation: 'Review and optimize database indexes for better query performance'
      });
    }
    
    return recommendations;
  }

  generateMarkdownReport(data) {
    return `# Database Performance Report

## Summary

**Test Date**: ${data.metadata.timestamp}  
**Total Duration**: ${(data.metadata.duration / 1000).toFixed(2)} seconds  
**Total Queries Executed**: ${data.summary.totalQueries}  
**Average Query Time**: ${data.summary.avgQueryTime.toFixed(2)}ms

## Query Performance

${data.summary.avgQueryTime < 50 ? '✅' : data.summary.avgQueryTime < 100 ? '⚠️' : '❌'} Average query execution time: **${data.summary.avgQueryTime.toFixed(2)}ms**

## Connection Pooling

${data.summary.connectionPooling ? `
**Average Connection Acquisition Time**: ${data.summary.connectionPooling.avgAcquisitionTime.toFixed(2)}ms  
**Average Success Rate**: ${(data.summary.connectionPooling.avgSuccessRate * 100).toFixed(1)}%
` : 'No connection pooling data available'}

## Index Effectiveness

${data.summary.indexEffectiveness ? `
**Average Performance Improvement**: ${data.summary.indexEffectiveness.avgImprovement.toFixed(1)}%  
**Best Improvement**: ${data.summary.indexEffectiveness.bestImprovement.toFixed(1)}%  
**Worst Improvement**: ${data.summary.indexEffectiveness.worstImprovement.toFixed(1)}%
` : 'No index effectiveness data available'}

## Transaction Performance

${data.summary.transactionPerformance ? `
**Average Transaction Duration**: ${data.summary.transactionPerformance.avgDuration.toFixed(2)}ms  
**Fastest Transaction**: ${data.summary.transactionPerformance.minDuration.toFixed(2)}ms  
**Slowest Transaction**: ${data.summary.transactionPerformance.maxDuration.toFixed(2)}ms
` : 'No transaction performance data available'}

## Recommendations

${data.recommendations.map(rec => `
### ${rec.category} - ${rec.priority} Priority
**Issue**: ${rec.issue}  
**Recommendation**: ${rec.recommendation}
`).join('\n')}

---
*Generated on ${new Date().toISOString()}*
`;
  }
}

// Command line interface
if (require.main === module) {
  const options = {};
  
  const tester = new DatabasePerformanceTester(options);
  tester.runAll().catch(error => {
    console.error('Database performance testing failed:', error);
    process.exit(1);
  });
}

module.exports = DatabasePerformanceTester;
