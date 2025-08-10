/**
 * Devnet Game Room Service
 * - Creates real, verifiable on-chain records (Memo) for room creation
 * - Generates unique session identifier and human shareable room code
 * - Optionally includes ephemeral rollup info if provided via env
 *
 * Env:
 * - SOLANA_RPC_URL (default https://api.devnet.solana.com)
 * - COMMITMENT (default confirmed)
 * - BACKEND_WALLET_SECRET_KEY or BACKEND_WALLET_KEYPAIR_PATH (required for signing)
 * - MEMO_PROGRAM_ID (optional override)
 * - MAGICBLOCK_API_URL, MAGICBLOCK_API_KEY (optional for rollup/session if integrated later)
 */

require('dotenv').config();

const path = require('path');
const fs = require('fs');
const crypto = require('crypto');
const { v4: uuidv4 } = require('uuid');

let training;
try { training = require('./training-devnet.js'); } catch (_) { training = null; }

const {
  Connection,
  PublicKey,
  Transaction,
  sendAndConfirmTransaction
} = require('@solana/web3.js');

function getConnection() {
  if (training && typeof training.getConnection === 'function') return training.getConnection();
  // Prefer MagicBlock Router on devnet if provided for transparent ER routing
  const router = process.env.MAGICBLOCK_ROUTER_RPC; // e.g. https://devnet-router.magicblock.app
  const url = router || process.env.SOLANA_RPC_URL || 'https://api.devnet.solana.com';
  const commitment = process.env.COMMITMENT || 'confirmed';
  return new Connection(url, commitment);
}

function loadServiceKeypair() {
  if (training && typeof training.loadServiceKeypair === 'function') return training.loadServiceKeypair();
  // Fallback to backend-wallet-devnet.json in repo root
  const kpPath = path.join(process.cwd(), 'backend-wallet-devnet.json');
  const raw = fs.readFileSync(kpPath, 'utf8');
  const arr = JSON.parse(raw);
  const { Keypair } = require('@solana/web3.js');
  return Keypair.fromSecretKey(new Uint8Array(arr));
}

function getMemoProgramId() {
  const id = process.env.MEMO_PROGRAM_ID || 'MemoSq4gqABAXKb96qnH8TysNcWxMyWCqXgDLGmfcHr';
  return new PublicKey(id);
}

function explorerTx(sig) {
  return `https://explorer.solana.com/tx/${sig}?cluster=devnet`;
}

function saveRoomRecord(record) {
  const dir = path.join(process.cwd(), 'logs');
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  const file = path.join(dir, 'rooms.json');
  const arr = fs.existsSync(file) ? JSON.parse(fs.readFileSync(file, 'utf8')) : [];
  arr.push(record);
  fs.writeFileSync(file, JSON.stringify(arr, null, 2));
}

function readRoomByCode(code) {
  const file = path.join(process.cwd(), 'logs', 'rooms.json');
  if (!fs.existsSync(file)) return null;
  const arr = JSON.parse(fs.readFileSync(file, 'utf8'));
  return arr.find(r => r.roomCode === code) || null;
}

function generateRoomCode() {
  // 8-char base32 uppercase code avoiding ambiguous chars
  const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = '';
  for (let i = 0; i < 8; i++) {
    const idx = crypto.randomInt(0, alphabet.length);
    code += alphabet[idx];
  }
  return code;
}

function getInitialECSSummary(settings) {
  // Minimal ECS entity summary consistent with Gungi board setup
  // We compute a commitment hash for verifiability on-chain
  const entities = [
    { id: 'p1_marshal', type: 'Marshal', owner: 1 },
    { id: 'p2_marshal', type: 'Marshal', owner: 2 }
  ];
  const positions = [];
  for (let x = 0; x < 9; x++) {
    for (let y = 0; y < 9; y++) {
      positions.push({ x, y, level: 0 });
    }
  }
  const payload = { entities, positions, systems: ['movement', 'capture'], variant: settings?.boardVariant || 'standard' };
  const hash = crypto.createHash('sha256').update(JSON.stringify(payload)).digest('hex');
  return { entityCount: entities.length + positions.length, systems: payload.systems, commitment: hash };
}

async function sendRoomMemo(connection, payer, memoObj) {
  const ix = { keys: [], programId: getMemoProgramId(), data: Buffer.from(JSON.stringify(memoObj), 'utf8') };
  const tx = new Transaction().add(ix);
  const sig = await sendAndConfirmTransaction(connection, tx, [payer], { commitment: 'confirmed' });
  return sig;
}

async function createGameRoom(params) {
  const connection = getConnection();
  const payer = loadServiceKeypair();

  const sessionId = uuidv4();
  const roomCode = generateRoomCode();

  const ecs = getInitialECSSummary(params?.settings || {});

  // Optional rollup fields controlled by env; values must be real and provided externally
  const rollupEnvEndpoint = process.env.MAGICBLOCK_ROLLUP_ENDPOINT || null; // e.g. wss://devnet.magicblock.app/session/...
  const rollupEnvId = process.env.MAGICBLOCK_ROLLUP_ID || null;
  const rollup = {
    available: Boolean(rollupEnvEndpoint && rollupEnvId),
    endpoint: rollupEnvEndpoint,
    rollupId: rollupEnvId
  };

  const nowIso = new Date().toISOString();
  const memoPayload = {
    kind: 'nen_room_created',
    version: 1,
    sessionId,
    roomCode,
    status: 'waiting',
    settings: params?.settings || {},
    entry: params?.entry || {},
    ecs,
    rollup,
    createdBy: params?.creator || null,
    createdAt: nowIso
  };

  const signature = await sendRoomMemo(connection, payer, memoPayload);

  const record = {
    ...memoPayload,
    signature,
    explorer: explorerTx(signature)
  };

  saveRoomRecord(record);

  return record;
}

module.exports = {
  createGameRoom,
  readRoomByCode
};
