/**
 * Create Real Devnet Agents for Specific Wallet
 * User Story 7 Requirement: Real devnet data instead of mocks
 */

require('dotenv').config();
const { Connection, PublicKey, Keypair, Transaction, SystemProgram, sendAndConfirmTransaction } = require('@solana/web3.js');
const { createMint, createAccount, mintTo, getMint, getAccount } = require('@solana/spl-token');
const fs = require('fs');

const TARGET_WALLET = '8SRwaR9wr4n7a3tCWMgejAV5DAJnky8NXQTS8qWgsEyC';
const RPC_URL = process.env.SOLANA_RPC_URL || 'https://api.devnet.solana.com';

async function createRealDevnetAgents() {
  console.log('🔧 Creating real devnet agents for wallet:', TARGET_WALLET);
  
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
  
  // Check backend wallet balance
  const balance = await connection.getBalance(backendWallet.publicKey);
  console.log(`Backend wallet balance: ${balance / 1e9} SOL`);
  
  if (balance < 0.5 * 1e9) {
    console.log('🪂 Requesting airdrop for backend wallet...');
    const airdropSignature = await connection.requestAirdrop(backendWallet.publicKey, 2 * 1e9);
    await connection.confirmTransaction(airdropSignature);
    console.log('✅ Airdrop completed');
  }
  
  // Create 3 AI agent NFT mints for the target wallet
  const agents = [
    {
      name: 'Netero Strategic AI',
      description: 'Elite AI agent trained on Hunter x Hunter tactical patterns',
      elo: 2450,
      nenType: 'Enhancement',
      personality: 'Tactical',
      winRate: 0.89,
      totalMatches: 234
    },
    {
      name: 'Phantom AI Specialist',
      description: 'Advanced AI specializing in deceptive and unpredictable gameplay',
      elo: 2120,
      nenType: 'Transmutation',
      personality: 'Unpredictable', 
      winRate: 0.83,
      totalMatches: 187
    },
    {
      name: 'Zoldyck Assassin AI',
      description: 'Lightning-fast AI trained on precision and elimination tactics',
      elo: 1980,
      nenType: 'Manipulation',
      personality: 'Aggressive',
      winRate: 0.79,
      totalMatches: 156
    }
  ];
  
  const createdAgents = [];
  const targetWalletPubkey = new PublicKey(TARGET_WALLET);
  
  for (let i = 0; i < agents.length; i++) {
    const agent = agents[i];
    console.log(`\n🎮 Creating agent ${i + 1}: ${agent.name}`);
    
    try {
      // Create NFT mint
      const mintKeypair = Keypair.generate();
      const mint = await createMint(
        connection,
        backendWallet,
        backendWallet.publicKey, // mint authority
        null, // freeze authority
        0, // decimals (NFT)
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
      
      console.log(`✅ Token account created: ${tokenAccount.toString()}`);
      
      // Mint 1 NFT to target wallet
      await mintTo(
        connection,
        backendWallet,
        mint,
        tokenAccount,
        backendWallet.publicKey,
        1 // amount (1 for NFT)
      );
      
      console.log(`✅ NFT minted to target wallet`);
      
      // Create on-chain memo with agent metadata
      const memo = JSON.stringify({
        kind: 'ai_agent_metadata',
        mint: mint.toString(),
        owner: TARGET_WALLET,
        metadata: {
          name: agent.name,
          description: agent.description,
          attributes: [
            { trait_type: 'Elo Rating', value: agent.elo },
            { trait_type: 'Nen Type', value: agent.nenType },
            { trait_type: 'Personality', value: agent.personality },
            { trait_type: 'Win Rate', value: (agent.winRate * 100).toFixed(1) + '%' },
            { trait_type: 'Total Matches', value: agent.totalMatches }
          ]
        },
        created_at: new Date().toISOString(),
        devnet: true
      });
      
      // Send memo transaction
      const transaction = new Transaction().add(
        SystemProgram.transfer({
          fromPubkey: backendWallet.publicKey,
          toPubkey: backendWallet.publicKey,
          lamports: 1000
        })
      );
      
      // Add memo instruction
      transaction.add({
        keys: [],
        programId: new PublicKey('MemoSq4gqABAXKb96qnH8TysNcWxMyWCqXgDLGmfcHr'),
        data: Buffer.from(memo)
      });
      
      const signature = await sendAndConfirmTransaction(connection, transaction, [backendWallet]);
      console.log(`✅ Metadata memo sent: ${signature}`);
      
      createdAgents.push({
        mint: mint.toString(),
        owner: TARGET_WALLET,
        tokenAccount: tokenAccount.toString(),
        signature: signature,
        explorer: `https://explorer.solana.com/tx/${signature}?cluster=devnet`,
        metadata: agent
      });
      
    } catch (error) {
      console.error(`❌ Failed to create agent ${i + 1}:`, error.message);
    }
  }
  
  // Save agent registry
  const agentRegistry = {
    wallet: TARGET_WALLET,
    agents: createdAgents,
    created_at: new Date().toISOString(),
    network: 'devnet',
    total_agents: createdAgents.length
  };
  
  fs.writeFileSync('./devnet-agent-registry.json', JSON.stringify(agentRegistry, null, 2));
  console.log(`\n✅ Created ${createdAgents.length} real devnet agents for wallet ${TARGET_WALLET}`);
  console.log('📝 Agent registry saved to: devnet-agent-registry.json');
  
  return agentRegistry;
}

if (require.main === module) {
  createRealDevnetAgents().catch(console.error);
}

module.exports = { createRealDevnetAgents, TARGET_WALLET };
