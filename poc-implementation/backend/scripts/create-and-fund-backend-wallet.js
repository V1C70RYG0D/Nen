#!/usr/bin/env node
// Creates (or reuses) backend-wallet-devnet.json in backend/ and funds it on devnet via airdrop
require('dotenv').config();
const fs = require('fs');
const path = require('path');
const {
  Connection,
  Keypair,
  LAMPORTS_PER_SOL
} = require('@solana/web3.js');

async function main() {
  const backendDir = path.join(process.cwd());
  const walletPath = path.join(backendDir, 'backend-wallet-devnet.json');
  const rpc = process.env.SOLANA_RPC_URL || 'https://api.devnet.solana.com';
  const commitment = process.env.COMMITMENT || 'confirmed';
  const connection = new Connection(rpc, commitment);

  let keypair;
  if (fs.existsSync(walletPath)) {
    const raw = JSON.parse(fs.readFileSync(walletPath, 'utf8'));
    keypair = Keypair.fromSecretKey(new Uint8Array(raw));
    console.log('Found existing backend devnet wallet.');
  } else {
    keypair = Keypair.generate();
    fs.writeFileSync(walletPath, JSON.stringify(Array.from(keypair.secretKey)));
    console.log('Created new backend devnet wallet file:', walletPath);
  }

  const pubkey = keypair.publicKey;
  console.log('Backend wallet pubkey:', pubkey.toBase58());

  async function getBalance() {
    return await connection.getBalance(pubkey);
  }

  let balance = await getBalance();
  console.log('Current balance:', balance / LAMPORTS_PER_SOL, 'SOL');

  const targetSol = Number(process.env.BACKEND_TARGET_BALANCE_SOL || 2);
  const maxTries = 5;
  let tries = 0;
  while (balance < targetSol * LAMPORTS_PER_SOL && tries < maxTries) {
    tries++;
    console.log(`Requesting airdrop attempt ${tries} for 1 SOL on devnet...`);
    const sig = await connection.requestAirdrop(pubkey, 1 * LAMPORTS_PER_SOL);
    await connection.confirmTransaction(sig, commitment);
    balance = await getBalance();
    console.log('Updated balance:', balance / LAMPORTS_PER_SOL, 'SOL');
  }

  if (balance < 0.5 * LAMPORTS_PER_SOL) {
    console.error('Airdrop did not reach minimum required balance (0.5 SOL). Please retry later.');
    process.exit(2);
  }

  console.log('Backend wallet is funded on devnet.');
}

main().catch((e) => {
  console.error('Failed to create/fund backend wallet:', e);
  process.exit(1);
});
