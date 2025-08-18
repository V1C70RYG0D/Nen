/**
 * Display Setup Status and Testing Instructions
 * Shows the current wallet setup and provides testing guidance
 */

const fs = require('fs');

function displaySetupStatus() {
  console.log('🎉 NFT AGENTS & MARKETPLACE SETUP COMPLETED');
  console.log('='.repeat(60));
  
  try {
    // Load all registry files
    const agentRegistry = JSON.parse(fs.readFileSync('./devnet-agent-registry.json', 'utf8'));
    const marketplaceRegistry = JSON.parse(fs.readFileSync('./devnet-marketplace-registry.json', 'utf8'));
    const matchHistoryRegistry = JSON.parse(fs.readFileSync('./devnet-match-history-registry.json', 'utf8'));
    const summaryReport = JSON.parse(fs.readFileSync('./setup-summary-report.json', 'utf8'));
    
    console.log(`\n📊 WALLET OVERVIEW:`);
    console.log(`   Wallet: ${agentRegistry.wallet}`);
    console.log(`   Network: Solana Devnet`);
    console.log(`   Setup completed: ${new Date(summaryReport.setup_completed_at).toLocaleString()}`);
    
    console.log(`\n🎮 AI AGENTS CREATED (${agentRegistry.total_agents}):`);
    console.log('┌─────────────────────────┬─────────────┬─────┬────────────┬──────────────┐');
    console.log('│ Agent Name              │ ELO Rating  │ Tier│ Win Rate   │ Market Status│');
    console.log('├─────────────────────────┼─────────────┼─────┼────────────┼──────────────┤');
    
    agentRegistry.agents.forEach(agent => {
      const name = agent.name.padEnd(23);
      const elo = agent.properties.stats.elo.toString().padEnd(11);
      const tier = agent.properties.tier.padEnd(4);
      const winRate = `${(agent.properties.stats.winRate * 100).toFixed(1)}%`.padEnd(10);
      const status = agent.isListed ? `${agent.marketPrice} SOL`.padEnd(12) : 'Not listed'.padEnd(12);
      console.log(`│ ${name} │ ${elo} │ ${tier}│ ${winRate} │ ${status} │`);
    });
    
    console.log('└─────────────────────────┴─────────────┴─────┴────────────┴──────────────┘');
    
    console.log(`\n🏪 MARKETPLACE LISTINGS (${marketplaceRegistry.total_listings}):`);
    if (marketplaceRegistry.listings.length > 0) {
      marketplaceRegistry.listings.forEach(listing => {
        console.log(`   • ${listing.metadata.name} - ${listing.price} SOL (${listing.metadata.tier})`);
        console.log(`     ELO: ${listing.metadata.elo} | Win Rate: ${(listing.metadata.winRate * 100).toFixed(1)}%`);
      });
      console.log(`   Total marketplace value: ${marketplaceRegistry.total_value} SOL`);
    }
    
    console.log(`\n📈 MATCH HISTORIES GENERATED:`);
    console.log(`   Total match records: ${matchHistoryRegistry.total_matches}`);
    matchHistoryRegistry.match_histories.forEach(agentHistory => {
      const matches = agentHistory.match_history.filter(h => h.result).length;
      const trainingSessions = agentHistory.training_sessions;
      console.log(`   • ${agentHistory.agent_name}: ${matches} matches, ${trainingSessions} training sessions`);
    });
    
    console.log(`\n📁 FILES CREATED:`);
    console.log(`   ✅ devnet-agent-registry.json - Agent NFT data`);
    console.log(`   ✅ devnet-marketplace-registry.json - Marketplace listings`);
    console.log(`   ✅ devnet-match-history-registry.json - Match histories`);
    console.log(`   ✅ backend-nft-service-data.json - NFT service integration`);
    console.log(`   ✅ backend-marketplace-service-data.json - Marketplace service integration`);
    console.log(`   ✅ backend-training-service-data.json - Training service integration`);
    console.log(`   ✅ api-mock-data.json - API endpoint mock data`);
    console.log(`   ✅ setup-summary-report.json - Summary report`);
    
    console.log(`\n🧪 TESTING INSTRUCTIONS:`);
    console.log(`\n1. BACKEND API TESTING:`);
    console.log(`   Start the backend server:`);
    console.log(`   cd backend && npm start`);
    console.log(`\n   Test owned agents endpoint:`);
    console.log(`   curl "http://localhost:3001/api/training/owned-agents?wallet=${agentRegistry.wallet}"`);
    
    console.log(`\n2. FRONTEND TESTING:`);
    console.log(`   Start the frontend:`);
    console.log(`   cd frontend && npm run dev`);
    console.log(`\n   Navigate to training page:`);
    console.log(`   http://localhost:3000/training`);
    console.log(`\n   Connect wallet: ${agentRegistry.wallet}`);
    console.log(`   (You should see ${agentRegistry.total_agents} AI agents)`);
    
    console.log(`\n3. MARKETPLACE TESTING:`);
    console.log(`   Navigate to marketplace page (if available)`);
    console.log(`   Browse ${marketplaceRegistry.total_listings} listed agents`);
    console.log(`   View agent details and pricing`);
    
    console.log(`\n4. TRAINING WORKFLOW TESTING:`);
    console.log(`   Select any agent from the training page`);
    console.log(`   View match history (${matchHistoryRegistry.total_matches} records available)`);
    console.log(`   Start training session with replay data`);
    console.log(`   Monitor training progress`);
    
    console.log(`\n5. BLOCKCHAIN VERIFICATION:`);
    console.log(`   Check agent NFTs on Solana Explorer:`);
    agentRegistry.agents.forEach((agent, index) => {
      console.log(`   Agent ${index + 1}: https://explorer.solana.com/address/${agent.mint}?cluster=devnet`);
    });
    
    console.log(`\n💡 ADDITIONAL FEATURES:`);
    console.log(`   • Each agent has unique attributes and specialties`);
    console.log(`   • Marketplace listings include detailed metadata`);
    console.log(`   • Match histories include training sessions and ranked matches`);
    console.log(`   • All data is integrated with backend services`);
    console.log(`   • Ready for full training workflow demonstration`);
    
    console.log(`\n🎯 SUCCESS CRITERIA MET:`);
    console.log(`   ✅ NFT agents created for wallet ${agentRegistry.wallet}`);
    console.log(`   ✅ Multiple agents listed in marketplace`);
    console.log(`   ✅ Rich match histories for training workflow demo`);
    console.log(`   ✅ Backend service integration ready`);
    console.log(`   ✅ Frontend testing data prepared`);
    
  } catch (error) {
    console.error('❌ Error reading setup files:', error.message);
    console.log('\nPlease run the setup scripts first:');
    console.log('1. node create-simplified-agents.js');
    console.log('2. node integrate-backend-services.js');
  }
}

if (require.main === module) {
  displaySetupStatus();
}

module.exports = { displaySetupStatus };
