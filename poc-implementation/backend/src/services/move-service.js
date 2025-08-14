/*
 * Move Processing Service
 * - Validates and applies moves using MagicBlock BOLT ECS (compiled JS)
 * - Persists verifiable move history per session
 * - Optionally appends to MagicBlock rollup via HTTP API
 * - Supports undo (10s window) and resign-based finalization
 * - Settles match on Solana devnet with a Memo commitment (finalStateHash + merkleRoot)
 */

require('dotenv').config();
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');
const axios = require('axios').default;
const { Connection, PublicKey, Keypair, Transaction, SystemProgram, sendAndConfirmTransaction } = require('@solana/web3.js');

// ---------- Utilities ----------
function assertEnv(name) {
  const v = process.env[name];
  if (typeof v === 'undefined' || String(v).trim() === '') {
    throw new Error(`${name} not set`);
  }
  return v;
}

function getConnection() {
  const url = process.env.MAGICBLOCK_ROUTER_RPC || 'https://devnet-router.magicblock.app' || process.env.SOLANA_RPC_URL || 'https://api.devnet.solana.com';
  const commitment = process.env.COMMITMENT || 'confirmed';
  return new Connection(url, commitment);
}

function loadServiceKeypair() {
  const bs58 = require('bs58');
  const secretEnv = process.env.BACKEND_WALLET_SECRET_KEY;
  if (secretEnv && secretEnv.trim()) {
    try {
      let secretBytes;
      if (secretEnv.trim().startsWith('[')) {
        secretBytes = new Uint8Array(JSON.parse(secretEnv));
      } else {
        secretBytes = new Uint8Array(bs58.decode(secretEnv.trim()));
      }
      return Keypair.fromSecretKey(secretBytes);
    } catch (e) {
      throw new Error(`Failed to parse BACKEND_WALLET_SECRET_KEY: ${e.message}`);
    }
  }
  const kpEnvPath = process.env.BACKEND_WALLET_KEYPAIR_PATH;
  if (kpEnvPath) {
    const resolved = path.isAbsolute(kpEnvPath) ? kpEnvPath : path.resolve(process.cwd(), kpEnvPath);
    if (!fs.existsSync(resolved)) throw new Error(`Keypair file not found at BACKEND_WALLET_KEYPAIR_PATH=${resolved}`);
    const arr = JSON.parse(fs.readFileSync(resolved, 'utf8'));
    return Keypair.fromSecretKey(new Uint8Array(arr));
  }
  // Fallbacks
  const candidates = [
    path.resolve(process.cwd(), 'backend-wallet-devnet.json'),
    path.resolve(process.cwd(), '..', 'backend-wallet-devnet.json'),
    path.resolve(__dirname, '..', '..', 'backend-wallet-devnet.json'),
    path.resolve(__dirname, '..', '..', '..', 'backend-wallet-devnet.json')
  ];
  for (const p of candidates) {
    if (fs.existsSync(p)) {
      const arr = JSON.parse(fs.readFileSync(p, 'utf8'));
      return Keypair.fromSecretKey(new Uint8Array(arr));
    }
  }
  throw new Error('No signing keypair found. Configure BACKEND_WALLET_SECRET_KEY or BACKEND_WALLET_KEYPAIR_PATH.');
}

function getMemoProgramId() {
  return new PublicKey(process.env.MEMO_PROGRAM_ID || 'MemoSq4gqABAXKb96qnH8TysNcWxMyWCqXgDLGmfcHr');
}

async function sendMemo(connection, payer, payloadObj) {
  const disableMemo = (process.env.DISABLE_MEMO_TX || 'false').toLowerCase() === 'true';
  if (disableMemo) return `DISABLED_MEMO_${Date.now()}`;
  const ix = { keys: [], programId: getMemoProgramId(), data: Buffer.from(JSON.stringify(payloadObj), 'utf8') };
  const tx = new Transaction().add(ix);
  const sig = await sendAndConfirmTransaction(connection, tx, [payer], { commitment: 'confirmed' });
  return sig;
}

async function ensurePayerFunds(connection, payer, minLamports = 2_000_000) {
  try {
    const bal = await connection.getBalance(payer.publicKey, 'confirmed');
    if (bal >= minLamports) return { ok: true, balance: bal };
    // Devnet airdrop (best-effort)
    const sig = await connection.requestAirdrop(payer.publicKey, minLamports);
    await connection.confirmTransaction(sig, 'confirmed');
    const after = await connection.getBalance(payer.publicKey, 'confirmed');
    return { ok: after >= minLamports, balance: after };
  } catch (e) {
    return { ok: false, error: e.message };
  }
}

// Simple Merkle Tree (SHA-256) over JSON strings
function sha256Hex(buf) { return crypto.createHash('sha256').update(buf).digest('hex'); }
function merkleRootHex(items) {
  if (!items || items.length === 0) return sha256Hex(Buffer.from('[]'));
  let level = items.map(x => Buffer.from(sha256Hex(Buffer.from(typeof x === 'string' ? x : JSON.stringify(x))), 'hex'));
  while (level.length > 1) {
    const next = [];
    for (let i = 0; i < level.length; i += 2) {
      const left = level[i];
      const right = i + 1 < level.length ? level[i + 1] : left;
      next.push(Buffer.from(sha256Hex(Buffer.concat([left, right])), 'hex'));
    }
    level = next;
  }
  return level[0].toString('hex');
}

function ensureDir(p) { if (!fs.existsSync(p)) fs.mkdirSync(p, { recursive: true }); }

// ---------- BOLT ECS Bridge ----------
let boltService = null; // Single instance
function getBoltService() {
  if (boltService) return boltService;
  const connection = getConnection();
  const payer = loadServiceKeypair();
  const logger = console; // rooms-server uses console; keep minimal
  // Provider shape with wallet.publicKey
  const provider = { wallet: { publicKey: payer.publicKey } };
  // Prefer compiled JS
  const modPath = path.join(process.cwd(), 'dist/services/MagicBlockBOLTService.js');
  if (!fs.existsSync(modPath)) {
    throw new Error('Compiled BOLT service not found at dist/services/MagicBlockBOLTService.js. Run npm run build in backend.');
  }
  // eslint-disable-next-line import/no-dynamic-require, global-require
  const { MagicBlockBOLTService } = require(modPath);
  boltService = new MagicBlockBOLTService(connection, provider, logger);
  return boltService;
}

// Keep track of sessions we initialized on BOLT
const boltSessions = new Set();

function readRoom(sessionId) {
  const file = path.join(process.cwd(), 'logs', 'rooms.json');
  if (!fs.existsSync(file)) return null;
  try {
    const arr = JSON.parse(fs.readFileSync(file, 'utf8'));
    return arr.find(r => r.sessionId === sessionId) || null;
  } catch (_) { return null; }
}

async function ensureBoltSessionInitialized(sessionId) {
  if (boltSessions.has(sessionId)) return;
  const record = readRoom(sessionId);
  if (!record) throw new Error('Room not found');
  const players = (record.permissions?.players || []).slice(0, 2);
  const p1 = players[0] ? new PublicKey(players[0]) : loadServiceKeypair().publicKey;
  const p2 = players[1] ? new PublicKey(players[1]) : null;
  const settings = record.settings || {};
  const config = {
    timeControl: Number(String(settings.timeControl || '10+5').split('+')[0]) * 60,
    region: process.env.MAGICBLOCK_REGION_CODE || 'AUTO',
    allowSpectators: Boolean(settings.allowSpectators !== false),
    tournamentMode: Boolean(settings.tournamentMode)
  };
  await getBoltService().createEnhancedSession(sessionId, p1, p2, config, config.region);
  boltSessions.add(sessionId);
}

// ---------- Move Log Persistence ----------
function movesFile(sessionId) {
  const dir = path.join(process.cwd(), 'logs', 'moves');
  ensureDir(dir);
  return path.join(dir, `${sessionId}.json`);
}

function readMoves(sessionId) {
  const file = movesFile(sessionId);
  if (!fs.existsSync(file)) return [];
  try { return JSON.parse(fs.readFileSync(file, 'utf8')); } catch (_) { return []; }
}

function writeMoves(sessionId, arr) {
  const file = movesFile(sessionId);
  fs.writeFileSync(file, JSON.stringify(arr, null, 2));
}

// ---------- Rollup Append ----------
async function appendToRollup(sessionId, moveRecord) {
  const url = process.env.MAGICBLOCK_ROLLUP_APPEND_URL;
  if (!url) return { appended: false };
  const apiKey = assertEnv('MAGICBLOCK_API_KEY');
  const headers = { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` };
  const payload = { sessionId, move: moveRecord };
  const { data } = await axios.post(url, payload, { headers, timeout: 15000 });
  return { appended: true, response: data };
}

// ---------- Finalization / Settlement ----------
async function finalizeAndSettle(sessionId, result) {
  const record = readRoom(sessionId);
  if (!record) throw new Error('Room not found');
  const history = readMoves(sessionId);
  const moveHashes = history.map(m => m.moveHash || sha256Hex(Buffer.from(JSON.stringify(m.move))))
  const merkle = merkleRootHex(moveHashes);
  const finalStateHash = sha256Hex(Buffer.from(JSON.stringify({ sessionId, lastMoveHash: moveHashes[moveHashes.length - 1] || null, count: history.length })));

  // Settlement Memo
  const connection = getConnection();
  const payer = loadServiceKeypair();
  // Ensure we have funds for memo on devnet
  await ensurePayerFunds(connection, payer).catch(() => null);
  const payload = {
    kind: 'nen_settlement',
    version: 1,
    sessionId,
    result, // { reason: 'resign'|'terminal', winner: 'player1'|'player2'|'draw' }
    merkleRoot: merkle,
    finalStateHash,
    moveCount: history.length,
    timestamp: new Date().toISOString()
  };
  const signature = await sendMemo(connection, payer, payload);
  const explorer = `https://explorer.solana.com/tx/${signature}?cluster=devnet`;

  // Optional: persist replay to MagicBlock rollup service
  let replayPersist = null;
  try {
    const url = process.env.MAGICBLOCK_ROLLUP_PERSIST_URL;
    if (url) {
      const apiKey = assertEnv('MAGICBLOCK_API_KEY');
      const headers = { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` };
      const compressed = { merkleRoot: merkle, finalStateHash, moveCount: history.length };
      const body = { sessionId, compressed, history };
      const { data } = await axios.post(url, body, { headers, timeout: 20000 });
      replayPersist = { ok: true, response: data };
    }
  } catch (e) {
    replayPersist = { ok: false, error: e.message };
  }

  // On-chain payout from deterministic escrow
  let payout = null;
  try {
    payout = await payoutFromEscrow(connection, sessionId, result);
  } catch (e) {
    payout = { ok: false, error: e.message };
  }

  // Persist a summary
  const summaryDir = path.join(process.cwd(), 'logs', 'settlements');
  ensureDir(summaryDir);
  fs.writeFileSync(path.join(summaryDir, `${sessionId}.json`), JSON.stringify({ ...payload, signature, explorer, replayPersist, payout }, null, 2));

  // Emit event for subscribers
  try {
    const bus = require('./event-bus');
    bus.emit('game:settled', { sessionId, result, signature, explorer, merkleRoot: merkle, finalStateHash, payout, replayPersist });
  } catch (_) {}

  return { signature, explorer, merkleRoot: merkle, finalStateHash, payout, replayPersist };
}

// ---------- Public API ----------
async function processMove({ sessionId, userPubkey, move }) {
  if (!sessionId || !userPubkey || !move) throw new Error('sessionId, userPubkey, move are required');
  const room = readRoom(sessionId);
  if (!room) throw new Error('Room not found');
  const allowed = (room.permissions?.players || []);
  if (!allowed.includes(userPubkey)) throw new Error('User not permitted to submit moves for this session');

  // Enforce turn order based on index in allowed[]
  const history = readMoves(sessionId);
  const currentTurn = (history.length % 2 === 0) ? allowed[0] : allowed[1];
  if (allowed.length >= 2 && userPubkey !== currentTurn) {
    throw new Error('Not your turn');
  }

  // Initialize BOLT session if needed
  await ensureBoltSessionInitialized(sessionId);

  // Normalize move payload to expected structure; pass through otherwise
  const timestamp = Date.now();
  const moveData = {
    ...move,
    timestamp,
    player: (allowed[0] === userPubkey ? 1 : 2)
  };

  // Submit to BOLT ECS for validation/apply
  const res = await getBoltService().submitMoveEnhanced(
    sessionId,
    moveData,
    new PublicKey(userPubkey),
    crypto.randomBytes(32)
  );
  if (!res || res.success !== true) throw new Error('Move rejected by BOLT ECS');

  // Compose move record
  const moveRecord = {
    at: new Date(timestamp).toISOString(),
    sessionId,
    userPubkey,
    move: moveData,
    moveHash: res.moveHash,
    latencyMs: res.latency
  };

  // Persist
  const updated = [...history, moveRecord];
  writeMoves(sessionId, updated);

  // Append to rollup (best-effort)
  let rollup = null;
  try { rollup = await appendToRollup(sessionId, moveRecord); } catch (e) { rollup = { appended: false, error: e.message }; }

  // Auto terminal-state detection: if a Marshal is captured, finalize immediately
  let ended = false;
  let result = null;
  try {
    const world = getBoltService().getWorldState(sessionId);
    if (world && Array.isArray(world.pieces)) {
      // Find marshals by owner
      const p1Marshal = world.pieces.find(p => p.pieceType === 'Marshal' && p.owner === 1);
      const p2Marshal = world.pieces.find(p => p.pieceType === 'Marshal' && p.owner === 2);
      if ((p1Marshal && p1Marshal.captured) || (p2Marshal && p2Marshal.captured)) {
        ended = true;
        result = {
          reason: 'terminal',
          winner: (p1Marshal && p1Marshal.captured) ? 'player2' : 'player1'
        };
      }
    }
  } catch (_) {}

  let settlement = null;
  if (ended) {
    settlement = await finalizeAndSettle(sessionId, result);
    try {
      const roomSvc = require(path.join(process.cwd(), 'src/services/rooms-devnet.js'));
      roomSvc.updateRoom(sessionId, (r) => { r.status = 'ended'; r.endedAt = new Date().toISOString(); r.result = result; r.settlement = settlement; return r; });
    } catch (_) {}
  }

  return { accepted: true, moveHash: res.moveHash, latencyMs: res.latency, totalMoves: updated.length, rollup, ended, result, settlement };
}

async function undoLastMove({ sessionId, userPubkey }) {
  if (!sessionId || !userPubkey) throw new Error('sessionId and userPubkey are required');
  const history = readMoves(sessionId);
  if (history.length === 0) throw new Error('No moves to undo');
  const last = history[history.length - 1];
  const ageMs = Date.now() - new Date(last.at).getTime();
  if (last.userPubkey !== userPubkey) throw new Error('Only the author can undo the last move');
  if (ageMs > 10_000) throw new Error('Undo window expired');

  // Remove last move from log
  const updated = history.slice(0, -1);
  writeMoves(sessionId, updated);

  // Rebuild BOLT session by re-initializing and replaying moves
  boltSessions.delete(sessionId);
  await ensureBoltSessionInitialized(sessionId);
  for (const m of updated) {
    // Replay
    await getBoltService().submitMoveEnhanced(sessionId, m.move, new PublicKey(m.userPubkey), crypto.randomBytes(32));
  }

  return { undone: true, totalMoves: updated.length };
}

async function resignGame({ sessionId, userPubkey }) {
  if (!sessionId || !userPubkey) throw new Error('sessionId and userPubkey are required');
  const room = readRoom(sessionId);
  if (!room) throw new Error('Room not found');
  const allowed = (room.permissions?.players || []);
  if (!allowed.includes(userPubkey)) throw new Error('User not permitted to resign this session');

  const winner = allowed.find(p => p !== userPubkey) || null;
  const result = { reason: 'resign', winner: winner ? (allowed[0] === winner ? 'player1' : 'player2') : 'draw' };
  const settlement = await finalizeAndSettle(sessionId, result);

  // Mark room as ended
  try {
    const roomSvc = require(path.join(process.cwd(), 'src/services/rooms-devnet.js'));
    roomSvc.updateRoom(sessionId, (r) => { r.status = 'ended'; r.endedAt = new Date().toISOString(); r.result = result; r.settlement = settlement; return r; });
  } catch (_) {}

  return { ended: true, result, settlement };
}

module.exports = { processMove, undoLastMove, resignGame, finalizeAndSettle };

// ---------- Read APIs for UI ----------
async function getValidMoves({ sessionId, userPubkey, fromX, fromY, fromLevel, pieceType }) {
  if (!sessionId || !userPubkey) throw new Error('sessionId and userPubkey are required');
  const room = readRoom(sessionId);
  if (!room) throw new Error('Room not found');
  const allowed = (room.permissions?.players || []);
  if (!allowed.includes(userPubkey)) throw new Error('Not permitted');

  await ensureBoltSessionInitialized(sessionId);
  const bolt = getBoltService();
  const world = bolt.getWorldState(sessionId);
  if (!world) throw new Error('World state not available');

  const player = (allowed[0] === userPubkey ? 1 : 2);
  const res = [];
  for (let x = 0; x < 9; x++) {
    for (let y = 0; y < 9; y++) {
      for (let level = 0; level < 3; level++) {
        try {
          const ok = await bolt.validateMoveBOLTECS({ worldState: world }, {
            fromX, fromY, fromLevel, toX: x, toY: y, toLevel: level, pieceType, player,
            moveHash: '', timestamp: Date.now()
          });
          if (ok) res.push({ x, y, level });
        } catch (_) {}
      }
    }
  }
  return { destinations: res };
}

async function getWorldStateSnapshot(sessionId) {
  await ensureBoltSessionInitialized(sessionId);
  return getBoltService().getWorldState(sessionId);
}

module.exports.getValidMoves = getValidMoves;
module.exports.getWorldStateSnapshot = getWorldStateSnapshot;

// ---------- Escrow Payout Helpers ----------
function deriveSessionEscrowKeypair(sessionId) {
  const seedSecret = process.env.ESCROW_SEED_SECRET;
  if (!seedSecret) throw new Error('ESCROW_SEED_SECRET not set');
  const hash = crypto.createHash('sha256').update(`${seedSecret}:${sessionId}`).digest();
  const { Keypair } = require('@solana/web3.js');
  return Keypair.fromSeed(hash.subarray(0, 32));
}

async function payoutFromEscrow(connection, sessionId, result) {
  // Determine recipients based on result and room permissions
  const room = readRoom(sessionId);
  if (!room) throw new Error('Room not found');
  const players = (room.permissions?.players || []).slice(0, 2).map(p => new PublicKey(p));
  if (players.length === 0) throw new Error('No players in room');
  const escrow = deriveSessionEscrowKeypair(sessionId);

  // Determine balances and payout splits
  const balance = await connection.getBalance(escrow.publicKey, 'confirmed');
  if (balance <= 0) return { ok: true, reason: 'no_funds', balance };

  // Estimate fees for 1-2 transfers
  const feeReserve = 10_000; // conservative lamports reserve
  const available = Math.max(0, balance - feeReserve);
  if (available <= 0) return { ok: true, reason: 'insufficient_after_fees', balance };

  let instructions = [];
  if (result?.winner === 'player1') {
    instructions.push(SystemProgram.transfer({ fromPubkey: escrow.publicKey, toPubkey: players[0], lamports: available }));
  } else if (result?.winner === 'player2') {
    instructions.push(SystemProgram.transfer({ fromPubkey: escrow.publicKey, toPubkey: players[1] || players[0], lamports: available }));
  } else {
    // draw: split evenly
    const half = Math.floor(available / 2);
    instructions.push(SystemProgram.transfer({ fromPubkey: escrow.publicKey, toPubkey: players[0], lamports: half }));
    if (players[1]) instructions.push(SystemProgram.transfer({ fromPubkey: escrow.publicKey, toPubkey: players[1], lamports: available - half }));
  }

  const { blockhash, lastValidBlockHeight } = await connection.getLatestBlockhash('confirmed');
  const tx = new Transaction({ recentBlockhash: blockhash, feePayer: escrow.publicKey });
  instructions.forEach(ix => tx.add(ix));
  const sig = await sendAndConfirmTransaction(connection, tx, [escrow], { commitment: 'confirmed' });
  return { ok: true, signature: sig, explorer: `https://explorer.solana.com/tx/${sig}?cluster=devnet`, distributedLamports: available };
}
