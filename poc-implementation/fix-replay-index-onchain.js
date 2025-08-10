/**
 * Fix MagicBlock Replay Index On-Chain Recording
 * Creates a compact memo transaction that fits within Solana memo limits
 */

require('dotenv').config();
const { Connection, PublicKey, Keypair, Transaction, SystemProgram, sendAndConfirmTransaction } = require('@solana/web3.js');
const fs = require('fs');

const TARGET_WALLET = '8SRwaR9wr4n7a3tCWMgejAV5DAJnky8NXQTS8qWgsEyC';
const RPC_URL = process.env.SOLANA_RPC_URL || 'https://api.devnet.solana.com';

async function fixReplayIndexOnChain() {
  console.log('📝 Fixing MagicBlock replay index on-chain recording...');
  
  const connection = new Connection(RPC_URL, 'confirmed');
  
  // Load backend wallet
  const backendWalletPath = process.env.BACKEND_WALLET_KEYPAIR_PATH || './backend-wallet-devnet.json';
  let backendWallet;
  
  try {
    const keypairData = JSON.parse(fs.readFileSync(backendWalletPath, 'utf8'));
    backendWallet = Keypair.fromSecretKey(new Uint8Array(keypairData));
  } catch (error) {
    console.error('❌ Failed to load backend wallet:', error.message);
    return;
  }
  
  // Load replay database
  const replayDatabase = JSON.parse(fs.readFileSync('./magicblock-replay-database.json', 'utf8'));
  
  // Create compact replay index for memo transaction (under 1200 bytes)
  const compactIndex = {
    t: 'magicblock_replay_idx',
    w: TARGET_WALLET,
    c: replayDatabase.replays.length,
    a: replayDatabase.agents.length,
    ts: new Date().toISOString(),
    v: '1.0.0-devnet',
    h: replayDatabase.replays.slice(0, 5).map(r => r.commitmentHash.slice(0, 16)) // Sample hashes
  };
  
  console.log(`📊 Creating compact index for ${replayDatabase.replays.length} replays...`);
  
  try {
    const transaction = new Transaction().add(
      SystemProgram.transfer({
        fromPubkey: backendWallet.publicKey,
        toPubkey: backendWallet.publicKey,
        lamports: 5000
      })
    );
    
    const memoData = JSON.stringify(compactIndex);
    console.log(`📏 Memo size: ${memoData.length} bytes`);
    
    transaction.add({
      keys: [],
      programId: new PublicKey('MemoSq4gqABAXKb96qnH8TysNcWxMyWCqXgDLGmfcHr'),
      data: Buffer.from(memoData)
    });
    
    const signature = await sendAndConfirmTransaction(connection, transaction, [backendWallet]);
    console.log(`✅ Replay index recorded on-chain: ${signature}`);
    console.log(`🔗 Explorer: https://explorer.solana.com/tx/${signature}?cluster=devnet`);
    
    // Update replay database with on-chain reference
    replayDatabase.replayIndex.onChainTx = signature;
    replayDatabase.replayIndex.explorer = `https://explorer.solana.com/tx/${signature}?cluster=devnet`;
    replayDatabase.replayIndex.compactIndex = compactIndex;
    
    fs.writeFileSync('./magicblock-replay-database.json', JSON.stringify(replayDatabase, null, 2));
    console.log('✅ Updated replay database with on-chain reference');
    
    return signature;
    
  } catch (error) {
    console.error('❌ Failed to record replay index on-chain:', error.message);
    throw error;
  }
}

if (require.main === module) {
  fixReplayIndexOnChain().catch(console.error);
}

module.exports = { fixReplayIndexOnChain };
