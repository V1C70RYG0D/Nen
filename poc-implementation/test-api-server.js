/**
 * Simple Test Server for NFT Agents API
 * Demonstrates the created agents and marketplace data
 */

const express = require('express');
const fs = require('fs');
const path = require('path');
const cors = require('cors');

const app = express();
const PORT = 3001; // Match frontend API configuration

// Enable CORS
app.use(cors());
app.use(express.json());

// Load registry data
let agentRegistry, marketplaceRegistry, matchHistoryRegistry;

try {
  agentRegistry = JSON.parse(fs.readFileSync('./devnet-agent-registry.json', 'utf8'));
  marketplaceRegistry = JSON.parse(fs.readFileSync('./devnet-marketplace-registry.json', 'utf8'));
  matchHistoryRegistry = JSON.parse(fs.readFileSync('./devnet-match-history-registry.json', 'utf8'));
  console.log('✅ Registry files loaded successfully');
} catch (error) {
  console.error('❌ Failed to load registry files:', error.message);
  process.exit(1);
}

// API Routes

/**
 * GET /api/training/owned-agents
 * Returns AI agents owned by the wallet
 */
app.get('/api/training/owned-agents', (req, res) => {
  try {
    const { wallet } = req.query;
    
    if (!wallet) {
      return res.status(400).json({
        success: false,
        error: 'wallet parameter required'
      });
    }

    console.log(`🔍 Loading owned agents for wallet: ${wallet}`);

    // For the target wallet, return all agents
    if (wallet === agentRegistry.wallet) {
      const ownedAgents = agentRegistry.agents.map(agent => ({
        mint: agent.mint,
        name: agent.name,
        image: agent.image,
        attributes: agent.attributes,
        description: agent.description,
        verified: true,
        onChainData: {
          mint: agent.mint,
          owner: agent.owner,
          verified: true,
          lastVerified: agent.created_at,
          isLocked: false,
          currentTrainingSession: null
        }
      }));

      return res.json({
        success: true,
        data: ownedAgents,
        count: ownedAgents.length,
        wallet: wallet,
        network: 'devnet'
      });
    }

    // For other wallets, return empty array
    return res.json({
      success: true,
      data: [],
      count: 0,
      wallet: wallet,
      network: 'devnet',
      message: 'No AI agents found for this wallet on devnet'
    });
    
  } catch (error) {
    console.error('Error loading owned agents:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to load owned agents'
    });
  }
});

/**
 * GET /api/marketplace/listings
 * Returns marketplace listings
 */
app.get('/api/marketplace/listings', (req, res) => {
  try {
    console.log('🏪 Loading marketplace listings');
    
    return res.json({
      success: true,
      data: marketplaceRegistry.listings,
      count: marketplaceRegistry.listings.length,
      total_value: marketplaceRegistry.total_value
    });
    
  } catch (error) {
    console.error('Error loading marketplace listings:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to load marketplace listings'
    });
  }
});

/**
 * GET /api/training/match-history/:wallet
 * Returns match history for a wallet
 */
app.get('/api/training/match-history/:wallet', (req, res) => {
  try {
    const { wallet } = req.params;
    
    console.log(`📊 Loading match history for wallet: ${wallet}`);
    
    if (wallet === agentRegistry.wallet) {
      return res.json({
        success: true,
        data: matchHistoryRegistry.match_histories,
        wallet: wallet,
        total_matches: matchHistoryRegistry.total_matches
      });
    }
    
    return res.json({
      success: true,
      data: [],
      wallet: wallet,
      total_matches: 0,
      message: 'No match history found for this wallet'
    });
    
  } catch (error) {
    console.error('Error loading match history:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to load match history'
    });
  }
});

/**
 * GET /api/health
 * Health check endpoint
 */
app.get('/api/health', (req, res) => {
  res.json({
    success: true,
    status: 'healthy',
    timestamp: new Date().toISOString(),
    data: {
      agents: agentRegistry.total_agents,
      marketplace_listings: marketplaceRegistry.total_listings,
      match_histories: matchHistoryRegistry.total_matches
    }
  });
});

/**
 * GET /
 * Root endpoint with API documentation
 */
app.get('/', (req, res) => {
  res.json({
    message: 'Nen Platform Test API Server',
    version: '1.0.0',
    endpoints: {
      'GET /api/health': 'Health check',
      'GET /api/training/owned-agents?wallet=ADDRESS': 'Get owned AI agents',
      'GET /api/marketplace/listings': 'Get marketplace listings',
      'GET /api/training/match-history/:wallet': 'Get match history'
    },
    demo_wallet: agentRegistry.wallet,
    stats: {
      agents: agentRegistry.total_agents,
      marketplace_listings: marketplaceRegistry.total_listings,
      match_histories: matchHistoryRegistry.total_matches
    }
  });
});

// Start server
app.listen(PORT, () => {
  console.log(`\n🚀 Nen Platform Test API Server started`);
  console.log(`📡 Server running on http://localhost:${PORT}`);
  console.log(`\n📊 Loaded data:`);
  console.log(`   • ${agentRegistry.total_agents} AI agents`);
  console.log(`   • ${marketplaceRegistry.total_listings} marketplace listings`);
  console.log(`   • ${matchHistoryRegistry.total_matches} match history records`);
  console.log(`\n🧪 Test endpoints:`);
  console.log(`   • Health check: http://localhost:${PORT}/api/health`);
  console.log(`   • Owned agents: http://localhost:${PORT}/api/training/owned-agents?wallet=${agentRegistry.wallet}`);
  console.log(`   • Marketplace: http://localhost:${PORT}/api/marketplace/listings`);
  console.log(`   • Match history: http://localhost:${PORT}/api/training/match-history/${agentRegistry.wallet}`);
  console.log(`\n✅ Ready for testing!`);
});

module.exports = app;
