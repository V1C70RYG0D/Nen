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

// Anchor optional (loaded lazily)
let anchor = null;
try { anchor = require('@coral-xyz/anchor'); } catch (_) { /* optional */ }

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
  const router = process.env.MAGICBLOCK_ROUTER_RPC || 'https://devnet-router.magicblock.app';
  const url = router || process.env.SOLANA_RPC_URL || 'https://api.devnet.solana.com';
  const commitment = process.env.COMMITMENT || 'confirmed';
  return new Connection(url, commitment);
}

function loadServiceKeypair() {
  if (training && typeof training.loadServiceKeypair === 'function') return training.loadServiceKeypair();

  const { Keypair } = require('@solana/web3.js');
  const bs58 = require('bs58');

  // 1) BACKEND_WALLET_SECRET_KEY supports JSON array (stringified) OR base58
  const secretEnv = process.env.BACKEND_WALLET_SECRET_KEY;
  if (secretEnv && secretEnv.trim().length > 0) {
    try {
      let secretBytes;
      if (secretEnv.trim().startsWith('[')) {
        // JSON array of numbers
        secretBytes = new Uint8Array(JSON.parse(secretEnv));
      } else {
        // base58 string
        secretBytes = new Uint8Array(bs58.decode(secretEnv.trim()));
      }
      return Keypair.fromSecretKey(secretBytes);
    } catch (e) {
      throw new Error(`Failed to parse BACKEND_WALLET_SECRET_KEY: ${e.message}`);
    }
  }

  // 2) BACKEND_WALLET_KEYPAIR_PATH points to a keypair JSON file
  const kpEnvPath = process.env.BACKEND_WALLET_KEYPAIR_PATH;
  if (kpEnvPath) {
    const resolved = path.isAbsolute(kpEnvPath) ? kpEnvPath : path.resolve(process.cwd(), kpEnvPath);
    if (!fs.existsSync(resolved)) {
      throw new Error(`Keypair file not found at BACKEND_WALLET_KEYPAIR_PATH=${resolved}`);
    }
    const raw = fs.readFileSync(resolved, 'utf8');
    const arr = JSON.parse(raw);
    return Keypair.fromSecretKey(new Uint8Array(arr));
  }

  // 3) Fallbacks: try repo root then parent of current working dir
  const candidatePaths = [
    path.resolve(process.cwd(), 'backend-wallet-devnet.json'),
    path.resolve(process.cwd(), '..', 'backend-wallet-devnet.json'),
    path.resolve(__dirname, '..', '..', 'backend-wallet-devnet.json'),
    path.resolve(__dirname, '..', '..', '..', 'backend-wallet-devnet.json')
  ];
  for (const p of candidatePaths) {
    if (fs.existsSync(p)) {
      const raw = fs.readFileSync(p, 'utf8');
      const arr = JSON.parse(raw);
      return Keypair.fromSecretKey(new Uint8Array(arr));
    }
  }

  throw new Error('No signing keypair found. Set BACKEND_WALLET_SECRET_KEY, BACKEND_WALLET_KEYPAIR_PATH, or place backend-wallet-devnet.json at repo root.');
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

function updateRoom(sessionId, updater) {
  const dir = path.join(process.cwd(), 'logs');
  const file = path.join(dir, 'rooms.json');
  if (!fs.existsSync(file)) return null;
  const arr = JSON.parse(fs.readFileSync(file, 'utf8'));
  const idx = arr.findIndex(r => r.sessionId === sessionId);
  if (idx < 0) return null;
  const updated = updater({ ...arr[idx] });
  arr[idx] = updated || arr[idx];
  fs.writeFileSync(file, JSON.stringify(arr, null, 2));
  return arr[idx];
}

function addAllowedPlayer(sessionId, playerPubkey) {
  return updateRoom(sessionId, (r) => {
    r.permissions = r.permissions || { players: [] };
    if (!r.permissions.players.includes(playerPubkey)) {
      r.permissions.players.push(playerPubkey);
    }
    return r;
  });
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
  // Reuse training service sender for compute budget + logging if available
  if (training && typeof training.sendMemoWithSession === 'function') {
    const msg = JSON.stringify(memoObj);
    return training.sendMemoWithSession(connection, payer, msg);
  }
  const ix = { keys: [], programId: getMemoProgramId(), data: Buffer.from(JSON.stringify(memoObj), 'utf8') };
  const tx = new Transaction().add(ix);
  const sig = await sendAndConfirmTransaction(connection, tx, [payer], { commitment: 'confirmed' });
  return sig;
}

// -------------------------
// Anchor client helpers (nen_magicblock)
// -------------------------

function resolveExistingPath(paths) {
  for (const p of paths) {
    try { if (p && fs.existsSync(p)) return p; } catch (_) {}
  }
  return null;
}

function getMagicblockProgramId() {
  const envId = process.env.NEN_MAGICBLOCK_PROGRAM_ID || process.env.MAGICBLOCK_PROGRAM_ID;
  if (envId) return new PublicKey(envId);
  const candidates = [
    path.join(process.cwd(), 'DEVNET_PROGRAMS.json'),
    path.resolve(__dirname, '..', '..', '..', 'DEVNET_PROGRAMS.json'),
    path.resolve(__dirname, '..', '..', 'DEVNET_PROGRAMS.json'),
    path.resolve(__dirname, '..', 'DEVNET_PROGRAMS.json'),
    path.resolve(process.cwd(), '..', 'DEVNET_PROGRAMS.json')
  ];
  for (const f of candidates) {
    try {
      if (fs.existsSync(f)) {
        const json = JSON.parse(fs.readFileSync(f, 'utf8'));
        const pid = json?.programs?.nen_magicblock?.program_id;
        if (pid) return new PublicKey(pid);
      }
    } catch (_) { /* continue */ }
  }
  throw new Error('NEN_MAGICBLOCK_PROGRAM_ID not configured and DEVNET_PROGRAMS.json missing nen_magicblock.program_id');
}

function loadNenMagicblockIdl() {
  const customPath = process.env.NEN_MAGICBLOCK_IDL_PATH && path.resolve(process.env.NEN_MAGICBLOCK_IDL_PATH);
  const candidates = [
    customPath,
    path.join(process.cwd(), 'backend', 'lib', 'idl', 'nen_magicblock.json'),
    path.join(process.cwd(), 'lib', 'idl', 'nen_magicblock.json')
  ];
  const idlPath = resolveExistingPath(candidates);
  if (!idlPath) throw new Error('nen_magicblock IDL not found. Set NEN_MAGICBLOCK_IDL_PATH or place IDL at backend/lib/idl/nen_magicblock.json');
  return JSON.parse(fs.readFileSync(idlPath, 'utf8'));
}

function getAnchorProvider(payer) {
  if (!anchor) throw new Error('Anchor not installed');
  const connection = getConnection();
  const wallet = new anchor.Wallet(payer);
  return new anchor.AnchorProvider(connection, wallet, { preflightCommitment: 'confirmed' });
}

function sessionNumberFromUuid(sessionId) {
  // Deterministically map UUIDv4 to u64 using first 8 bytes of sha256
  const h = crypto.createHash('sha256').update(sessionId).digest();
  // Convert first 8 bytes to BN (little-endian false)
  const bn = new (anchor ? anchor.BN : require('bn.js'))(h.subarray(0, 8).toString('hex'), 16);
  return bn;
}

async function createOnChainSessionAnchor({ payer, settings, entry, sessionId, player1, player2 }) {
  if (!anchor) throw new Error('Anchor not available');
  const provider = getAnchorProvider(payer);
  anchor.setProvider(provider);
  const idl = loadNenMagicblockIdl();
  const programId = getMagicblockProgramId();
  const program = new anchor.Program(idl, programId, provider);

  const authority = provider.wallet.publicKey;
  const [sessionPda] = await PublicKey.findProgramAddress(
    [Buffer.from('session'), authority.toBuffer()],
    program.programId
  );

  const cuLimit = parseInt(process.env.ANCHOR_COMPUTE_UNIT_LIMIT || '600000');
  const cuPrice = parseInt(process.env.ANCHOR_PRIORITY_FEE_MICROLAMPORTS || '0');
  const { ComputeBudgetProgram, SystemProgram } = anchor.web3;

  // Map settings to on-chain SessionConfig
  const timeParts = String(settings.timeControl || '10+5').split('+');
  const baseMins = parseInt(timeParts[0] || '10');
  const incSecs = parseInt(timeParts[1] || '5');
  const sessionConfig = {
    timeLimitSeconds: Math.max(300, baseMins * 60),
    moveTimeLimitSeconds: Math.max(5, Math.min(300, incSecs)),
    enableSpectators: Boolean(settings.allowSpectators !== false),
    enableAnalysis: Boolean(settings.tournamentMode) === false, // Disable analysis in tournaments
    compressionLevel: 2
  };

  // Region selection
  const regionCode = process.env.MAGICBLOCK_REGION_CODE || 'US-WEST';
  const geographicRegion = {
    regionCode,
    latencyZone: Number(process.env.MAGICBLOCK_LATENCY_ZONE || 1),
    serverCluster: process.env.MAGICBLOCK_SERVER_CLUSTER || `cluster-${regionCode.toLowerCase().replace(/_/g, '-')}-1`
  };

  const player1Key = player1 ? new PublicKey(player1) : authority;
  const player2Key = player2 ? new PublicKey(player2) : null;

  const sig = await program.methods
    .createEnhancedSession(
      sessionNumberFromUuid(sessionId),
      player1Key,
      player2Key,
      sessionConfig,
      geographicRegion
    )
    .accounts({
      session: sessionPda,
      authority,
      systemProgram: SystemProgram.programId
    })
    .preInstructions([
      ComputeBudgetProgram.setComputeUnitLimit({ units: cuLimit }),
      ...(cuPrice > 0 ? [ComputeBudgetProgram.setComputeUnitPrice({ microLamports: cuPrice })] : [])
    ])
    .rpc();

  return { sessionPda: sessionPda.toBase58(), anchorSig: sig };
}

async function delegateSessionAnchor({ payer, sessionPdaBase58, commitFrequencyMs, validatorPubkeyBase58 }) {
  if (!anchor) throw new Error('Anchor not available');
  if (!sessionPdaBase58) throw new Error('sessionPdaBase58 required');
  if (!validatorPubkeyBase58) throw new Error('validatorPubkeyBase58 required');
  const provider = getAnchorProvider(payer);
  anchor.setProvider(provider);
  const idl = loadNenMagicblockIdl();
  const programId = getMagicblockProgramId();
  const program = new anchor.Program(idl, programId, provider);

  const authority = provider.wallet.publicKey;
  const sessionPda = new PublicKey(sessionPdaBase58);
  const validator = new PublicKey(validatorPubkeyBase58);
  const _ComputeBudgetProgram = anchor.web3.ComputeBudgetProgram;

  // Optional compute tuning
  const cuLimit = parseInt(process.env.ANCHOR_COMPUTE_UNIT_LIMIT || '400000');
  const cuPrice = parseInt(process.env.ANCHOR_PRIORITY_FEE_MICROLAMPORTS || '0');

  const args = { commitFrequencyMs: Number(commitFrequencyMs || 3000), validator };

  const txSig = await program.methods
    .delegateSession(args)
    .accounts({ session: sessionPda, authority })
    .preInstructions([
      _ComputeBudgetProgram.setComputeUnitLimit({ units: cuLimit }),
      ...(cuPrice > 0 ? [_ComputeBudgetProgram.setComputeUnitPrice({ microLamports: cuPrice })] : [])
    ])
    .rpc();

  return { signature: txSig };
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

  // Attempt real on-chain session creation via Anchor (nen_magicblock)
  let anchorSig = null;
  let sessionPda = null;
  let delegationSig = null;
  try {
    if ((process.env.DISABLE_MAGICBLOCK_ANCHOR || 'false').toLowerCase() !== 'true') {
      const res = await createOnChainSessionAnchor({
        payer,
        settings: params?.settings || {},
        entry: params?.entry || {},
        sessionId,
        player1: params?.player1,
        player2: params?.player2
      });
      anchorSig = res.anchorSig;
      sessionPda = res.sessionPda;

      // Optionally delegate immediately if validator is provided
      const validator = process.env.MAGICBLOCK_VALIDATOR;
      const commitMs = process.env.MAGICBLOCK_COMMIT_FREQ_MS || '3000';
      const enableDelegate = (process.env.ENABLE_SESSION_DELEGATION || 'false').toLowerCase() === 'true';
      if (enableDelegate && validator) {
        try {
          const delRes = await delegateSessionAnchor({
            payer,
            sessionPdaBase58: sessionPda,
            commitFrequencyMs: commitMs,
            validatorPubkeyBase58: validator,
          });
          delegationSig = delRes.signature;
        } catch (e) {
          console.warn('[rooms] delegation failed:', e.message);
        }
      }
    }
  } catch (e) {
    // Log and continue to memo fallback
    console.warn('[rooms] Anchor path failed, falling back to memo:', e.message);
  }

  // Always record a memo for auditability (unless explicitly disabled)
  let signature;
  const disableMemo = (process.env.DISABLE_MEMO_TX || 'false').toLowerCase() === 'true';
  if (!disableMemo) {
    signature = await sendRoomMemo(connection, payer, { ...memoPayload, sessionPda, anchorSig });
  } else {
    signature = `DISABLED_MEMO_${Date.now()}`;
  }

  const record = {
    ...memoPayload,
    signature,
    anchorSig,
    sessionPda,
    delegationSig,
    explorer: explorerTx(signature),
    ...(anchorSig && { anchorExplorer: explorerTx(anchorSig) })
  };

  saveRoomRecord(record);

  return record;
}

module.exports = {
  createGameRoom,
  readRoomByCode,
  // Added helpers for server integration
  readRoomBySessionId: function(sessionId) {
    const file = path.join(process.cwd(), 'logs', 'rooms.json');
    if (!fs.existsSync(file)) return null;
    const arr = JSON.parse(fs.readFileSync(file, 'utf8'));
    return arr.find(r => r.sessionId === sessionId) || null;
  },
  readRoomByCode: function(code) {
    const file = path.join(process.cwd(), 'logs', 'rooms.json');
    if (!fs.existsSync(file)) return null;
    const arr = JSON.parse(fs.readFileSync(file, 'utf8'));
    return arr.find(r => r.roomCode === code) || null;
  },
  updateRoom,
  addAllowedPlayer,
  listRooms: function() {
    const file = path.join(process.cwd(), 'logs', 'rooms.json');
    if (!fs.existsSync(file)) return [];
    try {
      const arr = JSON.parse(fs.readFileSync(file, 'utf8'));
      return Array.isArray(arr) ? arr : [];
    } catch (_) {
      return [];
    }
  }
};
