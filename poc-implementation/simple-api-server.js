/**
 * Simple Test Server for NFT Agents API
 * Minimal server to serve our agent data to the frontend
 */

const http = require('http');
const fs = require('fs');
const url = require('url');

const PORT = 3333; // Use port 3333 to avoid conflicts

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

// Simple HTTP server
const server = http.createServer((req, res) => {
  // Enable CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  
  if (req.method === 'OPTIONS') {
    res.writeHead(200);
    res.end();
    return;
  }
  
  const parsedUrl = url.parse(req.url, true);
  const pathname = parsedUrl.pathname;
  const query = parsedUrl.query;
  
  res.setHeader('Content-Type', 'application/json');
  
  try {
    if (pathname === '/api/health') {
      res.writeHead(200);
      res.end(JSON.stringify({
        success: true,
        status: 'healthy',
        timestamp: new Date().toISOString(),
        data: {
          agents: agentRegistry.total_agents,
          marketplace_listings: marketplaceRegistry.total_listings,
          match_histories: matchHistoryRegistry.total_matches
        }
      }));
    }
    else if (pathname === '/api/training/owned-agents') {
      const wallet = query.wallet;
      
      console.log(`🔍 Loading owned agents for wallet: ${wallet}`);
      
      if (!wallet) {
        res.writeHead(400);
        res.end(JSON.stringify({
          success: false,
          error: 'wallet parameter required'
        }));
        return;
      }
      
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
        
        res.writeHead(200);
        res.end(JSON.stringify({
          success: true,
          data: ownedAgents,
          count: ownedAgents.length,
          wallet: wallet,
          network: 'devnet'
        }));
      } else {
        res.writeHead(200);
        res.end(JSON.stringify({
          success: true,
          data: [],
          count: 0,
          wallet: wallet,
          network: 'devnet',
          message: 'No AI agents found for this wallet on devnet'
        }));
      }
    }
    else if (pathname === '/api/marketplace/listings') {
      console.log('🏪 Loading marketplace listings');
      
      res.writeHead(200);
      res.end(JSON.stringify({
        success: true,
        data: marketplaceRegistry.listings,
        count: marketplaceRegistry.listings.length,
        total_value: marketplaceRegistry.total_value
      }));
    }
    else if (pathname.startsWith('/api/training/match-history/')) {
      const wallet = pathname.split('/').pop();
      
      console.log(`📊 Loading match history for wallet: ${wallet}`);
      
      if (wallet === agentRegistry.wallet) {
        res.writeHead(200);
        res.end(JSON.stringify({
          success: true,
          data: matchHistoryRegistry.match_histories,
          wallet: wallet,
          total_matches: matchHistoryRegistry.total_matches
        }));
      } else {
        res.writeHead(200);
        res.end(JSON.stringify({
          success: true,
          data: [],
          wallet: wallet,
          total_matches: 0,
          message: 'No match history found for this wallet'
        }));
      }
    }
    else {
      res.writeHead(404);
      res.end(JSON.stringify({
        success: false,
        error: 'Endpoint not found'
      }));
    }
  } catch (error) {
    console.error('Server error:', error);
    res.writeHead(500);
    res.end(JSON.stringify({
      success: false,
      error: 'Internal server error'
    }));
  }
});

server.listen(PORT, () => {
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

server.on('error', (err) => {
  console.error('Server error:', err);
  if (err.code === 'EADDRINUSE') {
    console.log(`Port ${PORT} is already in use. Trying to kill existing process...`);
    process.exit(1);
  }
});

process.on('SIGINT', () => {
  console.log('\n🛑 Server shutting down...');
  server.close(() => {
    console.log('✅ Server closed');
    process.exit(0);
  });
});

module.exports = server;
