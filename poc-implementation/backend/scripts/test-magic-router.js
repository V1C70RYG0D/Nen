#!/usr/bin/env node
// Quick check that MagicBlock Router RPC is reachable and can relay a transaction
require('dotenv').config();

const { Connection, Keypair, Transaction, TransactionInstruction, PublicKey, sendAndConfirmTransaction } = require('@solana/web3.js');
const crypto = require('crypto');

function loadServiceKeypair() {
  const fs = require('fs');
  const path = require('path');
  const bs58 = require('bs58');
  const raw = process.env.BACKEND_WALLET_SECRET_KEY;
  if (raw) {
    try {
      const arr = JSON.parse(raw);
      return Keypair.fromSecretKey(new Uint8Array(arr));
    } catch (_) {
      const arr = bs58.decode(raw);
      return Keypair.fromSecretKey(Uint8Array.from(arr));
    }
  }
  const kpPath = process.env.BACKEND_WALLET_KEYPAIR_PATH;
  if (kpPath) {
    const resolved = path.isAbsolute(kpPath) ? kpPath : path.resolve(process.cwd(), kpPath);
    const arr = JSON.parse(fs.readFileSync(resolved, 'utf8'));
    return Keypair.fromSecretKey(new Uint8Array(arr));
  }
  const candidates = [
    path.resolve(process.cwd(), 'backend-wallet-devnet.json'),
    path.resolve(process.cwd(), '..', 'backend-wallet-devnet.json'),
    path.resolve(__dirname, '..', '..', 'backend-wallet-devnet.json'),
    path.resolve(__dirname, '..', '..', '..', 'backend-wallet-devnet.json'),
  ];
  for (const p of candidates) {
    try {
      const fs = require('fs');
      if (fs.existsSync(p)) {
        const arr = JSON.parse(fs.readFileSync(p, 'utf8'));
        return Keypair.fromSecretKey(new Uint8Array(arr));
      }
    } catch (_) {}
  }
  throw new Error('No backend wallet found. Set BACKEND_WALLET_SECRET_KEY or BACKEND_WALLET_KEYPAIR_PATH');
}

async function main() {
  const rpc = process.env.MAGICBLOCK_ROUTER_RPC || 'https://devnet-router.magicblock.app';
  const ws = process.env.SOLANA_WS_ENDPOINT || 'wss://api.devnet.solana.com/';
  const connection = new Connection(rpc, { commitment: 'confirmed', wsEndpoint: ws });
  const devnetConnection = new Connection(process.env.SOLANA_RPC_URL || 'https://api.devnet.solana.com', 'confirmed');
  const payer = loadServiceKeypair();

  console.log('Using Magic Router RPC:', rpc);
  console.log('WS for confirmations:', ws);
  console.log('Payer:', payer.publicKey.toBase58());

  // Ensure payer has SOL on devnet
  const minLamports = Math.floor(0.05 * 1_000_000_000);
  let bal = await devnetConnection.getBalance(payer.publicKey);
  if (bal < minLamports) {
    console.log('Requesting airdrop on devnet...');
    const airdropSig = await devnetConnection.requestAirdrop(payer.publicKey, minLamports);
    await devnetConnection.confirmTransaction(airdropSig, 'confirmed');
    bal = await devnetConnection.getBalance(payer.publicKey);
    console.log('Balance:', bal / 1_000_000_000, 'SOL');
  }

  // Construct a NOOP instruction as per Solana docs
  const noopIx = new TransactionInstruction({
    programId: new PublicKey('11111111111111111111111111111111'),
    keys: [],
    data: Buffer.from(crypto.randomBytes(8)),
  });

  // Optional: add a short memo for easier explorer debugging
  const memoProgram = new PublicKey(process.env.MEMO_PROGRAM_ID || 'MemoSq4gqABAXKb96qnH8TysNcWxMyWCqXgDLGmfcHr');
  const memoIx = new TransactionInstruction({ keys: [], programId: memoProgram, data: Buffer.from('magic-router-ping', 'utf8') });

  const tx = new Transaction().add(noopIx, memoIx);
  tx.feePayer = payer.publicKey;
  const latest = await connection.getLatestBlockhash('confirmed');
  tx.recentBlockhash = latest.blockhash;
  tx.sign(payer);
  const raw = tx.serialize();
  const sig = await connection.sendRawTransaction(raw, { skipPreflight: false, preflightCommitment: 'confirmed' });
  console.log('✅ Submitted via Magic Router. Signature:', sig);
  // Manual HTTP polling to avoid WS issues
  const start = Date.now();
  const timeoutMs = 30000;
  let confirmed = false;
  while (Date.now() - start < timeoutMs) {
    const st = await devnetConnection.getSignatureStatuses([sig]);
    const status = st && st.value && st.value[0];
    if (status && (status.confirmationStatus === 'confirmed' || status.confirmationStatus === 'finalized')) {
      confirmed = true;
      break;
    }
    await new Promise(r => setTimeout(r, 1000));
  }
  console.log(confirmed ? '✅ Confirmed' : '⚠️ Not confirmed within timeout');
  console.log('Explorer:', `https://explorer.solana.com/tx/${sig}?cluster=devnet`);
}

main().catch((e) => {
  console.error('❌ Magic Router test failed:', e.message || e);
  process.exit(1);
});


