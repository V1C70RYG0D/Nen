/**
 * Simplified Agent Setup Script
 * Creates NFT agents with lightweight metadata to avoid compute unit issues
 */

require('dotenv').config();
const { Connection, PublicKey, Keypair, Transaction, SystemProgram, sendAndConfirmTransaction } = require('@solana/web3.js');
const { createMint, createAccount, mintTo } = require('@solana/spl-token');
const fs = require('fs');

const TARGET_WALLET = '8SRwaR9wr4n7a3tCWMgejAV5DAJnky8NXQTS8qWgsEyC';
const RPC_URL = process.env.SOLANA_RPC_URL || 'https://api.devnet.solana.com';

// Simplified agent data
const AGENT_TEMPLATES = [
  {
    name: 'Netero Strategic AI',
    description: 'Elite AI agent trained on tactical patterns',
    elo: 2450,
    nenType: 'Enhancement',
    personality: 'Tactical',
    winRate: 0.89,
    totalMatches: 234,
    tier: 'Legendary',
    marketPrice: 3.5,
    isListed: false
  },
  {
    name: 'Phantom AI Specialist',
    description: 'Advanced AI specializing in unpredictable gameplay',
    elo: 2120,
    nenType: 'Transmutation',
    personality: 'Unpredictable',
    winRate: 0.83,
    totalMatches: 187,
    tier: 'Epic',
    marketPrice: 2.8,
    isListed: true
  },
  {
    name: 'Zoldyck Assassin AI',
    description: 'Lightning-fast AI trained on elimination tactics',
    elo: 1980,
    nenType: 'Manipulation',
    personality: 'Aggressive',
    winRate: 0.79,
    totalMatches: 156,
    tier: 'Rare',
    marketPrice: 1.9,
    isListed: true
  },
  {
    name: 'Chrollo Strategy AI',
    description: 'Master tactician AI with adaptive learning',
    elo: 2350,
    nenType: 'Specialist',
    personality: 'Analytical',
    winRate: 0.87,
    totalMatches: 298,
    tier: 'Legendary',
    marketPrice: 4.2,
    isListed: false
  },
  {
    name: 'Gon Determination AI',
    description: 'Persistent AI agent excelling in comebacks',
    elo: 1850,
    nenType: 'Enhancement',
    personality: 'Persistent',
    winRate: 0.75,
    totalMatches: 203,
    tier: 'Uncommon',
    marketPrice: 1.2,
    isListed: true
  }
];

async function createSimplifiedAgents() {
  console.log('🚀 Creating simplified NFT agents for wallet:', TARGET_WALLET);
  
  const connection = new Connection(RPC_URL, 'confirmed');
  
  // Load backend wallet
  const backendWalletPath = process.env.BACKEND_WALLET_KEYPAIR_PATH || './backend-wallet-devnet.json';
  let backendWallet;
  
  try {
    const keypairData = JSON.parse(fs.readFileSync(backendWalletPath, 'utf8'));
    backendWallet = Keypair.fromSecretKey(new Uint8Array(keypairData));
    console.log('✅ Backend wallet loaded:', backendWallet.publicKey.toString());
  } catch (error) {
    console.error('❌ Failed to load backend wallet:', error.message);
    return;
  }
  
  const createdAgents = [];
  const marketplaceListings = [];
  const targetWalletPubkey = new PublicKey(TARGET_WALLET);
  
  // Create NFT agents with minimal on-chain data
  for (let i = 0; i < AGENT_TEMPLATES.length; i++) {
    const agent = AGENT_TEMPLATES[i];
    console.log(`\n🎮 Creating agent ${i + 1}: ${agent.name}`);
    
    try {
      // Create NFT mint
      const mintKeypair = Keypair.generate();
      const mint = await createMint(
        connection,
        backendWallet,
        backendWallet.publicKey,
        null,
        0,
        mintKeypair
      );
      
      console.log(`✅ NFT mint created: ${mint.toString()}`);
      
      // Create token account for target wallet
      const tokenAccount = await createAccount(
        connection,
        backendWallet,
        mint,
        targetWalletPubkey
      );
      
      // Mint NFT to target wallet
      await mintTo(
        connection,
        backendWallet,
        mint,
        tokenAccount,
        backendWallet.publicKey,
        1
      );
      
      console.log(`✅ NFT minted to target wallet`);
      
      // Create lightweight metadata record (off-chain)
      const agentRecord = {
        mint: mint.toString(),
        owner: TARGET_WALLET,
        name: agent.name,
        description: agent.description,
        image: `/avatars/ai-agent-${mint.toString().slice(0, 8)}.png`,
        attributes: [
          { trait_type: 'Elo Rating', value: agent.elo },
          { trait_type: 'Nen Type', value: agent.nenType },
          { trait_type: 'Personality', value: agent.personality },
          { trait_type: 'Win Rate', value: `${(agent.winRate * 100).toFixed(1)}%` },
          { trait_type: 'Total Matches', value: agent.totalMatches },
          { trait_type: 'Tier', value: agent.tier }
        ],
        properties: {
          category: 'AI Agent',
          collection: 'Nen Platform AI Agents',
          tier: agent.tier,
          stats: {
            elo: agent.elo,
            winRate: agent.winRate,
            totalMatches: agent.totalMatches
          }
        },
        tokenAccount: tokenAccount.toString(),
        created_at: new Date().toISOString(),
        network: 'devnet',
        marketPrice: agent.marketPrice,
        isListed: agent.isListed
      };
      
      createdAgents.push(agentRecord);
      
      // Create marketplace listing if agent is listed
      if (agent.isListed) {
        const listing = {
          id: `listing_${mint.toString().slice(0, 8)}`,
          agentMint: mint.toString(),
          seller: TARGET_WALLET,
          price: agent.marketPrice,
          currency: 'SOL',
          status: 'active',
          created_at: new Date().toISOString(),
          expires_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
          metadata: {
            name: agent.name,
            description: agent.description,
            tier: agent.tier,
            elo: agent.elo,
            winRate: agent.winRate
          },
          features: {
            instant_buy: true,
            negotiable: false,
            reserved: false
          }
        };
        
        marketplaceListings.push(listing);
        console.log(`🏪 Listed on marketplace: ${agent.name} for ${agent.marketPrice} SOL`);
      }
      
    } catch (error) {
      console.error(`❌ Failed to create agent ${agent.name}:`, error.message);
    }
  }
  
  // Create match histories
  console.log('\n📊 Creating match histories for training workflow...');
  const matchHistories = createMatchHistories(createdAgents);
  
  // Save registry files
  const agentRegistry = {
    wallet: TARGET_WALLET,
    agents: createdAgents,
    total_agents: createdAgents.length,
    created_at: new Date().toISOString(),
    network: 'devnet',
    statistics: {
      total_value: createdAgents.reduce((sum, agent) => sum + agent.marketPrice, 0),
      listed_count: createdAgents.filter(agent => agent.isListed).length,
      average_elo: Math.round(createdAgents.reduce((sum, agent) => sum + agent.properties.stats.elo, 0) / createdAgents.length)
    }
  };
  
  const marketplaceRegistry = {
    listings: marketplaceListings,
    total_listings: marketplaceListings.length,
    total_value: marketplaceListings.reduce((sum, listing) => sum + listing.price, 0),
    created_at: new Date().toISOString(),
    network: 'devnet'
  };
  
  const matchHistoryRegistry = {
    wallet: TARGET_WALLET,
    match_histories: matchHistories,
    total_matches: matchHistories.reduce((sum, agent) => sum + agent.total_records, 0),
    created_at: new Date().toISOString(),
    network: 'devnet'
  };
  
  // Save files
  fs.writeFileSync('./devnet-agent-registry.json', JSON.stringify(agentRegistry, null, 2));
  fs.writeFileSync('./devnet-marketplace-registry.json', JSON.stringify(marketplaceRegistry, null, 2));
  fs.writeFileSync('./devnet-match-history-registry.json', JSON.stringify(matchHistoryRegistry, null, 2));
  
  console.log(`\n✅ Setup completed successfully!`);
  console.log(`📝 Created ${createdAgents.length} NFT agents`);
  console.log(`🏪 Listed ${marketplaceListings.length} agents on marketplace`);
  console.log(`📊 Generated ${matchHistoryRegistry.total_matches} match history records`);
  console.log(`💰 Total portfolio value: ${agentRegistry.statistics.total_value} SOL`);
  
  return {
    agents: agentRegistry,
    marketplace: marketplaceRegistry,
    matchHistories: matchHistoryRegistry
  };
}

function createMatchHistories(agents) {
  const histories = [];
  const now = new Date();
  
  for (const agent of agents) {
    const agentHistories = [];
    const totalMatches = agent.properties.stats.totalMatches;
    const winRate = agent.properties.stats.winRate;
    
    // Generate recent matches (last 30 days)
    for (let i = 0; i < Math.min(10, totalMatches); i++) {
      const matchDate = new Date(now.getTime() - (i * 24 * 60 * 60 * 1000 * Math.random() * 30));
      const isWin = Math.random() < winRate;
      
      const opponents = [
        'Meruem AI Elite', 'Ging Strategic AI', 'Kite Adaptive AI', 
        'Bisky Training AI', 'Razor Power AI', 'Silva Professional AI'
      ];
      
      const opponent = opponents[Math.floor(Math.random() * opponents.length)];
      const duration = 900 + Math.floor(Math.random() * 1800);
      
      const match = {
        id: `match_${Date.now()}_${i}`,
        agent_mint: agent.mint,
        agent_name: agent.name,
        opponent: opponent,
        result: isWin ? 'win' : 'loss',
        date: matchDate.toISOString(),
        duration_seconds: duration,
        elo_change: isWin ? Math.floor(Math.random() * 25) + 5 : -(Math.floor(Math.random() * 20) + 5),
        game_type: 'ranked',
        replay_id: `replay_${agent.mint.slice(0, 8)}_${i}`,
        moves_count: 45 + Math.floor(Math.random() * 60)
      };
      
      agentHistories.push(match);
    }
    
    // Add training session records
    for (let i = 0; i < 3; i++) {
      const sessionDate = new Date(now.getTime() - (i * 7 * 24 * 60 * 60 * 1000));
      
      const trainingSession = {
        id: `training_${Date.now()}_${i}`,
        agent_mint: agent.mint,
        agent_name: agent.name,
        session_type: 'ai_training',
        date: sessionDate.toISOString(),
        duration_seconds: 3600 + Math.floor(Math.random() * 1800),
        training_focus: ['tactical_patterns', 'endgame_scenarios', 'opening_theory'][Math.floor(Math.random() * 3)],
        replays_analyzed: Math.floor(Math.random() * 20) + 10,
        elo_before: agent.properties.stats.elo - (i * 15),
        elo_after: agent.properties.stats.elo - ((i - 1) * 15)
      };
      
      agentHistories.push(trainingSession);
    }
    
    histories.push({
      agent_mint: agent.mint,
      agent_name: agent.name,
      total_records: agentHistories.length,
      win_rate: winRate,
      recent_performance: agentHistories.filter(h => h.result === 'win').length / agentHistories.filter(h => h.result).length || 0,
      training_sessions: agentHistories.filter(h => h.session_type === 'ai_training').length,
      match_history: agentHistories
    });
  }
  
  return histories;
}

if (require.main === module) {
  createSimplifiedAgents().catch(console.error);
}

module.exports = { createSimplifiedAgents, TARGET_WALLET };
