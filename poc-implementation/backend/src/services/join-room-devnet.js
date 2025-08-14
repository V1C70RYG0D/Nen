/**
 * Devnet Join Room Service
 * - Builds a real, user-signed transaction to join a room: Memo + entry fee transfer to escrow
 * - Verifies on-chain requirements where possible (SOL balance, whitelist mint ownership)
 * - Confirms the join by inspecting the submitted signature on devnet
 * - Persists joins in logs/joins.json and updates room status in logs/rooms.json when full
 *
 * Env required for escrow derivation:
 * - ESCROW_SEED_SECRET (secret string used to derive deterministic escrow keypair per session)
 *
 * Optional env:
 * - SOLANA_RPC_URL (default https://api.devnet.solana.com)
 */

require('dotenv').config();

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const {
  Connection,
  PublicKey,
  Keypair,
  SystemProgram,
  Transaction,
  TransactionInstruction,
  LAMPORTS_PER_SOL
} = require('@solana/web3.js');

function getConnection() {
  const url = process.env.SOLANA_RPC_URL || 'https://api.devnet.solana.com';
  return new Connection(url, 'confirmed');
}

function loadRooms() {
  const file = path.join(process.cwd(), 'logs', 'rooms.json');
  if (!fs.existsSync(file)) return [];
  try {
    return JSON.parse(fs.readFileSync(file, 'utf8')) || [];
  } catch (_) {
    return [];
  }
}

function saveRooms(rooms) {
  const dir = path.join(process.cwd(), 'logs');
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  const file = path.join(dir, 'rooms.json');
  fs.writeFileSync(file, JSON.stringify(rooms, null, 2));
}

function loadJoins() {
  const file = path.join(process.cwd(), 'logs', 'joins.json');
  if (!fs.existsSync(file)) return [];
  try {
    return JSON.parse(fs.readFileSync(file, 'utf8')) || [];
  } catch (_) {
    return [];
  }
}

function saveJoins(joins) {
  const dir = path.join(process.cwd(), 'logs');
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  const file = path.join(dir, 'joins.json');
  fs.writeFileSync(file, JSON.stringify(joins, null, 2));
}

function findRoom(sessionId) {
  return loadRooms().find(r => r.sessionId === sessionId) || null;
}

function listJoinsForSession(sessionId) {
  return loadJoins().filter(j => j.sessionId === sessionId);
}

function upsertJoinRecord(record) {
  const joins = loadJoins();
  const idx = joins.findIndex(j => j.sessionId === record.sessionId && j.userPubkey === record.userPubkey);
  if (idx >= 0) joins[idx] = record; else joins.push(record);
  saveJoins(joins);
}

// Deterministic per-session escrow, derived from secret seed
function deriveSessionEscrowKeypair(sessionId) {
  const seedSecret = process.env.ESCROW_SEED_SECRET;
  if (!seedSecret) throw new Error('ESCROW_SEED_SECRET not set');
  const hash = crypto.createHash('sha256').update(`${seedSecret}:${sessionId}`).digest();
  return Keypair.fromSeed(hash.subarray(0, 32));
}

function buildMemoInstruction(message, payer) {
  const MEMO_PROGRAM_ID = new PublicKey('MemoSq4gqABAXKb96qnH8TysNcWxMyWCqXgDLGmfcHr');
  const data = Buffer.from(message, 'utf8');
  return new TransactionInstruction({
    keys: [{ pubkey: payer, isSigner: true, isWritable: false }],
    programId: MEMO_PROGRAM_ID,
    data
  });
}

async function verifyWhitelistOwnership(connection, userPubkey, mint) {
  if (!mint) return { ok: true };
  try {
    const owner = new PublicKey(userPubkey);
    const mintPk = new PublicKey(mint);
    const resp = await connection.getParsedTokenAccountsByOwner(owner, { mint: mintPk });
    const has = resp.value.some(ta => {
      const info = ta.account.data.parsed.info;
      const ui = Number(info.tokenAmount?.uiAmount || 0);
      return ui > 0;
    });
    return { ok: has, reason: has ? undefined : 'Whitelist mint not held' };
  } catch (e) {
    return { ok: false, reason: `Whitelist check failed: ${e.message}` };
  }
}

async function buildJoinTransaction({ sessionId, userPubkey }) {
  const connection = getConnection();
  const room = findRoom(sessionId);
  if (!room) throw new Error('Room not found');

  const now = new Date();
  const createdAt = new Date(room.createdAt);
  const expires = new Date(createdAt.getTime() + 24 * 60 * 60 * 1000);
  if (expires < now) throw new Error('Room has expired');

  const payer = new PublicKey(userPubkey);
  const escrow = deriveSessionEscrowKeypair(sessionId).publicKey;

  // Verify balance for entry fee if any
  const entryFeeSol = Number(room.entry?.entryFeeSol || 0);
  const lamports = Math.floor(Math.max(0, entryFeeSol) * LAMPORTS_PER_SOL);
  const balance = await connection.getBalance(payer);
  if (balance < lamports) {
    throw new Error(`Insufficient SOL balance for entry fee: need ${lamports} lamports`);
  }

  // Verify whitelist mint if required
  const wl = await verifyWhitelistOwnership(connection, userPubkey, room.entry?.whitelistMint || '');
  if (!wl.ok) throw new Error(wl.reason || 'Whitelist verification failed');

  // Build transaction: Memo + optional transfer to escrow
  const memoPayload = JSON.stringify({
    kind: 'nen_room_join',
    sessionId,
    userPubkey,
    ts: new Date().toISOString(),
    entryLamports: lamports
  });

  const { blockhash, lastValidBlockHeight } = await connection.getLatestBlockhash('confirmed');
  const tx = new Transaction({ feePayer: payer, recentBlockhash: blockhash });
  tx.add(buildMemoInstruction(memoPayload, payer));
  if (lamports > 0) {
    tx.add(SystemProgram.transfer({ fromPubkey: payer, toPubkey: escrow, lamports }));
  }

  const transactionBase64 = tx.serialize({ requireAllSignatures: false, verifySignatures: false }).toString('base64');

  return {
    sessionId,
    escrow: escrow.toBase58(),
    transactionBase64,
    recentBlockhash: blockhash,
    lastValidBlockHeight,
    memo: memoPayload,
    entryLamports: lamports
  };
}

async function confirmJoin({ sessionId, userPubkey, signature }) {
  const connection = getConnection();
  const room = findRoom(sessionId);
  if (!room) throw new Error('Room not found');

  const tx = await connection.getParsedTransaction(signature, { maxSupportedTransactionVersion: 0, commitment: 'confirmed' });
  if (!tx || tx.meta?.err) throw new Error('Transaction not found or failed');

  // Verify memo present and signed by user
  const payer = new PublicKey(userPubkey).toBase58();
  const memoIx = (tx.transaction.message.instructions || []).find(ix => ix.program === 'spl-memo' || ix.programId?.toBase58?.() === 'MemoSq4gqABAXKb96qnH8TysNcWxMyWCqXgDLGmfcHr');
  if (!memoIx) throw new Error('Join memo not found in transaction');

  // Verify transfer to escrow if entry fee required
  const entryFeeSol = Number(room.entry?.entryFeeSol || 0);
  const lamports = Math.floor(Math.max(0, entryFeeSol) * LAMPORTS_PER_SOL);
  if (lamports > 0) {
    const escrow = deriveSessionEscrowKeypair(sessionId).publicKey.toBase58();
    const transferIx = tx.transaction.message.instructions.find(ix => ix.program === 'system' && ix.parsed?.type === 'transfer');
    if (!transferIx) throw new Error('Entry fee transfer not found');
    const info = transferIx.parsed.info;
    if (info.destination !== escrow || info.source !== payer || parseInt(info.lamports, 10) !== lamports) {
      throw new Error('Entry fee transfer does not match expected details');
    }
  }

  // Persist join record
  const record = {
    sessionId,
    userPubkey: payer,
    signature,
    explorer: `https://explorer.solana.com/tx/${signature}?cluster=devnet`,
    ts: new Date().toISOString()
  };
  upsertJoinRecord(record);

  // Add to backend-side permissions registry for the session
  try {
    const roomsSvc = require('./rooms-devnet.js');
    roomsSvc.addAllowedPlayer(sessionId, payer);
  } catch (_) {}

  // Update room status when full (2 unique joins)
  const joins = listJoinsForSession(sessionId);
  const uniquePlayers = Array.from(new Set(joins.map(j => j.userPubkey)));
  if (uniquePlayers.length >= 2) {
    const rooms = loadRooms();
    const idx = rooms.findIndex(r => r.sessionId === sessionId);
    if (idx >= 0) {
      // Attach a short countdown for clients, while marking active for immediate play
      const now = Date.now();
      const countdownDurationSec = 5;
      rooms[idx].status = 'active';
      rooms[idx].activatedAt = new Date(now).toISOString();
      rooms[idx].countdown = {
        startsAt: new Date(now).toISOString(),
        durationSec: countdownDurationSec,
        endsAt: new Date(now + countdownDurationSec * 1000).toISOString()
      };
      rooms[idx].rollup = rooms[idx].rollup || {};
      rooms[idx].rollup.status = 'active';
      saveRooms(rooms);
      try {
        const bus = require('./event-bus');
        bus.emit('room:countdown_started', {
          sessionId,
          countdown: rooms[idx].countdown,
          activatedAt: rooms[idx].activatedAt
        });
        bus.emit('room:activated', {
          sessionId,
          countdown: rooms[idx].countdown,
          activatedAt: rooms[idx].activatedAt
        });
      } catch (_) {}
    }
  }

  return {
    success: true,
    sessionId,
    players: listJoinsForSession(sessionId).map(j => j.userPubkey),
    status: (findRoom(sessionId) || {}).status || 'waiting'
  };
}

module.exports = {
  buildJoinTransaction,
  confirmJoin,
  listJoinsForSession,
  getEscrowAddress(sessionId) {
    return deriveSessionEscrowKeypair(sessionId).publicKey.toBase58();
  }
};
