/**
 * Backend Services Integration Script
 * Integrates the created agents, marketplace listings, and match histories
 * with the existing backend services for seamless operation
 */

const fs = require('fs');
const path = require('path');

async function integrateWithBackendServices() {
  console.log('🔧 Integrating with backend services...');
  
  try {
    // Load registry files
    const agentRegistry = JSON.parse(fs.readFileSync('./devnet-agent-registry.json', 'utf8'));
    const marketplaceRegistry = JSON.parse(fs.readFileSync('./devnet-marketplace-registry.json', 'utf8'));
    const matchHistoryRegistry = JSON.parse(fs.readFileSync('./devnet-match-history-registry.json', 'utf8'));
    
    console.log('✅ Registry files loaded successfully');
    
    // Create NFT service data file
    const nftServiceData = {
      agents: agentRegistry.agents.map(agent => ({
        id: agent.mint,
        mint: agent.mint,
        owner: agent.owner,
        name: agent.name,
        description: agent.description,
        image: agent.image,
        attributes: agent.attributes,
        elo: agent.properties.stats.elo,
        winRate: agent.properties.stats.winRate,
        totalMatches: agent.properties.stats.totalMatches,
        tier: agent.properties.tier,
        specialties: agent.properties.specialties,
        isListed: agent.isListed,
        listPrice: agent.isListed ? agent.marketPrice * 1e9 : null, // Convert to lamports
        lastUpdated: agent.created_at,
        tradingHistory: [],
        onChainData: {
          mint: agent.mint,
          owner: agent.owner,
          verified: true,
          lastVerified: agent.created_at,
          tokenAccount: agent.tokenAccount,
          signature: agent.signature
        }
      }))
    };
    
    // Create marketplace service data file
    const marketplaceServiceData = {
      listings: marketplaceRegistry.listings.map(listing => ({
        id: listing.id,
        agentId: listing.agentMint,
        sellerId: listing.seller,
        price: listing.price * 1e9, // Convert to lamports
        currency: 'SOL',
        status: listing.status,
        createdAt: listing.created_at,
        expiresAt: listing.expires_at,
        metadata: listing.metadata,
        features: listing.features
      }))
    };
    
    // Create training service data file with match histories
    const trainingServiceData = {
      wallet: matchHistoryRegistry.wallet,
      agents: matchHistoryRegistry.match_histories.map(agentHistory => ({
        mint: agentHistory.agent_mint,
        name: agentHistory.agent_name,
        matchHistory: agentHistory.match_history,
        statistics: {
          totalMatches: agentHistory.total_records,
          winRate: agentHistory.win_rate,
          recentPerformance: agentHistory.recent_performance,
          trainingSessions: agentHistory.training_sessions
        }
      }))
    };
    
    // Save service integration files
    fs.writeFileSync('./backend-nft-service-data.json', JSON.stringify(nftServiceData, null, 2));
    fs.writeFileSync('./backend-marketplace-service-data.json', JSON.stringify(marketplaceServiceData, null, 2));
    fs.writeFileSync('./backend-training-service-data.json', JSON.stringify(trainingServiceData, null, 2));
    
    console.log('✅ Service integration files created:');
    console.log('   - backend-nft-service-data.json');
    console.log('   - backend-marketplace-service-data.json');
    console.log('   - backend-training-service-data.json');
    
    // Update existing replay database if it exists
    const replayDbPath = './replay-db.json';
    if (fs.existsSync(replayDbPath)) {
      const replayDb = JSON.parse(fs.readFileSync(replayDbPath, 'utf8'));
      
      // Add our agents to the replay database
      if (!replayDb.agents) {
        replayDb.agents = [];
      }
      
      agentRegistry.agents.forEach(agent => {
        if (!replayDb.agents.some(a => a.mint === agent.mint)) {
          replayDb.agents.push({
            mint: agent.mint,
            name: agent.name,
            owner: agent.owner,
            verified: true,
            metadata: agent.properties
          });
        }
      });
      
      fs.writeFileSync(replayDbPath, JSON.stringify(replayDb, null, 2));
      console.log('✅ Updated existing replay database');
    }
    
    // Create API endpoint mock data for frontend
    const apiMockData = {
      endpoints: {
        '/api/training/owned-agents': {
          success: true,
          data: agentRegistry.agents.map(agent => ({
            mint: agent.mint,
            name: agent.name,
            description: agent.description,
            image: agent.image,
            attributes: agent.attributes,
            verified: true,
            onChainData: {
              mint: agent.mint,
              owner: agent.owner,
              verified: true,
              lastVerified: agent.created_at,
              isLocked: false,
              currentTrainingSession: null
            }
          })),
          count: agentRegistry.agents.length,
          wallet: agentRegistry.wallet,
          network: 'devnet'
        },
        '/api/marketplace/listings': {
          success: true,
          data: marketplaceRegistry.listings,
          count: marketplaceRegistry.listings.length,
          total_value: marketplaceRegistry.total_value
        },
        [`/api/training/match-history/${agentRegistry.wallet}`]: {
          success: true,
          data: matchHistoryRegistry.match_histories,
          wallet: agentRegistry.wallet,
          total_matches: matchHistoryRegistry.total_matches
        }
      }
    };
    
    fs.writeFileSync('./api-mock-data.json', JSON.stringify(apiMockData, null, 2));
    console.log('✅ Created API mock data for frontend testing');
    
    // Generate summary report
    const summary = {
      setup_completed_at: new Date().toISOString(),
      wallet: agentRegistry.wallet,
      statistics: {
        total_agents_created: agentRegistry.agents.length,
        agents_in_marketplace: marketplaceRegistry.listings.length,
        total_marketplace_value: `${marketplaceRegistry.total_value} SOL`,
        match_histories_generated: matchHistoryRegistry.total_matches,
        average_agent_elo: agentRegistry.statistics.average_elo,
        total_portfolio_value: `${agentRegistry.statistics.total_value} SOL`
      },
      agents_overview: agentRegistry.agents.map(agent => ({
        name: agent.name,
        mint: agent.mint.slice(0, 8) + '...',
        elo: agent.properties.stats.elo,
        tier: agent.properties.tier,
        market_status: agent.isListed ? `Listed for ${agent.marketPrice} SOL` : 'Not listed',
        explorer_link: agent.explorer
      })),
      marketplace_listings: marketplaceRegistry.listings.map(listing => ({
        agent_name: listing.metadata.name,
        price: `${listing.price} SOL`,
        tier: listing.metadata.tier,
        elo: listing.metadata.elo,
        win_rate: `${(listing.metadata.winRate * 100).toFixed(1)}%`
      })),
      training_data_ready: true,
      next_steps: [
        'Start the backend server to serve the API endpoints',
        'Use the frontend training page to view owned agents',
        'Browse the marketplace to see listed agents',
        'View match histories for training workflow demonstration',
        'Test agent training with the generated replay data'
      ]
    };
    
    fs.writeFileSync('./setup-summary-report.json', JSON.stringify(summary, null, 2));
    console.log('✅ Created setup summary report');
    
    console.log('\n🎉 Backend integration completed successfully!');
    console.log('\nSummary:');
    console.log(`📊 ${summary.statistics.total_agents_created} AI agents created`);
    console.log(`🏪 ${summary.statistics.agents_in_marketplace} agents listed on marketplace`);
    console.log(`💰 ${summary.statistics.total_marketplace_value} total marketplace value`);
    console.log(`📈 ${summary.statistics.match_histories_generated} match history records`);
    console.log(`⭐ ${summary.statistics.average_agent_elo} average agent ELO`);
    
    return summary;
    
  } catch (error) {
    console.error('❌ Integration failed:', error.message);
    throw error;
  }
}

if (require.main === module) {
  integrateWithBackendServices().catch(console.error);
}

module.exports = { integrateWithBackendServices };
