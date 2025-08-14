#!/usr/bin/env node
/*
 Devnet E2E smoke test for User Story 12
 - Starts Rooms server (if not already running)
 - Creates a room via API
 - Adds two players to room permissions (direct service write for test)
 - Queries valid moves
 - Submits one move
 - Funds escrow and resigns to trigger payout and settlement memo
*/
require('dotenv').config();
const path = require('path');
const fs = require('fs');
const axios = require('axios').default;
const { Connection, PublicKey, Keypair, LAMPORTS_PER_SOL } = require('@solana/web3.js');

const HOST = process.env.BACKEND_HOST || '127.0.0.1';
const PORT = process.env.BACKEND_PORT || 3011;
const BASE = `http://${HOST}:${PORT}`;

async function waitForHealth(timeoutMs = 10000) {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    try {
      const { data } = await axios.get(`${BASE}/health`, { timeout: 1500 });
      if (data && data.success) return true;
    } catch (_) {}
    await new Promise(r => setTimeout(r, 500));
  }
  throw new Error('Rooms server /health not responding');
}

async function maybeStartServer() {
  // If already responding, skip
  try { await axios.get(`${BASE}/health`, { timeout: 1000 }); return; } catch (_) {}
  const { spawn } = require('child_process');
  const proc = spawn('node', ['rooms-server.js'], {
    cwd: path.join(process.cwd()),
    env: process.env,
    stdio: 'ignore',
    detached: true
  });
  proc.unref();
  await waitForHealth();
}

async function main() {
  const backendDir = path.join(process.cwd(), 'poc-implementation', 'backend');
  process.chdir(backendDir);

  // Ensure wallet and devnet RPC are set
  const walletCandidates = [
    path.join(process.cwd(), '..', 'backend-wallet-devnet.json'),
    path.join(process.cwd(), 'backend-wallet-devnet.json'),
    path.join(process.cwd(), '..', '..', 'backend-wallet-devnet.json')
  ];
  const walletPath = walletCandidates.find(p => fs.existsSync(p));
  if (!walletPath) throw new Error('backend-wallet-devnet.json not found');
  process.env.BACKEND_WALLET_KEYPAIR_PATH = walletPath;
  process.env.SOLANA_RPC_URL = process.env.SOLANA_RPC_URL || 'https://api.devnet.solana.com';
  process.env.ESCROW_SEED_SECRET = process.env.ESCROW_SEED_SECRET || 'nen_devnet_smoke_secret';

  await maybeStartServer();

  // 1) Create room
  const createResp = await axios.post(`${BASE}/api/v1/rooms`, {
    settings: { timeControl: '10+5', boardVariant: 'standard', tournamentMode: false, allowSpectators: true },
    entry: { minElo: 0, entryFeeSol: 0 }
  }, { timeout: 15000 });
  if (!createResp.data?.success) throw new Error('Room creation failed');
  const sessionId = createResp.data.room.sessionId;
  console.log('Room created:', sessionId);

  // 2) Add players permissions directly via service for testing
  const roomsSvc = require(path.join(process.cwd(), 'src/services/rooms-devnet.js'));
  const payerArr = JSON.parse(fs.readFileSync(process.env.BACKEND_WALLET_KEYPAIR_PATH, 'utf8'));
  const payer = Keypair.fromSecretKey(new Uint8Array(payerArr));
  const player1 = payer.publicKey.toBase58();
  const player2 = Keypair.generate().publicKey.toBase58();
  roomsSvc.addAllowedPlayer(sessionId, player1);
  roomsSvc.addAllowedPlayer(sessionId, player2);
  console.log('Players added:', { player1, player2 });

  // 3) Query valid moves for player1 marshal at (4,0,0)
  const vm = await axios.post(`${BASE}/api/v1/rooms/${sessionId}/valid-moves`, {
    userPubkey: player1, fromX: 4, fromY: 0, fromLevel: 0, pieceType: 'Marshal'
  }, { timeout: 10000 });
  const destinations = vm.data?.destinations || [];
  if (destinations.length === 0) throw new Error('No valid moves returned');
  console.log('Valid destinations sample:', destinations.slice(0, 5));

  // Choose first destination and submit move
  const d = destinations[0];
  const move = { fromX: 4, fromY: 0, fromLevel: 0, toX: d.x ?? d.toX, toY: d.y ?? d.toY, toLevel: d.level ?? d.toLevel, pieceType: 'Marshal' };
  const mv = await axios.post(`${BASE}/api/v1/rooms/${sessionId}/move`, { userPubkey: player1, move }, { timeout: 15000 });
  if (!mv.data?.success) throw new Error('Move submission failed');
  console.log('Move submitted:', { moveHash: mv.data.moveHash, latencyMs: mv.data.latencyMs, totalMoves: mv.data.totalMoves });

  // 4) Fund escrow and resign to trigger settlement + payout
  const escrowResp = await axios.get(`${BASE}/api/v1/rooms/${sessionId}/escrow`, { timeout: 10000 });
  const escrow = new PublicKey(escrowResp.data.escrow);
  const conn = new Connection(process.env.SOLANA_RPC_URL, 'confirmed');
  const airdropSig = await conn.requestAirdrop(escrow, 0.1 * LAMPORTS_PER_SOL);
  await conn.confirmTransaction(airdropSig, 'confirmed');
  console.log('Airdropped escrow');

  const resign = await axios.post(`${BASE}/api/v1/rooms/${sessionId}/resign`, { userPubkey: player2 }, { timeout: 30000 });
  if (!resign.data?.success) throw new Error('Resign failed');
  console.log('Settlement:', resign.data.settlement);

  console.log('E2E smoke test completed.');
}

main().catch((e) => { console.error('Smoke test failed:', e?.response?.data || e); process.exit(1); });
