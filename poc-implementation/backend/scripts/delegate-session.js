#!/usr/bin/env node
require('dotenv').config();

const path = require('path');
const fs = require('fs');
const { Connection, PublicKey, Keypair } = require('@solana/web3.js');
const anchor = require('@coral-xyz/anchor');

function resolveExistingPath(paths) {
  for (const p of paths) {
    try { if (p && fs.existsSync(p)) return p; } catch (_) {}
  }
  return null;
}

function loadIdl() {
  const custom = process.env.NEN_MAGICBLOCK_IDL_PATH && path.resolve(process.env.NEN_MAGICBLOCK_IDL_PATH);
  const candidates = [
    custom,
    path.join(process.cwd(), 'backend', 'lib', 'idl', 'nen_magicblock.json'),
    path.join(process.cwd(), 'lib', 'idl', 'nen_magicblock.json')
  ];
  const p = resolveExistingPath(candidates);
  if (!p) throw new Error('nen_magicblock IDL not found');
  return JSON.parse(fs.readFileSync(p, 'utf8'));
}

function loadProgramId() {
  const id = process.env.NEN_MAGICBLOCK_PROGRAM_ID || process.env.MAGICBLOCK_PROGRAM_ID;
  if (!id) throw new Error('NEN_MAGICBLOCK_PROGRAM_ID env required');
  return new PublicKey(id);
}

function loadServiceKeypair() {
  const bs58 = require('bs58');
  const raw = process.env.BACKEND_WALLET_SECRET_KEY;
  if (raw) {
    try { return Keypair.fromSecretKey(new Uint8Array(JSON.parse(raw))); } catch (_) {}
    try { return Keypair.fromSecretKey(Uint8Array.from(bs58.decode(raw))); } catch (_) {}
  }
  const p = process.env.BACKEND_WALLET_KEYPAIR_PATH;
  if (p) return Keypair.fromSecretKey(new Uint8Array(JSON.parse(fs.readFileSync(path.resolve(p), 'utf8'))));
  const candidates = [
    path.resolve(process.cwd(), 'backend-wallet-devnet.json'),
    path.resolve(process.cwd(), '..', 'backend-wallet-devnet.json'),
  ];
  for (const c of candidates) {
    if (fs.existsSync(c)) return Keypair.fromSecretKey(new Uint8Array(JSON.parse(fs.readFileSync(c, 'utf8'))));
  }
  throw new Error('No backend wallet found');
}

async function main() {
  const rpc = process.env.MAGICBLOCK_ROUTER_RPC || 'https://devnet-router.magicblock.app';
  const ws = process.env.SOLANA_WS_ENDPOINT || 'wss://api.devnet.solana.com/';
  const connection = new Connection(rpc, { commitment: 'confirmed', wsEndpoint: ws });

  const payer = loadServiceKeypair();
  const wallet = new anchor.Wallet(payer);
  const provider = new anchor.AnchorProvider(connection, wallet, { preflightCommitment: 'confirmed' });
  anchor.setProvider(provider);

  const idl = loadIdl();
  const programId = loadProgramId();
  const program = new anchor.Program(idl, programId, provider);

  const validatorStr = process.env.MAGICBLOCK_VALIDATOR || process.argv[2];
  const commitMsStr = process.env.MAGICBLOCK_COMMIT_FREQ_MS || process.argv[3] || '3000';
  if (!validatorStr) throw new Error('Provide MAGICBLOCK_VALIDATOR (validator pubkey)');
  const validator = new PublicKey(validatorStr);
  const commitMs = Number(commitMsStr);

  let sessionPda = process.env.SESSION_PDA || process.argv[4];
  if (!sessionPda) {
    const [pda] = await PublicKey.findProgramAddress(
      [Buffer.from('session'), payer.publicKey.toBuffer()],
      program.programId
    );
    sessionPda = pda.toBase58();
  }

  console.log('Router RPC:', rpc);
  console.log('Program:', program.programId.toBase58());
  console.log('Session PDA:', sessionPda);
  console.log('Validator:', validator.toBase58());
  console.log('Commit frequency (ms):', commitMs);

  const sig = await program.methods
    .delegateSession({ commitFrequencyMs: commitMs, validator })
    .accounts({ session: new PublicKey(sessionPda), authority: payer.publicKey })
    .rpc();

  console.log('✅ Delegation tx:', sig);
  console.log('Explorer:', `https://explorer.solana.com/tx/${sig}?cluster=devnet`);
}

main().catch((e) => {
  console.error('❌ Delegate session failed:', e.message || e);
  process.exit(1);
});



