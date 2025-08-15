#!/usr/bin/env node
/*
 E2E Devnet Test: User Story 11 (Join Human Match)
 - Starts from running rooms-server.js separately
 - Creates a room via /api/v1/rooms
 - Generates two wallets, airdrops devnet SOL
 - Builds join tx, signs and sends, confirms
 - Verifies room becomes active and escrow received lamports
*/

require('dotenv').config();
const axios = require('axios').default;
const assert = require('assert');
const { Connection, Keypair, LAMPORTS_PER_SOL, PublicKey, VersionedTransaction } = require('@solana/web3.js');

const HOST = process.env.HOST || process.env.BACKEND_HOST || '127.0.0.1';
const PORT = process.env.PORT || process.env.BACKEND_PORT || 3011;
const BASE = `http://${HOST}:${PORT}`;
const RPC = process.env.SOLANA_RPC_URL || 'https://api.devnet.solana.com';

async function airdropIfNeeded(connection, pubkey, minSol = 0.5) {
  const needLamports = Math.floor(minSol * LAMPORTS_PER_SOL);
  const bal = await connection.getBalance(pubkey);
  if (bal >= needLamports) return;
  const sig = await connection.requestAirdrop(pubkey, needLamports);
  await connection.confirmTransaction(sig, 'confirmed');
}

async function sendBase64Tx(connection, base64) {
  const raw = Buffer.from(base64, 'base64');
  // Try legacy first, then v0
  try {
    const tx = VersionedTransaction.deserialize(raw);
    const sig = await connection.sendRawTransaction(tx.serialize(), { skipPreflight: false });
    await connection.confirmTransaction(sig, 'confirmed');
    return sig;
  } catch (_) {
    const sig = await connection.sendRawTransaction(raw, { skipPreflight: false });
    await connection.confirmTransaction(sig, 'confirmed');
    return sig;
  }
}

async function main() {
  assert(process.env.ESCROW_SEED_SECRET, 'ESCROW_SEED_SECRET must be set');

  const connection = new Connection(RPC, 'confirmed');
  console.log('Using RPC:', RPC);

  // 1) Create room
  const settings = { timeControl: '10+5', boardVariant: 'standard', allowSpectators: true };
  const entry = { minElo: 0, entryFeeSol: 0.05, whitelistMint: '' };
  const createResp = await axios.post(`${BASE}/api/v1/rooms`, { settings, entry });
  assert(createResp.data?.success, 'Failed to create room');
  const room = createResp.data.room;
  console.log('Room created:', room.sessionId, room.roomCode);

  // 2) Two wallets
  const w1 = Keypair.generate();
  const w2 = Keypair.generate();
  console.log('Wallets:', w1.publicKey.toBase58(), w2.publicKey.toBase58());
  await airdropIfNeeded(connection, w1.publicKey, 1);
  await airdropIfNeeded(connection, w2.publicKey, 1);

  // 3) Build join tx for wallet1
  const build1 = await axios.post(`${BASE}/api/v1/rooms/${room.sessionId}/join/build-tx`, { userPubkey: w1.publicKey.toBase58() });
  assert(build1.data?.success, 'Build join tx failed (w1)');
  console.log('Escrow:', build1.data.escrow, 'Entry lamports:', build1.data.entryLamports);

  // Sign & send (wallet1)
  const tx1raw = Buffer.from(build1.data.transactionBase64, 'base64');
  // Deserialize as v0 or legacy automatically by web3 when signing: use VersionedTransaction
  let tx1;
  try { tx1 = VersionedTransaction.deserialize(tx1raw); } catch { /* fallback not needed here */ }
  if (tx1) {
    tx1.sign([w1]);
    const sig1 = await connection.sendRawTransaction(tx1.serialize(), { skipPreflight: false });
    await connection.confirmTransaction(sig1, 'confirmed');
    console.log('Join sig (w1):', sig1);
    const c1 = await axios.post(`${BASE}/api/v1/rooms/${room.sessionId}/join/confirm`, { userPubkey: w1.publicKey.toBase58(), signature: sig1 });
    assert(c1.data?.success, 'Confirm join failed (w1)');
  } else {
    const sig1 = await sendBase64Tx(connection, build1.data.transactionBase64);
    const c1 = await axios.post(`${BASE}/api/v1/rooms/${room.sessionId}/join/confirm`, { userPubkey: w1.publicKey.toBase58(), signature: sig1 });
    assert(c1.data?.success, 'Confirm join failed (w1)');
  }

  // 4) Wallet2
  const build2 = await axios.post(`${BASE}/api/v1/rooms/${room.sessionId}/join/build-tx`, { userPubkey: w2.publicKey.toBase58() });
  assert(build2.data?.success, 'Build join tx failed (w2)');
  let tx2;
  try { tx2 = VersionedTransaction.deserialize(Buffer.from(build2.data.transactionBase64, 'base64')); } catch {}
  if (tx2) {
    tx2.sign([w2]);
    const sig2 = await connection.sendRawTransaction(tx2.serialize(), { skipPreflight: false });
    await connection.confirmTransaction(sig2, 'confirmed');
    console.log('Join sig (w2):', sig2);
    const c2 = await axios.post(`${BASE}/api/v1/rooms/${room.sessionId}/join/confirm`, { userPubkey: w2.publicKey.toBase58(), signature: sig2 });
    assert(c2.data?.success, 'Confirm join failed (w2)');
  } else {
    const sig2 = await sendBase64Tx(connection, build2.data.transactionBase64);
    const c2 = await axios.post(`${BASE}/api/v1/rooms/${room.sessionId}/join/confirm`, { userPubkey: w2.publicKey.toBase58(), signature: sig2 });
    assert(c2.data?.success, 'Confirm join failed (w2)');
  }

  // 5) Verify room active
  const getResp = await axios.get(`${BASE}/api/v1/rooms/${room.sessionId}`);
  assert(getResp.data?.success, 'Get room failed');
  console.log('Room status:', getResp.data.room.status);
  if (getResp.data.room.status !== 'active' && getResp.data.room.status !== 'ready') {
    throw new Error('Room not active after two joins');
  }

  // 6) Verify escrow balance >= sum of entries
  const escrow = new PublicKey(build1.data.escrow);
  const bal = await connection.getBalance(escrow);
  console.log('Escrow balance lamports:', bal);
  if (build1.data.entryLamports > 0) {
    assert(bal >= build1.data.entryLamports + build2.data.entryLamports, 'Escrow balance less than expected');
  }

  // 7) List rooms filter by variant
  const list = await axios.get(`${BASE}/api/v1/rooms`, { params: { variant: 'standard' } });
  assert(list.data?.success, 'List rooms failed');
  const has = list.data.rooms.some(r => r.sessionId === room.sessionId);
  assert(has, 'Created room not listed in variant filter');

  console.log('E2E Join flow completed successfully.');
}

main().catch(err => {
  console.error('Join E2E failed:', err?.message || err);
  process.exit(1);
});
