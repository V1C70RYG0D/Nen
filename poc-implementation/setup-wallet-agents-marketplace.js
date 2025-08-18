/**
 * Enhanced Script: Setup NFT Agents, Marketplace Listings, and Match Histories
 * For wallet: 8SRwaR9wr4n7a3tCWMgejAV5DAJnky8NXQTS8qWgsEyC
 * 
 * This script will:
 * 1. Create additional NFT agents for the wallet
 * 2. Put some agents in the marketplace for sale
 * 3. Create realistic match histories for training workflow demonstration
 */

require('dotenv').config();
const { Connection, PublicKey, Keypair, Transaction, SystemProgram, sendAndConfirmTransaction } = require('@solana/web3.js');
const { createMint, createAccount, mintTo } = require('@solana/spl-token');
const fs = require('fs');
const path = require('path');

const TARGET_WALLET = '8SRwaR9wr4n7a3tCWMgejAV5DAJnky8NXQTS8qWgsEyC';
const RPC_URL = process.env.SOLANA_RPC_URL || 'https://api.devnet.solana.com';

// Extended agent data with more variety for marketplace demo
const AGENT_TEMPLATES = [
  {
    name: 'Netero Strategic AI',
    description: 'Elite AI agent trained on Hunter x Hunter tactical patterns with advanced strategic reasoning',
    elo: 2450,
    nenType: 'Enhancement',
    personality: 'Tactical',
    winRate: 0.89,
    totalMatches: 234,
    specialties: ['Endgame mastery', 'Position evaluation', 'Tactical combinations'],
    tier: 'Legendary',
    marketPrice: 3.5, // SOL
    isListed: false
  },
  {
    name: 'Phantom AI Specialist',
    description: 'Advanced AI specializing in deceptive and unpredictable gameplay with mind games expertise',
    elo: 2120,
    nenType: 'Transmutation',
    personality: 'Unpredictable',
    winRate: 0.83,
    totalMatches: 187,
    specialties: ['Psychological warfare', 'Adaptive strategies', 'Counter-play'],
    tier: 'Epic',
    marketPrice: 2.8,
    isListed: true
  },
  {
    name: 'Zoldyck Assassin AI',
    description: 'Lightning-fast AI trained on precision and elimination tactics with killer instinct',
    elo: 1980,
    nenType: 'Manipulation',
    personality: 'Aggressive',
    winRate: 0.79,
    totalMatches: 156,
    specialties: ['Aggressive openings', 'Fast attacks', 'Piece coordination'],
    tier: 'Rare',
    marketPrice: 1.9,
    isListed: true
  },
  {
    name: 'Chrollo Strategy AI',
    description: 'Master tactician AI with ability to adapt and learn opponent patterns mid-game',
    elo: 2350,
    nenType: 'Specialist',
    personality: 'Analytical',
    winRate: 0.87,
    totalMatches: 298,
    specialties: ['Pattern recognition', 'Adaptive learning', 'Complex strategies'],
    tier: 'Legendary',
    marketPrice: 4.2,
    isListed: false
  },
  {
    name: 'Gon Determination AI',
    description: 'Persistent AI agent that never gives up, excels in comeback scenarios',
    elo: 1850,
    nenType: 'Enhancement',
    personality: 'Persistent',
    winRate: 0.75,
    totalMatches: 203,
    specialties: ['Comeback mechanics', 'Endurance games', 'Never surrender'],
    tier: 'Uncommon',
    marketPrice: 1.2,
    isListed: true
  },
  {
    name: 'Killua Lightning AI',
    description: 'Ultra-fast processing AI with lightning-quick decision making and reflexes',
    elo: 2180,
    nenType: 'Transmutation',
    personality: 'Swift',
    winRate: 0.82,
    totalMatches: 176,
    specialties: ['Speed calculations', 'Quick tactics', 'Time pressure mastery'],
    tier: 'Epic',
    marketPrice: 2.5,
    isListed: false
  },
  {
    name: 'Hisoka Trickster AI',
    description: 'Unpredictable AI that loves complex positions and creative solutions',
    elo: 2090,
    nenType: 'Transmutation',
    personality: 'Creative',
    winRate: 0.81,
    totalMatches: 189,
    specialties: ['Creative tactics', 'Unusual moves', 'Surprise attacks'],
    tier: 'Epic',
    marketPrice: 2.3,
    isListed: true
  },
  {
    name: 'Kurapika Logic AI',
    description: 'Methodical AI with perfect logical reasoning and systematic approach',
    elo: 2280,
    nenType: 'Conjuration',
    personality: 'Logical',
    winRate: 0.85,
    totalMatches: 267,
    specialties: ['Logical deduction', 'Systematic play', 'Perfect calculation'],
    tier: 'Epic',
    marketPrice: 3.1,
    isListed: false
  }
];

async function setupWalletAgentsAndMarketplace() {
  console.log('🚀 Setting up NFT agents, marketplace, and match histories for wallet:', TARGET_WALLET);
  
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
  
  // Check and fund backend wallet if needed
  const balance = await connection.getBalance(backendWallet.publicKey);
  console.log(`Backend wallet balance: ${balance / 1e9} SOL`);
  
  if (balance < 2 * 1e9) {
    console.log('🪂 Requesting airdrop for backend wallet...');
    const airdropSignature = await connection.requestAirdrop(backendWallet.publicKey, 3 * 1e9);
    await connection.confirmTransaction(airdropSignature);
    console.log('✅ Airdrop completed');
  }
  
  const createdAgents = [];
  const marketplaceListings = [];
  const targetWalletPubkey = new PublicKey(TARGET_WALLET);
  
  // Create NFT agents
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
      
      // Create comprehensive metadata
      const metadata = {
        kind: 'ai_agent_nft',
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
          { trait_type: 'Tier', value: agent.tier },
          { trait_type: 'Specialties', value: agent.specialties.join(', ') }
        ],
        properties: {
          category: 'AI Agent',
          collection: 'Nen Platform AI Agents',
          tier: agent.tier,
          specialties: agent.specialties,
          stats: {
            elo: agent.elo,
            winRate: agent.winRate,
            totalMatches: agent.totalMatches
          }
        },
        created_at: new Date().toISOString(),
        network: 'devnet'
      };
      
      // Send metadata memo
      const memoTx = new Transaction().add(
        SystemProgram.transfer({
          fromPubkey: backendWallet.publicKey,
          toPubkey: backendWallet.publicKey,
          lamports: 1000
        })
      );
      
      memoTx.add({
        keys: [],
        programId: new PublicKey('MemoSq4gqABAXKb96qnH8TysNcWxMyWCqXgDLGmfcHr'),
        data: Buffer.from(JSON.stringify(metadata))
      });
      
      const signature = await sendAndConfirmTransaction(connection, memoTx, [backendWallet]);
      console.log(`✅ Metadata memo sent: ${signature}`);
      
      const agentRecord = {
        ...metadata,
        tokenAccount: tokenAccount.toString(),
        signature: signature,
        explorer: `https://explorer.solana.com/tx/${signature}?cluster=devnet`,
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
          expires_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(), // 30 days
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
  
  // Create match histories for training workflow demonstration
  console.log('\n📊 Creating match histories for training workflow...');
  const matchHistories = await createMatchHistories(createdAgents.slice(0, 3)); // Use first 3 agents
  
  // Save all data to registry files
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
    total_matches: matchHistories.length,
    created_at: new Date().toISOString(),
    network: 'devnet'
  };
  
  // Save registry files
  fs.writeFileSync('./devnet-agent-registry.json', JSON.stringify(agentRegistry, null, 2));
  fs.writeFileSync('./devnet-marketplace-registry.json', JSON.stringify(marketplaceRegistry, null, 2));
  fs.writeFileSync('./devnet-match-history-registry.json', JSON.stringify(matchHistoryRegistry, null, 2));
  
  console.log(`\n✅ Setup completed successfully!`);
  console.log(`📝 Created ${createdAgents.length} NFT agents`);
  console.log(`🏪 Listed ${marketplaceListings.length} agents on marketplace`);
  console.log(`📊 Generated ${matchHistories.length} match history records`);
  console.log(`💰 Total portfolio value: ${agentRegistry.statistics.total_value} SOL`);
  console.log(`\n📁 Files saved:`);
  console.log(`   - devnet-agent-registry.json`);
  console.log(`   - devnet-marketplace-registry.json`);
  console.log(`   - devnet-match-history-registry.json`);
  
  return {
    agents: agentRegistry,
    marketplace: marketplaceRegistry,
    matchHistories: matchHistoryRegistry
  };
}

async function createMatchHistories(agents) {
  const histories = [];
  const now = new Date();
  
  // Create realistic match histories for each agent
  for (const agent of agents) {
    const agentHistories = [];
    const totalMatches = agent.properties.stats.totalMatches;
    const winRate = agent.properties.stats.winRate;
    
    // Generate recent matches (last 30 days)
    for (let i = 0; i < Math.min(15, totalMatches); i++) {
      const matchDate = new Date(now.getTime() - (i * 24 * 60 * 60 * 1000 * Math.random() * 30));
      const isWin = Math.random() < winRate;
      
      const opponents = [
        'Meruem AI Elite', 'Ging Strategic AI', 'Kite Adaptive AI', 
        'Bisky Training AI', 'Razor Power AI', 'Silva Professional AI'
      ];
      
      const opponent = opponents[Math.floor(Math.random() * opponents.length)];
      const duration = 900 + Math.floor(Math.random() * 1800); // 15-45 minutes
      
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
        moves_count: 45 + Math.floor(Math.random() * 60),
        key_moments: [
          `Opening: ${['Aggressive', 'Defensive', 'Balanced'][Math.floor(Math.random() * 3)]} setup`,
          `Mid-game: ${['Tactical exchange', 'Positional play', 'Material gain'][Math.floor(Math.random() * 3)]}`,
          `Endgame: ${['Clean finish', 'Complex conversion', 'Time pressure'][Math.floor(Math.random() * 3)]}`
        ],
        training_data_generated: {
          pattern_recognition: Math.floor(Math.random() * 50) + 20,
          tactical_combinations: Math.floor(Math.random() * 30) + 10,
          positional_understanding: Math.floor(Math.random() * 40) + 15
        }
      };
      
      agentHistories.push(match);
    }
    
    // Add training session records
    for (let i = 0; i < 5; i++) {
      const sessionDate = new Date(now.getTime() - (i * 7 * 24 * 60 * 60 * 1000)); // Weekly sessions
      
      const trainingSession = {
        id: `training_${Date.now()}_${i}`,
        agent_mint: agent.mint,
        agent_name: agent.name,
        session_type: 'ai_training',
        date: sessionDate.toISOString(),
        duration_seconds: 3600 + Math.floor(Math.random() * 1800), // 1-2 hours
        training_focus: ['tactical_patterns', 'endgame_scenarios', 'opening_theory'][Math.floor(Math.random() * 3)],
        replays_analyzed: Math.floor(Math.random() * 20) + 10,
        improvement_metrics: {
          pattern_recognition: `+${Math.floor(Math.random() * 10) + 2}%`,
          decision_speed: `+${Math.floor(Math.random() * 8) + 1}%`,
          accuracy: `+${Math.floor(Math.random() * 5) + 1}%`
        },
        elo_before: agent.properties.stats.elo - (i * 15),
        elo_after: agent.properties.stats.elo - ((i - 1) * 15),
        training_data: {
          positions_analyzed: Math.floor(Math.random() * 500) + 200,
          patterns_learned: Math.floor(Math.random() * 50) + 20,
          neural_network_updates: Math.floor(Math.random() * 100) + 50
        }
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
  setupWalletAgentsAndMarketplace().catch(console.error);
}

module.exports = { setupWalletAgentsAndMarketplace, TARGET_WALLET, AGENT_TEMPLATES };
